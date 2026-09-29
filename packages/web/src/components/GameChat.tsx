import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import {
  type Game,
  type GameMessage,
  GameMessageContentSchema,
  type UserID,
} from '@lithello/shared';

const MAX_LENGTH = 500;

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function GameChat({
  messages,
  white,
  black,
  viewerId,
  onSend,
}: {
  messages: readonly GameMessage[];
  white: Game['white'];
  black: Game['black'];
  viewerId?: UserID;
  onSend?: (content: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLOListElement>(null);

  // Chat reads bottom-up, so new arrivals should not need scrolling to.
  useEffect(() => {
    const list = listRef.current;

    if (list !== null) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length]);

  // The database rejects whitespace-only content, so trim before deciding
  // whether there is anything to send.
  const trimmed = draft.trim();
  const canSend =
    onSend !== undefined && GameMessageContentSchema.safeParse(trimmed).success;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    onSend(trimmed);
    setDraft('');
  }

  function getAuthor(userId: UserID) {
    if (userId === white.id) {
      return { name: white.name, color: 'w' as const };
    }

    if (userId === black.id) {
      return { name: black.name, color: 'b' as const };
    }

    return { name: 'Unknown', color: null };
  }

  return (
    <section
      aria-label="Game chat"
      className="flex max-h-[24rem] min-h-56 flex-col self-stretch overflow-hidden rounded-lg border border-wood-700 bg-wood-800"
    >
      <header className="border-b border-wood-700">
        <h2 className="flex items-center justify-between px-5 pt-5 pb-4 text-sm font-semibold text-parchment-50">
          Table talk{' '}
          <span className="text-xs font-normal text-parchment-500">
            {messages.length}
          </span>
        </h2>
      </header>

      {messages.length === 0 ? (
        <p className="grid flex-1 place-items-center px-5 text-center text-sm text-parchment-500">
          Say something. A good game deserves good company.
        </p>
      ) : (
        <ol ref={listRef} className="flex-1 list-none overflow-y-auto px-5 py-3">
          {messages.map((message) => {
            const author = getAuthor(message.userId);
            const isViewer = message.userId === viewerId;

            return (
              <li key={message.id} className="py-1.5 text-sm">
                <span className="flex items-baseline gap-2">
                  {author.color && (
                    <span
                      aria-hidden="true"
                      className={`disc disc-${author.color} shrink-0`}
                      style={{ width: 10, height: 10 }}
                    />
                  )}
                  <strong className="text-parchment-50">
                    {author.name}
                    {isViewer && <span className="sr-only"> (you)</span>}
                  </strong>
                  <time
                    dateTime={message.createdAt.toISOString()}
                    className="ml-auto shrink-0 font-mono text-[0.65rem] text-parchment-500"
                  >
                    {formatTime(message.createdAt)}
                  </time>
                </span>
                <span className="block break-words text-parchment-300">
                  {message.content}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {onSend && (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-wood-700 p-3"
        >
          <label htmlFor="chat-message" className="sr-only">
            Message
          </label>
          <input
            id="chat-message"
            type="text"
            value={draft}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            placeholder="Say something…"
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 rounded border border-wood-700 bg-wood-900 px-3 py-2 text-sm text-parchment-50 placeholder:text-parchment-500 focus:border-brass-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="shrink-0 rounded border border-wood-700 px-3 py-2 text-parchment-50 transition-colors hover:border-brass-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  );
}
