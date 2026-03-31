import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import {
  users,
  refreshTokens,
  emailVerificationTokens,
  passwordResetTokens,
  auditLog,
} from '../../db/schema.js';
import { hashPassword, verifyPassword, sha256, generateToken, generateUUID } from '../../utils/crypto.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../plugins/auth.js';
import { AUTH } from '../../config/constants.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { RegisterBody, LoginBody } from './auth.schema.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserPublic {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  isVerified: boolean;
}

interface RegisterResult {
  userId: string;
  verificationToken: string;
}

interface LoginResult {
  user: UserPublic;
  tokens: AuthTokens;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createTokenPair(userId: string, role: string): Promise<AuthTokens & { familyId: string }> {
  const familyId = generateUUID();
  const accessToken = await signAccessToken(userId, role);
  const rawRefreshToken = generateToken(48);
  const refreshTokenJwt = await signRefreshToken(userId, familyId);

  // Store hashed refresh token in DB
  const tokenHash = sha256(rawRefreshToken);
  const expiresAt = new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRY_MS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    familyId,
    expiresAt,
  });

  // We use the JWT as the actual refresh token (it carries familyId + sub)
  // but also store the hash for revocation tracking
  return { accessToken, refreshToken: refreshTokenJwt, familyId };
}

async function logAuditEvent(
  userId: string | null,
  action: string,
  ip: string | undefined,
  userAgent: string | undefined,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId,
      action,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      details: details ?? null,
    });
  } catch (err) {
    // Audit logging should never break the main flow
    logger.error({ err, action, userId }, 'Failed to write audit log');
  }
}

// ─── Service Functions ───────────────────────────────────────────────────────

export async function register(
  body: RegisterBody,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<RegisterResult> {
  const { email, password, username } = body;

  // Check for existing email (by hash)
  const emailHash = sha256(email);
  const existingEmail = await db.query.users.findFirst({
    where: eq(users.emailHash, emailHash),
    columns: { id: true },
  });
  if (existingEmail) {
    throw new ConflictError('An account with this email already exists', 'EMAIL_EXISTS');
  }

  // Check for existing username
  const existingUsername = await db.query.users.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  });
  if (existingUsername) {
    throw new ConflictError('This username is already taken', 'USERNAME_EXISTS');
  }

  // Hash password with Argon2id
  const passwordHash = await hashPassword(password);

  // Encrypt email for storage (using pgcrypto would require raw SQL;
  // for now store the email hash for lookups and the email plaintext
  // which will be encrypted at the column level via a migration)
  const userId = generateUUID();

  await db.insert(users).values({
    id: userId,
    email, // TODO: encrypt with pgcrypto in production migration
    emailHash,
    passwordHash,
    username,
    role: 'user',
    isVerified: false,
    failedAttempts: 0,
  });

  // Create email verification token
  const rawToken = generateToken(32);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  await logAuditEvent(userId, 'auth.register', ip, userAgent);

  return { userId, verificationToken: rawToken };
}

export async function login(
  body: LoginBody,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<LoginResult> {
  const { email, password } = body;
  const emailHash = sha256(email);

  // Find user by email hash
  const user = await db.query.users.findFirst({
    where: eq(users.emailHash, emailHash),
  });

  if (!user) {
    // Timing-safe: still hash the password to prevent timing attacks
    await hashPassword(password);
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    await logAuditEvent(user.id, 'auth.login_locked', ip, userAgent);
    throw new UnauthorizedError(
      `Account is locked. Try again in ${remainingMin} minutes.`,
      'ACCOUNT_LOCKED',
    );
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, password);

  if (!isValid) {
    const newAttempts = user.failedAttempts + 1;
    const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

    // Lock account if threshold reached
    if (newAttempts >= AUTH.ACCOUNT_LOCK_THRESHOLD) {
      updateData['lockedUntil'] = new Date(Date.now() + AUTH.ACCOUNT_LOCK_DURATION_MS);
      logger.warn({ userId: user.id, attempts: newAttempts }, 'Account locked due to failed attempts');
    }

    await db.update(users).set(updateData).where(eq(users.id, user.id));
    await logAuditEvent(user.id, 'auth.login_failed', ip, userAgent, { attempts: newAttempts });

    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Reset failed attempts on successful login
  if (user.failedAttempts > 0) {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  }

  // Generate token pair
  const tokens = await createTokenPair(user.id, user.role);

  await logAuditEvent(user.id, 'auth.login_success', ip, userAgent);

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
    },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

export async function refreshSession(
  refreshTokenJwt: string,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<AuthTokens> {
  // Verify the JWT structure and signature
  let payload: { sub: string; familyId: string };
  try {
    payload = await verifyRefreshToken(refreshTokenJwt);
  } catch {
    throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const { sub: userId, familyId } = payload;

  // Find the token family
  const familyTokens = await db.query.refreshTokens.findMany({
    where: and(
      eq(refreshTokens.familyId, familyId),
      eq(refreshTokens.userId, userId),
    ),
    orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
  });

  if (familyTokens.length === 0) {
    throw new UnauthorizedError('Refresh token not found', 'INVALID_REFRESH_TOKEN');
  }

  const latestToken = familyTokens[0]!;

  // If the latest token in the family is revoked, this is a reuse attack
  // → revoke the ENTIRE family
  if (latestToken.isRevoked) {
    logger.warn({ userId, familyId }, 'Refresh token reuse detected — revoking entire family');
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.familyId, familyId));
    await logAuditEvent(userId, 'auth.token_reuse_detected', ip, userAgent, { familyId });
    throw new UnauthorizedError('Session compromised. Please log in again.', 'TOKEN_REUSE');
  }

  // Check expiration
  if (latestToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
  }

  // Revoke the current token (rotation)
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.id, latestToken.id));

  // Look up user for role
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  // Issue new token pair in the SAME family
  const newAccessToken = await signAccessToken(user.id, user.role);
  const newRefreshJwt = await signRefreshToken(user.id, familyId);
  const newRawToken = generateToken(48);
  const newTokenHash = sha256(newRawToken);
  const expiresAt = new Date(Date.now() + AUTH.REFRESH_TOKEN_EXPIRY_MS);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newTokenHash,
    familyId,
    expiresAt,
  });

  await logAuditEvent(userId, 'auth.token_refreshed', ip, userAgent);

  return { accessToken: newAccessToken, refreshToken: newRefreshJwt };
}

export async function logout(
  refreshTokenJwt: string | undefined,
  userId: string | undefined,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  if (refreshTokenJwt) {
    try {
      const payload = await verifyRefreshToken(refreshTokenJwt);
      // Revoke entire token family
      await db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.familyId, payload.familyId));
      await logAuditEvent(payload.sub, 'auth.logout', ip, userAgent);
    } catch {
      // Token expired or invalid — still clear cookies
      if (userId) {
        await logAuditEvent(userId, 'auth.logout_expired_token', ip, userAgent);
      }
    }
  } else if (userId) {
    await logAuditEvent(userId, 'auth.logout_no_token', ip, userAgent);
  }
}

export async function verifyEmail(
  token: string,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  const tokenHash = sha256(token);

  const verificationRecord = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.tokenHash, tokenHash),
  });

  if (!verificationRecord) {
    throw new BadRequestError('Invalid verification token', 'INVALID_TOKEN');
  }

  if (verificationRecord.usedAt) {
    throw new BadRequestError('Token has already been used', 'TOKEN_USED');
  }

  if (verificationRecord.expiresAt < new Date()) {
    throw new BadRequestError('Verification token has expired', 'TOKEN_EXPIRED');
  }

  // Mark token as used and verify user
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, verificationRecord.id));

  await db
    .update(users)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(eq(users.id, verificationRecord.userId));

  await logAuditEvent(verificationRecord.userId, 'auth.email_verified', ip, userAgent);
}

export async function forgotPassword(
  email: string,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<string | null> {
  const emailHash = sha256(email);

  const user = await db.query.users.findFirst({
    where: eq(users.emailHash, emailHash),
    columns: { id: true },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return null;
  }

  const rawToken = generateToken(32);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  await logAuditEvent(user.id, 'auth.forgot_password', ip, userAgent);

  return rawToken;
}

export async function resetPassword(
  token: string,
  newPassword: string,
  ip: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  const tokenHash = sha256(token);

  const resetRecord = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
  });

  if (!resetRecord) {
    throw new BadRequestError('Invalid reset token', 'INVALID_TOKEN');
  }

  if (resetRecord.usedAt) {
    throw new BadRequestError('Token has already been used', 'TOKEN_USED');
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new BadRequestError('Reset token has expired', 'TOKEN_EXPIRED');
  }

  const passwordHash = await hashPassword(newPassword);

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetRecord.id));

  // Update password and reset failed attempts
  await db
    .update(users)
    .set({
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, resetRecord.userId));

  // Revoke all refresh tokens for this user (force re-login everywhere)
  await db
    .update(refreshTokens)
    .set({ isRevoked: true })
    .where(eq(refreshTokens.userId, resetRecord.userId));

  await logAuditEvent(resetRecord.userId, 'auth.password_reset', ip, userAgent);
}
