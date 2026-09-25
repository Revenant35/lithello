import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS_POOL } from '../redis/redis-pool.provider.ts';
import { randomUUID } from 'node:crypto';
import { type RedisClientPoolType } from 'redis';

const PROCESS_ID = randomUUID();
const HEARTBEAT_TTL_SECONDS = 30;
const PROCESSES_KEY = 'processes';
const TOTAL_CLIENTS_KEY = 'total-clients';
const PROCESS_STATUS_KEY = `${PROCESS_ID}:is-up`;
const PROCESS_TOTAL_CLIENTS_KEY = `${PROCESS_ID}:${TOTAL_CLIENTS_KEY}`;

@Injectable()
export class PresenceService {
  constructor(
    @Inject(REDIS_POOL) private readonly redis: RedisClientPoolType,
  ) {}

  private readonly logger = new Logger(PresenceService.name);

  async registerProcess(): Promise<void> {
    await this.redis
      .multi()
      .sAdd(PROCESSES_KEY, PROCESS_ID)
      .set(PROCESS_STATUS_KEY, '1', {
        expiration: { type: 'EX', value: HEARTBEAT_TTL_SECONDS },
      })
      .exec();
  }

  async refreshHeartbeat(): Promise<void> {
    const renewed = await this.redis.expire(
      PROCESS_STATUS_KEY,
      HEARTBEAT_TTL_SECONDS,
    );

    if (!renewed) {
      this.logger.fatal('Presence heartbeat expired!');
      process.exit(1);
    }
  }

  async cleanupDeadProcesses(): Promise<void> {
    const processIds = await this.redis.sMembers(PROCESSES_KEY);

    if (processIds.length === 0) {
      return;
    }

    const states = await this.redis.mGet(
      processIds.map((processId) => `${processId}:is-up`),
    );

    for (const [index, processId] of processIds.entries()) {
      if (states[index] === '1') {
        continue;
      }

      const rawCount = await this.redis.get(PROCESS_TOTAL_CLIENTS_KEY);
      const clientCount = rawCount ? Number(rawCount) : 0;

      await this.redis
        .multi()
        .sRem(PROCESSES_KEY, processId)
        .del(PROCESS_TOTAL_CLIENTS_KEY)
        .decrBy(TOTAL_CLIENTS_KEY, clientCount || 0)
        .exec();
    }
  }

  async totalCount() {
    const val = await this.redis.get(TOTAL_CLIENTS_KEY);
    if (!val) {
      return 0;
    }
    return Number(val);
  }

  async onSocketConnect(): Promise<void> {
    await this.redis
      .multi()
      .incr(PROCESS_TOTAL_CLIENTS_KEY)
      .incr(TOTAL_CLIENTS_KEY)
      .exec();
  }

  async onSocketDisconnect(): Promise<void> {
    await this.redis
      .multi()
      .decr(PROCESS_TOTAL_CLIENTS_KEY)
      .decr(TOTAL_CLIENTS_KEY)
      .exec();
  }
}
