import { type Response } from 'express';
export declare const createOrder: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const calculateOrderItemCommissionAmount: (item: {
    product?: {
        price?: number;
    };
    verificationPrice?: number;
}, rate: number) => number;
export declare const getUserOrders: (req: any, res: Response) => Promise<void>;
export declare const getOrder: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminListOrders: (req: any, res: Response) => Promise<void>;
export declare const updateOrderStatus: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminUpdateOrderDelivery: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {};
export default _default;
//# sourceMappingURL=order.controller.d.ts.map