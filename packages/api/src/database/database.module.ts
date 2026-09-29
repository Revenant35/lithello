import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import type { Sql } from 'postgres';
import { DRIZZLE, provideDrizzle } from './drizzle.provider.ts';
import { POSTGRES_CLIENT, providePostgresClient } from './postgres.provider.ts';

@Module({
  providers: [
    providePostgresClient(),
    provideDrizzle(),
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: Sql) {}

  async onApplicationShutdown() {
    await this.client.end();
  }
}
