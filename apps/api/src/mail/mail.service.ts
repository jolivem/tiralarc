import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';
import { type MailLocale, verificationEmail } from './templates.js';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.transporter = createTransport(config.get('SMTP_URL', { infer: true }));
  }

  async sendEmailVerification(to: string, locale: string, token: string): Promise<void> {
    const lang: MailLocale = locale === 'en' ? 'en' : 'fr';
    const link = new URL(`/${lang}/verify-email`, this.config.get('WEB_URL', { infer: true }));
    link.searchParams.set('token', token);
    await this.send({ to, ...verificationEmail(lang, link.toString()) });
  }

  /** Overridden in tests to capture outgoing mail. */
  async send(mail: OutgoingMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      ...mail,
    });
    this.logger.log(`Mail "${mail.subject}" sent to ${mail.to}`);
  }
}
