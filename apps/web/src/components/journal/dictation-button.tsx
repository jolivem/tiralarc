'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Speech support doesn't change while the page is open. */
const noSubscription = () => () => {};

/** The browser's speech recognition (Chrome, Edge, Safari: prefixed; not Firefox). */
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionClass = new () => Recognition;

function recognitionClass(): RecognitionClass | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionClass;
    webkitSpeechRecognition?: RecognitionClass;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * A microphone by a free text's title (the sheet): a tap starts the dictation, the words go at
 * the text's end as they are recognised, a second tap (or a long silence) stops it. Nothing
 * shows where the browser can't recognise speech; the words are recognised by the browser's own
 * service (Chrome sends the voice to Google's).
 */
export function DictationButton({
  onText,
  disabled,
}: {
  onText: (words: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('journal.dictation');
  const locale = useLocale();
  // False on the server (it can't know what the browser supports), then the browser's answer.
  const supported = useSyncExternalStore(
    noSubscription,
    () => recognitionClass() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });
  useEffect(() => () => recognition.current?.stop(), []);

  if (!supported) return null;
  const toggle = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech = recognitionClass();
    if (!Speech) return;
    const r = new Speech();
    r.lang = locale === 'en' ? 'en-GB' : 'fr-FR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) onTextRef.current(result[0].transcript);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  };

  const label = listening ? t('stop') : t('start');
  return (
    <Tooltip label={label}>
      <ActionIcon
        variant={listening ? 'filled' : 'subtle'}
        color={listening ? 'red' : 'gray'}
        size="sm"
        aria-label={label}
        aria-pressed={listening}
        onClick={toggle}
        disabled={disabled}
      >
        {listening ? <IconPlayerStopFilled size={14} /> : <IconMicrophone size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}
