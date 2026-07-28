import { type Request, type Response } from 'express';
export declare const listFaqs: (req: Request, res: Response) => Promise<void>;
export declare const createFaq: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateFaq: (req: any, res: Response) => Promise<void>;
export declare const deleteFaq: (req: any, res: Response) => Promise<void>;
declare const _default: {};
export default _default;
//# sourceMappingURL=faq.controller.d.ts.map