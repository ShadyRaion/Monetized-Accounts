import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import { broadcastEvent } from '../sse.ts';
import { cacheDeletePrefix, cacheGet, cacheSet } from '../utils/cache.ts';

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

const normalizeReviewStatus = (value?: unknown): 'pending' | 'approved' | 'rejected' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'rejected' || normalized === 'pending') {
    return normalized;
  }
  return undefined;
}

export const createReview = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { orderId, rating, comment, anonymous, displayName, status } = req.body;
    if (!rating) return res.status(400).json({ message: 'Missing fields' });

    let reviewUserId = userId;
    let order = null;
    let reviewOrderId = orderId;
    if (orderId) {
      order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (req.user.role !== 'ADMIN' && order.userId !== userId) return res.status(403).json({ message: 'Invalid order' });
      if (req.user.role !== 'ADMIN' && String(order.status || '').toLowerCase() !== 'completed') return res.status(400).json({ message: 'Order not completed yet' });

      reviewUserId = req.user.role === 'ADMIN' ? order.userId : userId;
    } else if (req.user.role !== 'ADMIN') {
      return res.status(400).json({ message: 'Missing orderId for customer review' });
    }

    const requestedStatus = normalizeReviewStatus(status);
    const displayValue = displayName || (anonymous ? maskAnonymousName(req.user.name || 'Anonymous') : req.user.name || 'Anonymous')
    const reviewData: any = {
      userId: reviewUserId,
      rating: Number(rating),
      comment: comment || '',
      displayName: displayValue,
      anonymous: Boolean(anonymous),
      status: req.user.role === 'ADMIN' ? (requestedStatus || 'approved') : 'pending'
    };

    if (reviewOrderId) {
      reviewData.orderId = reviewOrderId;
    }

    const review = await prisma.review.create({
      data: reviewData,
      include: {
        user: { select: { id: true, name: true } },
        order: { include: { items: { include: { product: true } } } },
      },
    });
    try {
      broadcastEvent({ type: 'review', action: 'created', data: review })
    } catch (broadcastError) {
      console.warn('[review] failed to broadcast create', broadcastError)
    }
    try {
      cacheDeletePrefix('reviews:')
    } catch (e) {}
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const listReviews = async (req: Request, res: Response) => {
  try {
    const cacheKey = `reviews:${String(req.query.productId || '')}`
    const cached = cacheGet<any[]>(cacheKey)
    if (cached) {
      return res.json(cached)
    }
    const productId = req.query.productId as string | undefined;
    const reviews = await prisma.review.findMany({
      where: productId ? { order: { items: { some: { productId } } } } : {},
      include: {
        user: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            items: {
              include: { product: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    cacheSet(cacheKey, reviews, 5000)
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const updateReview = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, status, orderId } = req.body;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData: any = {}
    const normalizedStatus = normalizeReviewStatus(status)
    if (rating !== undefined) updateData.rating = Number(rating)
    if (comment !== undefined) updateData.comment = comment
    if (orderId !== undefined && req.user.role === 'ADMIN') updateData.orderId = orderId
    if (normalizedStatus !== undefined && req.user.role === 'ADMIN') updateData.status = normalizedStatus

    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        order: { include: { items: { include: { product: true } } } },
      },
    });

    try {
      broadcastEvent({ type: 'review', action: 'updated', data: updatedReview })
    } catch (broadcastError) {
      console.warn('[review] failed to broadcast update', broadcastError)
    }
    try {
      cacheDeletePrefix('reviews:')
    } catch (e) {}

    res.json(updatedReview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const deleteReview = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await prisma.review.delete({ where: { id } });
    try {
      broadcastEvent({ type: 'review', action: 'deleted', data: { id } })
    } catch (broadcastError) {
      console.warn('[review] failed to broadcast delete', broadcastError)
    }
    try {
      cacheDeletePrefix('reviews:')
    } catch (e) {}
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};



