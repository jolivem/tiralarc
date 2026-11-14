import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';
import {
  invitationEmail,
  type MailLocale,
  passwordResetEmail,
  verificationEmail,
} from './templates.js';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const mailLocale = (locale: string): MailLocale => (locale === 'en' ? 'en' : 'fr');

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.transporter = createTransport(config.get('SMTP_URL', { infer: true }));
  }

  async sendEmailVerification(to: string, locale: string, token: string): Promise<void> {
    const lang = mailLocale(locale);
    const link = this.tokenLink(lang, '/verify-email', token);
    this.logDevLink('Email verification', to, link);
    const ttl = this.config.get('EMAIL_VERIFICATION_TTL', { infer: true });
    await this.send({ to, ...verificationEmail(lang, link, ttl) });
  }

  /** "Forgot password": the link to choose a new one, in the user's language. */
  async sendPasswordReset(to: string, locale: string, token: string): Promise<void> {
    const lang = mailLocale(locale);
    const link = this.tokenLink(lang, '/reset-password', token);
    this.logDevLink('Password reset', to, link);
    const ttl = this.config.get('PASSWORD_RESET_TTL', { infer: true });
    await this.send({ to, ...passwordResetEmail(lang, link, ttl) });
  }

  /** Invitation from an archer to a guest, written in the archer's language. */
  async sendInvitation(
    to: string,
    locale: string,
    inviter: string,
    token: string,
    isCoach = false,
  ): Promise<void> {
    const lang = mailLocale(locale);
    const link = this.tokenLink(lang, '/invitations/accept', token);
    await this.send({ to, ...invitationEmail(lang, inviter, link, isCoach) });
  }

  /** A page of the web app (`path`, in `lang`) that receives `token`. */
  private tokenLink(lang: MailLocale, path: string, token: string): string {
    const link = new URL(`/${lang}${path}`, this.config.get('WEB_URL', { infer: true }));
    link.searchParams.set('token', token);
    return link.toString();
  }

  /**
   * Development only: such a link grants access to the account, it must never reach production
   * logs. Logged before sending, so it is available even when the SMTP server (Mailpit) is down.
   */
  private logDevLink(what: string, to: string, link: string): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'development') {
      this.logger.log(`${what} link for ${to}: ${link}`);
    }
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
