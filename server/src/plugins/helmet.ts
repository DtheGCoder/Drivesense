import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { env } from '../config/env.js';

async function helmetPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
        imgSrc: ["'self'", 'data:', 'blob:', 'https://api.mapbox.com'],
        fontSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://events.mapbox.com',
          env.NODE_ENV === 'development' ? 'ws://localhost:*' : undefined,
        ].filter((v): v is string => v !== undefined),
        workerSrc: ["'self'", 'blob:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Mapbox GL JS requires cross-origin resources
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Permissions-Policy is set via Caddy or manual header; @fastify/helmet
    // does not support permissionsPolicy directly. Handled in Caddyfile.
  });
}

export default fp(helmetPlugin, {
  name: 'helmet',
  fastify: '5.x',
});
