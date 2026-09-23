import { useEffect, useRef, useState } from "react";
import type { SessionMessage, UserID } from "@lithello/shared/types";
import "./ChatView.css";

interface ChatViewProps {
  messages: SessionMessage[];
  playerId: UserID;
  getAuthorName: (authorId: UserID) => string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatView({ messages, playerId, getAuthorName, onSend, disabled = false }: ChatViewProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className="chat">
      <p className="chat-heading">Chat</p>
      <ol className="chat-messages" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 && (
          <li className="chat-empty">No messages yet</li>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.authorId === playerId;
          return (
            <li key={i} className={`chat-message ${isOwn ? "chat-message-own" : "chat-message-other"}`}>
              <span className="chat-author">{isOwn ? "You" : getAuthorName(msg.authorId)}</span>
              <span className="chat-content">{msg.content}</span>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ol>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          type="text"
          placeholder="Say something…"
          value={draft}
          maxLength={500}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" disabled={disabled || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
