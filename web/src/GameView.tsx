import type { GameState, UserID, TurnAction } from "@lithello/shared/types";
import { getPlayerScore, getValidMoveLocations } from "@lithello/shared/util";

import { GameBoard } from "./GameBoard.tsx";
import { GameScoreView } from "./GameScoreView.tsx";
import { MoveHistory } from "./MoveHistory.tsx";
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

  return (
    <div className="game-layout">
      <GameBoard
        board={game.board}
        possibleMoves={possibleMoves}
        onMove={(action) => onAction({ ...action, playerColor })}
      />
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
      </div>
    </div>
  );
}
