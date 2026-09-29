import { type FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authClient } from '../lib/auth-client';
import { getRedirectPath } from '../lib/redirect';

export function SignUpView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error } = await authClient.signUp.email({ name, email, password });

    setIsSubmitting(false);

    if (error) {
      setError(error.message ?? 'Failed to sign up');
      return;
    }

    navigate(getRedirectPath(location.state), { replace: true });
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-wood-950 p-6">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-wood-700 bg-wood-800 p-8 shadow-lg"
        onSubmit={handleSubmit}
      >
        <h1 className="text-center text-2xl font-medium text-parchment-50">
          Sign up
        </h1>
        <label className="flex flex-col gap-1.5 text-sm text-parchment-300">
          Name
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded-lg border border-wood-600 bg-wood-900 px-3 py-2 text-parchment-50 outline-none focus-visible:border-brass-400 focus-visible:ring-2 focus-visible:ring-brass-400"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-parchment-300">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-lg border border-wood-600 bg-wood-900 px-3 py-2 text-parchment-50 outline-none focus-visible:border-brass-400 focus-visible:ring-2 focus-visible:ring-brass-400"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-parchment-300">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="rounded-lg border border-wood-600 bg-wood-900 px-3 py-2 text-parchment-50 outline-none focus-visible:border-brass-400 focus-visible:ring-2 focus-visible:ring-brass-400"
          />
        </label>
        {error && <p className="text-sm text-ember-500">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-brass-400 px-3 py-2 font-medium text-wood-950 transition-colors hover:enabled:bg-brass-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing up…' : 'Sign up'}
        </button>
        <p className="text-center text-sm text-parchment-300">
          Already have an account?{' '}
          <Link
            to="/signin"
            state={location.state}
            className="font-medium text-brass-300 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
