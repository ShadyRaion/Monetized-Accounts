import { type Response } from 'express';
export declare const getStats: (req: any, res: Response) => Promise<void>;
export declare const listUsers: (req: any, res: Response) => Promise<void>;
export declare const listCustomers: (req: any, res: Response) => Promise<void>;
export declare const banUser: (req: any, res: Response) => Promise<void>;
export declare const unbanUser: (req: any, res: Response) => Promise<void>;
export declare const autoCompleteOrders: (req: any, res: Response) => Promise<void>;
export declare const deleteUser: (req: any, res: Response) => Promise<void>;
export declare const listBlacklist: (req: any, res: Response) => Promise<void>;
export declare const addToBlacklist: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeFromBlacklist: (req: any, res: Response) => Promise<void>;
declare const _default: {};
export default _default;
//# sourceMappingURL=admin.controller.d.ts.map