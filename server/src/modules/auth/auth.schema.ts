import { z } from 'zod';
import { AUTH } from '../../config/constants.js';

// ─── Registration ────────────────────────────────────────────────────────────

export const registerBodySchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z
    .string()
    .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
    .max(AUTH.PASSWORD_MAX_LENGTH),
  username: z
    .string()
    .min(AUTH.USERNAME_MIN_LENGTH)
    .max(AUTH.USERNAME_MAX_LENGTH)
    .regex(AUTH.USERNAME_PATTERN, 'Username may only contain letters, numbers, and underscores'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginBodySchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(AUTH.PASSWORD_MAX_LENGTH),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

// ─── Verify Email ────────────────────────────────────────────────────────────

export const verifyEmailBodySchema = z.object({
  token: z.string().min(1).max(256),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;

// ─── Forgot Password ────────────────────────────────────────────────────────

export const forgotPasswordBodySchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

// ─── Reset Password ─────────────────────────────────────────────────────────

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1).max(256),
  password: z
    .string()
    .min(AUTH.PASSWORD_MIN_LENGTH, `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`)
    .max(AUTH.PASSWORD_MAX_LENGTH),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

// ─── Fastify JSON Schema converters ──────────────────────────────────────────

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Minimal Zod→JSON Schema conversion for Fastify's Ajv compilation.
  // For complex schemas, consider zod-to-json-schema package.
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required, additionalProperties: false };
  }

  if (schema instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    for (const check of schema._def.checks) {
      switch (check.kind) {
        case 'email':
          result['format'] = 'email';
          break;
        case 'min':
          result['minLength'] = check.value;
          break;
        case 'max':
          result['maxLength'] = check.value;
          break;
        case 'regex':
          result['pattern'] = check.regex.source;
          break;
      }
    }
    return result;
  }

  return {};
}

export const registerJsonSchema = {
  body: zodToJsonSchema(registerBodySchema),
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        userId: { type: 'string', format: 'uuid' },
      },
      required: ['message', 'userId'],
      additionalProperties: false,
    },
  },
};

export const loginJsonSchema = {
  body: zodToJsonSchema(loginBodySchema),
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            displayName: { type: ['string', 'null'] },
            role: { type: 'string' },
            isVerified: { type: 'boolean' },
          },
          required: ['id', 'username', 'role', 'isVerified'],
          additionalProperties: false,
        },
      },
      required: ['message', 'user'],
      additionalProperties: false,
    },
  },
};

export const refreshJsonSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
};

export const logoutJsonSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
};

export const verifyEmailJsonSchema = {
  body: zodToJsonSchema(verifyEmailBodySchema),
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
};

export const forgotPasswordJsonSchema = {
  body: zodToJsonSchema(forgotPasswordBodySchema),
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
};

export const resetPasswordJsonSchema = {
  body: zodToJsonSchema(resetPasswordBodySchema),
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
};
