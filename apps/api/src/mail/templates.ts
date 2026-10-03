export type MailLocale = 'fr' | 'en';

interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

const copy = {
  verification: {
    fr: {
      subject: 'Confirmez votre adresse email',
      intro: 'Bienvenue sur Tiralarc ! Pour activer votre compte, confirmez votre adresse email :',
      button: 'Confirmer mon email',
      outro:
        "Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
    },
    en: {
      subject: 'Confirm your email address',
      intro: 'Welcome to Tiralarc! To activate your account, please confirm your email address:',
      button: 'Confirm my email',
      outro: "This link is valid for 24 hours. If you didn't sign up, you can ignore this email.",
    },
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function verificationEmail(locale: MailLocale, link: string): RenderedMail {
  const t = copy.verification[locale];
  return {
    subject: t.subject,
    text: `${t.intro}\n\n${link}\n\n${t.outro}\n`,
    html: `<p>${escapeHtml(t.intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#171717;color:#fff;text-decoration:none;border-radius:4px">${escapeHtml(t.button)}</a></p>
<p style="color:#666;font-size:13px">${escapeHtml(t.outro)}</p>`,
  };
}
