import type { ComponentProps, ReactNode } from 'react';

export const inputClass =
  'rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900';

export function Button({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      className={`rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900 ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      className={`rounded border border-neutral-300 px-4 py-2 disabled:opacity-50 dark:border-neutral-700 ${className}`}
      {...props}
    />
  );
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Notice({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`text-sm ${tone === 'error' ? 'text-red-600' : 'text-green-700 dark:text-green-500'}`}
    >
      {children}
    </p>
  );
}
