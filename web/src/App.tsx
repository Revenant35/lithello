import { Link, Route, Routes, useParams } from "react-router-dom";

import { authClient } from "./auth-client";
import { AuthForm } from "./AuthForm";
import { PageShell } from "./PageShell";
import { SessionView } from "./SessionView";
import "./App.css";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/session/:sessionId" element={<SessionPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function HomePage() {
  const { data: session, error, isPending, refetch } = authClient.useSession();

  if (isPending) {
    return <AccountStatus message="Checking your session..." />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="status-panel" role="alert">
          <p>We could not check your session.</p>
          <button className="text-button" type="button" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <AuthForm onAuthenticated={() => void refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="status-page">
        <p className="eyebrow">Signed in as {session.user.name}</p>
        <h2>Open a new table</h2>
        <p>Create a session, then share its permanent link with your opponent.</p>
        <Link className="primary-link" to="/session/new">
          Create session
        </Link>
        <button
          className="text-button home-sign-out"
          type="button"
          onClick={() => void authClient.signOut()}
        >
          Sign out
        </button>
      </section>
    </PageShell>
  );
}

function SessionPage() {
  const { sessionId } = useParams();
  const { data: session, error, isPending, refetch } = authClient.useSession();

  if (isPending) {
    return <AccountStatus message="Checking your player..." />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="status-panel" role="alert">
          <p>We could not check your player.</p>
          <button className="text-button" type="button" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <AuthForm onAuthenticated={() => void refetch()} />
      </PageShell>
    );
  }

  return <SessionView key={sessionId} playerId={session.user.id} />;
}

function AccountStatus({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="status-panel" aria-live="polite">
        <span className="status-mark" />
        <p>{message}</p>
      </div>
    </PageShell>
  );
}

function NotFoundPage() {
  return (
    <PageShell>
      <section className="status-page">
        <p className="eyebrow">Wrong square</p>
        <h2>Page not found</h2>
        <p>There is nothing on this part of the board.</p>
        <Link className="text-button inline-link" to="/">
          Return home
        </Link>
      </section>
    </PageShell>
  );
}
