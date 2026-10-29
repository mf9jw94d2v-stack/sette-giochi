import type { PersistenceAdapter } from "./types";
import { LocalPersistenceAdapter } from "./localAdapter";

export * from "./types";
export { LocalPersistenceAdapter } from "./localAdapter";

let singleton: PersistenceAdapter | null = null;
let version = 0;
const listeners = new Set<() => void>();

/**
 * The active persistence adapter: on the device for a guest, the account
 * once signed in. The AuthProvider swaps it when the session changes
 * (src/features/auth/AuthProvider.tsx); every game reads it from here.
 */
export function getPersistence(): PersistenceAdapter {
  if (singleton) return singleton;
  singleton = new LocalPersistenceAdapter();
  return singleton;
}

/** Replace the adapter (on sign-in/out, and in tests). */
export function setPersistence(adapter: PersistenceAdapter): void {
  singleton = adapter;
  version++;
  for (const fn of listeners) fn();
}

/**
 * A number that changes whenever the adapter is replaced, so anything that
 * read from the previous one (a daily lock, say) can read again.
 */
export function persistenceVersion(): number {
  return version;
}

export function onPersistenceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
