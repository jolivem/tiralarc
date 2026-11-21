import { Injectable } from '@nestjs/common';
import { LayoutWatch } from '../mail/layout-watch.js';
import { MailService } from '../mail/mail.service.js';
import { IANSEO_PAGE_NAMES, type IanseoPageKind } from './ianseo-layout.js';

/** Watches the readings of ianseo.net (`LayoutWatch`, the pages of ianseo-layout.ts). */
@Injectable()
export class IanseoWatch extends LayoutWatch<IanseoPageKind> {
  constructor(mail: MailService) {
    super(mail, 'ianseo', IANSEO_PAGE_NAMES);
  }
}
