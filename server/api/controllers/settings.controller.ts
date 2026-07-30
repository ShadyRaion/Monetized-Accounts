import { type Request, type Response } from 'express';
import prisma from '../utils/prisma.ts';
import { broadcastEvent } from '../sse.ts';
import { storageBucket, getSupabaseClient } from '../utils/supabase.ts';

const safeJsonParse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn('[settings] safeJsonParse failed:', error)
    return fallback
  }
}

export const getSettings = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'settings:singleton'
    try {
      const cached = (await import('../utils/cache.ts')).cacheGet<any>(cacheKey)
      if (cached) return res.json(cached)
    } catch (err) { /* ignore cache errors */ }
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!s) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json({
      storeName: s.siteName,
      storeDescription: s.description,
      primaryColor: s.themeColor,
      storePhone: s.phone || '',
      storeEmail: s.email || '',
      storeDiscordLink: s.discordLink || '',
      logoUrl: s.logoUrl || null,
      faviconUrl: s.faviconUrl || null,
      paymentSettings: safeJsonParse<any>(s.paymentMethods, undefined),
      faqs: safeJsonParse<any[]>(s.faq, []),
    });
    try {
      (await import('../utils/cache.ts')).cacheSet(cacheKey, {
        storeName: s.siteName,
        storeDescription: s.description,
        primaryColor: s.themeColor,
        storePhone: s.phone || '',
        storeEmail: s.email || '',
        storeDiscordLink: s.discordLink || '',
        logoUrl: s.logoUrl || null,
        faviconUrl: s.faviconUrl || null,
        paymentSettings: safeJsonParse<any>(s.paymentMethods, undefined),
        faqs: safeJsonParse<any[]>(s.faq, []),
      }, 10000)
    } catch (err) { /* ignore cache errors */ }
  } catch (error) {
    console.error('[settings] getSettings error', error)
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const uploadImage = async (req: any, res: Response) => {
  try {
    const kind = typeof req.query?.kind === 'string' ? req.query.kind : (req.body?.kind || 'asset')
    let buffer: Buffer | undefined
    let mimeType = 'image/png'

    console.log('[uploadImage] kind:', kind, 'bodyType:', typeof req.body, 'isBuffer:', Buffer.isBuffer(req.body))

    if (typeof req.body === 'string' && req.body.startsWith('data:image/')) {
      const match = req.body.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) {
        return res.status(400).json({ message: 'Invalid image data format' })
      }
      mimeType = match[1] || 'image/png'
      buffer = Buffer.from(match[2] || '', 'base64')
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body
      const contentType = req.headers['content-type']
      const resolvedContentType = typeof contentType === 'string' && contentType ? contentType.split(';')[0] : 'image/png'
      mimeType = resolvedContentType || 'image/png'
      if (buffer) {
        console.log('[uploadImage] received buffer, size:', buffer.length, 'contentType:', contentType)
      }
    } else if (req.body && typeof req.body === 'object' && typeof req.body.image === 'string') {
      const image = req.body.image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Invalid image data' })
      }

      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) {
        return res.status(400).json({ message: 'Invalid image data format' })
      }

      mimeType = match[1] || 'image/png'
      buffer = Buffer.from(match[2] || '', 'base64')
    } else {
      console.log('[uploadImage] unrecognized body format')
      return res.status(400).json({ message: 'Invalid image data' })
    }

    if (!buffer || buffer.length === 0) {
      console.log('[uploadImage] empty buffer')
      return res.status(400).json({ message: 'Invalid image data' })
    }

    const extension = mimeType === 'image/svg+xml' ? 'svg' : (mimeType.split('/')[1] || 'png')
    const fileName = `${kind || 'asset'}-${Date.now()}-${Math.round(Math.random() * 10000)}.${extension}`
    const supabase = getSupabaseClient()
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(fileName, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) {
      console.error('[settings] Supabase Storage upload error', uploadError)
      return res.status(502).json({ message: 'Failed to upload image to Supabase Storage' })
    }

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(fileName)
    res.json({ url: data.publicUrl })
  } catch (error) {
    console.error('[settings] upload image error', error)
    res.status(500).json({ message: 'Failed to upload image' })
  }
}

export const updateSettings = async (req: any, res: Response) => {
  try {
    // Log raw request body for debugging parse issues
    try {
      console.log('[settings] rawBody:', req.rawBody)
    } catch (e) {
      // ignore
    }
    const data = req.body;
    console.log('[settings] parsed body:', data)
    const updateData: any = {}

    if (data.storeName !== undefined) updateData.siteName = data.storeName
    if (data.storeDescription !== undefined) updateData.description = data.storeDescription
    if (data.primaryColor !== undefined) updateData.themeColor = data.primaryColor
    if (data.storePhone !== undefined) updateData.phone = data.storePhone
    if (data.storeEmail !== undefined) updateData.email = data.storeEmail
    if (data.storeDiscordLink !== undefined) updateData.discordLink = data.storeDiscordLink
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null
    if (data.faviconUrl !== undefined) updateData.faviconUrl = data.faviconUrl || null
    if (data.paymentSettings !== undefined) updateData.paymentMethods = JSON.stringify(data.paymentSettings)
    if (data.faqs !== undefined) updateData.faq = JSON.stringify(data.faqs)

    const updated = await prisma.settings.update({ where: { id: 1 }, data: updateData })

    const payload = {
      storeName: updated.siteName,
      storeDescription: updated.description,
      primaryColor: updated.themeColor,
      storePhone: updated.phone || '',
      storeEmail: updated.email || '',
      storeDiscordLink: updated.discordLink || '',
      logoUrl: updated.logoUrl || null,
      faviconUrl: updated.faviconUrl || null,
      paymentSettings: updated.paymentMethods ? JSON.parse(updated.paymentMethods) : undefined,
      faqs: updated.faq ? JSON.parse(updated.faq) : [],
    }

    try {
      broadcastEvent({ type: 'settings', action: 'updated', data: payload })
    } catch (broadcastError) {
      console.warn('[settings] failed to broadcast update', broadcastError)
    }
    try {
      const cache = await import('../utils/cache.ts')
      cache.cacheDelete('settings:singleton')
    } catch (e) {}

    res.json(payload)
  } catch (error) {
    console.error('[settings] update error', error)
    res.status(500).json({ message: 'Internal server error' });
  }
}

export default {};



