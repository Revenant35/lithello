import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/database/schema/index.ts';
import { createAuth } from '../src/auth/auth.config.ts';
import { databaseUrl, env } from './env.ts';

/**
 * Entry point for `pnpm db:auth-generate` only. The running app builds its auth
 * instance through Nest DI in auth.module.ts.
 */
export const auth = createAuth(
  drizzle({
    client: postgres(databaseUrl()),
    schema,
    casing: 'snake_case',
  }),
  {
    baseURL: env('BETTER_AUTH_URL'),
    secret: env('BETTER_AUTH_SECRET'),
    trustedOrigins: env('BETTER_AUTH_TRUSTED_ORIGINS').split(','),
  },
);
