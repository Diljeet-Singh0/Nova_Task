import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken, REFRESH_COOKIE_NAME, verifyRefreshToken } from '../lib/jwt';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const refreshTokenVersions = new Map<string, number>();

export function getRefreshVersion(userId: string): number {
  return refreshTokenVersions.get(userId) ?? 0;
}

export function incrementRefreshVersion(userId: string): void {
  const current = getRefreshVersion(userId);
  refreshTokenVersions.set(userId, current + 1);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({ message: 'Invalid or expired access token' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }

  req.user = user;
  next();
}

export async function authenticateRefresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    res.status(401).json({ message: 'Refresh token required' });
    return;
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
    return;
  }

  const expectedVersion = getRefreshVersion(payload.userId);
  if (payload.version !== expectedVersion) {
    res.status(401).json({ message: 'Refresh token revoked' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }

  req.user = user;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
}
