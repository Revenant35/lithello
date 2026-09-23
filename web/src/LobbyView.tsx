import { useState } from "react";
import { Check, Copy, LogOut, UserRound } from "lucide-react";

import {
  INITIAL_BOARD,
  type LobbyState,
  type PlayerID,
  type SessionID,
} from "@lithello/shared/types";

import { GameBoard } from "./GameBoard.tsx";
import "./LobbyView.css";

interface LobbyViewProps {
  lobby: LobbyState;
  sessionId: SessionID;
  playerId: PlayerID;
  onReadyChange: (ready: boolean) => void;
  onLeave: () => void;
}

type CopyStatus = "idle" | "copied" | "error";

export function LobbyView({ lobby, sessionId, playerId, onReadyChange, onLeave }: LobbyViewProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const players = [lobby.host, lobby.guest] as const;
  const currentPlayer = players.find((player) => player?.id === playerId);
  const invitationUrl = new URL(`/session/${sessionId}`, window.location.origin).toString();

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="game-layout">
      <div className="lobby-board">
        <GameBoard board={INITIAL_BOARD} possibleMoves={[]} onMove={() => undefined} />
        <div className="lobby-board-message">
          <span>Session open</span>
          <strong>Ready when you are</strong>
        </div>
      </div>

      <aside className="lobby-session-panel">
        <div>
          <p className="game-kicker">Waiting room</p>
          <h2>Take your seats</h2>
          <p className="lobby-intro">The game begins when both players are ready.</p>
        </div>

        <ol className="lobby-player-list" aria-label="Players">
          {players.map((player, index) => {
            return (
              <li className={player ? undefined : "lobby-player-empty"} key={player?.id ?? index}>
                <span className="lobby-player-icon">
                  <UserRound aria-hidden="true" size={17} />
                </span>
                <span className="lobby-player-copy">
                  <strong>
                    {player ? (player.id === playerId ? "You" : "Opponent") : "Open seat"}
                  </strong>
                  <small>Player {index === 0 ? "A" : "B"}</small>
                </span>
                <span
                  className={`lobby-player-status ${player && !player.isConnected ? "lobby-player-disconnected" : player?.isReady ? "lobby-player-ready" : ""}`}
                >
                  {player && !player.isConnected
                    ? "Reconnecting"
                    : player?.isReady
                      ? "Ready"
                      : player
                        ? "Not ready"
                        : "Waiting"}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="lobby-invitation">
          <p>Invitation link</p>
          <div>
            <code>{invitationUrl}</code>
            <button type="button" onClick={() => void copyInvitation()}>
              {copyStatus === "copied" ? (
                <Check aria-hidden="true" size={15} />
              ) : (
                <Copy aria-hidden="true" size={15} />
              )}
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          {copyStatus === "error" && <small role="alert">Could not copy the invitation.</small>}
        </div>

        <div className="lobby-actions">
          <button
            className={`lobby-ready-button ${currentPlayer?.isReady ? "lobby-unready-button" : ""}`}
            type="button"
            disabled={!currentPlayer}
            onClick={() => onReadyChange(!currentPlayer?.isReady)}
          >
            {currentPlayer?.isReady ? "Not ready" : "Ready up"}
          </button>
          <button className="lobby-leave-button" type="button" onClick={onLeave}>
            <LogOut aria-hidden="true" size={15} />
            Leave session
          </button>
        </div>
      </aside>
    </div>
  );
}
