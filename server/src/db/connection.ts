import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const queryClient = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
});

export const db = drizzle(queryClient, { schema });

export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
