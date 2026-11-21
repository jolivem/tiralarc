'use client';

import {
  ActionIcon,
  Alert,
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
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconEye,
  IconHelp,
  IconHome,
  IconLogin,
  IconLogout,
  IconMoon,
  IconSun,
  IconUserCircle,
  IconUserPlus,
} from '@tabler/icons-react';
import type { User } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { leaveDemo, logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { homePathFor, type Profile } from '@/lib/current-user-paths';
import { type JournalChoices, JournalMenu } from './journal-menu';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { useRegisteredTour } from './tour/tour-store';
import { ARCHER_SECTIONS, coachedArcherOf, coachSections, sectionOf, tabColors } from './sections';
import classes from './app-shell.module.css';

type ShellUser = Pick<User, 'displayName' | 'email' | 'roles' | 'isDemo'> & {
  profile: Profile | null;
  /** The journals named in the middle of the header (and the menu to switch between them). */
  journals: JournalChoices;
};

/**
 * Responsive frame.
 * - Archer profile: tabs along the bottom on phones; from tablets up (≥ sm, 768px) the
 *   divider tabs are stuck to the pages instead (archer/layout.tsx). None on the account page.
 *   A coach in one of their archers' journals gets that archer's tabs (coach/[archerId]).
 * - Anonymous visitors: links in the header from tablets up, burger menu on phones.
 * - Signed-in users: avatar menu (account, sign out) in the header.
 */
export function TiralarcShell({ user, children }: { user: ShellUser | null; children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();
  // The PDF extract's pages (print/): paper only, no header or tabs.
  const printed = pathname.startsWith('/print/');

  // The tabs of the journal shown: the archer's own (archer area) or a coached archer's.
  const inArcherArea = pathname === '/archer' || pathname.startsWith('/archer/');
  const coachedId = user ? coachedArcherOf(pathname) : undefined;
  const sections = coachedId
    ? coachSections(coachedId)
    : inArcherArea && user?.roles.includes('ARCHER')
      ? ARCHER_SECTIONS
      : [];
  const hasSections = sections.length > 0;
  const current = hasSections ? sectionOf(pathname, sections) : undefined;

  if (printed) return <>{children}</>;
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
      // Archer area, visitors' home page and the sign-in page: a desk; on phones, the archer tab
      // bar edged with the colour of the open divider.
      className={
        hasSections || (!user && pathname === '/') || pathname === '/login'
          ? classes.desk
          : undefined
      }
      style={
        current
          ? ({ ...tabColors(current), '--open-tab': 'var(--tab-filled)' } as CSSProperties)
          : undefined
      }
    >
      <AppShell.Header>
        {user && (
          // Centred on the whole bar; from tablets up (no room between logo and buttons on phones).
          <JournalMenu
            choices={user.journals}
            // The coach's pages show an archer's journal (or none, on their list of archers).
            showOwn={!pathname.startsWith('/coach')}
          />
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
              <Logo size={26} />
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
            <TourButton label={t('nav.tour')} />
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

      <AppShell.Main>
        {/* The example journal: read-only, a way out to one's own. */}
        {user?.isDemo && <DemoBanner />}
        {children}
      </AppShell.Main>

      {hasSections && (
        <AppShell.Footer hiddenFrom="sm" className={classes.tabBar}>
          <nav aria-label={t('nav.mainNavigation')} className={classes.tabs} data-tour="tabs">
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

/** Above every page of the example journal: what it is, and the button to start one's own. */
function DemoBanner() {
  const t = useTranslations('demo');
  return (
    <Alert
      variant="light"
      color="yellow"
      radius="md"
      mb="md"
      icon={<IconEye size={20} />}
      title={t('bannerTitle')}
    >
      <Group justify="space-between" gap="sm">
        <Text size="sm">{t('bannerBody')}</Text>
        <form action={leaveDemo}>
          <Button type="submit" size="xs" color="#3f2817" leftSection={<IconUserPlus size={16} />}>
            {t('register')}
          </Button>
        </form>
      </Group>
    </Alert>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations('nav');
  const name = user.displayName ?? user.email;
  const tour = useRegisteredTour();
  // Phones: the guided tour is replayed from this menu (no "?" in the header).
  const phone = useMediaQuery('(max-width: 47.99em)');
  return (
    <Menu position="bottom-end" width={240} withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="transparent"
          size="lg"
          radius="xl"
          aria-label={t('userMenu')}
          // Phones: the "?" step points here (the account's step left out: the same button).
          data-tour={tour && phone ? 'help' : 'account'}
        >
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
        {tour && (
          <Menu.Item hiddenFrom="sm" leftSection={<IconHelp size={16} />} onClick={tour.start}>
            {t('tour')}
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

/** "?": replays the guided tour of the page shown (only on pages that have one). */
function TourButton({ label }: { label: string }) {
  const tour = useRegisteredTour();
  if (!tour) return null;
  return (
    // On phones the header has no room: it is in the user menu there.
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={label}
      title={label}
      onClick={tour.start}
      data-tour="help"
      visibleFrom="sm"
    >
      <IconHelp size={18} />
    </ActionIcon>
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
