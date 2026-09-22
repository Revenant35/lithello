import { BadRequestException, Logger, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import {
  ConnectedSocket,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { type Server, type Socket } from "socket.io";

type AuthenticatedSocket = Socket & { user: User };

import { LobbyService } from "./lobby.service.ts";
import { SessionService } from "./session.service.ts";
import {
  SessionID,
  SessionState,
  SessionIDSchema,
  UserID,
  UserIDSchema,
} from "@lithello/shared/types";
import { User } from "better-auth";
import { PostGameService } from "./post-game.service.ts";
import { GameService } from "./game.service.ts";

@UseGuards(AuthGuard)
@WebSocketGateway()
export class SessionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SessionGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly session: SessionService,
    private readonly lobby: LobbyService,
    private readonly postGame: PostGameService,
    private readonly game: GameService,
  ) {}

  afterInit() {
    this.logger.log("Gateway initialised");
  }

  // TODO: This is unauthenticated & will NOT have client.user available!
  async handleConnection(client: AuthenticatedSocket) {
    const user = this.getUser(client);
    const sessionId = this.getConnectingSessionId(client);

    // TODO: Need to set sessionId when authenticated
    await this.session.enterSession({ user, sessionId });
  }

  // TODO: This is unauthenticated & will NOT have client.user available!
  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);

    await this.session.leaveSession({ userId, sessionId });
  }

  @SubscribeMessage("lobby:ready")
  async ready(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);

    await this.lobby.setReady({ userId, sessionId, isReady: true });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("lobby:unready")
  async unready(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);

    await this.lobby.setReady({ userId, sessionId, isReady: false });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("game:draw-offered")
  async drawOffered(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOffered({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("game:draw-offer-accepted")
  async drawOfferAccepted(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferAccepted({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("game:draw-offer-denied")
  async drawOfferDenied(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferDenied({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("game:draw-offer-cancelled")
  async drawOfferCancelled(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.drawOfferCancelled({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("game:resigned")
  async resigned(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.game.resigned({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("postgame:postGame-requested")
  async rematchRequested(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequested({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("postgame:postGame-request-accepted")
  async rematchAccepted(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestAccepted({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("postgame:postGame-request-denied")
  async rematchDenied(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestDenied({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  @SubscribeMessage("postgame:postGame-request-cancelled")
  async rematchRequestCancelled(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = this.getUserId(client);
    const sessionId = this.getSessionId(client);
    await this.postGame.rematchRequestCancelled({ userId, sessionId });
    // if (state) {
    //   this.broadcast(sessionId, state);
    // }
  }

  private broadcast(sessionId: SessionID, state: SessionState): void {
    this.server.to(sessionId).emit("session:state", state);
  }

  private getConnectingSessionId(client: AuthenticatedSocket): SessionID {
    const result = SessionIDSchema.safeParse(client.handshake.auth["sessionId"]);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid session ID on socket handshake");
    }

    return result.data;
  }

  private getSessionId(client: AuthenticatedSocket): SessionID {
    const result = SessionIDSchema.safeParse(client.data?.sessionId);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid session ID on socket");
    }

    return result.data;
  }

  private getUserId(client: AuthenticatedSocket): UserID {
    const result = UserIDSchema.safeParse(client["user"]?.id);

    if (!result.success) {
      throw new BadRequestException("Missing or invalid user ID on socket");
    }

    return result.data;
  }

  private getUser(client: AuthenticatedSocket): User {
    const user = client["user"];

    if (!user) {
      throw new BadRequestException("Missing or invalid user on socket");
    }

    return user;
  }
}
