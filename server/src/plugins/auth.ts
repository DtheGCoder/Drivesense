import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import * as jose from 'jose';
import { env } from '../config/env.js';
import { AUTH, COOKIE } from '../config/constants.js';

export interface AccessTokenPayload {
  sub: string; // user id
  role: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  familyId: string;
  iat: number;
  exp: number;
}

// Encode secrets as Uint8Array for jose
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function signAccessToken(userId: string, role: string): Promise<string> {
  return new jose.SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(AUTH.ACCESS_TOKEN_EXPIRY)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jose.jwtVerify(token, accessSecret, {
    algorithms: ['HS256'],
  });
  return payload as unknown as AccessTokenPayload;
}

export async function signRefreshToken(userId: string, familyId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRY_MS);
  return new jose.SignJWT({ familyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jose.jwtVerify(token, refreshSecret, {
    algorithms: ['HS256'],
  });
  return payload as unknown as RefreshTokenPayload;
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(cookie, {
    parseOptions: {},
  });
}

export function setAuthCookies(
  reply: { setCookie: (name: string, value: string, options: Record<string, unknown>) => void },
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = env.NODE_ENV === 'production';
  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };

  reply.setCookie(COOKIE.ACCESS_TOKEN, accessToken, {
    ...cookieBase,
    maxAge: 15 * 60, // 15 minutes in seconds
  });

  reply.setCookie(COOKIE.REFRESH_TOKEN, refreshToken, {
    ...cookieBase,
    path: '/api/v1/auth', // only sent to auth endpoints
    maxAge: AUTH.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(
  reply: { clearCookie: (name: string, options: Record<string, unknown>) => void },
): void {
  reply.clearCookie(COOKIE.ACCESS_TOKEN, { path: '/' });
  reply.clearCookie(COOKIE.REFRESH_TOKEN, { path: '/api/v1/auth' });
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});
