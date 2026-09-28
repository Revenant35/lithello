import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
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
  const socketRef = useRef<
    Socket<ServerToClientGameEvents, ClientToServerGameEvents> | null
  >(null);

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

  return (
    <div className="min-h-svh bg-wood-950 p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-end justify-between border-b border-wood-700 pb-4">
          <div>
            <p className="mb-1 font-mono text-xs font-bold tracking-wide text-parchment-500 uppercase">
              {game?.status === 'active'
                ? 'Live match'
                : game?.status === 'finished'
                  ? 'Final result'
                  : 'Connecting'}
            </p>
            <h1 className="text-3xl font-medium text-parchment-50">Lithello</h1>
          </div>
          <div className="grid justify-items-end gap-1 text-right">
            <span className="font-mono text-[0.62rem] tracking-wide text-parchment-500 uppercase">
              Game
            </span>
            <code className="max-w-[23rem] truncate text-xs text-parchment-300">
              {result.data}
            </code>
          </div>
        </header>

        {!game ? (
          <p className="text-center text-sm text-parchment-500">
            Loading game…
          </p>
        ) : (
          <div className="grid grid-cols-1 items-center justify-center gap-8 lg:grid-cols-[minmax(0,43rem)_minmax(17rem,21rem)]">
            <div className="flex min-w-0 flex-col gap-2">
              {opponent && (
                <div className="flex justify-end">
                  <PlayerClockView clock={opponent.clock} />
                </div>
              )}
              <GameBoard
                board={game.board}
                possibleMoves={possibleMoves}
                onMove={handleMove}
              />
              {player && (
                <div className="flex justify-end">
                  <PlayerClockView clock={player.clock} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <GameScoreView
                blackScore={game.score.black}
                whiteScore={game.score.white}
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
                onResign={game.status === 'active' ? handleResign : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
