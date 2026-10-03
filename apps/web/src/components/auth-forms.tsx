'use client';

import type { SelfAssignableRole } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { login, register, resendVerification, updateRoles, verifyEmail } from '@/app/actions/auth';
import { Link } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import { FieldErrors, FormError } from './form-feedback';
import { RolePicker } from './role-picker';
import { SocialSignIn } from './social-sign-in';
import { Button, inputClass, Notice, SecondaryButton } from './ui';

const initial: ActionState = {};
const formClass = 'flex w-full max-w-sm flex-col gap-4';

function TextField(props: {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  state: ActionState;
}) {
  const { label, state, ...input } = props;
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input {...input} className={inputClass} />
      <FieldErrors state={state} field={props.name} />
    </label>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(login, initial);
  const [email, setEmail] = useState('');

  return (
    <>
      <form action={action} className={formClass}>
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex flex-col gap-1 text-sm">
          {t('common.email')}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <FieldErrors state={state} field="email" />
        </label>
        <TextField
          name="password"
          label={t('common.password')}
          type="password"
          autoComplete="current-password"
          required
          state={state}
        />
        <FormError state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('login.submit')}
        </Button>
      </form>
      {state.code === 'EMAIL_NOT_VERIFIED' && <ResendVerificationForm email={email} />}
      <SocialSignIn next={next} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('login.noAccount')}{' '}
        <Link href="/register" className="underline">
          {t('login.createAccount')}
        </Link>
      </p>
    </>
  );
}

export function RegisterForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(register, initial);
  const [roles, setRoles] = useState<SelfAssignableRole[]>([]);

  return (
    <>
      <form action={action} className={formClass}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm">
            {t('register.rolesLabel')}{' '}
            <span className="text-neutral-500">{t('register.rolesHint')}</span>
          </legend>
          <RolePicker value={roles} onChange={setRoles} />
          <FieldErrors state={state} field="roles" />
        </fieldset>
        <TextField
          name="displayName"
          label={t('register.displayName')}
          type="text"
          autoComplete="name"
          state={state}
        />
        <TextField
          name="email"
          label={t('common.email')}
          type="email"
          autoComplete="email"
          required
          state={state}
        />
        <TextField
          name="password"
          label={t('register.passwordHint')}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          state={state}
        />
        <FormError state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t('common.loading') : t('register.submit')}
        </Button>
      </form>
      <SocialSignIn roles={roles} />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {t('register.haveAccount')}{' '}
        <Link href="/login" className="underline">
          {t('register.signIn')}
        </Link>
      </p>
    </>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(resendVerification, initial);

  return (
    <form action={action} className="flex flex-col items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <SecondaryButton type="submit" disabled={pending || !email}>
        {t('checkEmail.resend')}
      </SecondaryButton>
      {state.notice === 'resent' && <Notice tone="success">{t('checkEmail.resent')}</Notice>}
      <FormError state={state} />
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(verifyEmail, initial);

  return (
    <form action={action} className="flex flex-col items-center gap-4">
      <input type="hidden" name="token" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? t('common.loading') : t('verifyEmail.submit')}
      </Button>
      <FormError state={state} />
    </form>
  );
}

/** Role selection, for onboarding (`next` set: redirects) or the profile page (shows a notice). */
export function RolesForm({
  initialRoles,
  submitLabel,
  next,
}: {
  initialRoles: SelfAssignableRole[];
  submitLabel: string;
  next?: string;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateRoles, initial);
  const [roles, setRoles] = useState(initialRoles);

  return (
    <form action={action} className={formClass}>
      {next !== undefined && <input type="hidden" name="next" value={next} />}
      <RolePicker value={roles} onChange={setRoles} />
      <FieldErrors state={state} field="roles" />
      <FormError state={state} />
      {state.notice === 'saved' && <Notice tone="success">{t('profile.saved')}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? t('common.loading') : submitLabel}
      </Button>
    </form>
  );
}
