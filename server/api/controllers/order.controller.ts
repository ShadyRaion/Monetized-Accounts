import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import { broadcastEvent } from '../sse.ts'

type OrderProduct = {
  id: string;
  price: number;
  platform?: string | null;
  type?: string | null;
};
import {
  AFFILIATE_TIERS,
  normalizeCommissionRate,
  calculateAffiliateCommissionRate,
  calculateCommissionAmount,
  getNextTierRate
} from '../utils/affiliateTiers.ts';

const isAffiliateApproved = (status: unknown) => {
  return ['accepted', 'active'].includes(String(status || '').trim().toLowerCase())
}

const resolveReferralCode = async (userId: string, requestReferralCode?: string) => {
  if (typeof requestReferralCode === 'string' && requestReferralCode.trim()) {
    return requestReferralCode.trim()
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  return user?.referralCode?.trim() || undefined
}

export const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { items, paymentMethod } = req.body;
    const referralCode = await resolveReferralCode(userId, typeof req.body.referralCode === 'string' ? req.body.referralCode : undefined);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    const itemProductIds = items.map((item: any) => item.productId);
    const products = (await prisma.product.findMany({ where: { id: { in: itemProductIds } } })) as OrderProduct[];
    const productsMap = new Map(products.map((product: OrderProduct) => [product.id, product]));

    let total = 0;
    for (const item of items) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }

      const quantity = Number(item.quantity) || 1;
      if (quantity < 1) {
        return res.status(400).json({ message: `Invalid quantity for product ${item.productId}` });
      }

      const verificationCount = Math.min(Number(item.verificationCount) || 0, quantity);
      const verificationUnitPrice = Number(item.verificationUnitPrice) || 0;

      total += product.price * quantity + verificationCount * verificationUnitPrice;
    }

    const order = await prisma.order.create({ data: { userId, totalAmount: total, status: 'VerifyingPayment', paymentMethod: paymentMethod ?? 'card', referralCode: referralCode ?? null } });

    for (const item of items) {
      const product = productsMap.get(item.productId)!;
      const quantity = Number(item.quantity) || 1;
      const verificationCount = Math.min(Number(item.verificationCount) || 0, quantity);
      const verificationUnitPrice = Number(item.verificationUnitPrice) || 0;
      const label = `${product.platform} ${product.type}`.trim() || product.type || product.platform || 'Product';

      for (let i = 0; i < quantity; i += 1) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            productLabel: label,
            productPrice: product.price,
            verificationCount: i < verificationCount ? 1 : 0,
            verificationPrice: i < verificationCount ? verificationUnitPrice : 0
          }
        });
      }
    }

    try { broadcastEvent({ type: 'order', action: 'created', data: order }) } catch (e) {}
    try {
      const cache = await import('../utils/cache.ts')
      cache.cacheDelete(`orders:user:${userId}`)
      cache.cacheDelete('orders:admin:list')
    } catch (e) {}
    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const calculateOrderItemCommissionAmount = (
  item: { product?: { price?: number }; productPrice?: number; verificationPrice?: number },
  rate: number
) => {
  const productPrice = Number(item.product?.price ?? item.productPrice ?? 0);
  const verificationPrice = Number(item.verificationPrice ?? 0);
  return calculateCommissionAmount(productPrice, verificationPrice, rate);
};

const processAffiliateOrderCompletion = async (order: any) => {
  if (!order || !order.referralCode) return

  const affiliate = await prisma.affiliate.findUnique({
    where: { affiliateCode: String(order.referralCode) },
    include: { purchases: true }
  })
  if (!affiliate || !isAffiliateApproved(affiliate.status)) return

  console.log('[affiliate order completion] orderId=', order.id, 'referralCode=', order.referralCode,
    'affiliateUserId=', affiliate.userId, 'commissionRate=', affiliate.commissionRate,
    'commissionRateAutoUpgradeEnabled=', affiliate.commissionRateAutoUpgradeEnabled,
    'affiliateStatus=', affiliate.status)

  const orderItems = await prisma.orderItem.findMany({
    where: { orderId: order.id },
    include: { product: true, affiliatePurchase: true }
  })

  const currentRateRaw = affiliate.commissionRate
  // Normalize: if stored as decimal (0.2), convert to percentage (20), keep 20 as 20
  const currentRate = normalizeCommissionRate(currentRateRaw)
  if (currentRate !== currentRateRaw && currentRate > 0) {
    console.log('[affiliate order completion] normalized rate from', currentRateRaw, 'to', currentRate)
  }
  let prevCount = await prisma.affiliatePurchase.count({ where: { affiliateId: affiliate.userId } })
  let totalCommission = 0

  for (const item of orderItems) {
    if (item.affiliatePurchase) continue

    const baseAmount = Number(item.product?.price ?? item.productPrice ?? 0) + Number(item.verificationPrice || 0)
    const commissionAmount = Number((baseAmount * (currentRate / 100)).toFixed(2))

    await prisma.affiliatePurchase.create({
      data: {
        affiliateId: affiliate.userId,
        orderItemId: item.id,
        commissionAmount,
        status: 'Pending'
      }
    })

    await prisma.affiliate.update({
      where: { userId: affiliate.userId },
      data: { totalEarnings: { increment: commissionAmount } }
    })

    totalCommission += commissionAmount
    prevCount += 1
  }

  const autoUpgradeEnabled = affiliate.commissionRateAutoUpgradeEnabled !== false
  const isRateWithinAutoUpgradeRange = Number.isFinite(currentRate) && currentRate >= 20 && currentRate <= 40

  console.log('[affiliate order completion] autoUpgradeEnabled=', autoUpgradeEnabled,
    'currentRate=', currentRate,
    'currentRateRaw=', currentRateRaw,
    'purchaseCount=', prevCount)

  if (!Number.isFinite(currentRate)) {
    console.log('[affiliate order completion] invalid commission rate, skipping auto-upgrade', { currentRateRaw })
  } else if (!autoUpgradeEnabled) {
    console.log('[affiliate order completion] skipping auto-upgrade because it is explicitly disabled')
  } else if (!isRateWithinAutoUpgradeRange) {
    console.log('[affiliate order completion] currentRate outside auto-upgrade range; preserving manual override', { currentRate })
    if (affiliate.commissionRateAutoUpgradeEnabled !== false) {
      await prisma.affiliate.update({
        where: { userId: affiliate.userId },
        data: { commissionRateAutoUpgradeEnabled: false }
      })
      console.log('[affiliate order completion] persisted commissionRateAutoUpgradeEnabled=false for manual override')
    }
  } else {
    const upgradedRate = getNextTierRate(currentRate, prevCount)
    console.log('[affiliate order completion] computed upgradedRate=', upgradedRate)
    if (affiliate.commissionRate !== upgradedRate) {
      console.log('[affiliate order completion] updating commissionRate from', affiliate.commissionRate, 'to', upgradedRate)
      await prisma.affiliate.update({
        where: { userId: affiliate.userId },
        data: { commissionRate: upgradedRate }
      })
    } else {
      console.log('[affiliate order completion] commissionRate remains unchanged at', affiliate.commissionRate)
    }
  }

  return totalCommission
}

const maskAnonymousName = (name?: string) => {
  const trimmed = (name ?? 'Anonymous').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'A';

  return words
    .map((word) => {
      const w = typeof word === 'string' ? word : String(word || '');
      if (w.length <= 1) return w.toUpperCase();
      return (w[0] ?? '').toUpperCase() + '*'.repeat(Math.max(0, w.length - 1));
    })
    .join(' ');
}

const formatReviewDisplayName = (name?: string): string => {
  if (!name) return 'Anonymous';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return maskAnonymousName(parts[0]);
  return maskAnonymousName(name);
}

const createAutoReviewForOrder = async (order: any) => {
  if (!order || order.review || order.status !== 'Completed') return null;

  const completedAt = order.completedAt ?? order.updatedAt ?? order.createdAt;
  const completedDate = completedAt instanceof Date ? completedAt : new Date(completedAt);
  const ageMs = Date.now() - completedDate.getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  if (ageMs < threeDaysMs) return null;

  const existingReview = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existingReview) return existingReview;

  const user = order.user ?? await prisma.user.findUnique({ where: { id: order.userId } });
  const displayName = formatReviewDisplayName(user?.name ?? 'Anonymous');

  return prisma.review.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      rating: 5,
      comment: '',
      displayName,
      anonymous: false,
      status: 'approved'
    }
  });
}

export const getUserOrders = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const cacheKey = `orders:user:${userId}`
    try {
      const cached = (await import('../utils/cache.ts')).cacheGet<any[]>(cacheKey)
      if (cached) return res.json(cached)
    } catch (e) { /* ignore cache errors */ }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } }, review: true, user: true },
      orderBy: { createdAt: 'desc' }
    });

    // Avoid creating auto-reviews during list fetch to reduce DB work and latency.
    // Auto-review creation still runs when fetching a single order or on status updates.

    try { (await import('../utils/cache.ts')).cacheSet(cacheKey, orders, 3000) } catch (e) {}
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getOrder = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, review: true, user: true } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) return res.status(403).json({ message: 'Access denied' });

    if (order.status === 'Completed') {
      const autoReview = await createAutoReviewForOrder(order);
      if (autoReview) {
        order.review = autoReview;
      }
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminListOrders = async (req: any, res: Response) => {
  try {
    const cacheKey = 'orders:admin:list'
    try {
      const cached = (await import('../utils/cache.ts')).cacheGet<any[]>(cacheKey)
      if (cached) return res.json(cached)
    } catch (e) { /* ignore cache errors */ }

    const orders = await prisma.order.findMany({ include: { user: true, items: { include: { product: true } }, review: true }, orderBy: { createdAt: 'desc' } });

    // Avoid creating auto-reviews during list fetch to reduce DB work and latency.
    try { (await import('../utils/cache.ts')).cacheSet(cacheKey, orders, 3000) } catch (e) {}
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const normalizeStatus = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    verifyingpayment: 'VerifyingPayment',
    payment_received: 'processing',
    processing: 'processing',
    preparing: 'processing',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    rejected: 'rejected'
  };
  return map[normalized] ?? value;
}

export const updateOrderStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`[order] updateOrderStatus called id=${id} status=${status} user=${req.user?.id} role=${req.user?.role}`);

    if (!status) return res.status(400).json({ message: 'Missing status' });

    const normalizedStatus = normalizeStatus(status);
    const order = await prisma.order.findUnique({ where: { id } }) as any;
    if (!order) {
      console.log(`[order] updateOrderStatus order not found id=${id}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user?.role === 'ADMIN'
    const currentStatus = String(order.status || '').toLowerCase()

    if (!isAdmin) {
      if (order.userId !== req.user.id) return res.status(403).json({ message: 'Access denied' })
      if (normalizedStatus === 'cancelled') {
        if (currentStatus === 'completed') {
          return res.status(400).json({ message: 'Completed orders cannot be cancelled' })
        }
      } else if (normalizedStatus !== 'delivered' && normalizedStatus !== 'processing' && normalizedStatus !== 'pending' && normalizedStatus !== 'completed') {
        return res.status(403).json({ message: 'Customers may only cancel or confirm receipt' })
      }
    }

    const data: any = { status: normalizedStatus, statusManualOverride: true }
    if (normalizedStatus === 'delivered' && !order.deliveredAt) {
      data.deliveredAt = new Date()
    }
    if (normalizedStatus === 'completed') {
      if (!order.deliveredAt) {
        data.deliveredAt = new Date()
      }
      if (!order.completedAt) {
        data.completedAt = new Date()
      }
    }

    const updatedOrder = await prisma.order.update({ where: { id }, data });

    if (normalizedStatus === 'completed') {
      await processAffiliateOrderCompletion(updatedOrder)
    }

    try {
      const cache = await import('../utils/cache.ts')
      cache.cacheDelete(`orders:user:${updatedOrder.userId}`)
      cache.cacheDelete('orders:admin:list')
    } catch (e) {}

    const refreshedOrder = await prisma.order.findUnique({ where: { id }, include: { user: true, items: { include: { product: true } }, review: true } });
    if (!refreshedOrder) {
      console.log(`[order] updateOrderStatus failed to refresh order id=${id}`);
      return res.status(500).json({ message: 'Unable to refresh order' });
    }

    console.log(`[order] updateOrderStatus success id=${id} normalizedStatus=${normalizedStatus}`);
    try { broadcastEvent({ type: 'order', action: 'updated', data: refreshedOrder }) } catch (e) {}
    res.json(refreshedOrder);
  } catch (error) {
    console.error('[order] updateOrderStatus error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminUpdateOrderDelivery = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { productId, deliveryInfo } = req.body;

    if (!productId || !deliveryInfo) {
      return res.status(400).json({ message: 'Missing productId or deliveryInfo' });
    }

    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await prisma.orderItem.updateMany({
      where: {
        orderId: id,
        OR: [
          { productId },
          { originalProductId: productId }
        ]
      },
      data: {
        accountDetails: deliveryInfo,
      },
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: { include: { product: true } }, review: true }
    }) as any;
    if (!updatedOrder) {
      return res.status(500).json({ message: 'Unable to refresh order' });
    }

    try {
      const cache = await import('../utils/cache.ts')
      cache.cacheDelete(`orders:user:${updatedOrder.userId}`)
      cache.cacheDelete('orders:admin:list')
    } catch (e) {}

    const allDelivered = updatedOrder.items.every((item: { accountDetails?: string | null }) => Boolean(item.accountDetails));
    const canAutoDeliver = allDelivered && !('statusManualOverride' in updatedOrder ? updatedOrder.statusManualOverride : false) && updatedOrder.status !== 'Completed' && updatedOrder.status !== 'Cancelled' && updatedOrder.status !== 'Rejected';

    if (canAutoDeliver) {
      await prisma.order.update({
        where: { id },
        data: { status: 'Delivered', deliveredAt: new Date() }
      });
    }

    const finalOrder = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: { include: { product: true } }, review: true }
    });

    try { broadcastEvent({ type: 'order', action: 'updated', data: finalOrder }) } catch (e) {}
    res.json(finalOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};



