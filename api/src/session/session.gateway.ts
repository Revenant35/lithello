import { BadRequestException, Logger, UseGuards } from "@nestjs/common";
import { AuthGuard, AuthService } from "@thallesp/nestjs-better-auth";
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { type Server, type Socket } from "socket.io";
import type { IncomingMessage } from "node:http";

import { LobbyService } from "./lobby.service.ts";
import { SessionService, SessionServiceError } from "./session.service.ts";
import {
  type SessionID,
  SessionIDSchema,
  type SessionState,
  TurnActionSchema,
  type UserID,
  UserIDSchema,
} from "@lithello/shared/types";
import type { User } from "better-auth";
import { PostGameService } from "./post-game.service.ts";
import { GameService } from "./game.service.ts";
import { ClockSchedulerService } from "./clock-scheduler.service.ts";

interface SocketData {
  user: User;
  sessionId: SessionID;
}

type AuthenticatedSocket = Socket & { data: SocketData };

@UseGuards(AuthGuard)
@WebSocketGateway()
export class SessionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SessionGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
    private readonly lobby: LobbyService,
    private readonly postGame: PostGameService,
    private readonly game: GameService,
    private readonly clockScheduler: ClockSchedulerService,
  ) {}

  afterInit() {
    this.logger.log("Gateway initialised");
  }

  async handleConnection(client: Socket) {
    const req = client.request as IncomingMessage;
    const headers = new Headers(req.headers as Record<string, string>);
    const sessionData = await this.auth.instance.api.getSession({ headers });

    if (!sessionData?.user) {
      this.logger.warn(`Unauthenticated connection: ${client.id}`);
      client.disconnect(true);
      return;
    }

    (client as AuthenticatedSocket).data.user = sessionData.user;
    this.logger.log(`Connected: ${client.id} (user ${sessionData.user.id})`);
  }

  async handleDisconnect(client: Socket) {
    const data = (client as AuthenticatedSocket).data;
    const userId = data?.user?.id as UserID | undefined;
    const sessionId = data?.sessionId;

    if (!userId || !sessionId) {
      // Disconnected before joining any session — nothing to clean up.
      return;
    }

    const result = await this.session.leaveSession({ userId, sessionId });

    if (result.isErr()) {
      this.logger.warn(`leaveSession error on disconnect: ${result.error}`);
      return;
    }

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("session:create")
  async createSession(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ success: true; sessionId: SessionID }> {
    const user = this.getUser(client);
    const sessionId = crypto.randomUUID() as SessionID;

    const result = await this.session.enterSession({ user, sessionId });

    if (result.isErr()) {
      throw new BadRequestException(`Failed to create session: ${result.error}`);
    }

    client.data.sessionId = sessionId;
    await client.join(sessionId);

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }

    return { success: true, sessionId };
  }

  @SubscribeMessage("session:join")
  async joinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { sessionId: string },
  ): Promise<{ success: true } | { success: false; reason: "not-found" | "full" }> {
    const user = this.getUser(client);
    const parsed = SessionIDSchema.safeParse(body?.sessionId);

    if (!parsed.success) {
      return { success: false, reason: "not-found" };
    }

    const sessionId = parsed.data;
    const result = await this.session.enterSession({ user, sessionId });

    if (result.isErr()) {
      if (result.error === SessionServiceError.SessionFull) {
        return { success: false, reason: "full" };
      }
      return { success: false, reason: "not-found" };
    }

    client.data.sessionId = sessionId;
    await client.join(sessionId);

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }

    return { success: true };
  }

  @SubscribeMessage("session:leave")
  async leaveSession(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);

    await client.leave(sessionId);
    client.data.sessionId = undefined as unknown as SessionID;

    const result = await this.session.leaveSession({ userId, sessionId });
    if (result.isErr()) {
      this.logger.warn(`leaveSession error: ${result.error}`);
      return;
    }

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("lobby:set-ready")
  async setReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { ready: boolean },
  ): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    const isReady = typeof body?.ready === "boolean" ? body.ready : false;

    await this.lobby.setReady({ userId, sessionId, isReady });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
      this.scheduleClockIfGame(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:action")
  async action(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    const parsed = TurnActionSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException("Invalid turn action");
    }

    await this.game.action({ userId, sessionId, action: parsed.data });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
      this.scheduleClockIfGame(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:resign")
  async resigned(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.resigned({ userId, sessionId });

    this.clockScheduler.cancel(sessionId);

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:draw-offered")
  async drawOffered(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOffered({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:draw-offer-accepted")
  async drawOfferAccepted(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferAccepted({ userId, sessionId });

    this.clockScheduler.cancel(sessionId);

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:draw-offer-denied")
  async drawOfferDenied(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferDenied({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("game:draw-offer-cancelled")
  async drawOfferCancelled(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferCancelled({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("rematch:requested")
  async rematchRequested(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequested({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("rematch:accepted")
  async rematchAccepted(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestAccepted({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
      this.scheduleClockIfGame(sessionId, state.value);
    }
  }

  @SubscribeMessage("rematch:denied")
  async rematchDenied(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestDenied({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  @SubscribeMessage("rematch:request-cancelled")
  async rematchRequestCancelled(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestCancelled({ userId, sessionId });

    const state = await this.session.getSession(sessionId);
    if (state.isOk() && state.value !== null) {
      this.broadcast(sessionId, state.value);
    }
  }

  private broadcast(sessionId: SessionID, state: SessionState): void {
    this.server.to(sessionId).emit("session:state", state);
  }

  private scheduleClockIfGame(sessionId: SessionID, state: SessionState): void {
    if (state.phase !== "game") {
      this.clockScheduler.cancel(sessionId);
      return;
    }

    const activePlayer =
      state.activePlayerId === state.white.id ? state.white : state.black;

    if (activePlayer.clock.kind !== "active") {
      return;
    }

    this.clockScheduler.schedule({
      sessionId,
      activePlayerId: activePlayer.id,
      expiresAt: activePlayer.clock.expiresAt,
      broadcast: (updated) => this.broadcast(sessionId, updated),
    });
  }

  private getSessionId(client: AuthenticatedSocket): SessionID {
    const result = SessionIDSchema.safeParse(client.data?.sessionId);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid session ID on socket");
    }

    return result.data;
  }

  private getUserId(client: AuthenticatedSocket): UserID {
    const result = UserIDSchema.safeParse(client.data?.user?.id);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid user ID on socket");
    }

    return result.data;
  }

  private getUser(client: AuthenticatedSocket): User {
    const user = client.data?.user;

    if (!user) {
      throw new BadRequestException("Missing or invalid user on socket");
    }

    return user;
  }
}
