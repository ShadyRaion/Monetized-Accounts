import { type Request, type Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const getProfile: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map