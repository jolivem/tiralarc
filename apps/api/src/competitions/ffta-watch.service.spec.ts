import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MailService } from '../mail/mail.service.js';
import { ALERT_AFTER, ALERT_EVERY_MS, FftaWatch } from './ffta-watch.service.js';

describe('FftaWatch', () => {
  let sendLayoutAlert: ReturnType<typeof vi.fn>;
  let watch: FftaWatch;

  beforeEach(() => {
    vi.useFakeTimers();
    sendLayoutAlert = vi.fn().mockResolvedValue(undefined);
    watch = new FftaWatch({ sendLayoutAlert } as unknown as MailService);
  });
  afterEach(() => vi.useRealTimers());

  const fail = (times: number, kind: 'search' | 'ranking' = 'search') => {
    for (let i = 0; i < times; i++)
      watch.anomaly(kind, 'https://www.ffta.fr/competitions', 'vue absente');
  };

  it('alerts once a page keeps coming back unrecognised', () => {
    fail(ALERT_AFTER - 1);
    expect(sendLayoutAlert).not.toHaveBeenCalled();
    fail(1);
    expect(sendLayoutAlert).toHaveBeenCalledWith({
      site: 'FFTA',
      page: expect.stringContaining('recherche des compétitions'),
      url: 'https://www.ffta.fr/competitions',
      problem: 'vue absente',
      failures: ALERT_AFTER,
    });
  });

  it('starts counting again after a good reading', () => {
    fail(ALERT_AFTER - 1);
    watch.ok('search');
    fail(ALERT_AFTER - 1);
    expect(sendLayoutAlert).not.toHaveBeenCalled();
  });

  it('sends at most one alert a day per page', () => {
    fail(ALERT_AFTER + 5);
    fail(ALERT_AFTER, 'ranking');
    expect(sendLayoutAlert).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(ALERT_EVERY_MS);
    fail(1);
    expect(sendLayoutAlert).toHaveBeenCalledTimes(3);
  });

  it('tries again on the next anomaly when the email could not be sent', async () => {
    sendLayoutAlert.mockRejectedValueOnce(new Error('SMTP down'));
    fail(ALERT_AFTER);
    await vi.runAllTimersAsync();
    fail(1);
    expect(sendLayoutAlert).toHaveBeenCalledTimes(2);
  });
});
