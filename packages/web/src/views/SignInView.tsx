import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { authClient } from '../lib/auth-client';

export function SignInView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error } = await authClient.signIn.email({ email, password });

    setIsSubmitting(false);

    if (error) {
      setError(error.message ?? 'Failed to sign in');
      return;
    }

    navigate('/');
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-cream-100 p-6 dark:bg-neutral-950">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-cream-200 bg-cream-50 p-8 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        onSubmit={handleSubmit}
      >
        <h1 className="text-center text-2xl font-medium text-ink dark:text-neutral-100">
          Sign in
        </h1>
        <label className="flex flex-col gap-1.5 text-sm text-slate dark:text-neutral-400">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-ink outline-none focus-visible:border-blue-muted focus-visible:ring-2 focus-visible:ring-blue-muted dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate dark:text-neutral-400">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-ink outline-none focus-visible:border-blue-muted focus-visible:ring-2 focus-visible:ring-blue-muted dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-muted px-3 py-2 font-medium text-white transition-colors hover:enabled:bg-blue-muted-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate dark:text-neutral-400">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-blue-muted hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
