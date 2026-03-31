import type { FastifyInstance } from 'fastify';
import { COOKIE, AUTH } from '../../config/constants.js';
import {
  registerBodySchema,
  loginBodySchema,
  verifyEmailBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  registerJsonSchema,
  loginJsonSchema,
  refreshJsonSchema,
  logoutJsonSchema,
  verifyEmailJsonSchema,
  forgotPasswordJsonSchema,
  resetPasswordJsonSchema,
  type RegisterBody,
  type LoginBody,
  type VerifyEmailBody,
  type ForgotPasswordBody,
  type ResetPasswordBody,
} from './auth.schema.js';
import {
  register,
  login,
  refreshSession,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from './auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../../plugins/auth.js';

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── POST /register ──────────────────────────────────────────────────────
  fastify.post<{ Body: RegisterBody }>(
    '/register',
    {
      schema: registerJsonSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = registerBodySchema.parse(request.body);
      const result = await register(body, request.ip, request.headers['user-agent']);

      // In production, send verification email instead of returning token
      // For now, return userId for testing
      return reply.status(201).send({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: result.userId,
      });
    },
  );

  // ─── POST /login ─────────────────────────────────────────────────────────
  fastify.post<{ Body: LoginBody }>(
    '/login',
    {
      schema: loginJsonSchema,
      config: {
        rateLimit: {
          max: AUTH.LOGIN_MAX_ATTEMPTS,
          timeWindow: `${AUTH.LOGIN_WINDOW_MS}`,
        },
      },
    },
    async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const result = await login(body, request.ip, request.headers['user-agent']);

      setAuthCookies(reply, result.tokens.accessToken, result.tokens.refreshToken);

      return reply.send({
        message: 'Login successful',
        user: result.user,
      });
    },
  );

  // ─── POST /refresh ───────────────────────────────────────────────────────
  fastify.post(
    '/refresh',
    {
      schema: refreshJsonSchema,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const refreshTokenCookie = (request.cookies as Record<string, string | undefined>)[COOKIE.REFRESH_TOKEN];

      if (!refreshTokenCookie) {
        clearAuthCookies(reply);
        return reply.send({ message: 'No refresh token provided' });
      }

      const tokens = await refreshSession(
        refreshTokenCookie,
        request.ip,
        request.headers['user-agent'],
      );

      setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

      return reply.send({ message: 'Token refreshed' });
    },
  );

  // ─── POST /logout ────────────────────────────────────────────────────────
  fastify.post(
    '/logout',
    { schema: logoutJsonSchema },
    async (request, reply) => {
      const refreshTokenCookie = (request.cookies as Record<string, string | undefined>)[COOKIE.REFRESH_TOKEN];
      // Try to extract userId from access token cookie (best-effort)
      let userId: string | undefined;
      try {
        const { verifyAccessToken } = await import('../../plugins/auth.js');
        const accessCookie = (request.cookies as Record<string, string | undefined>)[COOKIE.ACCESS_TOKEN];
        if (accessCookie) {
          const payload = await verifyAccessToken(accessCookie);
          userId = payload.sub;
        }
      } catch {
        // Access token may be expired — that's fine for logout
      }

      await logout(refreshTokenCookie, userId, request.ip, request.headers['user-agent']);
      clearAuthCookies(reply);

      return reply.send({ message: 'Logged out successfully' });
    },
  );

  // ─── POST /verify-email ──────────────────────────────────────────────────
  fastify.post<{ Body: VerifyEmailBody }>(
    '/verify-email',
    {
      schema: verifyEmailJsonSchema,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = verifyEmailBodySchema.parse(request.body);
      await verifyEmail(body.token, request.ip, request.headers['user-agent']);
      return reply.send({ message: 'Email verified successfully' });
    },
  );

  // ─── POST /forgot-password ───────────────────────────────────────────────
  fastify.post<{ Body: ForgotPasswordBody }>(
    '/forgot-password',
    {
      schema: forgotPasswordJsonSchema,
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = forgotPasswordBodySchema.parse(request.body);
      await forgotPassword(body.email, request.ip, request.headers['user-agent']);

      // Always the same response to prevent email enumeration
      return reply.send({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    },
  );

  // ─── POST /reset-password ────────────────────────────────────────────────
  fastify.post<{ Body: ResetPasswordBody }>(
    '/reset-password',
    {
      schema: resetPasswordJsonSchema,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = resetPasswordBodySchema.parse(request.body);
      await resetPassword(body.token, body.password, request.ip, request.headers['user-agent']);
      return reply.send({ message: 'Password reset successfully. Please log in with your new password.' });
    },
  );
}
