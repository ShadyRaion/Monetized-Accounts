import { type Request, type Response } from 'express';
export declare function ensureAffiliateForUser(userId: string, payoutMethod: string | null, data?: {
    platforms?: string[];
    isContentCreator?: boolean;
}): Promise<{
    affiliate: {
        user: import("@prisma/client/runtime/index.js").GetResult<{
            id: string;
            name: string;
            email: string;
            passwordHash: string;
            role: string;
            isBanned: boolean;
            createdAt: Date;
            updatedAt: Date;
            referralCode: string | null;
        }, unknown> & {};
    } & import("@prisma/client/runtime/index.js").GetResult<{
        userId: string;
        status: string;
        affiliateCode: string;
        totalEarnings: number;
        payoutMethod: string | null;
        payoutAddress: string | null;
        createdAt: Date;
        updatedAt: Date;
        isContentCreator: boolean;
        socialMediaPlatforms: string[];
        commissionRate: number;
        commissionRateAutoUpgradeEnabled: boolean;
    }, unknown> & {};
    created: boolean;
    reapplied: boolean;
} | {
    affiliate: import("@prisma/client/runtime/index.js").GetResult<{
        userId: string;
        status: string;
        affiliateCode: string;
        totalEarnings: number;
        payoutMethod: string | null;
        payoutAddress: string | null;
        createdAt: Date;
        updatedAt: Date;
        isContentCreator: boolean;
        socialMediaPlatforms: string[];
        commissionRate: number;
        commissionRateAutoUpgradeEnabled: boolean;
    }, unknown> & {};
    created: boolean;
    reapplied?: never;
}>;
export declare const applyAffiliate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAffiliateDashboard: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminListAffiliates: (req: Request, res: Response) => Promise<void>;
export declare const updateMyAffiliate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminUpdateAffiliate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminPayAffiliate: (req: Request, res: Response) => Promise<void>;
declare const _default: {};
export default _default;
//# sourceMappingURL=affiliate.controller.d.ts.map