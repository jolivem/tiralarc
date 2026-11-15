'use client';

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { IconBrandInstagram, IconCopy, IconDownload, IconShare } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import journalClasses from '@/components/journal/journal.module.css';
import { download, type ShareStatus, toJpeg } from '@/components/journal/share-modal';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type BoardFigure,
  type BoardFonts,
  type BoardPaper,
  drawBoardCard,
} from './board-card';

/** The board's fonts (marker, upright hand), read from <html> and loaded first. */
async function boardFonts(): Promise<BoardFonts> {
  const style = getComputedStyle(document.documentElement);
  const family = (name: string, fallback: string) =>
    `${style.getPropertyValue(name).trim() || fallback}, cursive`;
  const fonts = {
    marker: family('--font-marker', "'Permanent Marker'"),
    hand: family('--font-hand-upright', "'Patrick Hand'"),
  };
  await Promise.all(
    [`400 40px ${fonts.marker}`, `400 30px ${fonts.hand}`, `700 30px ${fonts.hand}`].map((font) =>
      document.fonts.load(font).catch(() => undefined),
    ),
  );
  return fonts;
}

/**
 * The season summary for Instagram: its whiteboard as a picture (board-card.ts) — the title,
 * the ticked figures in marker, the ticked papers under their magnets — and a caption the
 * archer may edit. No Instagram API: the phone's share sheet (the caption copied, Instagram
 * drops shared text), else the picture is downloaded.
 */
export function SeasonShareButton({
  title,
  subtitle,
  figures,
  papers,
  fileName,
}: {
  title: string;
  subtitle: string;
  figures: BoardFigure[];
  papers: BoardPaper[];
  /** The picture's file name, without extension. */
  fileName: string;
}) {
  const t = useTranslations('journal.share');
  const tSeason = useTranslations('season');
  const [opened, setOpened] = useState(false);
  const all = useMemo(
    () => [...figures.map((f) => f.key), ...papers.map((p) => p.key)],
    [figures, papers],
  );
  const [chosen, setChosen] = useState(all);
  const [edited, setEdited] = useState<string | null>(null);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  // Kept by value: the card is redrawn only when what it shows changes.
  const shownKey = JSON.stringify({
    figures: figures.filter((f) => chosen.includes(f.key)),
    papers: papers.filter((p) => chosen.includes(p.key)),
  });
  const shown = useMemo(
    () => JSON.parse(shownKey) as { figures: BoardFigure[]; papers: BoardPaper[] },
    [shownKey],
  );
  const allChosen = chosen.length === all.length;
  const site = typeof window === 'undefined' ? null : window.location;
  const caption =
    edited ??
    [`${title} — ${subtitle}`, '', t('siteLink', { url: site?.origin ?? '' }), t('hashtags')].join(
      '\n',
    );

  /** The card's JPEG, with what it shows (an older one isn't shared). */
  const [drawn, setDrawn] = useState<{ key: string; file: File } | null>(null);
  const card = drawn?.key === shownKey ? drawn.file : null;
  useEffect(() => {
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let current = true;
    void (async () => {
      const fonts = await boardFonts();
      if (!current) return;
      drawBoardCard(ctx, { title, subtitle, ...shown, fonts, site: window.location.host });
      const file = await toJpeg(canvas, `${fileName}.jpg`);
      if (current) setDrawn({ key: shownKey, file });
    })();
    return () => {
      current = false;
    };
  }, [canvas, shown, shownKey, title, subtitle, fileName]);

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
  const toggle = (key: string) =>
    setChosen((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));

  return (
    <>
      <Button
        variant="light"
        leftSection={<IconBrandInstagram size={18} />}
        onClick={() => {
          setStatus('idle');
          setOpened(true);
        }}
      >
        {t('button')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text fw={600}>{t('title')}</Text>}
        size="xl"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            {tSeason('shareIntro')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Stack gap={6} role="group" aria-label={t('fields')}>
              <Group justify="space-between" gap="xs">
                <Text size="sm" fw={500}>
                  {t('fields')}
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => setChosen(allChosen ? [] : all)}
                >
                  {allChosen ? t('selectNone') : t('selectAll')}
                </Button>
              </Group>
              {[
                ...figures.map((f) => ({ key: f.key, label: f.label })),
                ...papers.map((p) => ({ key: p.key, label: p.title })),
              ].map(({ key, label }) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={chosen.includes(key)}
                  onChange={() => toggle(key)}
                />
              ))}
            </Stack>
            <Stack gap="md">
              <canvas
                ref={setCanvas}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className={journalClasses.shareCard}
                role="img"
                aria-label={t('preview')}
              />
              <Textarea
                label={t('caption')}
                value={caption}
                onChange={(e) => setEdited(e.currentTarget.value)}
                autosize
                minRows={4}
                maxRows={10}
                maxLength={2200}
              />
            </Stack>
          </SimpleGrid>
          {status !== 'idle' && (
            <Alert color={status === 'error' ? 'red' : 'teal'} variant="light" role="status">
              {t(`status.${status}`)}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              leftSection={<IconCopy size={18} />}
              onClick={() => copy()?.then(() => setStatus('copied'))}
            >
              {t('copy')}
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
              {t('download')}
            </Button>
            {canShareFile && (
              <Button leftSection={<IconShare size={18} />} onClick={share}>
                {t('share')}
              </Button>
            )}
          </Group>
          {!card && (
            <Text size="xs" c="dimmed" ta="right">
              {t('preparing')}
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
