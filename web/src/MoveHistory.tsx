import { useRef } from "react";
import { Check, Flag, Handshake, X } from "lucide-react";

import type { BoardLocation, TurnAction } from "@lithello/shared/types";
import type { DrawStatus } from "./GameView.tsx";

import "./MoveHistory.css";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

function formatLocation(location: BoardLocation): string {
  return `${FILES[location.col]}${RANKS[location.row]}`.toUpperCase();
}

function formatTurnAction(action: TurnAction | undefined) {
  if (!action) {
    return null;
  }

  return action.kind === "pass" ? "Pass" : formatLocation(action.location);
}

interface MoveHistoryProps {
  moves: readonly TurnAction[];
  drawStatus: DrawStatus;
  onResign: () => void;
  onOfferDraw: () => void;
  onCancelDraw: () => void;
  onAcceptDraw: () => void;
  onDenyDraw: () => void;
}

export function MoveHistory({
  moves,
  drawStatus,
  onResign,
  onOfferDraw,
  onCancelDraw,
  onAcceptDraw,
  onDenyDraw,
}: MoveHistoryProps) {
  const resignDialog = useRef<HTMLDialogElement>(null);
  const turns = Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    black: moves[index * 2],
    white: moves[index * 2 + 1],
  }));

  return (
    <section className="move-history" aria-label="Move history">
      <header className="move-history-header">
        <h2>Moves</h2>
        <div className="move-history-columns" aria-hidden="true">
          <span />
          <span>Black</span>
          <span>White</span>
        </div>
      </header>

      {turns.length === 0 ? (
        <p className="move-history-empty">No moves yet</p>
      ) : (
        <ol className="move-history-list">
          {turns.map((turn, index) => (
            // Move history is append-only, so an item's turn index remains stable.
            // oxlint-disable-next-line react/no-array-index-key
            <li key={index}>
              <span className="move-history-number">{index + 1}.</span>
              <span className={turn.black?.kind === "pass" ? "move-history-pass" : undefined}>
                {formatTurnAction(turn.black)}
              </span>
              <span className={turn.white?.kind === "pass" ? "move-history-pass" : undefined}>
                {formatTurnAction(turn.white)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {drawStatus === "offered-by-opponent" && (
        <div className="move-history-draw-alert" role="alert">
          <p>Your opponent offered a draw</p>
          <div className="move-history-draw-alert-actions">
            <button type="button" onClick={onAcceptDraw}>
              <Check aria-hidden="true" size={13} />
              Accept
            </button>
            <button type="button" onClick={onDenyDraw}>
              <X aria-hidden="true" size={13} />
              Decline
            </button>
          </div>
        </div>
      )}

      <footer className="move-history-footer">
        {drawStatus === "offered-by-you" ? (
          <button type="button" onClick={onCancelDraw}>
            <X aria-hidden="true" size={15} />
            Cancel draw offer
          </button>
        ) : (
          <button
            type="button"
            disabled={drawStatus === "offered-by-opponent"}
            onClick={onOfferDraw}
          >
            <Handshake aria-hidden="true" size={15} />
            Offer draw
          </button>
        )}

        <button type="button" onClick={() => resignDialog.current?.showModal()}>
          <Flag aria-hidden="true" size={15} />
          Resign
        </button>
      </footer>

      <dialog className="resign-dialog" ref={resignDialog} aria-label="Confirm resignation">
        <h3>Resign this game?</h3>
        <p>This will end the game and award the win to your opponent.</p>
        <div className="resign-dialog-actions">
          <button type="button" autoFocus onClick={() => resignDialog.current?.close()}>
            Keep playing
          </button>
          <button
            className="resign-confirm-button"
            type="button"
            onClick={() => {
              resignDialog.current?.close();
              onResign();
            }}
          >
            Resign
          </button>
        </div>
      </dialog>
    </section>
  );
}
