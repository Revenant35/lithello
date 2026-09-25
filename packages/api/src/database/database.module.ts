import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import type { Sql } from 'postgres';
import { KYSELY, provideKysely } from './kysely.provider.ts';
import { providePostgresDialect } from './postgres-dialect.provider.ts';
import { POSTGRES_CLIENT, providePostgresClient } from './postgres.provider.ts';

@Module({
  providers: [
    providePostgresClient(),
    providePostgresDialect(),
    provideKysely(),
  ],
  exports: [KYSELY],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: Sql) {}

  async onApplicationShutdown() {
    await this.client.end();
  }
}
