export type ShopTypeCard = {
  id: string
  title: string
  description: string
  aliases: string[]
}

export const SHOP_TYPE_CARDS: ShopTypeCard[] = [
  {
    id: 'tiktok-monetized',
    title: 'Tiktok Monetized',
    description: 'Monetized TikTok accounts that have Creator Rewards Program (CRP) enabled.',
    aliases: ['tiktok monetized', 'monetized tiktok']
  },
  {
    id: 'tiktok-shop',
    title: 'Tiktok Shop (Seller)',
    description: 'Monetized TikTok accounts that have TikTok Shop for seller enabled.',
    aliases: ['tiktok shop', 'tiktok shop (seller)', 'us tiktok shop', 'uk tiktok shop']
  },
  {
    id: 'shop-affiliate',
    title: 'Tiktok Shop (Creator)',
    description: 'Monetized TikTok accounts that have TikTok Shop for creator enabled.',
    aliases: ['shop affiliate', 'tiktok shop (creator)', 'us shop affiliate', 'uk shop affiliate']
  },
  {
    id: 'non-tts-affiliate',
    title: 'Non-TTS/Affiliate',
    description: 'TikTok accounts that have link in bio enabled and live access.',
    aliases: ['non-tts/affiliate', 'non-tts affiliate', 'non-tts-affiliate']
  },
  {
    id: 'youtube-monetized',
    title: 'Youtube Monetized',
    description: 'Monetized YouTube channels with monetization already enabled.',
    aliases: ['youtube monetized', 'you tube monetized']
  },
  {
    id: 'aged-youtube',
    title: 'Aged Youtube',
    description: 'Older aged YouTube channels with historical account activity.',
    aliases: ['aged youtube', 'youtube aged', 'you tube aged']
  }
]

export function normalizeShopProductType(type: string | undefined | null): string {
  const value = String(type ?? '').trim().toLowerCase()

  if (!value) {
    return ''
  }

  const normalized = value
    .replace(/you\s*tube/gi, 'youtube')
    .replace(/tiktok/gi, 'tiktok')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized === 'tiktok monetized' || normalized === 'monetized tiktok') {
    return 'Tiktok Monetized'
  }

  if (normalized === 'tiktok shop' || normalized === 'tiktok shop (seller)' || normalized === 'us tiktok shop' || normalized === 'uk tiktok shop') {
    return 'Tiktok Shop (Seller)'
  }

  if (normalized === 'shop affiliate' || normalized === 'tiktok shop (creator)' || normalized === 'us shop affiliate' || normalized === 'uk shop affiliate') {
    return 'Tiktok Shop (Creator)'
  }

  if (normalized === 'non-tts/affiliate' || normalized === 'non-tts affiliate' || normalized === 'non-tts-affiliate') {
    return 'Non-TTS/Affiliate'
  }

  if (normalized === 'youtube monetized' || normalized === 'you tube monetized') {
    return 'Youtube Monetized'
  }

  if (normalized === 'aged youtube' || normalized === 'youtube aged' || normalized === 'you tube aged') {
    return 'Aged Youtube'
  }

  return type ?? ''
}

export function getShopTypeIdForProductType(type: string | undefined | null): string | undefined {
  const normalized = normalizeShopProductType(type)

  const card = SHOP_TYPE_CARDS.find((shopType) => {
    return shopType.aliases.some((alias) => {
      return normalizeShopProductType(alias) === normalized
    })
  })

  return card?.id
}
