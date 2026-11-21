'use client';

import {
  Alert,
  Button,
  DEFAULT_THEME,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconBrandInstagram, IconCopy, IconDownload, IconShare } from '@tabler/icons-react';
import type { JournalSessionSummary, MonthStars, ThemeFill } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { createElement, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Artwork } from './coloring';
import { eventDisplay, pendingReason } from './event-display';
import classes from './journal.module.css';
import {
  type BoardEvent,
  chalkIcon,
  drawMonthBoard,
  haloIcon,
  MONTH_BOARD_HEIGHT,
  MONTH_BOARD_WIDTH,
} from './month-board-card';
import { TYPE_PICTURES } from './session-types';
import { cardFont, download, loadImage, type ShareStatus, toJpeg } from './share-modal';

/** An event's colour as in the calendar (Mantine's "filled" shade, light scheme). */
const eventColor = (color: string) =>
  (DEFAULT_THEME.colors as Record<string, readonly string[]>)[color]?.[6] ?? '#f3f0e6';

/** Each event's logo in its own colours, by what it looks like (loaded once per opening). */
async function eventIcon(session: JournalSessionSummary): Promise<HTMLCanvasElement | null> {
  const picture = TYPE_PICTURES[session.type as keyof typeof TYPE_PICTURES];
  if (picture) {
    const image = await loadImage(picture);
    return image && haloIcon(image);
  }
  // A pictogram (custom type, "Divers"): the Tabler icon, rendered to SVG in its colour.
  const { color, icon } = eventDisplay(session);
  // Out of the effect that asks for it first: React won't flush a render (flushSync) while it is
  // still running its own effects, and the icon would come out empty.
  await new Promise((resolve) => setTimeout(resolve));
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() =>
    root.render(createElement(icon, { size: 96, color: eventColor(color), stroke: 2 })),
  );
  let svg = host.innerHTML;
  root.unmount();
  if (!svg.startsWith('<svg')) return null;
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  // With the same light halo as the pictures, so its lines stand out on the slate.
  return image && haloIcon(image);
}

/**
 * "Share" on the Journal page: the displayed month as a blackboard written in chalk
 * (month-board-card.ts) — its coloured name, its calendar with the completed events, its
 * arrows and satisfaction — and a caption the archer may edit. No Instagram API: the phone's
 * share sheet (the caption copied, Instagram drops shared text), else the picture is downloaded.
 */
export function MonthShareButton({
  month,
  monthName,
  monthLabel,
  journalTitle,
  fills,
  lettering,
  sessions,
  arrows,
  stars,
  today,
}: {
  /** "YYYY-MM". */
  month: string;
  /** "Novembre". */
  monthName: string;
  /** "Novembre 2026". */
  monthLabel: string;
  journalTitle: string;
  /** The month's colouring: only its name's (`title`) is drawn. */
  fills: ThemeFill[];
  lettering: Artwork | null;
  sessions: JournalSessionSummary[];
  arrows: number;
  stars: MonthStars | null;
  /** "YYYY-MM-DD": only the events completed by then are shown (not those greyed in the calendar). */
  today: string;
}) {
  const t = useTranslations('journal');
  const tShare = useTranslations('journal.share');
  const format = useFormatter();
  const [opened, setOpened] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [drawn, setDrawn] = useState<{ key: string; file: File } | null>(null);

  const site = typeof window === 'undefined' ? null : window.location;
  const caption =
    edited ??
    [
      `${monthLabel} — ${journalTitle}`,
      '',
      tShare('siteLink', { url: site?.origin ?? '' }),
      tShare('hashtags'),
    ].join('\n');

  // Monday to Sunday, in the page's language (1 January 2024 was a Monday).
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const name = format.dateTime(new Date(2024, 0, 1 + i, 12), { weekday: 'short' });
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
  });
  // Under the month's name: the journal's title (no year).
  const subtitle = journalTitle;
  const summary = {
    arrowsLabel: t('monthSummary.arrows'),
    arrows: format.number(arrows),
    satisfactionLabel: t('monthSummary.satisfaction'),
  };
  // Only the completed events: those still to review (or to come) are left out.
  const completed = sessions.filter((s) => pendingReason(s, today) === null);
  const titleFills = fills.filter((fill) => fill.band === 'title');

  // Redrawn only when what the board shows changes.
  const key = JSON.stringify({
    month,
    titleFills,
    lettering: !!lettering,
    weekdays,
    subtitle,
    summary,
    stars,
    events: completed.map((s) => [
      s.date,
      s.type,
      s.color,
      s.icon,
      s.customType?.color,
      s.customType?.icon,
    ]),
  });
  const card = drawn?.key === key ? drawn.file : null;

  // What the drawing reads, as of the last render (`key` decides when it is redrawn).
  const input = { month, monthName, monthLabel, titleFills, lettering, completed };
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
  });

  useEffect(() => {
    const ctx = canvas?.getContext('2d');
    if (!opened || !canvas || !ctx) return;
    let current = true;
    const { month, monthName, monthLabel, titleFills, lettering, completed } = latest.current;
    const { weekdays, subtitle, summary, stars } = JSON.parse(key) as {
      weekdays: string[];
      subtitle: string;
      summary: { arrowsLabel: string; arrows: string; satisfactionLabel: string };
      stars: MonthStars | null;
    };
    void (async () => {
      const [font, icons, quiver, target] = await Promise.all([
        cardFont(),
        Promise.all(completed.map(eventIcon)),
        loadImage('/month-summary/quiver.png'),
        loadImage('/month-summary/target.png'),
      ]);
      if (!current) return;
      const events: BoardEvent[] = completed.map((session, i) => ({
        day: session.date,
        icon: icons[i] ?? null,
        color: eventColor(eventDisplay(session).color),
      }));
      drawMonthBoard(ctx, {
        monthName,
        subtitle,
        lettering,
        fills: titleFills,
        weekdays,
        month,
        events,
        summary: {
          ...summary,
          stars,
          quiver: quiver && chalkIcon(quiver),
          target: target && chalkIcon(target),
        },
        font,
        site: window.location.host,
      });
      const file = await toJpeg(canvas, `${monthLabel.replace(/\s+/g, '-').toLowerCase()}.jpg`);
      if (current) setDrawn({ key, file });
    })();
    return () => {
      current = false;
    };
  }, [opened, canvas, key]);

  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    card !== null &&
    navigator.canShare({ files: [card] });
  const copy = () => navigator.clipboard?.writeText(caption).catch(() => undefined);
  const share = () => {
    if (!card) return;
    // Both straight from the click (the share sheet needs it): the caption is what Instagram drops.
    void copy();
    navigator.share({ files: [card], text: caption }).then(
      () => setStatus('shared'),
      (error: unknown) =>
        setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'idle' : 'error'),
    );
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        leftSection={<IconBrandInstagram size={18} />}
        data-tour="share"
        onClick={() => {
          setStatus('idle');
          setEdited(null);
          setOpened(true);
        }}
      >
        {t('monthShare.button')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={600}>{tShare('title')}</Text>}
        size="xl"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {t('monthShare.intro')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <canvas
              ref={setCanvas}
              width={MONTH_BOARD_WIDTH}
              height={MONTH_BOARD_HEIGHT}
              className={classes.shareCard}
              role="img"
              aria-label={t('monthShare.preview', { month: monthLabel })}
            />
            <Textarea
              label={tShare('caption')}
              value={caption}
              onChange={(e) => setEdited(e.currentTarget.value)}
              autosize
              minRows={4}
              maxRows={10}
              maxLength={2200}
            />
          </SimpleGrid>
          {status !== 'idle' && (
            <Alert color={status === 'error' ? 'red' : 'teal'} variant="light" role="status">
              {tShare(`status.${status}`)}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              leftSection={<IconCopy size={18} />}
              onClick={() => copy()?.then(() => setStatus('copied'))}
            >
              {tShare('copy')}
            </Button>
            <Button
              variant={canShareFile ? 'default' : 'filled'}
              leftSection={<IconDownload size={18} />}
              onClick={() => {
                if (!card) return;
                void copy();
                download(card);
                setStatus('downloaded');
              }}
              disabled={!card}
            >
              {tShare('download')}
            </Button>
            {canShareFile && (
              <Button leftSection={<IconShare size={18} />} onClick={share}>
                {tShare('share')}
              </Button>
            )}
          </Group>
          {!card && (
            <Text size="xs" c="dimmed" ta="right">
              {tShare('preparing')}
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
