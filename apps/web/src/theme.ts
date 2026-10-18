import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** The notebook's leather (home page cover, #7a5539 at shade 6), lightest to darkest. */
const leather: MantineColorsTuple = [
  '#f8f1ea',
  '#ecdccb',
  '#dcc0a3',
  '#c9a17a',
  '#b78657',
  '#a06f45',
  '#7a5539',
  '#66462f',
  '#523825',
  '#3f2817',
];

/**
 * Single source of design tokens. Breakpoints (Mantine defaults):
 * xs 36em (576px) · sm 48em (768px, tablet) · md 62em (992px, desktop) · lg 75em · xl 88em
 */
export const theme = createTheme({
  colors: { leather },
  primaryColor: 'leather',
  // The cover's own brown in light mode; a lighter one on dark backgrounds.
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), monospace',
  headings: { fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' },
});
