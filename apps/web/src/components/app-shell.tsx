'use client';

import {
  ActionIcon,
  AppShell,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconLogin,
  IconLogout,
  IconMoon,
  IconSun,
  IconTarget,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from './language-switcher';

interface NavItem {
  href: '/' | '/login' | '/register' | '/profile';
  label: string;
  icon: ReactNode;
}

/**
 * Responsive layout: on phones (< sm, 768px) navigation sits behind a burger
 * in a side panel; from tablets up it is shown inline in the header.
 */
export function TiralarcShell({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const t = useTranslations('nav');
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/', label: t('home'), icon: <IconHome size={18} /> },
    ...(signedIn
      ? [{ href: '/profile' as const, label: t('profile'), icon: <IconUser size={18} /> }]
      : [
          { href: '/login' as const, label: t('login'), icon: <IconLogin size={18} /> },
          { href: '/register' as const, label: t('register'), icon: <IconUserPlus size={18} /> },
        ]),
  ];

  const logoutLabel = t('logout');
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: true } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label={t('menu')}
            />
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={close}>
              <Group gap={6} wrap="nowrap">
                <IconTarget size={26} color="var(--mantine-primary-color-filled)" />
                <Text fw={700} size="lg">
                  Tiralarc
                </Text>
              </Group>
            </Link>
          </Group>

          <Group gap="xs" visibleFrom="sm" wrap="nowrap">
            {items.slice(1).map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                variant={pathname === item.href ? 'light' : 'subtle'}
                leftSection={item.icon}
              >
                {item.label}
              </Button>
            ))}
            {signedIn && (
              <form action={logout}>
                <Button
                  type="submit"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconLogout size={18} />}
                >
                  {logoutLabel}
                </Button>
              </form>
            )}
          </Group>

          <Group gap="xs" wrap="nowrap">
            <LanguageSwitcher />
            <ColorSchemeToggle label={t('toggleColorScheme')} />
          </Group>
        </Group>
      </AppShell.Header>

      {/* Phone-only menu: display:none from sm so its links are not duplicated for keyboard / screen readers. */}
      <AppShell.Navbar p="md" hiddenFrom="sm">
        <Stack gap={4}>
          {items.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={item.icon}
              active={pathname === item.href}
              onClick={close}
            />
          ))}
          {signedIn && (
            <form action={logout}>
              <NavLink
                component="button"
                type="submit"
                label={logoutLabel}
                leftSection={<IconLogout size={18} />}
              />
            </form>
          )}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function ColorSchemeToggle({ label }: { label: string }) {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={label}
      title={label}
      onClick={() => setColorScheme(computed === 'light' ? 'dark' : 'light')}
    >
      {computed === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  );
}
