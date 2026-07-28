import { type Request, type Response } from 'express';
export declare const listSubscribers: (_req: Request, res: Response) => Promise<void>;
export declare const createSubscriber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteSubscriber: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=subscriber.controller.d.ts.map