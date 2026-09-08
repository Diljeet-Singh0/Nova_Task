import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  type: 'access';
  userId: string;
}

export interface RefreshTokenPayload {
  type: 'refresh';
  userId: string;
  version: number;
}

const REFRESH_COOKIE_NAME = 'nova_refresh_token';

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { type: 'access', userId };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as number,
  });
}

export function signRefreshToken(userId: string, version: number): string {
  const payload: RefreshTokenPayload = { type: 'refresh', userId, version };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

export { REFRESH_COOKIE_NAME };
