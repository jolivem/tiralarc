'use client';

import { Anchor, Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { type FormEvent, useActionState, useState } from 'react';
import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '@/app/actions/auth';
import { Link } from '@/i18n/navigation';
import type { ActionState } from '@/lib/action-state';
import { FormError, SuccessNotice, useFieldError } from './form-feedback';
import { SocialSignIn } from './social-sign-in';

const initial: ActionState = {};

/**
 * A new password typed twice (sign-up, reset): the form isn't sent while they differ, and the
 * mismatch shows once the confirmation is left or the form submitted, not while typing it.
 */
function usePasswordConfirm(password: string, confirm: string, state: ActionState) {
  const fieldError = useFieldError();
  const tValidation = useTranslations('validation');
  const [check, setCheck] = useState(false);
  const mismatch = confirm !== password;
  return {
    onSubmit: (e: FormEvent) => {
      if (!mismatch) return;
      e.preventDefault();
      setCheck(true);
    },
    /** For the confirmation field. */
    confirmProps: {
      onBlur: () => setCheck(confirm !== ''),
      error:
        check && mismatch
          ? tValidation('passwordMismatch')
          : // The server's verdict only while the fields still disagree.
            mismatch && fieldError(state, 'passwordConfirm'),
    },
  };
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations();
  const fieldError = useFieldError();
  const [state, action, pending] = useActionState(login, initial);
  const [email, setEmail] = useState('');

  return (
    <Stack gap="lg">
      <form action={action}>
        <Stack gap="md">
          {next && <input type="hidden" name="next" value={next} />}
          <TextInput
            name="email"
            type="email"
            label={t('common.email')}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={fieldError(state, 'email')}
          />
          <PasswordInput
            name="password"
            label={t('common.password')}
            autoComplete="current-password"
            required
            error={fieldError(state, 'password')}
          />
          <FormError state={state} />
          <Stack gap={4}>
            {/* The dark leather brown of the home page's sign-up button. */}
            <Button type="submit" loading={pending} fullWidth color="#3f2817">
              {t('login.submit')}
            </Button>
            <Anchor component={Link} href="/forgot-password" size="xs" ta="center">
              {t('login.forgotPassword')}
            </Anchor>
          </Stack>
        </Stack>
      </form>
      {state.code === 'EMAIL_NOT_VERIFIED' && <ResendVerificationForm email={email} />}
      <SocialSignIn next={next} />
      <Text size="sm" ta="center" c="dimmed">
        {t('login.noAccount')}{' '}
        <Anchor component={Link} href="/register">
          {t('login.createAccount')}
        </Anchor>
      </Text>
    </Stack>
  );
}

export function RegisterForm() {
  const t = useTranslations();
  const fieldError = useFieldError();
  const [state, action, pending] = useActionState(register, initial);
  // Controlled: React resets uncontrolled fields after each submission, which
  // would wipe what the user typed when the server rejects the form.
  const [values, setValues] = useState({
    displayName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const confirm = usePasswordConfirm(values.password, values.passwordConfirm, state);
  const bind = (name: keyof typeof values) => ({
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.currentTarget; // read now: currentTarget is null inside the updater
      setValues((v) => ({ ...v, [name]: value }));
    },
    error: fieldError(state, name),
  });

  return (
    <Stack gap="lg">
      <form action={action} onSubmit={confirm.onSubmit}>
        <Stack gap="md">
          <TextInput
            {...bind('displayName')}
            label={t('register.displayName')}
            autoComplete="name"
          />
          <TextInput
            {...bind('email')}
            type="email"
            label={t('common.email')}
            autoComplete="email"
            required
          />
          <PasswordInput
            {...bind('password')}
            label={t('register.passwordHint')}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <PasswordInput
            {...bind('passwordConfirm')}
            {...confirm.confirmProps}
            label={t('register.passwordConfirm')}
            autoComplete="new-password"
            required
          />
          <FormError state={state} />
          <Button type="submit" loading={pending} fullWidth>
            {t('register.submit')}
          </Button>
        </Stack>
      </form>
      <SocialSignIn />
      <Text size="sm" ta="center" c="dimmed">
        {t('register.haveAccount')}{' '}
        <Anchor component={Link} href="/login">
          {t('register.signIn')}
        </Anchor>
      </Text>
    </Stack>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(resendVerification, initial);

  return (
    <form action={action}>
      <Stack gap="sm" align="center">
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="default" loading={pending} disabled={!email}>
          {t('checkEmail.resend')}
        </Button>
        {state.notice === 'resent' && <SuccessNotice>{t('checkEmail.resent')}</SuccessNotice>}
        <FormError state={state} />
      </Stack>
    </form>
  );
}

/** "Forgot password": the address to send the link to. */
export function ForgotPasswordForm() {
  const t = useTranslations();
  const fieldError = useFieldError();
  const [state, action, pending] = useActionState(forgotPassword, initial);
  const [email, setEmail] = useState('');

  return (
    <Stack gap="lg">
      <form action={action}>
        <Stack gap="md">
          <TextInput
            name="email"
            type="email"
            label={t('common.email')}
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            error={fieldError(state, 'email')}
          />
          {state.notice === 'sent' && (
            <SuccessNotice>{t('forgotPassword.sent', { email })}</SuccessNotice>
          )}
          <FormError state={state} />
          <Button type="submit" loading={pending} fullWidth>
            {t(state.notice === 'sent' ? 'forgotPassword.resend' : 'forgotPassword.submit')}
          </Button>
        </Stack>
      </form>
      <Text size="sm" ta="center">
        <Anchor component={Link} href="/login">
          {t('checkEmail.backToLogin')}
        </Anchor>
      </Text>
    </Stack>
  );
}

/** The emailed link's page: the new password, twice. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const fieldError = useFieldError();
  const [state, action, pending] = useActionState(resetPassword, initial);
  // Controlled: React resets uncontrolled fields after each submission.
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const confirm = usePasswordConfirm(password, passwordConfirm, state);

  return (
    <form action={action} onSubmit={confirm.onSubmit}>
      <Stack gap="md">
        <input type="hidden" name="token" value={token} />
        <PasswordInput
          name="password"
          label={t('register.passwordHint')}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          error={fieldError(state, 'password')}
        />
        <PasswordInput
          name="passwordConfirm"
          label={t('register.passwordConfirm')}
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.currentTarget.value)}
          {...confirm.confirmProps}
        />
        <FormError state={state} />
        {state.code === 'INVALID_RESET_TOKEN' && (
          <Anchor component={Link} href="/forgot-password" size="sm" ta="center">
            {t('resetPassword.newLink')}
          </Anchor>
        )}
        <Button type="submit" loading={pending} fullWidth>
          {t('resetPassword.submit')}
        </Button>
      </Stack>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(verifyEmail, initial);

  return (
    <form action={action}>
      <Stack gap="md">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" loading={pending} fullWidth>
          {t('verifyEmail.submit')}
        </Button>
        <FormError state={state} />
      </Stack>
    </form>
  );
}
