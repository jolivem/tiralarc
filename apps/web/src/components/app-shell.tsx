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
  IconArrowsExchange,
  IconHome,
  IconLogin,
  IconLogout,
  IconMoon,
  IconSun,
  IconTarget,
  IconUserCircle,
  IconUserPlus,
} from '@tabler/icons-react';
import type { User } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { hasBothProfiles, homePathFor, type Profile } from '@/lib/current-user-paths';
import { LanguageSwitcher } from './language-switcher';
import { ARCHER_SECTIONS, sectionOf, tabColors } from './sections';
import classes from './app-shell.module.css';

type ShellUser = Pick<User, 'displayName' | 'email' | 'roles'> & {
  profile: Profile | null;
  /** The selected journal (archer profile), shown in the middle of the header. */
  journalTitle: string | null;
};

/**
 * Responsive frame.
 * - Archer profile: tabs along the bottom on phones; from tablets up (≥ sm, 768px) the
 *   divider tabs are stuck to the pages instead (archer/layout.tsx). None on the account page.
 * - Anonymous visitors: links in the header from tablets up, burger menu on phones.
 * - Signed-in users: avatar menu (account, sign out) in the header.
 */
export function TiralarcShell({ user, children }: { user: ShellUser | null; children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();

  // The account page shows on its own, closed with its cross: no archer menu there.
  const onAccountPage = pathname === '/account' || pathname.startsWith('/account/');
  const sections = user?.profile === 'ARCHER' && !onAccountPage ? ARCHER_SECTIONS : [];
  const hasSections = sections.length > 0;
  const current = hasSections ? sectionOf(pathname) : undefined;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        hasSections
          ? undefined
          : { width: 280, breakpoint: 'sm', collapsed: { mobile: !opened, desktop: true } }
      }
      footer={hasSections ? { height: { base: 64, sm: 0 } } : undefined}
      padding="md"
      // Archer area and visitors' home page: a desk; on phones, the archer tab bar edged with
      // the colour of the open divider.
      className={hasSections || (!user && pathname === '/') ? classes.desk : undefined}
      style={
        current
          ? ({ ...tabColors(current), '--open-tab': 'var(--tab-filled)' } as CSSProperties)
          : undefined
      }
    >
      <AppShell.Header>
        {user?.journalTitle && (
          // Centred on the whole bar; from tablets up (no room between logo and buttons on phones).
          <Text className={classes.journalTitle} visibleFrom="sm" truncate>
            {user.journalTitle}
          </Text>
        )}
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
              href={user ? homePathFor(user.roles, user.profile ?? undefined) : '/'}
              className={classes.brand}
              onClick={close}
            >
              <IconTarget size={26} color="var(--mantine-primary-color-filled)" />
              <Text fw={700} size="lg">
                MyArcheryDiary
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

      {/* From tablets up, the archer area's divider tabs are part of its pages (archer/layout.tsx). */}
      {!hasSections && !user && (
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
      )}

      <AppShell.Main>{children}</AppShell.Main>

      {hasSections && (
        <AppShell.Footer hiddenFrom="sm" className={classes.tabBar}>
          <nav aria-label={t('nav.mainNavigation')} className={classes.tabs}>
            {sections.map((section) => {
              const { key, href, icon: Icon } = section;
              const active = current?.href === href;
              return (
                <UnstyledButton
                  key={href}
                  component={Link}
                  href={href}
                  className={classes.tab}
                  data-active={active || undefined}
                  aria-current={active ? 'page' : undefined}
                  style={tabColors(section)}
                >
                  <Icon size={22} stroke={active ? 2.2 : 1.6} />
                  <span className={classes.tabLabel}>{t(`archer.${key}`)}</span>
                </UnstyledButton>
              );
            })}
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
        {hasBothProfiles(user.roles) && (
          <Menu.Item
            component={Link}
            href="/choose-profile"
            leftSection={<IconArrowsExchange size={16} />}
          >
            {t('switchProfile')}
          </Menu.Item>
        )}
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
