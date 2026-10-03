'use client';

import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChartLine,
  IconFileText,
  IconHome,
  IconId,
  IconLogin,
  IconLogout,
  IconMoon,
  IconNotebook,
  IconSun,
  IconTarget,
  IconUserCircle,
  IconUserPlus,
} from '@tabler/icons-react';
import type { User } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import type { ComponentType, ReactNode } from 'react';
import { logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { homePathFor } from '@/lib/current-user-paths';
import { LanguageSwitcher } from './language-switcher';
import classes from './app-shell.module.css';

type ShellUser = Pick<User, 'displayName' | 'email' | 'roles'>;

interface Section {
  href: '/archer' | '/archer/journal' | '/archer/sheets' | '/archer/stats' | '/archer/profile';
  label: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
}

/**
 * Responsive frame.
 * - Archers: side menu from tablets up (≥ sm, 768px), bottom tab bar on phones.
 * - Anonymous visitors: links in the header from tablets up, burger menu on phones.
 * - Signed-in users: avatar menu (account, sign out) in the header.
 */
export function TiralarcShell({ user, children }: { user: ShellUser | null; children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();

  const sections: Section[] = user?.roles.includes('ARCHER')
    ? [
        { href: '/archer', label: t('archer.home'), icon: IconHome },
        { href: '/archer/journal', label: t('archer.journal'), icon: IconNotebook },
        { href: '/archer/sheets', label: t('archer.sheets'), icon: IconFileText },
        { href: '/archer/stats', label: t('archer.stats'), icon: IconChartLine },
        { href: '/archer/profile', label: t('archer.profile'), icon: IconId },
      ]
    : [];
  const hasSections = sections.length > 0;
  const isActive = (href: string) =>
    href === '/archer' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        hasSections
          ? { width: 240, breakpoint: 'sm', collapsed: { mobile: true } }
          : { width: 280, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: true } }
      }
      footer={hasSections ? { height: { base: 64, sm: 0 } } : undefined}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {!user && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={t('nav.menu')}
              />
            )}
            <Link
              href={user ? homePathFor(user.roles) : '/'}
              className={classes.brand}
              onClick={close}
            >
              <IconTarget size={26} color="var(--mantine-primary-color-filled)" />
              <Text fw={700} size="lg">
                Tiralarc
              </Text>
            </Link>
          </Group>

          <Group gap="xs" wrap="nowrap">
            {!user && (
              <Group gap="xs" visibleFrom="sm" wrap="nowrap">
                <Button
                  component={Link}
                  href="/login"
                  variant="subtle"
                  leftSection={<IconLogin size={18} />}
                >
                  {t('nav.login')}
                </Button>
                <Button component={Link} href="/register" leftSection={<IconUserPlus size={18} />}>
                  {t('nav.register')}
                </Button>
              </Group>
            )}
            <LanguageSwitcher />
            <ColorSchemeToggle label={t('nav.toggleColorScheme')} />
            {user && <UserMenu user={user} />}
          </Group>
        </Group>
      </AppShell.Header>

      {hasSections ? (
        // Tablet / desktop side menu. display:none on phones, where the bottom bar takes over.
        <AppShell.Navbar p="sm" visibleFrom="sm" aria-label={t('nav.archerSection')}>
          <Stack gap={4}>
            {sections.map(({ href, label, icon: Icon }) => (
              <NavLink
                key={href}
                component={Link}
                href={href}
                label={label}
                leftSection={<Icon size={20} />}
                active={isActive(href)}
              />
            ))}
          </Stack>
        </AppShell.Navbar>
      ) : (
        !user && (
          // Phone-only menu for visitors: display:none from sm (links are in the header there).
          <AppShell.Navbar p="md" hiddenFrom="sm">
            <Stack gap={4}>
              <NavLink
                component={Link}
                href="/"
                label={t('nav.home')}
                leftSection={<IconHome size={18} />}
                active={pathname === '/'}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/login"
                label={t('nav.login')}
                leftSection={<IconLogin size={18} />}
                active={pathname === '/login'}
                onClick={close}
              />
              <NavLink
                component={Link}
                href="/register"
                label={t('nav.register')}
                leftSection={<IconUserPlus size={18} />}
                active={pathname === '/register'}
                onClick={close}
              />
            </Stack>
          </AppShell.Navbar>
        )
      )}

      <AppShell.Main>{children}</AppShell.Main>

      {hasSections && (
        <AppShell.Footer hiddenFrom="sm" className={classes.tabBar}>
          <nav aria-label={t('nav.mainNavigation')} className={classes.tabs}>
            {sections.map(({ href, label, icon: Icon }) => (
              <UnstyledButton
                key={href}
                component={Link}
                href={href}
                className={classes.tab}
                data-active={isActive(href) || undefined}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                <Icon size={22} stroke={isActive(href) ? 2.2 : 1.6} />
                <span className={classes.tabLabel}>{label}</span>
              </UnstyledButton>
            ))}
          </nav>
        </AppShell.Footer>
      )}
    </AppShell>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations('nav');
  const name = user.displayName ?? user.email;
  return (
    <Menu position="bottom-end" width={240} withinPortal>
      <Menu.Target>
        <ActionIcon variant="transparent" size="lg" radius="xl" aria-label={t('userMenu')}>
          <Avatar name={name} color="initials" size={34} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={600} c="var(--mantine-color-text)" truncate>
            {name}
          </Text>
          <Text size="xs" truncate>
            {user.email}
          </Text>
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item component={Link} href="/account" leftSection={<IconUserCircle size={16} />}>
          {t('account')}
        </Menu.Item>
        <form action={logout}>
          <Menu.Item
            component="button"
            type="submit"
            color="red"
            leftSection={<IconLogout size={16} />}
          >
            {t('logout')}
          </Menu.Item>
        </form>
      </Menu.Dropdown>
    </Menu>
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
