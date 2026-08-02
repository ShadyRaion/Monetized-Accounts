import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../utils/prisma.ts';

const SESSION_COOKIE = 'monetized_session';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_OAUTH_REDIRECT = process.env.GOOGLE_OAUTH_REDIRECT || '';

const createSession = async (userId: string, role: string) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + (role === 'ADMIN' ? 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000));
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return { rawToken, expiresAt };
};

const setSessionCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, referralCode } = req.body;
    const normalizedEmail = email?.trim().toLowerCase()

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
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase()
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const verifyGoogleIdToken = async (idToken: string) => {
  if (!idToken) return null;
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) return null;
  const tokenData = await response.json();
  if (tokenData.aud !== GOOGLE_CLIENT_ID) return null;
  if (tokenData.email_verified !== 'true' && tokenData.email_verified !== true) return null;
  return tokenData;
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google authentication is not configured' });
    }

    const tokenData: any = await verifyGoogleIdToken(idToken);
    if (!tokenData || !tokenData.email) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }

    const normalizedEmail = tokenData.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          name: tokenData.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash,
        },
      });
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
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Google login failed' });
  }
};

export const startGoogleOAuth = async (req: Request, res: Response) => {
  try {
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ message: 'Google authentication is not configured' });

    const host = (req.headers && ((req.headers as any).host || (req.headers as any)['x-forwarded-host'])) || 'localhost:3000'
    const proto = (req.headers && ((req.headers as any)['x-forwarded-proto'] || (req.headers as any)['x-forwarded-protocol'])) || (req as any).protocol || 'http'
    const redirectUri = GOOGLE_OAUTH_REDIRECT || `${proto}://${host}/api/auth/login/google/callback`;

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.setHeader?.('Location', url)
    res.status?.(302)
    res.end?.()
  } catch (error) {
    console.error('startGoogleOAuth error', error);
    res.status(500).json({ message: 'Failed to start Google OAuth' });
  }
};

export const handleGoogleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = (req.query as any).code;
    if (!code) return res.status(400).json({ message: 'Missing code' });
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return res.status(500).json({ message: 'Google server-side credentials not configured' });

    const host = (req.headers && ((req.headers as any).host || (req.headers as any)['x-forwarded-host'])) || 'localhost:3000'
    const proto = (req.headers && ((req.headers as any)['x-forwarded-proto'] || (req.headers as any)['x-forwarded-protocol'])) || (req as any).protocol || 'http'
    const redirectUri = GOOGLE_OAUTH_REDIRECT || `${proto}://${host}/api/auth/login/google/callback`;

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('Token exchange failed', txt);
      return res.status(502).json({ message: 'Failed to exchange code for tokens' });
    }

    const tokenData: any = await tokenResp.json();
    const idToken = tokenData.id_token;
    if (!idToken) return res.status(502).json({ message: 'No id_token returned from Google' });

    const verified = await verifyGoogleIdToken(idToken);
    if (!verified || !verified.email) return res.status(401).json({ message: 'Invalid Google token' });

    const normalizedEmail = verified.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && user.isBanned) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          name: verified.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash,
        },
      });
    }

    const session = await createSession(user.id, user.role);
    setSessionCookie(res, session.rawToken, session.expiresAt);

    // Redirect back to the app root (could be enhanced to use state param)
    res.setHeader?.('Location', '/')
    res.status?.(302)
    res.end?.()
  } catch (error) {
    console.error('handleGoogleOAuthCallback error', error);
    res.status(500).json({ message: 'Google OAuth callback failed' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
  res.status(204).send();
};

export const getProfile = async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(200).json(null);
    }

    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isBanned: true, createdAt: true, referralCode: true }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const updateProfile = async (req: any, res: Response) => {
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const changePassword = async (req: any, res: Response) => {
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
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}


