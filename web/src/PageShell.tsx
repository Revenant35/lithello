import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <section className="brand-panel" aria-labelledby="brand-title">
        <div className="brand-copy">
          <p className="wordmark">Lithello</p>
          <p className="edition">Online edition · Two players</p>
          <h1 id="brand-title">A quiet battle for every square.</h1>
          <p className="brand-intro">
            Invite a friend, claim the corners, and turn the board in your favor.
          </p>
        </div>

        <div className="board-art" aria-hidden="true">
          <span className="disc disc-light disc-one" />
          <span className="disc disc-dark disc-two" />
          <span className="disc disc-light disc-three" />
          <span className="disc disc-dark disc-four" />
        </div>

        <p className="brand-footer">64 squares · One winner</p>
      </section>

      <section className="content-panel">{children}</section>
    </main>
  );
}
