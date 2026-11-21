import { Injectable } from '@nestjs/common';
import { LayoutWatch } from '../mail/layout-watch.js';
import { MailService } from '../mail/mail.service.js';
import { FFTA_PAGE_NAMES, type FftaPageKind } from './ffta-layout.js';

export { ALERT_AFTER, ALERT_EVERY_MS } from '../mail/layout-watch.js';

/** Watches the readings of the FFTA website (`LayoutWatch`, the pages of ffta-layout.ts). */
@Injectable()
export class FftaWatch extends LayoutWatch<FftaPageKind> {
  constructor(mail: MailService) {
    super(mail, 'FFTA', FFTA_PAGE_NAMES);
  }
}
