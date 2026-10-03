import { createTheme } from '@mantine/core';

/**
 * Single source of design tokens. Breakpoints (Mantine defaults):
 * xs 36em (576px) · sm 48em (768px, tablet) · md 62em (992px, desktop) · lg 75em · xl 88em
 */
export const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), monospace',
  headings: { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' },
});
