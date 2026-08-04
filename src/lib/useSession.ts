'use client';

import { useMemo, useSyncExternalStore } from 'react';

/**
 * The logged-in customer, read from localStorage.
 *
 * localStorage is an external store, so it is read through useSyncExternalStore
 * rather than an effect + setState: no flash of the wrong header, no
 * `set-state-in-effect` lint violation, and a second tab stays in sync via the
 * `storage` event.
 */

const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';

/** `storage` only fires in *other* tabs, so same-tab writes announce themselves. */
const SESSION_EVENT = 'foodbox:session';

export interface SessionUser {
  _id?: string;
  fullName?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  zone?: string;
  zoneDisplay?: string;
  address?: string;
  walletBalance?: number;
  package?: string;
  [key: string]: unknown;
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SESSION_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SESSION_EVENT, onChange);
  };
}

/** Raw JSON string so the snapshot stays referentially stable between renders. */
function getSnapshot() {
  return localStorage.getItem(TOKEN_KEY) ? localStorage.getItem(USER_KEY) : null;
}

const getServerSnapshot = () => null;

const subscribeToNothing = () => () => {};

/**
 * false while server-rendering and during hydration, true afterwards. Lets a
 * guarded page tell "not logged in" apart from "we don't know yet" and avoid
 * bouncing the user out before localStorage has been read.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
}

export function useSession(): { user: SessionUser | null; hydrated: boolean } {
  const hydrated = useHydrated();
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const user = useMemo<SessionUser | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }, [raw]);

  return { user, hydrated };
}

/** Persists profile changes and tells every `useSession` in this tab. */
export function saveSessionUser(user: SessionUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Display name with a sensible fallback — `fullName` is not always present. */
export function displayName(user: SessionUser | null): string {
  return user?.fullName || user?.name || 'ইউজার';
}
