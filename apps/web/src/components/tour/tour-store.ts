import { useSyncExternalStore } from 'react';

/** The guided tour of the page shown, for the header's "?" button (which replays it). */
type RegisteredTour = { id: string; start: () => void };

let current: RegisteredTour | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Called by the page's `Tour`; the returned function unregisters it. */
export function registerTour(tour: RegisteredTour): () => void {
  current = tour;
  emit();
  return () => {
    if (current !== tour) return;
    current = null;
    emit();
  };
}

export function useRegisteredTour(): RegisteredTour | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
