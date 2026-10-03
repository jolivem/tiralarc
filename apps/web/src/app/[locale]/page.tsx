import { Badge, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconLogin, IconUserPlus } from '@tabler/icons-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ButtonLink } from '@/components/links';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';

async function getApiStatus(): Promise<'up' | 'down'> {
  try {
    const { data } = await api.GET('/api/v1/health');
    return data?.status === 'ok' ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('home');
  const status = await getApiStatus();

  return (
    <Container size="sm" py={{ base: 'xl', sm: 80 }}>
      <Stack align="center" gap="lg" ta="center">
        <Title order={1} fz={{ base: 36, sm: 52 }}>
          Tiralarc
        </Title>
        <Text size="lg" c="dimmed">
          {t('tagline')}
        </Text>
        <Group justify="center" gap="sm" w="100%" grow={false}>
          <ButtonLink href="/register" size="md" leftSection={<IconUserPlus size={18} />}>
            {t('register')}
          </ButtonLink>
          <ButtonLink
            href="/login"
            size="md"
            variant="default"
            leftSection={<IconLogin size={18} />}
          >
            {t('login')}
          </ButtonLink>
        </Group>
        <Badge variant="dot" color={status === 'up' ? 'teal' : 'red'}>
          {t('apiStatus')} {status === 'up' ? t('apiUp') : t('apiDown')}
        </Badge>
      </Stack>
    </Container>
  );
}
