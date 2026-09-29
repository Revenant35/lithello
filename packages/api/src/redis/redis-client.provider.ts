import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommandParser,
  createClient,
  defineScript,
} from 'redis';
import { AppRedisClient } from './app-redis-client.type.ts';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export function provideRedisClient(): Provider {
  return {
    provide: REDIS_CLIENT,
    inject: [ConfigService],
    useFactory: async (config: ConfigService): Promise<AppRedisClient> => {
      const logger = new Logger('Redis Pool');
      const pool = createClient({
        url: config.getOrThrow<string>('REDIS_URL'),
        scripts: {
          adjustConnection: defineScript({
            NUMBER_OF_KEYS: 3,
            SCRIPT: `
              if redis.call('EXISTS', KEYS[3]) == 0 then
                return -1
              end
          
              local delta = tonumber(ARGV[2])
          
              local owned = redis.call('HINCRBY', KEYS[2], ARGV[1], delta)
              if owned < 0 then
                redis.call('HDEL', KEYS[2], ARGV[1])
                return -1  -- we didn't own this connection; leave the global count alone
              end
              if owned <= 0 then
                redis.call('HDEL', KEYS[2], ARGV[1])
              end
          
              local count = redis.call('HINCRBY', KEYS[1], ARGV[1], delta)
              if count <= 0 then
                redis.call('HDEL', KEYS[1], ARGV[1])
                return 0
              end
          
              return count
            `,
            parseCommand(
              parser: CommandParser,
              globalKey: string,
              processKey: string,
              heartbeatKey: string,
              field: string,
              delta: 1 | -1,
            ) {
              parser.pushKey(globalKey);
              parser.pushKey(processKey);
              parser.pushKey(heartbeatKey);
              parser.push(field);
              parser.push(delta.toString());
            },
            transformReply(reply: number): number {
              return reply;
            },
          }),
          cleanup: defineScript({
            NUMBER_OF_KEYS: 2,
            SCRIPT: `
                local disconnected_users = {}
                local values = redis.call('HGETALL', KEYS[2])
      
                for i = 1, #values, 2 do
                  local user_id = values[i]
                  local socket_count = tonumber(values[i + 1])
                  local count = redis.call('HINCRBY', KEYS[1], user_id, -socket_count)
      
                  if count <= 0 then
                    redis.call('HDEL', KEYS[1], user_id)
                    table.insert(disconnected_users, user_id)
                  end
                end
      
                redis.call('DEL', KEYS[2])
      
                return disconnected_users
              `,
            parseCommand(
              parser: CommandParser,
              key: string,
              processKey: string,
            ) {
              parser.pushKey(key);
              parser.pushKey(processKey);
            },
            transformReply(reply: string[]): string[] {
              return reply;
            },
          }),
          promoteGuest: defineScript({
            NUMBER_OF_KEYS: 1,
            SCRIPT: `
              local guest = redis.pcall('JSON.GET', KEYS[1], '.guest')
              if type(guest) == 'table' and guest.err then
                return false
              end

              redis.call('JSON.SET', KEYS[1], '.host', guest)
              redis.call('JSON.DEL', KEYS[1], '.guest')

              return redis.call('JSON.GET', KEYS[1])
            `,
            parseCommand(parser: CommandParser, key: string) {
              parser.pushKey(key);
            },
            transformReply(reply: string | null): string | null {
              return reply;
            },
          }),
        },
      });

      pool.on('error', (error) => logger.error(error));
      await pool.connect();

      return pool;
    },
  };
}
