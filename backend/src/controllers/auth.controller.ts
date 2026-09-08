import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE_NAME,
} from '../lib/jwt';
import { env } from '../config/env';
import { getRefreshVersion, incrementRefreshVersion } from '../middleware/auth';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

async function setRefreshCookie(res: Response, userId: string) {
  const version = getRefreshVersion(userId);
  const refreshToken = signRefreshToken(userId, version);
  const sameSite: 'lax' | 'strict' | 'none' = env.COOKIE_SECURE ? 'none' : 'lax';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const accessToken = signAccessToken(user.id);
  await setRefreshCookie(res, user.id);

  res.status(201).json({ user, accessToken });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken(user.id);
  await setRefreshCookie(res, user.id);

  res.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    accessToken,
  });
}

export async function refresh(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  incrementRefreshVersion(req.user.id);
  const accessToken = signAccessToken(req.user.id);
  await setRefreshCookie(res, req.user.id);

  res.json({ user: req.user, accessToken });
}

export async function logout(req: Request, res: Response) {
  if (req.user) {
    incrementRefreshVersion(req.user.id);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out' });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  res.json({ user: req.user });
}
