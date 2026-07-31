import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import {
  AFFILIATE_TIERS,
  calculateAffiliateCommissionRate,
  getTierByRate,
  normalizeCommissionRate
} from '../utils/affiliateTiers.ts';
import { broadcastEvent } from '../sse.ts';

const getAffiliateTierInfo = (commissionRate: number) => {
  const normalizedRate = normalizeCommissionRate(commissionRate)
  return getTierByRate(normalizedRate)
}

const getNextTierGoal = (commissionRate: number, autoUpgradeEnabled: boolean) => {
  if (!autoUpgradeEnabled) return null
  const normalizedRate = Number(commissionRate)
  if (Number.isNaN(normalizedRate)) return null

  for (const tier of AFFILIATE_TIERS) {
    if (tier.rate > normalizedRate) {
      return tier.minPurchases
    }
  }

  return null
}

const shouldCommissionAutoUpgrade = (commissionRate: number, purchaseCount: number, existingRate?: number) => {
  if (commissionRate < 20 || commissionRate > 40) return false

  const normalizedRate = Number(commissionRate)
  if (Number.isNaN(normalizedRate)) return false

  if (typeof existingRate === 'number' && !Number.isNaN(existingRate) && normalizedRate < existingRate) {
    return false
  }

  return true
}

export async function ensureAffiliateForUser(userId: string, payoutMethod: string | null, data?: { platforms?: string[]; isContentCreator?: boolean }) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: `User ${userId}`,
      email: `${userId}@example.test`,
      passwordHash: 'dev-password',
    }
  });

  const existing = await prisma.affiliate.findUnique({ where: { userId } });
  if (existing) {
    const existingStatus = String(existing.status || '').trim().toLowerCase();
      // debug: existing affiliate found (removed noisy logging)

    // If affiliate is suspended or rejected, allow them to reapply by resetting status to Pending
    if (existingStatus === 'suspended' || existingStatus === 'rejected') {
      const updated = await prisma.affiliate.update({
        where: { userId },
        data: {
          status: 'Pending',
          updatedAt: new Date(),
          socialMediaPlatforms: data?.platforms || existing.socialMediaPlatforms || [],
          isContentCreator: data?.isContentCreator !== undefined ? data.isContentCreator : existing.isContentCreator
        },
        include: { user: true }
      });
        // debug: affiliate reapplied, updated status
      return { affiliate: updated, created: false, reapplied: true };
    }
    return { affiliate: existing, created: false };
  }

  const affiliate = await prisma.affiliate.create({
    data: { 
      userId, 
      status: 'Pending', 
      payoutMethod,
      socialMediaPlatforms: data?.platforms || [],
      isContentCreator: data?.isContentCreator || false
    } as any,
    include: { user: true }
  });

  return { affiliate, created: true };
}

// Unauthenticated debug handler to inspect request parsing
// applyAffiliateDebug removed during cleanup

export const applyAffiliate = async (req: Request, res: Response) => {
  try {
    const rawUserId = (req as any).user?.id;
    if (!rawUserId) return res.status(401).json({ message: 'Authentication required' });
    const userId = String(rawUserId);

    const { platforms, isContentCreator, payoutMethod: requestedPayoutMethod, payoutAddress: requestedPayoutAddress, paymentMethod } = (req as any).body ?? {};

    const affiliatePlatforms = Array.isArray(platforms) ? platforms : [];
    const isCreator = Boolean(isContentCreator);

    let payoutMethod: string | null = null;
    let payoutAddress: string | null = null;

    if (typeof requestedPayoutMethod === 'string' && requestedPayoutMethod.trim()) {
      payoutMethod = requestedPayoutMethod.trim();
      payoutAddress = typeof requestedPayoutAddress === 'string' && requestedPayoutAddress.trim()
        ? requestedPayoutAddress.trim()
        : null;
    } else if (paymentMethod && typeof paymentMethod === 'object') {
      if (paymentMethod.type === 'paypal' && typeof paymentMethod.paypalLink === 'string') {
        payoutMethod = 'paypal';
        payoutAddress = paymentMethod.paypalLink.trim() || null;
      } else if (paymentMethod.type === 'crypto' && typeof paymentMethod.cryptoData === 'object') {
        const pm = paymentMethod.cryptoData;
        if (typeof pm.coin === 'string' && pm.coin.trim()) {
          payoutMethod = pm.coin.trim();
          payoutAddress = typeof pm.walletAddress === 'string' && pm.walletAddress.trim()
            ? pm.walletAddress.trim()
            : null;
        }
      }
    }

    const { affiliate, created, reapplied } = await ensureAffiliateForUser(userId, payoutMethod, {
      platforms: affiliatePlatforms,
      isContentCreator: isCreator
    });
    
    if (!created) {
      try {
        broadcastEvent({ type: 'affiliate', action: 'updated', data: affiliate })
      } catch (broadcastError) {
        console.warn('[affiliate] failed to broadcast update', broadcastError)
      }
      return res.status(200).json({ affiliate, alreadyExists: true, reapplied: Boolean(reapplied) });
    }

    try {
      broadcastEvent({ type: 'affiliate', action: 'created', data: affiliate })
    } catch (broadcastError) {
      console.warn('[affiliate] failed to broadcast create', broadcastError)
    }

    return res.status(201).json({ affiliate, created: true });
  } catch (error) {
    console.error('applyAffiliate error:', error);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ message: 'Internal server error', error: String(error), stack: (error as any)?.stack });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function enrichAffiliateWithMetrics(affiliate: any) {
  const affiliateCode = typeof affiliate?.affiliateCode === 'string' ? affiliate.affiliateCode : '';

  const referredUsers = affiliateCode
    ? await prisma.user.findMany({
        where: { referralCode: affiliateCode },
        select: { id: true }
      })
    : [];

  const referredUserIds = referredUsers.map((user: any) => user.id);
  const referredOrders = referredUserIds.length
    ? await prisma.order.findMany({
        where: { userId: { in: referredUserIds }, status: { in: ['completed', 'Completed'] } },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })
    : [];

  const totalProductsByReferrals = referredOrders.reduce((sum: number, order: any) => sum + (order.items?.length ?? 0), 0);
  const totalSpentByReferrals = referredOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount ?? 0), 0);
  const purchaseEarnings = affiliate.purchases?.reduce((sum: number, purchase: any) => {
    const orderStatus = purchase.orderItem?.order?.status ?? ''
    if (typeof orderStatus !== 'string') return sum
    if (!['completed', 'Completed'].includes(orderStatus)) return sum
    return sum + Number(purchase.commissionAmount ?? 0)
  }, 0) ?? 0;
  const pendingEarnings = affiliate.purchases?.reduce((sum: number, purchase: any) => {
    if (!purchase || typeof purchase.status !== 'string') return sum;
    const orderStatus = purchase.orderItem?.order?.status ?? ''
    if (!['completed', 'Completed'].includes(orderStatus)) return sum;
    return purchase.status.toLowerCase() !== 'paid'
      ? sum + Number(purchase.commissionAmount ?? 0)
      : sum;
  }, 0) ?? 0;

  const storedEarnings = typeof affiliate.totalEarnings === 'number' ? Number(affiliate.totalEarnings) : undefined;
  const totalEarnings = storedEarnings !== undefined
    ? (storedEarnings === 0 && pendingEarnings > 0 ? pendingEarnings : storedEarnings)
    : pendingEarnings || purchaseEarnings;

  let displayRate = Number(affiliate.commissionRate ?? 20)
  // Normalize: if stored as decimal (0.2), convert to percentage (20)
  if (Number.isFinite(displayRate) && displayRate > 0 && displayRate < 1) {
    displayRate = displayRate * 100
  }
  const currentTier = getAffiliateTierInfo(displayRate)
  const nextTierGoal = getNextTierGoal(displayRate, affiliate.commissionRateAutoUpgradeEnabled !== false)
  const currentTierRate = currentTier?.rate ?? AFFILIATE_TIERS[0]?.rate ?? 20

  return {
    ...affiliate,
    totalReferrals: referredUsers.length,
    totalSales: totalProductsByReferrals,
    totalProductsByReferrals,
    totalSpentByReferrals,
    totalReferralPurchases: totalProductsByReferrals,
    totalEarnings,
    currentTier: AFFILIATE_TIERS.findIndex((tier) => tier.rate === currentTierRate),
    nextTierGoal,
  };
}

export const getAffiliateDashboard = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id);
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        user: true,
        purchases: {
          include: {
            orderItem: {
              include: {
                product: true,
                order: true
              }
            }
          }
        }
      }
    });
    if (!affiliate) return res.status(204).end()

    const enrichedAffiliate = await enrichAffiliateWithMetrics(affiliate);
    res.json(enrichedAffiliate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminListAffiliates = async (req: Request, res: Response) => {
  try {
    const affiliates = await prisma.affiliate.findMany({
      include: {
        user: true,
        purchases: {
          include: {
            orderItem: {
              include: {
                product: true,
                order: true
              }
            }
          }
        }
      }
    });

    const list = await Promise.all(affiliates.map((affiliate: any) => enrichAffiliateWithMetrics(affiliate)));
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function normalizeAffiliateStatus(value: any): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined

  const map: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Accepted',
    active: 'Accepted',
    rejected: 'Rejected',
    suspended: 'Suspended'
  }

  return map[normalized] ?? value
}

function parseCommissionRateInput(value: any): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  return undefined
}

function getAffiliateUpdatePayload(body: any) {
  const payload: any = {}

  if (typeof body.payoutMethod === 'string') {
    payload.payoutMethod = body.payoutMethod
  }

  if (typeof body.payoutAddress === 'string') {
    payload.payoutAddress = body.payoutAddress
  }

  if (body.paymentMethod && typeof body.paymentMethod === 'object') {
    const pm = body.paymentMethod
    if (pm.type === 'paypal' && typeof pm.paypalLink === 'string') {
      payload.payoutMethod = 'paypal'
      payload.payoutAddress = pm.paypalLink
    } else if (pm.type === 'crypto' && pm.cryptoData && typeof pm.cryptoData.coin === 'string' && typeof pm.cryptoData.walletAddress === 'string') {
      payload.payoutMethod = pm.cryptoData.coin
      payload.payoutAddress = pm.cryptoData.walletAddress
    }
  }

  if (typeof body.status === 'string') {
    const normalizedStatus = normalizeAffiliateStatus(body.status)
    if (normalizedStatus) {
      payload.status = normalizedStatus
    }
  }

  const commissionRateInput = parseCommissionRateInput(body.commissionRate)
  if (typeof commissionRateInput === 'number') {
    const normalized = commissionRateInput > 0 && commissionRateInput < 1
      ? commissionRateInput * 100
      : commissionRateInput
    payload.commissionRate = normalized
    console.log('[getAffiliateUpdatePayload] commissionRate: input=', commissionRateInput, 'normalized=', normalized)
  }

  if (typeof body.commissionRateAutoUpgradeEnabled === 'boolean') {
    payload.commissionRateAutoUpgradeEnabled = body.commissionRateAutoUpgradeEnabled
  }

  return payload
}

export const updateMyAffiliate = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id)
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const existing = await prisma.affiliate.findUnique({ where: { userId } })
    const purchaseCount = await prisma.affiliatePurchase.count({ where: { affiliateId: userId } })
    const data = getAffiliateUpdatePayload(req.body)

    if (typeof data.commissionRate === 'number') {
      // Normalize the commission rate before processing
      data.commissionRate = normalizeCommissionRate(data.commissionRate)
      const existingRate = normalizeCommissionRate(existing?.commissionRate)
      
      console.log('[affiliate updateMyAffiliate] existingRate=', existingRate,
        'inputRate=', data.commissionRate,
        'purchaseCount=', purchaseCount)
      // Only recompute auto-upgrade flag if not explicitly provided in request
      if (typeof data.commissionRateAutoUpgradeEnabled !== 'boolean') {
        data.commissionRateAutoUpgradeEnabled = shouldCommissionAutoUpgrade(
          data.commissionRate,
          purchaseCount,
          existingRate
        )
        console.log('[affiliate updateMyAffiliate] computed commissionRateAutoUpgradeEnabled=', data.commissionRateAutoUpgradeEnabled)
      } else {
        console.log('[affiliate updateMyAffiliate] using explicitly provided commissionRateAutoUpgradeEnabled=', data.commissionRateAutoUpgradeEnabled)
      }
    }

    if (!existing) {
      const createData: any = {
        userId,
        status: typeof data.status === 'string' ? data.status : 'Pending',
      }

      if (typeof data.payoutMethod === 'string') {
        createData.payoutMethod = data.payoutMethod
      }

      if (typeof data.payoutAddress === 'string') {
        createData.payoutAddress = data.payoutAddress
      }

      if (typeof data.commissionRate === 'number') {
        createData.commissionRate = normalizeCommissionRate(data.commissionRate)
      }

      if (typeof data.commissionRateAutoUpgradeEnabled === 'boolean') {
        createData.commissionRateAutoUpgradeEnabled = data.commissionRateAutoUpgradeEnabled
      }

      const created = await prisma.affiliate.create({
        data: createData,
        include: { user: true, purchases: true }
      })
      try {
        broadcastEvent({ type: 'affiliate', action: 'created', data: created })
      } catch (broadcastError) {
        console.warn('[affiliate] failed to broadcast create', broadcastError)
      }
      return res.status(201).json(created)
    }

    const updated = await prisma.affiliate.update({
      where: { userId },
      data,
      include: { user: true, purchases: true }
    })

    try {
      broadcastEvent({ type: 'affiliate', action: 'updated', data: updated })
    } catch (broadcastError) {
      console.warn('[affiliate] failed to broadcast update', broadcastError)
    }
    
    console.log('[affiliate updateMyAffiliate] AFTER DB UPDATE: commissionRate=', updated.commissionRate, 'commissionRateAutoUpgradeEnabled=', updated.commissionRateAutoUpgradeEnabled)
    res.json(updated)
  } catch (error) {
    console.error('updateMyAffiliate error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const adminUpdateAffiliate = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const existing = await prisma.affiliate.findUnique({ where: { userId } });
    const purchaseCount = await prisma.affiliatePurchase.count({ where: { affiliateId: userId } });
    const data = getAffiliateUpdatePayload(req.body);

    // If admin explicitly enables auto-upgrade (check raw request body too), resolve the stored commissionRate
    // according to current sales and the admin-provided value per specification.
    const explicitlyEnabled = (typeof data.commissionRateAutoUpgradeEnabled === 'boolean' && data.commissionRateAutoUpgradeEnabled === true)
      || (req.body && req.body.commissionRateAutoUpgradeEnabled === true);
    if (explicitlyEnabled) {
      // Determine the base rate (admin-provided or existing)
      const baseRate = typeof data.commissionRate === 'number'
        ? normalizeCommissionRate(data.commissionRate)
        : normalizeCommissionRate(existing?.commissionRate);

      const salesTierRate = calculateAffiliateCommissionRate(purchaseCount);
      console.log('[affiliate adminUpdateAffiliate] enabling auto-upgrade request:', { userId, purchaseCount, baseRate, salesTierRate, providedCommissionRate: data.commissionRate, reqBodyFlag: req.body?.commissionRateAutoUpgradeEnabled })

      // Case: admin-set outside normal tier range -> enable restores to tier based on sales
      if (baseRate < 20 || baseRate > 40) {
        // Admin set an out-of-range value (e.g. 100). Per spec, enabling auto-upgrade restores tier based on sales.
        console.log('[affiliate adminUpdateAffiliate] baseRate out-of-range -> restoring to sales tier')
        data.commissionRate = salesTierRate;
      } else {
        // baseRate is within [20,40]
        const existingRate = normalizeCommissionRate(existing?.commissionRate);
        if (baseRate < existingRate) {
          // admin lowered rate below previous: enabling restores normal tier based on sales
          data.commissionRate = salesTierRate;
        } else {
          // admin increased rate above previous: keep admin-set value until sales exceed it
          // If sales already qualify for a higher tier than admin-set, move to that tier
          if (salesTierRate > baseRate) {
            data.commissionRate = salesTierRate;
          } else {
            data.commissionRate = baseRate;
          }
        }
      }
      // ensure flag is true in payload
      data.commissionRateAutoUpgradeEnabled = true;
      console.log('[affiliate adminUpdateAffiliate] enabling auto-upgrade resolved commissionRate=', data.commissionRate, 'salesTierRate=', salesTierRate, 'baseRate=', baseRate)
    }

    if (typeof data.commissionRate === 'number') {
      // Normalize the commission rate before processing
      data.commissionRate = normalizeCommissionRate(data.commissionRate)
      const existingRate = normalizeCommissionRate(existing?.commissionRate)
      
      console.log('[affiliate adminUpdateAffiliate] existingRate=', existingRate,
        'inputRate=', data.commissionRate,
        'purchaseCount=', purchaseCount)
      // Only recompute auto-upgrade flag if not explicitly provided in request
      if (typeof data.commissionRateAutoUpgradeEnabled !== 'boolean') {
        data.commissionRateAutoUpgradeEnabled = shouldCommissionAutoUpgrade(
          data.commissionRate,
          purchaseCount,
          existingRate
        );
        console.log('[affiliate adminUpdateAffiliate] computed commissionRateAutoUpgradeEnabled=', data.commissionRateAutoUpgradeEnabled)
      } else {
        console.log('[affiliate adminUpdateAffiliate] using explicitly provided commissionRateAutoUpgradeEnabled=', data.commissionRateAutoUpgradeEnabled)
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid affiliate update fields provided' });
    }

    if (!existing) {
      const createData: any = {
        userId,
        status: typeof data.status === 'string' ? data.status : 'Pending',
      };

      if (typeof data.payoutMethod === 'string') {
        createData.payoutMethod = data.payoutMethod;
      }

      if (typeof data.payoutAddress === 'string') {
        createData.payoutAddress = data.payoutAddress;
      }

      if (typeof data.commissionRate === 'number') {
        createData.commissionRate = data.commissionRate;
      }

      if (typeof data.commissionRateAutoUpgradeEnabled === 'boolean') {
        createData.commissionRateAutoUpgradeEnabled = data.commissionRateAutoUpgradeEnabled;
      }

      const created = await prisma.affiliate.create({ data: createData });
      try {
        broadcastEvent({ type: 'affiliate', action: 'created', data: created })
      } catch (broadcastError) {
        console.warn('[affiliate] failed to broadcast create', broadcastError)
      }
      return res.status(201).json(created);
    }

    const updated = await prisma.affiliate.update({ where: { userId }, data });
    try {
      broadcastEvent({ type: 'affiliate', action: 'updated', data: updated })
    } catch (broadcastError) {
      console.warn('[affiliate] failed to broadcast update', broadcastError)
    }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const adminPayAffiliate = async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const purchases = await prisma.affiliatePurchase.findMany({ where: { affiliateId: userId, status: 'Pending' } });
    if (purchases.length) {
      await prisma.$transaction(purchases.map((p: any) => prisma.affiliatePurchase.update({ where: { id: p.id }, data: { status: 'Paid' } })));
    }
    await prisma.affiliate.update({ where: { userId }, data: { totalEarnings: 0 } });
    res.json({ message: 'Paid' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};




