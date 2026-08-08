export function formatFollowersLabel(followers: number) {
  if (followers >= 1000000) {
    const m = followers / 1000000
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`
  }

  if (followers >= 1000) {
    const k = followers / 1000
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`
  }

  return `${followers}`
}

function getRegionLabel(region?: string) {
  if (!region) return "Global"
  if (region.toUpperCase() === "US") return "American"
  if (region.toUpperCase() === "UK") return "UK"
  return region
}

function getRegionDescription(region?: string) {
  if (!region) return "global audience"
  return `${region.toUpperCase()} region`
}

function normalizeType(type: string) {
  return type.trim().toLowerCase()
}

export function buildProductMetadata(product: { platform: string; region?: string; type: string; followers: number }) {
  const followerLabel = formatFollowersLabel(product.followers)
  const followerText = product.followers >= 1000 ? `over ${followerLabel}` : `${followerLabel}`
  const platform = product.platform?.trim().toLowerCase() || ""
  const regionLabel = getRegionLabel(product.region)
  const regionDescription = getRegionDescription(product.region)
  const typeKey = normalizeType(product.type)

  if (typeKey.includes("tiktok shop") || typeKey.includes("shop affiliate") || typeKey.includes("tiktok shop (seller)") || typeKey.includes("tiktok shop (creator)") || typeKey.includes("tiktok monetized") || typeKey.includes("non-tts/affiliate")) {
    const regionPrefix = product.region?.toUpperCase() === "UK" ? "UK" : product.region?.toUpperCase() === "US" ? "US" : regionLabel
    const regionPhrase = product.region ? `${regionPrefix} TikTok` : "TikTok"

    const isSellerType = typeKey.includes("tiktok shop (seller)") || (typeKey.includes("tiktok shop") && !typeKey.includes("creator") && !typeKey.includes("shop affiliate"))
    const isCreatorType = typeKey.includes("tiktok shop (creator)") || typeKey.includes("shop affiliate")

    if (isSellerType) {
      return {
        description: `${regionPhrase} Shop seller account with ${followerText} real, 100% organic followers. Optimized for shop sellers who want a ready-made storefront, LIVE shopping, and direct conversion traffic.`,
        features: [
          'Tiktok Shop for Sellers enabled',
          'CRP enabled',
          `${product.region ? `${product.region} region` : 'US region'}`,
          '100% organic followers'
        ]
      }
    }

    if (isCreatorType) {
      return {
        description: `${regionPhrase} Shop Affiliate creator account with ${followerText} real, organic followers. Built for affiliate promotion and product discovery through a creator sales funnel.`,
        features: [
          'Tiktok Shop for Creators enabled',
          'CRP enabled',
          `${product.region ? `${product.region} region` : 'US region'}`,
          '100% organic followers'
        ]
      }
    }

    if (typeKey.includes("tiktok monetized") || typeKey.includes("monetized tiktok")) {
      return {
        description: `${regionPhrase} pre-monetized TikTok creator account with ${followerText} real followers. Creator Rewards is enabled so you can start earning from your first upload and grow revenue immediately.`,
        features: [
          'CRP enabled',
          'Ready-To-Post account',
          'Earn on your 1st video',
          '100% organic followers'
        ]
      }
    }

    if (typeKey.includes("non-tts") || typeKey.includes("affiliate")) {
      return {
        description: `${regionPhrase} TikTok affiliate creator account with ${followerText} real followers. Perfect for adding affiliate links in bio, hosting lives, and monetizing content through sponsorships and direct conversions.`,
        features: [
          'Affiliate link in bio',
          'LIVE access',
          '100% organic followers'
        ]
      }
    }
  }

  if (typeKey.includes("youtube monetized") || typeKey.includes("monetized youtube")) {
    return {
      description: `Pre-monetized YouTube channel with ${followerText} subscribers and Partner Program enabled. Ad revenue is unlocked and the channel is ready to earn instantly.`,
      features: [
        'YouTube Partner Program enabled',
        `${followerLabel}+ subscribers`,
        'Ad revenue ready',
        'Clean channel standing',
        'Upload-ready',
        'Original email included'
      ]
    }
  }

  if (typeKey.includes("youtube aged") || typeKey.includes("aged youtube") || typeKey.includes("youtube aged")) {
    return {
      description: `Aged YouTube channel with established history and clean standing. This AED-style channel is ideal for creators who want a trusted foundation for new growth and future monetization.`,
      features: [
        'Aged channel',
        'Clean history',
        'Monetization eligible',
        'Upload-ready',
        'Original email included'
      ]
    }
  }

  return {
    description: `Established ${product.type} account with ${followerText} real followers, ready to be customized and monetized for your niche.`,
    features: [
      `${regionDescription} audience`,
      '100% organic followers',
      'Ready for transfer',
      'Original email included'
    ]
  }
}
