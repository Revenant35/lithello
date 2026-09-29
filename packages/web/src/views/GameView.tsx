import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import {
  GameIDSchema,
  GameStateSchema,
  type BoardLocation,
  type GameState,
  type ClientToServerGameEvents,
  type ServerToClientGameEvents,
} from '@lithello/shared';
import { GameBoard } from '../components/GameBoard';
import { AppShell } from '../components/AppShell';
import { GameScoreView } from '../components/GameScoreView';
import { MoveHistory } from '../components/MoveHistory';
import { PostMatchView } from '../components/PostMatchView';
import { PlayerClockView } from '../components/clocks/PlayerClockView';
import { authClient } from '../lib/auth-client';

const GAME_SOCKET_URL = `${import.meta.env.VITE_API_URL}/game`;

export function GameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: session } = authClient.useSession();
  const [game, setGame] = useState<GameState | null>(null);
  const [connectFailed, setConnectFailed] = useState(false);
  const socketRef = useRef<Socket<
    ServerToClientGameEvents,
    ClientToServerGameEvents
  > | null>(null);

  const result = GameIDSchema.safeParse(gameId);

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

    socket.on('state', (data: unknown) => {
      const parsed = GameStateSchema.safeParse(data);
      if (parsed.success) {
        setGame(parsed.data);
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

  const playerColor =
    game && session
      ? game.white.id === session.user.id
        ? 'w'
        : game.black.id === session.user.id
          ? 'b'
          : undefined
      : undefined;

  const isPlayerTurn =
    game?.status === 'active' &&
    playerColor !== undefined &&
    game.activePlayer === playerColor;

  const possibleMoves =
    game?.status === 'active' && isPlayerTurn ? game.possibleMoves : [];

  function handleMove(location: BoardLocation) {
    if (game?.status === 'active' && isPlayerTurn) {
      socketRef.current?.emit('move', location);
    }
  }

  function handleResign() {
    if (game?.status === 'active') {
      socketRef.current?.emit('resign');
    }
  }

  const player = game
    ? playerColor === 'b'
      ? game.black
      : game.white
    : undefined;
  const opponent = game
    ? playerColor === 'b'
      ? game.white
      : game.black
    : undefined;

  const bottomColor = playerColor === 'b' ? 'b' : 'w';
  const topColor = bottomColor === 'b' ? 'w' : 'b';

  return (
    <AppShell className="game-shell">
      <div className="mx-auto w-full max-w-[942px]">
        <Link to="/home" className="back-link">
          <ArrowLeft size={14} /> The clubhouse
        </Link>
        <header className="match-heading">
          <div>
            <p className="eyebrow accent-text">
              {game?.status === 'active'
                ? 'Live match'
                : game?.status === 'finished'
                  ? 'Final result'
                  : 'Connecting'}
            </p>
            <h1 className="display-heading">
              {game?.status === 'finished'
                ? 'That’s a good game.'
                : 'Make every move count.'}
            </h1>
          </div>
          <div className="match-id">
            <span>THE MATCH</span>
            <code title={result.data}>#{result.data.slice(0, 8)}</code>
          </div>
        </header>

        {!game ? (
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
                        {topColor === 'b' ? 'Black' : 'White'}
                        {!opponent.isConnected && ' · Disconnected'}
                      </small>
                    </div>
                  </div>
                  <PlayerClockView clock={opponent.clock} />
                </div>
              )}
              <GameBoard
                board={game.board}
                possibleMoves={possibleMoves}
                onMove={handleMove}
              />
              {player && (
                <div className="player-bar mt-2">
                  <div className="player-identity">
                    <span
                      className={`disc disc-${bottomColor} player-disc`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong>
                        {player.name}
                        {playerColor && ' (you)'}
                      </strong>
                      <small>
                        {bottomColor === 'b' ? 'Black' : 'White'}
                        {!player.isConnected && ' · Disconnected'}
                      </small>
                    </div>
                  </div>
                  <PlayerClockView clock={player.clock} />
                </div>
              )}
            </div>

            <div className="game-sidebar">
              {game.status === 'active' && (
                <div
                  role="status"
                  className={`turn-status ${isPlayerTurn ? 'is-your-turn' : ''}`}
                >
                  {isPlayerTurn
                    ? 'Your move. Make it a good one.'
                    : playerColor
                      ? 'Your opponent is thinking…'
                      : `${game.activePlayer === 'b' ? 'Black' : 'White'} to move`}
                  <p>
                    {isPlayerTurn
                      ? 'Choose a highlighted square to place your disc.'
                      : 'A little patience is part of the game.'}
                  </p>
                </div>
              )}
              <GameScoreView
                blackScore={game.score.black}
                whiteScore={game.score.white}
                viewerColor={playerColor}
              />
              {game.status === 'finished' && (
                <PostMatchView
                  result={game.result}
                  endReason={game.endReason}
                  viewerColor={playerColor}
                />
              )}
              <MoveHistory
                moves={game.moveHistory}
                onResign={
                  game.status === 'active' && playerColor
                    ? handleResign
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
