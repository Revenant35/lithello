import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { type Sql } from "postgres";
import { POSTGRES_CLIENT, providePostgresClient } from "./postgres.provider.ts";
import { POSTGRES_DIALECT, providePostgresDialect } from "./postgres-dialect.provider.ts";
import { KYSELY, provideKysely } from "./kysely.provider.ts";

@Module({
  providers: [providePostgresClient(), providePostgresDialect(), provideKysely()],
  exports: [POSTGRES_CLIENT, POSTGRES_DIALECT, KYSELY],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_CLIENT) private readonly sql: Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 });
  }
}
