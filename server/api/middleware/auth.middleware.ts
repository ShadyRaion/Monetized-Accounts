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
  return prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, role: true, isBanned: true } } } });
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await loadSession(getSessionToken(req));
    if (!session || session.expiresAt <= new Date() || session.user.isBanned) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    req.user = { id: session.user.id, role: session.user.role };
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
    const session = await loadSession(getSessionToken(req));
    if (session && session.expiresAt > new Date() && !session.user.isBanned) {
      req.user = { id: session.user.id, role: session.user.role };
    }
  } catch {
    // Optional authentication intentionally proceeds without a session.
  }

  next()
};

