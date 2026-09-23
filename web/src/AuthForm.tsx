import { type FormEvent, useState } from "react";

import { authClient } from "./auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  function selectMode(nextMode: AuthMode): void {
    setMode(nextMode);
    setErrorMessage(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(undefined);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    try {
      const result = isSignUp
        ? await authClient.signUp.email({
            email,
            name: String(formData.get("name")),
            password,
          })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Authentication failed");
        return;
      }

      onAuthenticated();
    } catch {
      setErrorMessage("The server could not be reached. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-heading">
      <p className="eyebrow">Enter the match room</p>
      <h2 id="auth-heading">{isSignUp ? "Create your player" : "Return to the board"}</h2>
      <p className="auth-intro">
        {isSignUp
          ? "Choose the name your opponent will see."
          : "Sign in to create a game or rejoin a match."}
      </p>

      <div className="auth-switch" aria-label="Authentication mode">
        <button
          type="button"
          aria-pressed={!isSignUp}
          className={!isSignUp ? "active" : undefined}
          onClick={() => selectMode("sign-in")}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={isSignUp}
          className={isSignUp ? "active" : undefined}
          onClick={() => selectMode("sign-up")}
        >
          Sign up
        </button>
      </div>

      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        {isSignUp && (
          <label>
            <span>Player name</span>
            <input name="name" type="text" autoComplete="name" placeholder="Ada" required />
          </label>
        )}

        <label>
          <span>Email address</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            placeholder="At least 8 characters"
            required
          />
        </label>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : isSignUp ? "Create player" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
