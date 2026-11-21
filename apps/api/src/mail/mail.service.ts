import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';
import {
  type AlertSite,
  coachNewsEmail,
  competitionReminderEmail,
  invitationEmail,
  layoutAlertEmail,
  type MailLocale,
  passwordResetEmail,
  reviewModerationEmail,
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

  /**
   * A user's review of the app, to the moderators (REVIEWS_EMAIL, in French): its stars, comment
   * and author, with the link to the page that publishes or refuses it.
   */
  async sendReviewForModeration(
    review: { stars: number; comment: string; authorName: string; email: string },
    token: string,
  ): Promise<void> {
    const link = this.tokenLink('fr', '/reviews/moderate', token);
    this.logDevLink('Review moderation', review.email, link);
    await this.send({
      to: this.config.get('REVIEWS_EMAIL', { infer: true }),
      ...reviewModerationEmail(review, link),
    });
  }

  /**
   * To ALERTS_EMAIL (in French): a page of an outside website (the FFTA's, ianseo.net) no longer
   * reads as expected (`LayoutWatch`).
   */
  async sendLayoutAlert(alert: {
    site: AlertSite;
    page: string;
    url: string;
    problem: string;
    failures: number;
  }): Promise<void> {
    await this.send({
      to: this.config.get('ALERTS_EMAIL', { infer: true }),
      ...layoutAlertEmail(alert),
    });
  }

  /** To an archer: what their coach proposed or wrote since the last such email (one a day). */
  async sendCoachNews(
    to: string,
    locale: string,
    news: Parameters<typeof coachNewsEmail>[1],
  ): Promise<void> {
    const lang = mailLocale(locale);
    await this.send({ to, ...coachNewsEmail(lang, news, this.webLink(lang, '/archer')) });
  }

  /** To an archer, the week before: their competitions to come (`sheetId`: the first one's). */
  async sendCompetitionReminder(
    to: string,
    locale: string,
    competitions: Parameters<typeof competitionReminderEmail>[1],
    sheetId: string,
  ): Promise<void> {
    const lang = mailLocale(locale);
    const link = this.webLink(lang, `/archer/journal/${sheetId}`);
    await this.send({ to, ...competitionReminderEmail(lang, competitions, link) });
  }

  /** A page of the web app (`path`, in `lang`). */
  private webLink(lang: MailLocale, path: string): string {
    return new URL(`/${lang}${path}`, this.config.get('WEB_URL', { infer: true })).toString();
  }

  /** A page of the web app (`path`, in `lang`) that receives `token`. */
  private tokenLink(lang: MailLocale, path: string, token: string): string {
    const link = new URL(this.webLink(lang, path));
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
