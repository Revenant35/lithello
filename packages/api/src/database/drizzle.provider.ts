import { Provider } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type Sql } from 'postgres';
import * as schema from './schema/index.ts';
import { POSTGRES_CLIENT } from './postgres.provider.ts';

export const DRIZZLE = Symbol('DRIZZLE');

export type Database = PostgresJsDatabase<typeof schema>;

export function provideDrizzle(): Provider {
  return {
    provide: DRIZZLE,
    inject: [POSTGRES_CLIENT],
    useFactory: (client: Sql) =>
      drizzle({
        client,
        schema,
        casing: 'snake_case',
      }),
  };
}
