import crypto from 'node:crypto';
import prisma from "../utils/prisma.js";
const getSessionToken = (req) => req.cookies?.monetized_session;
const loadSession = async (token) => {
    if (!token)
        return null;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, role: true, isBanned: true } } } });
};
export const authenticate = async (req, res, next) => {
    try {
        const session = await loadSession(getSessionToken(req));
        if (!session || session.expiresAt <= new Date() || session.user.isBanned) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        req.user = { id: session.user.id, role: session.user.role };
        next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid session' });
    }
};
export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};
export const optionalAuthenticate = async (req, res, next) => {
    try {
        const session = await loadSession(getSessionToken(req));
        if (session && session.expiresAt > new Date() && !session.user.isBanned) {
            req.user = { id: session.user.id, role: session.user.role };
        }
    }
    catch {
        // Optional authentication intentionally proceeds without a session.
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map