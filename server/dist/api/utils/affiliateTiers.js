/**
 * Shared affiliate tier and commission calculation logic
 * Used across multiple controllers to maintain consistency
 */
export const AFFILIATE_TIERS = [
    { rate: 20, minPurchases: 0 },
    { rate: 25, minPurchases: 10 },
    { rate: 30, minPurchases: 25 },
    { rate: 35, minPurchases: 50 },
    { rate: 40, minPurchases: 100 }
];
/**
 * Normalize commission rate to percentage (0-100)
 * Handles decimal (0.2) or percentage (20) formats
 */
export const normalizeCommissionRate = (rate) => {
    const parsed = Number(rate ?? 20);
    if (!Number.isFinite(parsed))
        return 20;
    // If between 0-1, it's a decimal (0.2), convert to percentage (20)
    if (parsed > 0 && parsed < 1)
        return parsed * 100;
    // If 0 or negative, default to 20
    if (parsed <= 0)
        return 20;
    return parsed;
};
/**
 * Calculate affiliate commission rate based on previous purchases
 * Returns the rate corresponding to the highest tier they've achieved
 */
export const calculateAffiliateCommissionRate = (previousPurchases) => {
    if (previousPurchases >= 100)
        return 40;
    if (previousPurchases >= 50)
        return 35;
    if (previousPurchases >= 25)
        return 30;
    if (previousPurchases >= 10)
        return 25;
    return 20;
};
/**
 * Calculate commission amount for an order item
 * @param productPrice - Base product price
 * @param verificationPrice - Additional verification price (if any)
 * @param commissionRate - Commission rate as percentage (0-100)
 * @returns Commission amount as fixed 2-decimal number
 */
export const calculateCommissionAmount = (productPrice, verificationPrice, commissionRate) => {
    const baseAmount = productPrice + verificationPrice;
    return Number((baseAmount * (commissionRate / 100)).toFixed(2));
};
/**
 * Get the next tier rate based on current rate and purchase history
 * Used to determine if affiliate qualifies for rate upgrade
 */
export const getNextTierRate = (currentRate, totalPurchases) => {
    const normalizedRate = normalizeCommissionRate(currentRate);
    let nextRate = normalizedRate;
    for (const tier of AFFILIATE_TIERS) {
        if (tier.rate > normalizedRate && totalPurchases >= tier.minPurchases) {
            nextRate = tier.rate;
        }
    }
    return nextRate;
};
/**
 * Get current tier object based on rate
 * Returns the tier that matches the given rate
 */
export const getTierByRate = (rate) => {
    const normalizedRate = normalizeCommissionRate(rate);
    if (!Number.isFinite(normalizedRate))
        return AFFILIATE_TIERS[0];
    let currentTier = AFFILIATE_TIERS[0];
    for (const tier of AFFILIATE_TIERS) {
        if (tier.rate === normalizedRate) {
            return tier;
        }
        if (tier.rate < normalizedRate) {
            currentTier = tier;
        }
    }
    return currentTier;
};
//# sourceMappingURL=affiliateTiers.js.map