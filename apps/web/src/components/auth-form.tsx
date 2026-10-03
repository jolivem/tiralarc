'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { AuthFormState } from '@/app/actions/auth';

interface Field {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}

interface AuthFormProps {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
  footer: { text: string; href: string; linkLabel: string };
  next?: string;
}

export function AuthForm({ action, fields, submitLabel, footer, next }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {fields.map((field) => (
        <label key={field.name} className="flex flex-col gap-1 text-sm">
          {field.label}
          <input
            {...field}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          {state.fieldErrors?.[field.name]?.map((message) => (
            <span key={message} className="text-red-600">
              {message}
            </span>
          ))}
        </label>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? '…' : submitLabel}
      </button>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {footer.text}{' '}
        <Link href={footer.href} className="underline">
          {footer.linkLabel}
        </Link>
      </p>
    </form>
  );
}
