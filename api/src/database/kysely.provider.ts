import { Provider } from "@nestjs/common";
import { PostgresJSDialect } from "kysely-postgres-js";
import { Kysely } from "kysely";
import { DatabaseSchema } from "./database-schema.ts";
import { POSTGRES_DIALECT } from "./postgres-dialect.provider.ts";

export const KYSELY = Symbol("KYSELY");

export function provideKysely(): Provider {
  return {
    provide: KYSELY,
    inject: [POSTGRES_DIALECT],
    useFactory: (dialect: PostgresJSDialect) =>
      new Kysely<DatabaseSchema>({
        dialect: dialect,
      }),
  };
}
