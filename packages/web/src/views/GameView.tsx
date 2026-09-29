import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import {
  type ClientToServerGameEvents,
  GameIDSchema,
  type GameSession,
  GameSessionSchema,
  getColorForPly,
  getConnectionState,
  getBoardScore,
  getCurrentBoard,
  getDisplayClocks,
  getLastMove,
  getLegalMoves,
  getTurnDeadline,
  type PlayerColor,
  type ServerToClientGameEvents,
  type Square,
  type UserID,
} from '@lithello/shared';
import { AbandonNotice } from '../components/AbandonNotice';
import { GameBoard } from '../components/GameBoard';
import { GameChat } from '../components/GameChat';
import { AppShell } from '../components/AppShell';
import { MoveHistory } from '../components/MoveHistory';
import { PostMatchView } from '../components/PostMatchView';
import { PlayerClockView } from '../components/clocks/PlayerClockView';
import { authClient } from '../lib/auth-client';
import { useCountdown } from '../lib/use-countdown';

const GAME_SOCKET_URL = `${import.meta.env.VITE_API_URL}/game`;

const NO_MOVES: readonly Square[] = [];

export function GameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: authSession } = authClient.useSession();
  const [session, setSession] = useState<GameSession | null>(null);
  const [connectFailed, setConnectFailed] = useState(false);
  const socketRef = useRef<Socket<
    ServerToClientGameEvents,
    ClientToServerGameEvents
  > | null>(null);

  const result = GameIDSchema.safeParse(gameId);

  const game = session?.game;
  const isFinished = game?.endedAt != null;

  // Games are created with a short grace period before the clocks start, so
  // the board stays locked until it passes. Called before the early returns
  // below so the hook order never changes between renders.
  const secondsUntilStart = useCountdown(
    !isFinished && game?.startedAt ? game.startedAt : null,
  );
  const hasStarted = game?.startedAt != null && secondsUntilStart === 0;

  useEffect(() => {
    if (!result.success) {
      return;
    }

    const socket: Socket<ServerToClientGameEvents, ClientToServerGameEvents> =
      io(GAME_SOCKET_URL, {
        transports: ['websocket'],
        auth: { gameId: result.data },
      });
    socketRef.current = socket;

    socket.on('connect_error', () => setConnectFailed(true));

    socket.on('session', (data: unknown) => {
      // The wire carries bitboards as hex and dates as strings; parsing runs
      // the codec's decode direction and hands back a usable session.
      const parsed = GameSessionSchema.safeParse(data);
      if (parsed.success) {
        setSession(parsed.data);
      }
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [result.success, result.data]);

  if (!result.success || connectFailed) {
    return <Navigate to="/home" replace />;
  }

  const viewerColor: PlayerColor | undefined =
    game && authSession
      ? game.white.id === authSession.user.id
        ? 'w'
        : game.black.id === authSession.user.id
          ? 'b'
          : undefined
      : undefined;

  // Everything below the board is derived from the moves rather than sent.
  const board = session ? getCurrentBoard(session.moves) : null;
  const lastMove = session ? getLastMove(session.moves) : null;
  const colorToMove =
    !isFinished && lastMove ? getColorForPly(lastMove.ply + 1) : undefined;
  const isViewerTurn =
    hasStarted && viewerColor !== undefined && colorToMove === viewerColor;

  const legalMoves =
    board && isViewerTurn && viewerColor
      ? getLegalMoves(board, viewerColor)
      : NO_MOVES;

  // Freezes the losing side's clock at the truth once the game has ended,
  // rather than the value from before the turn they never finished.
  const clocks = session ? getDisplayClocks(session) : null;

  // The recorded final position, rather than a rederivation from the moves.
  const finalScore =
    game?.finalWhitePieces != null && game.finalBlackPieces != null
      ? getBoardScore({
          whitePieces: game.finalWhitePieces,
          blackPieces: game.finalBlackPieces,
        })
      : undefined;
  const deadline = session ? getTurnDeadline(session) : null;

  function clockProps(color: PlayerColor) {
    return {
      remainingMs: color === 'w' ? (clocks?.white ?? 0) : (clocks?.black ?? 0),
      // Nobody is counting down until the game has actually started, so both
      // clocks sit idle on their full time rather than showing more than it.
      expiresAt:
        hasStarted && deadline?.color === color ? deadline.expiresAt : undefined,
    };
  }

  function handleMove(square: Square) {
    if (isViewerTurn) {
      socketRef.current?.emit('move', square);
    }
  }

  function handleResign() {
    if (!isFinished) {
      socketRef.current?.emit('resign');
    }
  }

  function handleSendMessage(content: string) {
    socketRef.current?.emit('send-message', content);
  }

  const viewer = game
    ? viewerColor === 'b'
      ? game.black
      : game.white
    : undefined;
  const opponent = game
    ? viewerColor === 'b'
      ? game.white
      : game.black
    : undefined;

  const bottomColor: PlayerColor = viewerColor === 'b' ? 'b' : 'w';
  const topColor: PlayerColor = bottomColor === 'b' ? 'w' : 'b';

  const topConnection = session ? getConnectionState(session, topColor) : null;
  const bottomConnection = session
    ? getConnectionState(session, bottomColor)
    : null;

  return (
    <AppShell className="game-shell">
      <div className="mx-auto w-full max-w-[942px]">
        <Link to="/home" className="back-link">
          <ArrowLeft size={14} /> The clubhouse
        </Link>
        <header className="match-heading">
          <div>
            <p className="eyebrow accent-text">
              {!session ? 'Connecting' : isFinished ? 'Final result' : 'Live match'}
            </p>
            <h1 className="display-heading">
              {isFinished
                ? 'That’s a good game.'
                : 'Make every move count.'}
            </h1>
          </div>
          <div className="match-id">
            <span>THE MATCH</span>
            <code title={result.data}>#{result.data.slice(0, 8)}</code>
          </div>
        </header>

        {!session || !game || !board ? (
          <div role="status" className="empty-history">
            <span className="mini-discs mb-4" aria-hidden="true">
              <i />
              <i />
            </span>
            <p>Getting the board ready…</p>
          </div>
        ) : (
          <div className="game-layout">
            <div className="board-column">
              {opponent && (
                <div className="player-bar">
                  <div className="player-identity">
                    <span
                      className={`disc disc-${topColor} player-disc`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>{opponent.name}</strong>
                      <small>
                        {topColor === 'b' ? 'Black' : 'White'} ·{' '}
                        {opponent.ratingBefore}
                      </small>
                      {topConnection && !topConnection.isConnected && (
                        <AbandonNotice abandonsAt={topConnection.abandonsAt} />
                      )}
                    </div>
                  </div>
                  <PlayerClockView {...clockProps(topColor)} />
                </div>
              )}
              <GameBoard
                board={board}
                legalMoves={legalMoves}
                onMove={handleMove}
              />
              {viewer && (
                <div className="player-bar mt-2">
                  <div className="player-identity">
                    <span
                      className={`disc disc-${bottomColor} player-disc`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>
                        {viewer.name}
                        {viewerColor && ' (you)'}
                      </strong>
                      <small>
                        {bottomColor === 'b' ? 'Black' : 'White'} ·{' '}
                        {viewer.ratingBefore}
                      </small>
                      {bottomConnection && !bottomConnection.isConnected && (
                        <AbandonNotice
                          abandonsAt={bottomConnection.abandonsAt}
                        />
                      )}
                    </div>
                  </div>
                  <PlayerClockView {...clockProps(bottomColor)} />
                </div>
              )}
            </div>

            <div className="game-sidebar">
              {!isFinished && !hasStarted && (
                <div role="status" className="turn-status">
                  Starting in {secondsUntilStart}…
                  <p>Take a breath. The clocks are not running yet.</p>
                </div>
              )}
              {!isFinished && hasStarted && (
                <div
                  role="status"
                  className={`turn-status ${isViewerTurn ? 'is-your-turn' : ''}`}
                >
                  {isViewerTurn
                    ? 'Your move. Make it a good one.'
                    : viewerColor
                      ? 'Your opponent is thinking…'
                      : `${colorToMove === 'b' ? 'Black' : 'White'} to move`}
                  <p>
                    {isViewerTurn
                      ? 'Choose a highlighted square to place your disc.'
                      : 'A little patience is part of the game.'}
                  </p>
                </div>
              )}
              {isFinished && game.result && game.endReason && (
                <PostMatchView
                  result={game.result}
                  endReason={game.endReason}
                  score={finalScore}
                  viewerColor={viewerColor}
                />
              )}
              <MoveHistory
                moves={session.moves}
                onResign={
                  !isFinished && hasStarted && viewerColor
                    ? handleResign
                    : undefined
                }
              />
              {/* Only the two players may post; the server rejects anyone else. */}
              <GameChat
                messages={session.messages}
                white={game.white}
                black={game.black}
                viewerId={authSession?.user.id as UserID | undefined}
                onSend={viewerColor ? handleSendMessage : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
