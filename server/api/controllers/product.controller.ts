import { Prisma } from '@prisma/client';
import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import { broadcastEvent } from '../sse.ts';

export const previewProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ take: 4, orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    const message = String((error as any)?.message || error);
    // If Prisma isn't initialized (no DB), return an empty list so frontend can still load
    if (message.includes('PrismaClientInitializationError') || message.includes('Error validating datasource') || message.includes('P1000')) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const listProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    console.error('listProducts error:', error);
    res.status(500).json({ message: 'Internal server error', error: String((error as any)?.message || error) });
  }
}

export const getProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    console.log('getProduct called with id:', id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.log('getProduct: Product not found for id:', id);
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('getProduct: Returning product:', JSON.stringify(product, null, 2));
    res.json(product);
  } catch (error) {
    console.error('getProduct error:', error);
    const message = String((error as any)?.message || error);
    if (message.includes('PrismaClientInitializationError') || message.includes('Error validating datasource') || message.includes('P1000')) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
}

function parseFollowersValue(value: any): number {
  if (value === undefined || value === null || value === "") return 0

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase().replace(/\+/g, "").replace(/,/g, "")
    const match = normalized.match(/^([0-9]*\.?[0-9]+)\s*([KM]?)$/)
    if (!match) {
      const parsed = parseInt(normalized, 10)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const [, parsedNumber = "0", suffix] = match
    const numberPortion = parseFloat(parsedNumber)
    if (!Number.isFinite(numberPortion)) return 0

    if (suffix === "K") return Math.round(numberPortion * 1000)
    if (suffix === "M") return Math.round(numberPortion * 1000000)
    return Math.round(numberPortion)
  }

  return 0
}

function normalizeFeatures(value: any) {
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function buildProductData(body: any) {
  const {
    platform,
    type,
    followers,
    hasVerificationFee,
    verificationPrice,
    price,
    description,
    features,
    badge,
    transferTime,
    inStock
  } = body

  const data: any = {}

  if (platform !== undefined) data.platform = platform
  if (type !== undefined) data.type = type
  if (followers !== undefined) {
    const parsed = parseFollowersValue(followers)
    data.followers = Number.isFinite(parsed) ? Math.round(parsed) : 0
    if (!Number.isFinite(parsed)) console.warn('buildProductData: followers parsed to non-finite', followers, parsed)
  }

  if (verificationPrice !== undefined) {
    const parsedPrice = Number(verificationPrice || 0)
    data.verificationPrice = Number.isFinite(parsedPrice) ? parsedPrice : 0
    data.hasVerificationFee = (data.verificationPrice ?? 0) > 0
  } else if (hasVerificationFee !== undefined) {
    data.hasVerificationFee = Boolean(hasVerificationFee)
    data.verificationPrice = data.hasVerificationFee ? 30 : 0
  }

  if (price !== undefined) data.price = Number(price || 0)
  if (description !== undefined) data.description = description || null
  if (features !== undefined) data.features = normalizeFeatures(features)
  if (badge !== undefined) data.badge = badge || null
  if (transferTime !== undefined) data.transferTime = transferTime
  if (inStock !== undefined) {
    data.inStock = Boolean(inStock)
  }

  // Final safety: ensure followers is a finite integer before sending to Prisma
  if (data.followers !== undefined && !Number.isFinite(data.followers)) {
    console.warn('buildProductData: removing invalid followers value', data.followers)
    delete data.followers
  }

  return data
}

export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = buildProductData(req.body)
    const product = await prisma.product.create({ data })
    try {
      broadcastEvent({ type: 'product', action: 'created', data: product })
    } catch (broadcastError) {
      console.warn('[product] failed to broadcast create', broadcastError)
    }
    res.status(201).json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    console.log('updateProduct request', { id, body: req.body })
    const data = buildProductData(req.body)
    console.log('updateProduct data', data)
    const product = await prisma.product.update({ where: { id }, data })
    try {
      broadcastEvent({ type: 'product', action: 'updated', data: product })
    } catch (broadcastError) {
      console.warn('[product] failed to broadcast update', broadcastError)
    }
    res.json(product)
  } catch (error: any) {
    console.error('updateProduct error:', error)
    res.status(500).json({ message: 'Internal server error', details: error?.message || 'unknown' })
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    console.log('deleteProduct called with id:', id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.log('deleteProduct: Product not found for id:', id);
      return res.status(404).json({ message: 'Product not found' });
    }

    const [orderItemCount, favoriteCount, cartItemCount] = await prisma.$transaction([
      prisma.orderItem.count({ where: { productId: id } }),
      prisma.favorite.count({ where: { productId: id } }),
      prisma.cartItem.count({ where: { productId: id } }),
    ]);

    console.log('deleteProduct reference counts', { id, orderItemCount, favoriteCount, cartItemCount });

    if (orderItemCount > 0) {
      console.log('deleteProduct blocked: product is referenced by order items', { orderItemCount });
      return res.status(400).json({
        message: `Cannot delete product because it is referenced by ${orderItemCount} existing order item(s).`,
      });
    }

    if (favoriteCount > 0 || cartItemCount > 0) {
      console.log('deleteProduct blocked: product is referenced by favorites/cart items', { favoriteCount, cartItemCount });
      return res.status(400).json({
        message: `Cannot delete product because it is referenced by ${favoriteCount} favorite(s) and ${cartItemCount} cart item(s).`,
      });
    }

    console.log('deleteProduct deleting product id:', id);
    await prisma.product.delete({ where: { id } });
    try {
      broadcastEvent({ type: 'product', action: 'deleted', data: { id } })
    } catch (broadcastError) {
      console.warn('[product] failed to broadcast delete', broadcastError)
    }
    return res.json({ message: 'Deleted' });
  } catch (error: unknown) {
    console.error('deleteProduct error:', error);

    const errorMessage = String(error);
    const isPrismaConstraintError =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2003';

    if (
      errorMessage.includes('OrderItem_productId_fkey') ||
      errorMessage.includes('violates RESTRICT setting of foreign key constraint') ||
      isPrismaConstraintError
    ) {
      return res.status(400).json({
        message: 'Cannot delete product because it is referenced by existing order items.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};



