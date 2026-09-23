import type { GameState, SessionMessage, UserID, TurnAction } from "@lithello/shared/types";
import { getPlayerScore, getValidMoveLocations } from "@lithello/shared/util";

import { GameBoard } from "./GameBoard.tsx";
import { GameScoreView } from "./GameScoreView.tsx";
import { MoveHistory } from "./MoveHistory.tsx";
import { PlayerClockView } from "./components/clocks/PlayerClockView.tsx";
import { ChatView } from "./components/ChatView.tsx";
import "./GameView.css";

export type DrawStatus = "idle" | "offered-by-you" | "offered-by-opponent";

interface GameViewProps {
  game: GameState;
  playerId: UserID;
  onAction: (action: TurnAction) => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onCancelDraw: () => void;
  onAcceptDraw: () => void;
  onDenyDraw: () => void;
  messages: SessionMessage[];
  getAuthorName: (authorId: UserID) => string;
  onSendMessage: (content: string) => void;
}

export function GameView({
  game,
  playerId,
  onAction,
  onResign,
  onOfferDraw,
  onCancelDraw,
  onAcceptDraw,
  onDenyDraw,
  messages,
  getAuthorName,
  onSendMessage,
}: GameViewProps) {
  const playerColor = game.black.id === playerId ? "b" : "w";
  const isPlayerTurn = game.activePlayerId === playerId;
  const possibleMoves = isPlayerTurn ? getValidMoveLocations(game.board, playerColor) : [];

  const drawStatus: DrawStatus =
    game.drawStatus.status === "offered"
      ? game.drawStatus.offererId === playerId
        ? "offered-by-you"
        : "offered-by-opponent"
      : "idle";

  const player = playerColor === "w" ? game.white : game.black;
  const opponent = playerColor === "w" ? game.black : game.white;

  return (
    <div className="game-layout">
      <div className="board-panel">
        <div className="board-clock">
          <PlayerClockView clock={opponent.clock} />
        </div>
        <GameBoard
          board={game.board}
          possibleMoves={possibleMoves}
          onMove={(action) => onAction({ ...action, playerColor })}
        />
        <div className="board-clock">
          <PlayerClockView clock={player.clock} />
        </div>
      </div>
      <div className="game-sidebar">
        <GameScoreView
          blackScore={getPlayerScore(game.board, "b")}
          whiteScore={getPlayerScore(game.board, "w")}
        />
        <MoveHistory
          moves={game.history}
          drawStatus={drawStatus}
          onResign={onResign}
          onOfferDraw={onOfferDraw}
          onCancelDraw={onCancelDraw}
          onAcceptDraw={onAcceptDraw}
          onDenyDraw={onDenyDraw}
        />
        <ChatView
          messages={messages}
          playerId={playerId}
          getAuthorName={getAuthorName}
          onSend={onSendMessage}
        />
      </div>
    </div>
  );
}
