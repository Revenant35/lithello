import { Injectable, Logger } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import type { SessionID, UserID } from "@lithello/shared/types";
import { toPostGameState } from "@lithello/shared/util";
import type { SessionState } from "@lithello/shared/types";
import { SessionRepository } from "./session.repository.ts";
import { ClockService } from "../clock.service.ts";
import { ok } from "neverthrow";

@Injectable()
export class ClockSchedulerService {
  private readonly logger = new Logger(ClockSchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly repository: SessionRepository,
    private readonly clock: ClockService,
  ) {}

  /**
   * Schedule a timeout for the active player in a session.
   * Any existing timeout for this session is replaced.
   * When the timeout fires, the session transitions to postgame and the
   * provided broadcast callback is called with the updated state.
   */
  schedule(args: {
    sessionId: SessionID;
    activePlayerId: UserID;
    expiresAt: string;
    broadcast: (state: SessionState) => void;
  }): void {
    const { sessionId, activePlayerId, expiresAt, broadcast } = args;

    this.cancel(sessionId);

    const delay = new Date(expiresAt).getTime() - this.clock.now().getTime();

    if (delay <= 0) {
      this.logger.warn(`Timeout already expired for session ${sessionId}, firing immediately`);
    }

    const timeout = setTimeout(async () => {
      this.logger.log(`Clock expired for player ${activePlayerId} in session ${sessionId}`);

      const result = await this.repository.transact(sessionId, (session) => {
        if (session === null || session.phase !== "game") {
          return ok({ action: "noop" as const });
        }

        if (session.activePlayerId !== activePlayerId) {
          // Player already moved before the timeout fired — nothing to do.
          return ok({ action: "noop" as const });
        }

        const opponent =
          session.white.id === activePlayerId ? session.black : session.white;

        return ok({
          action: "write" as const,
          session: toPostGameState(session, { reason: "timeout", winnerId: opponent.id }),
        });
      });

      if (result.isErr()) {
        this.logger.error(`Failed to apply timeout for session ${sessionId}: ${result.error}`);
        return;
      }

      const state = await this.repository.getSession(sessionId);
      if (state.isOk() && state.value !== null) {
        broadcast(state.value);
      }
    }, Math.max(0, delay));

    this.schedulerRegistry.addTimeout(sessionId, timeout);
  }

  /**
   * Cancel any pending timeout for a session.
   * Safe to call even if no timeout is scheduled.
   */
  cancel(sessionId: SessionID): void {
    try {
      this.schedulerRegistry.deleteTimeout(sessionId);
    } catch {
      // No timeout was registered — nothing to cancel.
    }
  }
}
