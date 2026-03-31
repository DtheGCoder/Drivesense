import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../plugins/auth.js';
import { COOKIE } from '../config/constants.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

// Extend Fastify request with user info
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

/**
 * Route-level preHandler that verifies the access token cookie
 * and attaches userId + userRole to the request.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const token = (request.cookies as Record<string, string | undefined>)[COOKIE.ACCESS_TOKEN];

  if (!token) {
    throw new UnauthorizedError('Authentication required', 'NO_TOKEN');
  }

  try {
    const payload = await verifyAccessToken(token);
    request.userId = payload.sub;
    request.userRole = payload.role;
  } catch {
    throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
  }
}

/**
 * Factory for role-based authorization preHandler.
 * Usage: { preHandler: [authenticate, authorize('admin', 'moderator')] }
 */
export function authorize(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.userRole) {
      throw new UnauthorizedError('Authentication required', 'NO_TOKEN');
    }
    if (!allowedRoles.includes(request.userRole)) {
      throw new ForbiddenError('Insufficient permissions', 'INSUFFICIENT_ROLE');
    }
  };
}
