import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './database/env.ts';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './database/migrations',
  casing: 'snake_case',
  dbCredentials: { url: databaseUrl() },
});
