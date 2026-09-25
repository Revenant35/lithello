import { Provider } from "@nestjs/common";
import { type Sql } from "postgres";
import { PostgresJSDialect } from "kysely-postgres-js";
import { POSTGRES_CLIENT } from "./postgres.provider.ts";

export const POSTGRES_DIALECT = Symbol("POSTGRES_DIALECT");

export function providePostgresDialect(): Provider {
  return {
    provide: POSTGRES_DIALECT,
    inject: [POSTGRES_CLIENT],
    useFactory: (client: Sql) =>
      new PostgresJSDialect({
        postgres: client,
      }),
  };
}
