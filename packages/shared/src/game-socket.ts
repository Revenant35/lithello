import type { Square } from './game-board.ts';
import type { GameSessionWire } from './game-session.ts';
import type { GameMessageContent } from './game-message.ts';

export interface ClientToServerGameEvents {
  /** Asks the server to push the current session. */
  'get-session': () => void;
  move: (square: Square) => void;
  resign: () => void;
  'send-message': (content: GameMessageContent) => void;
}

export interface ServerToClientGameEvents {
  /** The whole session, pushed after every change. */
  session: (session: GameSessionWire) => void;
}
