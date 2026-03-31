import 'dotenv/config';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { API } from './config/constants.js';
import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { closeDatabase } from './db/connection.js';
import helmetPlugin from './plugins/helmet.js';
import corsPlugin from './plugins/cors.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './modules/auth/auth.routes.js';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie'],
        censor: '[REDACTED]',
      },
    },
    bodyLimit: API.MAX_BODY_SIZE,
    trustProxy: env.NODE_ENV === 'production', // trust Caddy's X-Forwarded-For
  });

  // ─── Global Error Handler ──────────────────────────────────────────────
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, request, reply) => {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
      });
    }

    // Handle AppError (operational errors)
    if (error instanceof AppError) {
      if (!error.isOperational) {
        request.log.error({ err: error }, 'Non-operational error');
      }

      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
        code: error.code,
      });
    }

    // Handle Fastify validation errors (from JSON schema)
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: error.message,
        code: 'VALIDATION_ERROR',
      });
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: error.message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // Unknown errors — log full details, return generic message
    request.log.error({ err: error }, 'Unhandled error');

    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      code: 'INTERNAL_ERROR',
    });
  });

  // ─── Not Found Handler ─────────────────────────────────────────────────
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'Route not found',
      code: 'NOT_FOUND',
    });
  });

  // ─── Security Plugins ──────────────────────────────────────────────────
  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  // ─── Health Check ──────────────────────────────────────────────────────
  app.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
          required: ['status', 'timestamp'],
          additionalProperties: false,
        },
      },
    },
  }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // ─── API Routes ────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: `${API.PREFIX}/auth` });

  return app;
}

async function start(): Promise<void> {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`DriveSense API running on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }

  // ─── Graceful Shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    if (app) {
      await app.close();
    }
    await closeDatabase();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start();

export { buildApp };
