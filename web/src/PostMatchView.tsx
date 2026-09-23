import { Link } from "react-router-dom";
import { Check, RotateCcw, Trophy, X } from "lucide-react";

import type { GameCompletion } from "@lithello/shared/types";

import "./PostMatchView.css";

interface PostMatchViewProps {
  outcome: "win" | "loss" | "draw";
  reason: GameCompletion["reason"];
  rematchStatus: RematchStatus;
  onAcceptRematch: () => void;
  onCancelRematch: () => void;
  onDenyRematch: () => void;
  onRequestRematch: () => void;
}

export type RematchStatus = "idle" | "requested-by-you" | "requested-by-opponent";

const OUTCOME_COPY = {
  win: { heading: "You win!", message: "The board is yours." },
  loss: { heading: "You lose", message: "Your opponent claimed the board." },
  draw: { heading: "Draw game", message: "The board ends even." },
} as const;

export function PostMatchView({
  outcome,
  reason,
  rematchStatus,
  onAcceptRematch,
  onCancelRematch,
  onDenyRematch,
  onRequestRematch,
}: PostMatchViewProps) {
  const copy = OUTCOME_COPY[outcome];

  return (
    <section className="post-match" aria-labelledby="post-match-heading" aria-live="polite">
      <Trophy className="post-match-icon" aria-hidden="true" size={20} />
      <div className="post-match-copy">
        <p>
          {reason === "resignation"
            ? outcome === "win"
              ? "Won by resignation"
              : "You resigned"
            : reason === "timeout"
              ? outcome === "win"
                ? "Won by timeout"
                : "You ran out of time"
            : "Final result"}
        </p>
        <h2 id="post-match-heading">{copy.heading}</h2>
        <span>{copy.message}</span>
      </div>

      {rematchStatus === "requested-by-opponent" && (
        <div className="post-match-rematch-alert" role="alert">
          <p>Your opponent wants a rematch</p>
          <div className="post-match-rematch-alert-actions">
            <button type="button" onClick={onAcceptRematch}>
              <Check aria-hidden="true" size={13} />
              Accept
            </button>
            <button type="button" onClick={onDenyRematch}>
              <X aria-hidden="true" size={13} />
              Decline
            </button>
          </div>
        </div>
      )}

      <div className="post-match-actions">
        <Link to="/">Return home</Link>

        {rematchStatus === "requested-by-you" && (
          <button className="post-match-secondary" type="button" onClick={onCancelRematch}>
            <X aria-hidden="true" size={14} />
            Cancel request
          </button>
        )}

        {(rematchStatus === "idle" || rematchStatus === "requested-by-opponent") && (
          <button
            type="button"
            disabled={rematchStatus === "requested-by-opponent"}
            onClick={onRequestRematch}
          >
            <RotateCcw aria-hidden="true" size={14} />
            Rematch
          </button>
        )}
      </div>
    </section>
  );
}
