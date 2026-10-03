'use client';

import { Anchor, type AnchorProps, Button, type ButtonProps } from '@mantine/core';
import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';

type LinkHref = ComponentProps<typeof Link>['href'];

/**
 * Mantine Button / Anchor rendered as a locale-aware link. Needed in Server
 * Components, which can't pass `component={Link}` (a function) to Mantine.
 */
export function ButtonLink({ href, ...props }: ButtonProps & { href: LinkHref }) {
  return <Button component={Link} href={href} {...props} />;
}

export function AnchorLink({
  href,
  ...props
}: AnchorProps & { href: LinkHref; children: React.ReactNode }) {
  return <Anchor component={Link} href={href} {...props} />;
}
