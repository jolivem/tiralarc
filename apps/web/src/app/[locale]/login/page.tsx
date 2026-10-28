import { Box, Container } from '@mantine/core';
import { setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/auth-forms';
import { NotebookCover } from '@/components/notebook/cover';
import type { Locale } from '@/i18n/routing';

export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/login'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const { next } = await searchParams;

  // The visitors' home page notebook, the sign-in form on its panel.
  return (
    <Container size="md" px={0} py={{ base: 'md', sm: 'xl' }}>
      <NotebookCover wide>
        <Box ta="left" pt="xs">
          <LoginForm next={typeof next === 'string' ? next : undefined} />
        </Box>
      </NotebookCover>
    </Container>
  );
}
