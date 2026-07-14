import { AuthResponse } from '@/types/user';

/**
 * Wrapper around fetch that attaches the acting user's identity headers
 * (x-user-id, x-user-email) so the backend can attribute audit-trail actions.
 *
 * The logged-in user is read from localStorage['luka_auth'] (see AuthContext).
 * If no user is stored (e.g. during login) the request is made without the
 * identity headers.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('luka_auth');
      if (stored) {
        const authData = JSON.parse(stored) as AuthResponse;
        const user = authData?.user;
        if (user?.id) headers.set('x-user-id', user.id);
        if (user?.email) headers.set('x-user-email', user.email);
      }
    }
  } catch {
    // Ignore malformed auth data; proceed without identity headers.
  }

  return fetch(input, { ...init, headers });
}
