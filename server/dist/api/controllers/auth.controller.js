import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from "../utils/prisma.js";
const SESSION_COOKIE = 'monetized_session';
const createSession = async (userId, role) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + (role === 'ADMIN' ? 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000));
    await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
    await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
    return { rawToken, expiresAt };
};
const setSessionCookie = (res, token, expiresAt) => {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });
};
export const register = async (req, res) => {
    try {
        const { name, email, password, referralCode } = req.body;
        const normalizedEmail = email?.trim().toLowerCase();
        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        // Check blacklist
        const black = await prisma.blacklist.findUnique({ where: { email: normalizedEmail } });
        if (black) {
            return res.status(403).json({ message: 'This email has been banned' });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        // Only the designated admin email should be granted ADMIN
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
        const role = (email && email.toLowerCase() === ADMIN_EMAIL) ? 'ADMIN' : 'USER';
        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                passwordHash,
                role,
                referralCode: referralCode?.trim() || undefined,
            },
        });
        const session = await createSession(user.id, user.role);
        setSessionCookie(res, session.rawToken, session.expiresAt);
        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                referralCode: user.referralCode ?? undefined
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (user.isBanned) {
            return res.status(403).json({ message: 'Your account has been banned' });
        }
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const session = await createSession(user.id, user.role);
        setSessionCookie(res, session.rawToken, session.expiresAt);
        res.status(200).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                referralCode: user.referralCode ?? undefined
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const logout = async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.session.deleteMany({ where: { tokenHash } });
    }
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    res.status(204).send();
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, isBanned: true, createdAt: true, referralCode: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;
        if (!name && !email) {
            return res.status(400).json({ message: 'No update data provided' });
        }
        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name || undefined,
                email: email ? email.toLowerCase() : undefined
            },
            select: { id: true, name: true, email: true, role: true, isBanned: true, createdAt: true }
        });
        res.status(200).json(updatedUser);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        res.status(200).json({ message: 'Password updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
//# sourceMappingURL=auth.controller.js.map