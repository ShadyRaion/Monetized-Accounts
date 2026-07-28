import { type Response } from 'express';
export declare const createTicket: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserTickets: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addMessage: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const adminListTickets: (req: any, res: Response) => Promise<void>;
export declare const adminCloseTicket: (req: any, res: Response) => Promise<void>;
export declare const adminReopenTicket: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTicket: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTicket: (req: any, res: Response) => Promise<void>;
export declare const adminResetMessaging: (req: any, res: Response) => Promise<void>;
declare const _default: {};
export default _default;
//# sourceMappingURL=ticket.controller.d.ts.map