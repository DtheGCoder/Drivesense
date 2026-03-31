import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { AUTH } from '../config/constants.js';

/**
 * Hash a password with Argon2id using the mandated security parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: AUTH.ARGON2_MEMORY_COST,
    timeCost: AUTH.ARGON2_TIME_COST,
    parallelism: AUTH.ARGON2_PARALLELISM,
  });
}

/**
 * Verify a password against an Argon2id hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

/**
 * Generate a SHA-256 hash of input text (hex encoded).
 * Used for email hashing, token hashing.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographically secure random token (URL-safe base64).
 */
export function generateToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Generate a UUID v4 using Node.js crypto.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
