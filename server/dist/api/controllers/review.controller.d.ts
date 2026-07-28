import { type Request, type Response } from 'express';
export declare const createReview: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listReviews: (req: Request, res: Response) => Promise<void>;
export declare const updateReview: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteReview: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {};
export default _default;
//# sourceMappingURL=review.controller.d.ts.map