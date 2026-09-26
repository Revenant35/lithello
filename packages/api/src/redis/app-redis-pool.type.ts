import type { CommandParser, RedisClientPoolType, defineScript } from 'redis';

export type AppRedisPool = RedisClientPoolType<
  {},
  {},
  {
    adjustConnection: ReturnType<
      typeof defineScript<{
        NUMBER_OF_KEYS: number;
        SCRIPT: string;
        parseCommand(
          parser: CommandParser,
          globalKey: string,
          processKey: string,
          heartbeatKey: string,
          field: string,
          delta: 1 | -1,
        ): void;
        transformReply(reply: number): number;
      }>
    >;
    cleanup: ReturnType<
      typeof defineScript<{
        NUMBER_OF_KEYS: number;
        SCRIPT: string;
        parseCommand(
          parser: CommandParser,
          key: string,
          processKey: string,
        ): void;
        transformReply(reply: string[]): string[];
      }>
    >;
    promoteGuest: ReturnType<
      typeof defineScript<{
        NUMBER_OF_KEYS: number;
        SCRIPT: string;
        parseCommand(parser: CommandParser, key: string): void;
        transformReply(reply: string | null): string | null;
      }>
    >;
  }
>;
