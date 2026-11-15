'use client';

import { Modal, Text, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import classes from './preview-print.module.css';

/**
 * One glance inside the notebook on the visitors' home page: a square print of a screenshot
 * (public/home/, made-up data), a little askew, its caption handwritten below. A click opens
 * the whole screenshot enlarged in a window, closed by its cross (or Escape).
 */
export function PreviewPrint({
  src,
  alt,
  caption,
  width,
  height,
  tilt,
}: {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  /** Degrees. */
  tilt: number;
}) {
  const t = useTranslations('home.preview');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [opened, setOpened] = useState(false);

  return (
    <figure className={classes.print} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <UnstyledButton
        className={classes.open}
        onClick={() => setOpened(true)}
        aria-label={t('open', { name: caption })}
        title={t('open', { name: caption })}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 992px) 50vw, 300px"
          className={classes.image}
        />
      </UnstyledButton>
      <figcaption className={classes.caption}>{caption}</figcaption>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Text className={classes.modalTitle}>{caption}</Text>}
        closeButtonProps={{ 'aria-label': t('close'), size: 'lg' }}
        size="min(1200px, 94vw)"
        fullScreen={isPhone}
        centered
        radius="md"
      >
        {/* The whole screenshot, not cropped. */}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="94vw"
          className={classes.full}
        />
      </Modal>
    </figure>
  );
}
