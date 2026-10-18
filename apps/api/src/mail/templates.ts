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
        `${inviter} tient son journal de tir à l'arc sur Tiralarc et vous invite à le découvrir, pour créer votre propre journal. Pour accepter son invitation :`,
      button: "Accepter l'invitation",
      outro: 'Si vous ne connaissez pas cette personne, ignorez cet email.',
      heading: 'Invitation',
      invites: 'a le plaisir de vous inviter à découvrir Tiralarc',
      purpose: "pour y tenir, vous aussi, votre journal de tir à l'arc.",
      howTo: "Acceptez l'invitation, puis créez votre compte pour ouvrir votre premier journal.",
    },
    en: {
      subject: (inviter: string) => `${inviter} invites you to Tiralarc`,
      intro: (inviter: string) =>
        `${inviter} keeps an archery journal on Tiralarc and invites you to discover it, to keep your own journal. To accept the invitation:`,
      button: 'Accept the invitation',
      outro: "If you don't know this person, you can ignore this email.",
      heading: 'Invitation',
      invites: 'is pleased to invite you to discover Tiralarc',
      purpose: 'to keep your own archery journal there too.',
      howTo: 'Accept the invitation, then create your account to open your first journal.',
    },
  },
  coachInvitation: {
    fr: {
      subject: (inviter: string) => `${inviter} vous invite comme coach sur Tiralarc`,
      intro: (inviter: string) =>
        `${inviter} tient son journal de tir à l'arc sur Tiralarc et vous invite comme coach, pour suivre son journal de la saison en cours. Connectez-vous (ou créez votre compte), puis acceptez l'invitation :`,
      button: "Accepter l'invitation",
      outro: 'Si vous ne connaissez pas cette personne, ignorez cet email.',
      // The invitation card (HTML version).
      heading: 'Invitation',
      invites: 'a le plaisir de vous inviter à devenir son coach',
      purpose: "pour suivre son journal de tir à l'arc de la saison en cours sur Tiralarc.",
      howTo: "Connectez-vous (ou créez votre compte), puis acceptez l'invitation.",
    },
    en: {
      subject: (inviter: string) => `${inviter} invites you to Tiralarc as their coach`,
      intro: (inviter: string) =>
        `${inviter} keeps an archery journal on Tiralarc and invites you as their coach, to follow their journal of the current season. Sign in (or create your account), then accept the invitation:`,
      button: 'Accept the invitation',
      outro: "If you don't know this person, you can ignore this email.",
      heading: 'Invitation',
      invites: 'is pleased to invite you to become their coach',
      purpose: 'to follow their archery journal of the current season on Tiralarc.',
      howTo: 'Sign in (or create your account), then accept the invitation.',
    },
  },
} as const;

/**
 * Calligraphy of the invitation card: Great Vibes (also one of the app's calendar fonts) where the
 * mail client loads web fonts (Apple Mail, iOS, Thunderbird…), otherwise a script font installed
 * on the reader's system (Gmail and Outlook ignore web fonts).
 */
const CALLIGRAPHY = "'Great Vibes', 'Segoe Script', 'Brush Script MT', 'Apple Chancery', cursive";
const SERIF = "Georgia, 'Times New Roman', serif";
const INK = '#2f2a24';
const GOLD = '#b08d57';
const PAPER = '#fdf8ee';

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

export function invitationEmail(
  locale: MailLocale,
  inviter: string,
  link: string,
  isCoach = false,
): RenderedMail {
  return invitationCard(
    locale,
    (isCoach ? copy.coachInvitation : copy.invitation)[locale],
    inviter,
    link,
  );
}

/** The words of an invitation card (a guest's or a coach's). */
type InvitationCopy = (typeof copy)['invitation' | 'coachInvitation'][MailLocale];

/**
 * An invitation (a guest's or a coach's), laid out as an invitation card: cream paper in a
 * double gold frame, the inviter's name in calligraphy, an archery ornament and the button to
 * accept. Tables and inline styles only, for mail clients; the plain-text version says the same.
 */
function invitationCard(
  locale: MailLocale,
  t: InvitationCopy,
  inviter: string,
  link: string,
): RenderedMail {
  const name = escapeHtml(inviter);
  const href = escapeHtml(link);
  // Two stars around an arrow (➳).
  const ornament = `<p style="margin:16px 0;font-family:${SERIF};font-size:14px;line-height:1;color:${GOLD}">&#10022;<span style="font-size:34px;vertical-align:middle;padding:0 14px">&#10163;</span>&#10022;</p>`;
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(t.subject(inviter))}</title>
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&amp;display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#efe9dd">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efe9dd">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${PAPER};border:3px double ${GOLD};border-radius:6px;box-shadow:0 6px 18px rgba(80,60,30,0.18)">
<tr><td style="padding:10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${GOLD};border-radius:3px">
<tr><td align="center" style="padding:36px 28px 32px;font-family:${SERIF};color:${INK};text-align:center">
<p style="margin:0;font-family:${SERIF};font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${GOLD}">Tiralarc</p>
<h1 style="margin:10px 0 0;font-family:${CALLIGRAPHY};font-size:54px;line-height:1.1;font-weight:400;color:${INK}">${escapeHtml(t.heading)}</h1>
${ornament}
<p style="margin:0;font-family:${CALLIGRAPHY};font-size:40px;line-height:1.2;color:${INK}">${name}</p>
<p style="margin:14px 0 0;font-family:${SERIF};font-size:18px;line-height:1.5;font-style:italic">${escapeHtml(t.invites)}</p>
<p style="margin:6px 0 0;font-family:${SERIF};font-size:16px;line-height:1.5">${escapeHtml(t.purpose)}</p>
${ornament}
<p style="margin:0 0 20px;font-family:${SERIF};font-size:14px;line-height:1.5;color:#5c5348">${escapeHtml(t.howTo)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td style="border-radius:24px;background:${INK}"><a href="${href}" style="display:inline-block;padding:12px 28px;font-family:${SERIF};font-size:16px;color:${PAPER};text-decoration:none;border-radius:24px;border:1px solid ${GOLD}">${escapeHtml(t.button)}</a></td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-family:${SERIF};font-size:12px;line-height:1.5;color:#8a8073;text-align:center">${escapeHtml(t.outro)}</p>
</td></tr>
</table>
</body>
</html>`;
  return {
    subject: t.subject(inviter),
    text: `${t.intro(inviter)}\n\n${link}\n\n${t.outro}\n`,
    html,
  };
}
