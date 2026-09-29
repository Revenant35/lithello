import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  UserRound,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authClient } from '../lib/auth-client';
import { getRedirectPath } from '../lib/redirect';
import { BoardArtwork } from './BoardArtwork';
import { Brand } from './Brand';
import { RulesButton } from './RulesButton';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const isSignUp = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (response.error) {
        setError(
          response.error.message ??
            `Could not ${isSignUp ? 'create your account' : 'sign in'}. Please try again.`,
        );
        return;
      }
      navigate(getRedirectPath(location.state), { replace: true });
    } catch {
      setError(
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <a href="#auth-form" className="skip-link">
        Skip to sign {isSignUp ? 'up' : 'in'}
      </a>
      <header className="auth-header">
        <Brand />
        <RulesButton />
      </header>
      <main className="auth-main">
        <section className="auth-story" aria-label="Welcome to Lithello">
          <div className="story-topline">
            <span className="eyebrow">
              <span className="status-dot" /> THE CLASSIC GAME. A FRESH SPIN.
            </span>
            <span className="edition-label">EST. 2026</span>
          </div>
          <h1>
            A little friendly
            <br />
            <em>competition.</em>
          </h1>
          <p className="story-description">
            Two colors. Sixty-four squares.
            <br />
            Your next great rivalry starts here.
          </p>
          <BoardArtwork />
          <div className="story-bottomline">
            <span>MADE FOR YOUR NEXT “ONE MORE GAME.”</span>
            <span>01 — 64</span>
          </div>
        </section>
        <section className="auth-form-panel" aria-labelledby="auth-heading">
          <div className="auth-form-inner">
            <span className="eyebrow accent-text">YOUR SEAT AT THE TABLE</span>
            <h2 id="auth-heading" className="display-heading">
              {isSignUp ? 'Join the club.' : 'Welcome back.'}
            </h2>
            <p className="auth-intro">
              {isSignUp
                ? 'A good game starts with good company. Let’s get you set up.'
                : 'The board is set. Your next move is signing in.'}
            </p>
            <form id="auth-form" onSubmit={handleSubmit} className="auth-form">
              {isSignUp && (
                <label className="field-label" htmlFor="name">
                  Your name
                  <div className="input-wrap">
                    <UserRound size={18} aria-hidden="true" />
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      placeholder="What should we call you?"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                </label>
              )}
              <label className="field-label" htmlFor="email">
                Email address
                <div className="input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </label>
              <div>
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <div className="input-wrap">
                  <KeyRound size={18} aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      isSignUp ? 'new-password' : 'current-password'
                    }
                    placeholder={
                      isSignUp ? 'At least 8 characters' : 'Enter your password'
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    aria-describedby={isSignUp ? 'password-hint' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isSignUp && (
                  <p id="password-hint" className="field-hint">
                    Make it yours. Use 8 or more characters.
                  </p>
                )}
              </div>
              {error && (
                <p role="alert" className="error-notice">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="button-primary auth-submit"
              >
                {isSubmitting
                  ? isSignUp
                    ? 'Creating your account…'
                    : 'Signing you in…'
                  : isSignUp
                    ? 'Create your account'
                    : 'Let’s play'}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </form>
            <p className="auth-switch">
              {isSignUp ? 'Already part of the club?' : 'New around here?'}{' '}
              <Link
                to={isSignUp ? '/signin' : '/signup'}
                state={location.state}
              >
                {isSignUp ? 'Sign in' : 'Create an account'}{' '}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </p>
            <div className="auth-note">
              <span className="mini-discs" aria-hidden="true">
                <i />
                <i />
              </span>
              <span>
                No noise. No distractions.
                <br />
                Just a really good game.
              </span>
            </div>
          </div>
        </section>
      </main>
      <footer className="auth-footer">
        <span>Good games. Great company.</span>
        <span>Play thoughtfully. Win gracefully.</span>
      </footer>
    </div>
  );
}
