import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import type { Database } from '../database/drizzle.provider.ts';
import * as schema from '../database/schema/index.ts';

export interface AuthOptions {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
}

/**
 * Shared between the Nest provider and the better-auth CLI, so the generated
 * schema always matches the auth instance the app actually runs.
 */
export function createAuth(db: Database, options: AuthOptions) {
  return betterAuth({
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: options.secret,
  });
}
