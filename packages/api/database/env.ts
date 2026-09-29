import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads config straight from the environment. CLI tooling (drizzle-kit, the
 * better-auth schema generator) runs outside Nest, so it cannot use ConfigService.
 */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function databaseUrl(): string {
  return env('DATABASE_URL');
}
