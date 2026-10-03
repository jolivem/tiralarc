import { Container, Paper, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/** Centered card layout for short pages (forms). Full width on phones, card from tablets up. */
export function FormPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container size={460} px={0} py={{ base: 'md', sm: 'xl' }}>
      <Paper withBorder={false} p={{ base: 'md', sm: 'xl' }} radius="lg" shadow="sm">
        <Stack gap="lg">
          <Title order={1} size="h2" ta="center">
            {title}
          </Title>
          {children}
        </Stack>
      </Paper>
    </Container>
  );
}
