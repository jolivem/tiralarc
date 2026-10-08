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
  invitation: {
    fr: {
      subject: (inviter: string) => `${inviter} vous invite sur Tiralarc`,
      intro: (inviter: string) =>
        `${inviter} tient son journal de tir à l'arc sur Tiralarc et vous a ajouté à ses personnes invitées. Pour accepter son invitation :`,
      button: "Accepter l'invitation",
      outro: 'Si vous ne connaissez pas cette personne, ignorez cet email.',
    },
    en: {
      subject: (inviter: string) => `${inviter} invites you to Tiralarc`,
      intro: (inviter: string) =>
        `${inviter} keeps an archery journal on Tiralarc and added you to their guests. To accept the invitation:`,
      button: 'Accept the invitation',
      outro: "If you don't know this person, you can ignore this email.",
    },
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Intro, a button to `link`, then a small-print outro. */
function linkEmail(
  subject: string,
  intro: string,
  button: string,
  outro: string,
  link: string,
): RenderedMail {
  return {
    subject,
    text: `${intro}\n\n${link}\n\n${outro}\n`,
    html: `<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#171717;color:#fff;text-decoration:none;border-radius:4px">${escapeHtml(button)}</a></p>
<p style="color:#666;font-size:13px">${escapeHtml(outro)}</p>`,
  };
}

export function verificationEmail(locale: MailLocale, link: string): RenderedMail {
  const t = copy.verification[locale];
  return linkEmail(t.subject, t.intro, t.button, t.outro, link);
}

export function invitationEmail(locale: MailLocale, inviter: string, link: string): RenderedMail {
  const t = copy.invitation[locale];
  return linkEmail(t.subject(inviter), t.intro(inviter), t.button, t.outro, link);
}
