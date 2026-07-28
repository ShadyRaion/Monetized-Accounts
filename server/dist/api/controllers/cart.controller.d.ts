import { type Response } from 'express';
export declare const addToCart: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCart: (req: any, res: Response) => Promise<void>;
export declare const removeFromCart: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCartItem: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkoutCart: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const _default: {};
export default _default;
//# sourceMappingURL=cart.controller.d.ts.map