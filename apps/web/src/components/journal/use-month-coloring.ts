import type { Journal, ThemeFill } from '@tiralarc/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveMonthColoring } from '@/app/actions/journal';
import type { ActionState } from '@/lib/action-state';

const SAVE_DELAY_MS = 800;

/**
 * The colouring of the displayed month's decoration: what the server has, plus
 * the archer's edits, saved a moment after the last click (and when leaving).
 */
export function useMonthColoring(journal: Journal, month: string, theme: string | null) {
  // Edits since the page loaded, by "month/theme": moving to another month and back keeps them.
  const [edits, setEdits] = useState<Record<string, ThemeFill[]>>({});
  const [history, setHistory] = useState<{ key: string; steps: ThemeFill[][] }>({
    key: '',
    steps: [],
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | ActionState['code']>('idle');
  const pending = useRef<{ month: string; fills: ThemeFill[]; timer: number } | null>(null);

  const key = `${month}/${theme}`;
  const saved = journal.monthThemes.find((m) => m.month === month && m.theme === theme)?.fills;
  const fills = edits[key] ?? saved ?? [];
  const steps = history.key === key ? history.steps : [];

  const flush = useCallback(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    window.clearTimeout(job.timer);
    setStatus('saving');
    void saveMonthColoring(journal.id, job.month, job.fills).then((result) =>
      setStatus(result.code ?? 'saved'),
    );
  }, [journal.id]);

  // Leaving the page: don't lose the last clicks.
  useEffect(() => flush, [flush]);

  const apply = (next: ThemeFill[], nextSteps: ThemeFill[][]) => {
    // Another month's save is still waiting: send it before queuing this one.
    if (pending.current && pending.current.month !== month) flush();
    if (pending.current) window.clearTimeout(pending.current.timer);
    setEdits((all) => ({ ...all, [key]: next }));
    setHistory({ key, steps: nextSteps });
    pending.current = { month, fills: next, timer: window.setTimeout(flush, SAVE_DELAY_MS) };
  };

  return {
    fills,
    status,
    /** Replaces the colouring and saves it at once: done when the server has it. */
    replace: async (next: ThemeFill[]): Promise<ActionState> => {
      if (pending.current?.month !== month) flush();
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = null;
      setEdits((all) => ({ ...all, [key]: next }));
      setHistory({ key, steps: [...steps, fills] });
      setStatus('saving');
      const result = await saveMonthColoring(journal.id, month, next);
      setStatus(result.code ?? 'saved');
      return result;
    },
    /** The month's decoration changed, its colouring is gone: nothing of it may come back. */
    forget: () => {
      if (pending.current?.month === month) {
        window.clearTimeout(pending.current.timer);
        pending.current = null;
      }
      setEdits((all) =>
        Object.fromEntries(
          Object.entries(all).filter(([edited]) => !edited.startsWith(`${month}/`)),
        ),
      );
    },
    change: (next: ThemeFill[]) => apply(next, [...steps, fills]),
    canUndo: steps.length > 0,
    undo: () => {
      const previous = steps.at(-1);
      if (previous) apply(previous, steps.slice(0, -1));
    },
    flush,
  };
}
