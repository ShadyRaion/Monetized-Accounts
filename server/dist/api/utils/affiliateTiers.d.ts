/**
 * Shared affiliate tier and commission calculation logic
 * Used across multiple controllers to maintain consistency
 */
export declare const AFFILIATE_TIERS: readonly [{
    readonly rate: 20;
    readonly minPurchases: 0;
}, {
    readonly rate: 25;
    readonly minPurchases: 10;
}, {
    readonly rate: 30;
    readonly minPurchases: 25;
}, {
    readonly rate: 35;
    readonly minPurchases: 50;
}, {
    readonly rate: 40;
    readonly minPurchases: 100;
}];
/**
 * Normalize commission rate to percentage (0-100)
 * Handles decimal (0.2) or percentage (20) formats
 */
export declare const normalizeCommissionRate: (rate: any) => number;
/**
 * Calculate affiliate commission rate based on previous purchases
 * Returns the rate corresponding to the highest tier they've achieved
 */
export declare const calculateAffiliateCommissionRate: (previousPurchases: number) => number;
/**
 * Calculate commission amount for an order item
 * @param productPrice - Base product price
 * @param verificationPrice - Additional verification price (if any)
 * @param commissionRate - Commission rate as percentage (0-100)
 * @returns Commission amount as fixed 2-decimal number
 */
export declare const calculateCommissionAmount: (productPrice: number, verificationPrice: number, commissionRate: number) => number;
/**
 * Get the next tier rate based on current rate and purchase history
 * Used to determine if affiliate qualifies for rate upgrade
 */
export declare const getNextTierRate: (currentRate: number, totalPurchases: number) => number;
/**
 * Get current tier object based on rate
 * Returns the tier that matches the given rate
 */
export declare const getTierByRate: (rate: number) => (typeof AFFILIATE_TIERS)[number];
//# sourceMappingURL=affiliateTiers.d.ts.map