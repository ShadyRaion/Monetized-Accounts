export interface VariantLike {
  id: string
  platform: string
  type: string
  region?: "US" | "UK"
  followers: string
}

export interface VariantSelectionState {
  region: "all" | "US" | "UK"
  followers: string
}

export interface VariantSelectionResult<T extends VariantLike> {
  activeVariant: T | null
  variants: T[]
  availableRegions: Array<"US" | "UK">
  availableFollowers: string[]
}

export function getVariantSelection<T extends VariantLike>(
  items: T[],
  baseVariant: T,
  selection: VariantSelectionState
): VariantSelectionResult<T> {
  const sameTypeVariants = items.filter((item) => item.platform === baseVariant.platform && item.type === baseVariant.type)
  const availableRegions = Array.from(new Set(sameTypeVariants.map((item) => item.region).filter((region): region is "US" | "UK" => Boolean(region))))
  const normalizedRegion = selection.region === "all" ? undefined : selection.region
  const normalizedFollowers = selection.followers === "all" ? undefined : selection.followers

  const availableFollowers = Array.from(new Set(
    sameTypeVariants
      .filter((item) => !normalizedRegion || item.region === normalizedRegion)
      .map((item) => item.followers)
  )).sort((left, right) => {
    const leftNumber = Number(left.replace(/[^0-9]/g, "")) || 0
    const rightNumber = Number(right.replace(/[^0-9]/g, "")) || 0
    return leftNumber - rightNumber
  })

  const matches = sameTypeVariants.filter((item) => {
    const regionMatches = !normalizedRegion || item.region === normalizedRegion || (!item.region && normalizedRegion === undefined)
    const followersMatches = !normalizedFollowers || item.followers === normalizedFollowers
    return regionMatches && followersMatches
  })

  const variants = matches.length > 0 ? matches : sameTypeVariants
  const activeVariant = (() => {
    if (normalizedFollowers !== undefined) {
      const preferred = variants.find((item) => {
        const regionMatch = !normalizedRegion || item.region === normalizedRegion
        return regionMatch && item.followers === normalizedFollowers
      })
      if (preferred) return preferred
    }

    if (normalizedRegion !== undefined) {
      const preferred = variants.find((item) => item.region === normalizedRegion && item.id === baseVariant.id)
      if (preferred) return preferred
    }

    return variants.find((item) => item.id === baseVariant.id) ?? variants[0] ?? baseVariant
  })()

  return {
    activeVariant,
    variants,
    availableRegions,
    availableFollowers
  }
}
