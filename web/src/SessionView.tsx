import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";

import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SessionState,
} from "./socket-types.ts";
import type { TurnAction } from "@lithello/shared/types";
import { getPlayerScore } from "@lithello/shared/util";
import { GameBoard } from "./GameBoard.tsx";
import { GameScoreView } from "./GameScoreView.tsx";
import { MoveHistory } from "./MoveHistory.tsx";
import { PostMatchView } from "./PostMatchView.tsx";
import { GameView } from "./GameView.tsx";
import { LobbyView } from "./LobbyView.tsx";
import { PlayerClockView } from "./components/clocks/PlayerClockView.tsx";
import "./SessionView.css";
import { UserID, SessionIDSchema, SessionStateSchema } from "@lithello/shared/types";

interface SessionViewProps {
  playerId: UserID;
}

type SessionViewState =
  | { status: "loading" }
  | { status: "ready"; session: SessionState }
  | { status: "error"; message: string };

export function SessionView({ playerId }: SessionViewProps) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>(null);
  const hasRequestedCreation = useRef(false);
  const isCreatingSession = sessionId === "new";
  const initialSessionId = isCreatingSession ? null : SessionIDSchema.safeParse(sessionId);
  const [viewState, setViewState] = useState<SessionViewState>(() =>
    !isCreatingSession && !initialSessionId?.success
      ? { status: "error", message: "This session link is not valid." }
      : { status: "loading" },
  );

  useEffect(() => {
    const isCreating = sessionId === "new";
    const parsedSessionId = isCreating ? null : SessionIDSchema.safeParse(sessionId);

    if (!isCreating && !parsedSessionId?.success) {
      return;
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      withCredentials: true,
      auth: {
        sessionId: isCreating ? null : (parsedSessionId?.data ?? null),
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (isCreating) {
        if (!hasRequestedCreation.current) {
          hasRequestedCreation.current = true;
          socket.emit("session:create", (result) => {
            void navigate(`/session/${result.sessionId}`, { replace: true });
          });
        }
        return;
      }

      if (parsedSessionId?.success) {
        socket.emit("session:join", { sessionId: parsedSessionId.data }, (result) => {
          if (!result.success) {
            setViewState({
              status: "error",
              message:
                result.reason === "not-found"
                  ? "This session does not exist or is no longer available."
                  : "This session already has two players.",
            });
          }
        });
      }
    });

    socket.on("session:state", (unparsedSessionState) => {
      const parsedSessionState = SessionStateSchema.safeParse(unparsedSessionState);

      if (!parsedSessionState.success) {
        setViewState({ status: "error", message: "The server returned an invalid session." });
        return;
      }

      if (!isCreating && parsedSessionState.data.id !== parsedSessionId?.data) {
        setViewState({ status: "error", message: "The server returned a different session." });
        return;
      }

      setViewState({ status: "ready", session: parsedSessionState.data });
    });

    socket.on("connect_error", () => {
      setViewState({ status: "error", message: "The session server could not be reached." });
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [navigate, playerId, sessionId]);

  function handleReadyChange(ready: boolean) {
    if (viewState.status === "ready" && viewState.session.phase === "lobby") {
      socketRef.current?.emit("lobby:set-ready", { ready });
    }
  }

  function handleAction(action: TurnAction) {
    if (viewState.status !== "ready" || viewState.session.phase !== "game") {
      return;
    }

    socketRef.current?.emit("game:action", action);
  }

  function handleResign() {
    if (viewState.status === "ready" && viewState.session.phase === "game") {
      socketRef.current?.emit("game:resign");
    }
  }

  function handleOfferDraw() {
    if (viewState.status === "ready" && viewState.session.phase === "game") {
      socketRef.current?.emit("game:draw-offered");
    }
  }

  function handleCancelDraw() {
    if (viewState.status === "ready" && viewState.session.phase === "game") {
      socketRef.current?.emit("game:draw-offer-cancelled");
    }
  }

  function handleAcceptDraw() {
    if (viewState.status === "ready" && viewState.session.phase === "game") {
      socketRef.current?.emit("game:draw-offer-accepted");
    }
  }

  function handleDenyDraw() {
    if (viewState.status === "ready" && viewState.session.phase === "game") {
      socketRef.current?.emit("game:draw-offer-denied");
    }
  }

  function handleRequestRematch() {
    socketRef.current?.emit("rematch:requested");
  }

  function handleAcceptRematch() {
    socketRef.current?.emit("rematch:accepted");
  }

  function handleDenyRematch() {
    socketRef.current?.emit("rematch:denied");
  }

  function handleCancelRematch() {
    socketRef.current?.emit("rematch:request-cancelled");
  }

  function handleLeave() {
    socketRef.current?.emit("session:leave");
    void navigate("/");
  }

  const displayedSessionId =
    viewState.status === "ready"
      ? viewState.session.id
      : sessionId === "new"
        ? "Creating"
        : sessionId;

  return (
    <main className="game-page">
      <header className="game-header">
        <div>
          <p className="game-kicker">
            {viewState.status === "ready" && viewState.session.phase === "game"
              ? "Live match"
              : "Match session"}
          </p>
          <h1>Lithello</h1>
        </div>
        <div className="game-identity">
          <span>Session</span>
          <code>{displayedSessionId}</code>
        </div>
      </header>

      {viewState.status === "loading" && (
        <section className="session-status" aria-live="polite">
          <span className="status-mark" />
          <div>
            <p className="game-kicker">Connecting</p>
            <h2>{sessionId === "new" ? "Opening your table" : "Finding your session"}</h2>
          </div>
        </section>
      )}

      {viewState.status === "error" && (
        <section className="session-status session-error" role="alert">
          <div>
            <p className="game-kicker">Unable to connect</p>
            <h2>Session unavailable</h2>
            <p>{viewState.message}</p>
            <div className="session-error-actions">
              <Link className="session-create-link" to="/session/new">
                Create a new session
              </Link>
              <Link className="session-home-link" to="/">
                Return home
              </Link>
            </div>
          </div>
        </section>
      )}

      {viewState.status === "ready" && viewState.session.phase === "lobby" && (
        <LobbyView
          lobby={viewState.session}
          sessionId={viewState.session.id}
          playerId={playerId}
          onReadyChange={handleReadyChange}
          onLeave={handleLeave}
        />
      )}

      {viewState.status === "ready" && viewState.session.phase === "game" && (
        <GameView
          game={viewState.session}
          playerId={playerId}
          onAction={handleAction}
          onResign={handleResign}
          onOfferDraw={handleOfferDraw}
          onCancelDraw={handleCancelDraw}
          onAcceptDraw={handleAcceptDraw}
          onDenyDraw={handleDenyDraw}
        />
      )}

      {viewState.status === "ready" &&
        viewState.session.phase === "postgame" &&
        (() => {
          const session = viewState.session;
          const completion = session.completion;
          const outcome =
            completion.reason === "draw"
              ? "draw"
              : completion.reason === "victory" || completion.reason === "timeout"
                ? completion.winnerId === playerId
                  ? "win"
                  : "loss"
                : completion.resignerId === playerId
                  ? "loss"
                  : "win"; // resignation: the resigner loses

          const rematchStatus =
            session.rematchStatus.status === "requested"
              ? session.rematchStatus.requesterId === playerId
                ? "requested-by-you"
                : "requested-by-opponent"
              : "idle";

          const playerColor = session.black.id === playerId ? "b" : "w";
          const player = playerColor === "w" ? session.white : session.black;
          const opponent = playerColor === "w" ? session.black : session.white;

          return (
            <div className="game-layout">
              <div className="board-panel">
                <div className="board-clock">
                  <PlayerClockView clock={opponent.clock} />
                </div>
                <GameBoard board={session.board} possibleMoves={[]} onMove={() => undefined} />
                <div className="board-clock">
                  <PlayerClockView clock={player.clock} />
                </div>
              </div>
              <div className="game-sidebar game-sidebar-finished">
                <GameScoreView
                  blackScore={getPlayerScore(session.board, "b")}
                  whiteScore={getPlayerScore(session.board, "w")}
                />
                <PostMatchView
                  outcome={outcome}
                  reason={completion.reason}
                  rematchStatus={rematchStatus}
                  onAcceptRematch={handleAcceptRematch}
                  onCancelRematch={handleCancelRematch}
                  onDenyRematch={handleDenyRematch}
                  onRequestRematch={handleRequestRematch}
                />
                {/* TODO: Make this component's draw-stuff injected */}
                <MoveHistory moves={session.history} />
              </div>
            </div>
          );
        })()}
    </main>
  );
}
