'use client';

import { ActionIcon, Anchor, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconWorldPlus } from '@tabler/icons-react';
import type { FavoriteSite } from '@tiralarc/api-client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { addSite, removeSite } from '@/app/actions/profile';
import { FormError, useFieldError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import { ListRow, ProfileCard, ProfileList } from './list-card';

/** The archer's favourite websites, opened in a new tab. */
export function SitesCard({ sites }: { sites: FavoriteSite[] }) {
  const t = useTranslations('profile');
  const isPhone = useMediaQuery('(max-width: 48em)');
  const [adding, setAdding] = useState(false);

  return (
    <ProfileCard
      title={t('sites.title')}
      action={
        <ActionIcon
          variant="light"
          size="lg"
          aria-label={t('sites.add')}
          onClick={() => setAdding(true)}
        >
          <IconWorldPlus size={20} />
        </ActionIcon>
      }
    >
      <ProfileList empty={t('sites.empty')}>
        {sites.map((site) => (
          <ListRow
            key={site.id}
            removeLabel={t('sites.removeLabel', { name: site.label })}
            confirmTitle={t('sites.removeTitle')}
            confirmBody={t('sites.removeBody', { name: site.label })}
            confirmButton={t('delete')}
            onRemove={() => removeSite(site.id)}
          >
            <Anchor href={site.url} target="_blank" rel="noopener noreferrer" fw={500}>
              {site.label}
            </Anchor>
            <Text size="sm" c="dimmed" truncate>
              {site.url.replace(/^https?:\/\//, '')}
            </Text>
          </ListRow>
        ))}
      </ProfileList>

      <Modal
        opened={adding}
        onClose={() => setAdding(false)}
        title={<Text fw={600}>{t('sites.add')}</Text>}
        fullScreen={isPhone}
        centered
      >
        {/* Mounted on each opening so the form starts empty. */}
        {adding && <SiteForm onDone={() => setAdding(false)} />}
      </Modal>
    </ProfileCard>
  );
}

/** "ffta.fr" → "https://ffta.fr": archers rarely type the scheme. */
const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

function SiteForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('profile');
  const fieldError = useFieldError();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  const valid = label.trim() !== '' && url.trim() !== '';
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        startTransition(async () => {
          const result = await addSite({ label: label.trim(), url: withScheme(url.trim()) });
          if (result.code) setState(result);
          else onDone();
        });
      }}
    >
      <Stack gap="md">
        <TextInput
          label={t('sites.label')}
          placeholder={t('sites.labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          maxLength={100}
          error={fieldError(state, 'label')}
          required
          data-autofocus
        />
        <TextInput
          label={t('sites.url')}
          placeholder={t('sites.urlPlaceholder')}
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          maxLength={490}
          error={fieldError(state, 'url')}
          inputMode="url"
          required
        />
        <FormError state={state} />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" loading={pending} disabled={!valid}>
            {t('sites.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
