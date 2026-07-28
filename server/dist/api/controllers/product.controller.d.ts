import { type Request, type Response } from 'express';
export declare const previewProducts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listProducts: (req: Request, res: Response) => Promise<void>;
export declare const getProduct: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createProduct: (req: Request, res: Response) => Promise<void>;
export declare const updateProduct: (req: Request, res: Response) => Promise<void>;
export declare const deleteProduct: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const _default: {};
export default _default;
//# sourceMappingURL=product.controller.d.ts.map