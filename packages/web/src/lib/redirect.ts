import type { Location } from 'react-router';

type RedirectState = {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>;
};

/**
 * Reads the location a route guard stashed in `state.from` and turns it back
 * into a path to navigate to after signing in. Falls back to `/` when the
 * state is missing or is not a same-origin path we put there ourselves.
 */
export function getRedirectPath(state: unknown): string {
  const from = (state as RedirectState | null | undefined)?.from;

  if (
    !from ||
    typeof from.pathname !== 'string' ||
    !from.pathname.startsWith('/') ||
    from.pathname.startsWith('//')
  ) {
    return '/';
  }

  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}
