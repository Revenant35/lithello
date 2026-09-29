import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject } from 'rxjs';
import type { GameID, UserID } from '@lithello/shared';
import type { AppRedisClient } from '../redis/app-redis-client.type.ts';
import { REDIS_CLIENT } from '../redis/redis-client.provider.ts';
import { PresenceService } from '../presence/presence.service.ts';
import { GameRepository } from './game.repository.ts';

/**
 * When each disconnected player forfeits, scored by the deadline. Members are
 * `gameId:userId`, so both seats of a game can be pending at once.
 */
const ABANDON_DEADLINES = 'game-abandon-deadlines';

const DEFAULT_GRACE_SECONDS = 30;

/** How long a sweeping process holds a claimed deadline before it is retried. */
const CLAIM_LEASE_MS = 10_000;

const CLAIM_BATCH_SIZE = 100;

export type GameConnectionChange = {
  gameId: GameID;
  userId: UserID;
  isConnected: boolean;
};

export type PlayerConnection = {
  isConnected: boolean;
  abandonsAt: Date | null;
};

/**
 * Tracks who is at the board and when a disconnected player forfeits.
 *
 * Deliberately owns state only - it records deadlines and hands out due ones,
 * but never ends a game. GameService reads connection state into the session
 * and decides what an expired deadline means, which keeps the dependency
 * pointing one way.
 */
@Injectable()
export class GameAbandonmentService implements OnModuleInit {
  private readonly logger = new Logger(GameAbandonmentService.name);
  private readonly graceMs: number;

  private readonly _connectionChanged$ = new Subject<GameConnectionChange>();
  public readonly connectionChanged$ = this._connectionChanged$.asObservable();

  constructor(
    private readonly presence: PresenceService,
    private readonly games: GameRepository,
    @Inject(REDIS_CLIENT) private readonly redis: AppRedisClient,
    config: ConfigService,
  ) {
    this.graceMs =
      Number(config.get('GAME_ABANDON_GRACE_SECONDS', DEFAULT_GRACE_SECONDS)) *
      1000;
  }

  /**
   * Presence only emits on the instance that handled the socket. That is
   * enough: the change is re-emitted here, GameService republishes, and the
   * gateway broadcasts to the room through the socket.io Redis adapter.
   */
  onModuleInit(): void {
    this.presence.gameConnections$.subscribe((event) => {
      void this.handleConnectionChange(event).catch((error) =>
        this.logger.error(error),
      );
    });
  }

  /** Whether a player is at the board, and when they forfeit if they are not. */
  async getConnection(
    gameId: GameID,
    userId: UserID,
  ): Promise<PlayerConnection> {
    const [isConnected, score] = await Promise.all([
      this.presence.isUserConnectedToGame({ userId, gameId }),
      this.redis.zScore(ABANDON_DEADLINES, this.getEntry(gameId, userId)),
    ]);

    return {
      isConnected,
      abandonsAt: isConnected || score === null ? null : new Date(score),
    };
  }

  /** Drops any pending forfeits for a game, used once it has ended. */
  async clear(gameId: GameID, userIds: UserID[]): Promise<void> {
    await this.redis.zRem(
      ABANDON_DEADLINES,
      userIds.map((userId) => this.getEntry(gameId, userId)),
    );
  }

  async release(gameId: GameID, userId: UserID): Promise<void> {
    await this.redis.zRem(ABANDON_DEADLINES, this.getEntry(gameId, userId));
  }

  /**
   * Claims every forfeit that has come due. The claim is atomic, so with
   * several instances running exactly one gets a given player.
   */
  async claimDue(): Promise<{ gameId: GameID; userId: UserID }[]> {
    const now = Date.now();

    const due = await this.redis.claimDueDeadlines(
      ABANDON_DEADLINES,
      now,
      now + CLAIM_LEASE_MS,
      CLAIM_BATCH_SIZE,
    );

    return due
      .map((entry) => this.parseEntry(entry))
      .filter((entry) => entry !== null);
  }

  private async handleConnectionChange(
    event: GameConnectionChange,
  ): Promise<void> {
    const game = await this.games.getGame({ id: event.gameId });

    if (game === null || game.endedAt !== null) {
      return;
    }

    if (event.isConnected) {
      await this.release(event.gameId, event.userId);
    } else {
      await this.redis.zAdd(ABANDON_DEADLINES, {
        score: Date.now() + this.graceMs,
        value: this.getEntry(event.gameId, event.userId),
      });
    }

    this._connectionChanged$.next(event);
  }

  private getEntry(gameId: GameID, userId: UserID): string {
    return `${gameId}:${userId}`;
  }

  private parseEntry(
    entry: string,
  ): { gameId: GameID; userId: UserID } | null {
    const [gameId, userId] = entry.split(':');

    return gameId === undefined || userId === undefined
      ? null
      : { gameId: gameId as GameID, userId: userId as UserID };
  }
}
