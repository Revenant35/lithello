import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from 'postgres';

export const POSTGRES_CLIENT = Symbol('POSTGRES_CLIENT');

export function providePostgresClient(): Provider {
  return {
    provide: POSTGRES_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      postgres(config.getOrThrow<string>('DATABASE_URL')),
  };
}
