'use client';

import { ActionIcon, Badge, Button, Group, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { SessionComment } from '@tiralarc/api-client';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  addSessionComment,
  deleteSessionComment,
  updateSessionComment,
} from '@/app/actions/coaching';
import { FormError } from '@/components/form-feedback';
import type { ActionState } from '@/lib/action-state';
import classes from './journal.module.css';

const MAX_LENGTH = 2000;

/**
 * The bottom of an event's sheet: the comments the archer's coach left on it, in a box of its
 * own colour. The coach (`coach`) writes new ones and changes or deletes their own; the archer
 * reads them (the box shows only when there are some), the unread ones marked "new".
 */
export function CoachComments({
  sessionId,
  comments,
  coach,
}: {
  sessionId: string;
  comments: SessionComment[];
  /** The coach looking at their archer's sheet. */
  coach?: { archerId: string };
}) {
  const t = useTranslations('journal.comments');
  const [text, setText] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  if (!coach && comments.length === 0) return null;

  const run = (action: () => Promise<ActionState>, done?: () => void) =>
    startTransition(async () => {
      const result = await action();
      setState(result);
      if (!result.code) done?.();
    });

  return (
    <section className={classes.coachComments} aria-label={t('title')}>
      <h2 className={classes.coachCommentsTitle}>{t('title')}</h2>
      <Stack gap="sm">
        {comments.length === 0 && (
          <Text size="sm" c="dimmed">
            {t('empty')}
          </Text>
        )}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            pending={pending}
            onSave={
              coach && comment.mine
                ? (value, done) =>
                    run(
                      () => updateSessionComment(coach.archerId, sessionId, comment.id, value),
                      done,
                    )
                : undefined
            }
            onDelete={
              coach && comment.mine
                ? () => run(() => deleteSessionComment(coach.archerId, sessionId, comment.id))
                : undefined
            }
            showNew={!coach}
          />
        ))}
        {coach && (
          <Stack gap="xs">
            <Textarea
              aria-label={t('placeholder')}
              placeholder={t('placeholder')}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={8}
              maxLength={MAX_LENGTH}
            />
            <Group justify="flex-end">
              <Button
                size="sm"
                loading={pending}
                disabled={text.trim() === ''}
                onClick={() =>
                  run(
                    () => addSessionComment(coach.archerId, sessionId, text),
                    () => setText(''),
                  )
                }
              >
                {t('add')}
              </Button>
            </Group>
          </Stack>
        )}
        <FormError state={state} />
      </Stack>
    </section>
  );
}

function CommentItem({
  comment,
  pending,
  onSave,
  onDelete,
  showNew,
}: {
  comment: SessionComment;
  pending: boolean;
  /** Its author's: change it (then `done`). */
  onSave?: (text: string, done: () => void) => void;
  onDelete?: () => void;
  /** The archer's sheet: a badge on the comments they hadn't read. */
  showNew: boolean;
}) {
  const t = useTranslations('journal.comments');
  const format = useFormatter();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const edited = comment.updatedAt !== comment.createdAt;
  const when = format.dateTime(new Date(comment.updatedAt), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className={classes.coachComment}>
      <Group justify="space-between" gap="xs" wrap="nowrap" align="flex-start">
        <Text size="sm" fw={600}>
          {comment.coach.name}
          <Text span size="xs" c="dimmed" fw={400}>
            {' · '}
            {edited ? t('editedOn', { date: when }) : when}
          </Text>
          {showNew && comment.isNew && (
            <Badge ml="xs" size="xs" color="red" variant="filled">
              {t('new')}
            </Badge>
          )}
        </Text>
        {onSave && onDelete && editing === null && (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={t('edit')}>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={t('edit')}
                onClick={() => setEditing(comment.text)}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
            {confirming ? (
              <Group gap={4} wrap="nowrap">
                <Text size="xs">{t('deleteConfirm')}</Text>
                <Button size="compact-xs" color="red" loading={pending} onClick={onDelete}>
                  {t('delete')}
                </Button>
                <Button size="compact-xs" variant="default" onClick={() => setConfirming(false)}>
                  {t('cancel')}
                </Button>
              </Group>
            ) : (
              <Tooltip label={t('delete')}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={t('delete')}
                  onClick={() => setConfirming(true)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        )}
      </Group>
      {editing !== null && onSave ? (
        <Stack gap="xs" mt={4}>
          <Textarea
            aria-label={t('edit')}
            value={editing}
            onChange={(e) => setEditing(e.currentTarget.value)}
            autosize
            minRows={2}
            maxRows={8}
            maxLength={MAX_LENGTH}
          />
          <Group justify="flex-end" gap="xs">
            <Button size="compact-sm" variant="default" onClick={() => setEditing(null)}>
              {t('cancel')}
            </Button>
            <Button
              size="compact-sm"
              loading={pending}
              disabled={editing.trim() === ''}
              onClick={() => onSave(editing, () => setEditing(null))}
            >
              {t('save')}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Text size="sm" className={classes.coachCommentText}>
          {comment.text}
        </Text>
      )}
    </article>
  );
}
