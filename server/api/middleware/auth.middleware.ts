import { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import prisma from '../utils/prisma.ts';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const getSessionToken = (req: Request) => req.cookies?.monetized_session as string | undefined;

const loadSession = async (token: string | undefined) => {
  if (!token) return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  // Try in-memory cache first
  try {
    const cacheKey = `session:${tokenHash}`
    const cached = (await import('../utils/cache.ts')).cacheGet<any>(cacheKey)
    if (cached) return cached
  } catch (e) {}
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, role: true, isBanned: true } } } });
  try { (await import('../utils/cache.ts')).cacheSet(`session:${tokenHash}`, session, 30000) } catch (e) {}
  return session
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const start = Date.now()
    const token = getSessionToken(req)
    try { console.debug(`[auth] authenticate start path=${req?.url || req?.originalUrl || req?.baseUrl || ''} tokenProvided=${Boolean(token)}`) } catch (e) {}
    const session = await loadSession(token);
    try { console.debug(`[auth] authenticate loadSession time=${Date.now()-start}ms sessionFound=${Boolean(session)}`) } catch (e) {}
    if (!session || session.expiresAt <= new Date() || session.user.isBanned) {
      try { console.debug('[auth] authenticate rejected session invalid or missing') } catch (e) {}
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.user = { id: session.user.id, role: session.user.role };
    try { console.debug('[auth] authenticate success user=' + req.user.id) } catch (e) {}
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const start = Date.now()
    const token = getSessionToken(req)
    try { console.debug(`[auth] optionalAuthenticate start path=${req?.url || req?.originalUrl || req?.baseUrl || ''} tokenProvided=${Boolean(token)}`) } catch (e) {}
    const session = await loadSession(token);
    try { console.debug(`[auth] optionalAuthenticate loadSession time=${Date.now()-start}ms sessionFound=${Boolean(session)}`) } catch (e) {}
    if (session && session.expiresAt > new Date() && !session.user.isBanned) {
      req.user = { id: session.user.id, role: session.user.role };
    }
  } catch {
    // Optional authentication intentionally proceeds without a session.
  }

  next()
};

