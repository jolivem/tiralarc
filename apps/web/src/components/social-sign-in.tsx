'use client';

import { Alert, Button, Divider, Stack } from '@mantine/core';
import { IconBrandApple } from '@tabler/icons-react';
import type { SelfAssignableRole } from '@tiralarc/api-client';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useEffectEvent, useRef, useState, useTransition } from 'react';
import { socialSignIn, type SocialSignInInput } from '@/app/actions/auth';
import type { ActionState } from '@/lib/action-state';
import { loadScript } from '@/lib/load-script';
import { FormError } from './form-feedback';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
const APPLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI;

export const isSocialSignInEnabled = Boolean(
  GOOGLE_CLIENT_ID || (APPLE_CLIENT_ID && APPLE_REDIRECT_URI),
);

type TokenPayload = Pick<SocialSignInInput, 'idToken' | 'nonce' | 'displayName'>;

interface SocialSignInProps {
  /** Sign-up page: roles picked in the form, required for new accounts. */
  roles?: SelfAssignableRole[];
  next?: string;
}

/**
 * Google / Apple buttons. The provider returns an ID token in the browser; the
 * Server Action forwards it to the API, which verifies it and opens a session.
 * Buttons only render when the corresponding client ID is configured.
 */
export function SocialSignIn({ roles, next }: SocialSignInProps) {
  const t = useTranslations();
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  if (!isSocialSignInEnabled) return null;

  const submit = (provider: SocialSignInInput['provider'], payload: TokenPayload) => {
    if (roles && roles.length === 0) {
      setState({ fieldErrors: { roles: ['arrayMinSize'] } });
      return;
    }
    setState({});
    startTransition(async () => {
      setState(await socialSignIn({ provider, ...payload, roles, next }));
    });
  };

  return (
    <Stack gap="sm" align="center">
      <Divider label={t('common.or')} labelPosition="center" w="100%" />
      {GOOGLE_CLIENT_ID && (
        <GoogleButton clientId={GOOGLE_CLIENT_ID} onToken={(p) => submit('google', p)} />
      )}
      {APPLE_CLIENT_ID && APPLE_REDIRECT_URI && (
        <AppleButton
          clientId={APPLE_CLIENT_ID}
          redirectUri={APPLE_REDIRECT_URI}
          disabled={pending}
          label={t('social.apple')}
          onToken={(p) => submit('apple', p)}
        />
      )}
      {state.fieldErrors?.roles && (
        <Alert color="red" variant="light" w="100%">
          {t('register.rolesRequired')}
        </Alert>
      )}
      <FormError state={state} />
    </Stack>
  );
}

// ------------------------------------------------------------------ Google

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        nonce?: string;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

function GoogleButton({
  clientId,
  onToken,
}: {
  clientId: string;
  onToken: (payload: TokenPayload) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const handleCredential = useEffectEvent(onToken);

  useEffect(() => {
    let cancelled = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        const google = (window as unknown as { google?: GoogleIdentity }).google;
        if (cancelled || !google || !container.current) return;
        const nonce = crypto.randomUUID();
        google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          callback: ({ credential }) => handleCredential({ idToken: credential, nonce }),
        });
        google.accounts.id.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: 320,
          locale,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, locale]);

  return <div ref={container} style={{ minHeight: 40 }} />;
}

// ------------------------------------------------------------------ Apple

interface AppleSignInResponse {
  authorization: { id_token: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

interface AppleIdAuth {
  auth: {
    init(options: {
      clientId: string;
      scope: string;
      redirectURI: string;
      usePopup: boolean;
      nonce: string;
    }): void;
    signIn(): Promise<AppleSignInResponse>;
  };
}

function AppleButton({
  clientId,
  redirectUri,
  label,
  disabled,
  onToken,
}: {
  clientId: string;
  redirectUri: string;
  label: string;
  disabled: boolean;
  onToken: (payload: TokenPayload) => void;
}) {
  const locale = useLocale();

  const signIn = async () => {
    const lang = locale === 'fr' ? 'fr_FR' : 'en_US';
    await loadScript(
      `https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/${lang}/appleid.auth.js`,
    );
    const apple = (window as unknown as { AppleID?: AppleIdAuth }).AppleID;
    if (!apple) return;
    const nonce = crypto.randomUUID();
    apple.auth.init({
      clientId,
      scope: 'name email',
      redirectURI: redirectUri,
      usePopup: true,
      nonce,
    });
    try {
      const response = await apple.auth.signIn();
      const name = [response.user?.name?.firstName, response.user?.name?.lastName]
        .filter(Boolean)
        .join(' ');
      onToken({ idToken: response.authorization.id_token, nonce, displayName: name || undefined });
    } catch {
      // Popup closed or cancelled by the user.
    }
  };

  return (
    <Button
      type="button"
      variant="default"
      onClick={signIn}
      disabled={disabled}
      w={320}
      maw="100%"
      leftSection={<IconBrandApple size={18} />}
    >
      {label}
    </Button>
  );
}
