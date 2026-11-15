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
      intro:
        'Bienvenue sur MyArcheryDiary ! Pour activer votre compte, confirmez votre adresse email :',
      button: 'Confirmer mon email',
      outro: (validity: string) =>
        `Ce lien est valable ${validity}. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.`,
      // The notebook page (HTML version).
      heading: 'Bienvenue !',
      body: "Votre carnet de tir à l'arc vous attend. Pour l'ouvrir, confirmez votre adresse email :",
      copyLink: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :',
    },
    en: {
      subject: 'Confirm your email address',
      intro:
        'Welcome to MyArcheryDiary! To activate your account, please confirm your email address:',
      button: 'Confirm my email',
      outro: (validity: string) =>
        `This link is valid for ${validity}. If you didn't sign up, you can ignore this email.`,
      heading: 'Welcome!',
      body: 'Your archery diary is waiting for you. To open it, please confirm your email address:',
      copyLink: "If the button doesn't work, copy this link into your browser:",
    },
  },
  passwordReset: {
    fr: {
      subject: 'Choisissez un nouveau mot de passe',
      intro:
        'Vous avez demandé à changer le mot de passe de votre compte. Pour en choisir un nouveau :',
      button: 'Choisir un nouveau mot de passe',
      outro: (validity: string) =>
        `Ce lien est valable ${validity} et ne sert qu'une fois. Si vous n'avez rien demandé, ignorez cet email : votre mot de passe reste le même.`,
    },
    en: {
      subject: 'Choose a new password',
      intro: 'You asked to change the password of your account. To choose a new one:',
      button: 'Choose a new password',
      outro: (validity: string) =>
        `This link is valid for ${validity} and works once. If you didn't ask for it, you can ignore this email: your password stays the same.`,
    },
  },
  invitation: {
    fr: {
      subject: (inviter: string) => `${inviter} vous invite sur MyArcheryDiary`,
      intro: (inviter: string) =>
        `${inviter} tient son journal de tir à l'arc sur MyArcheryDiary et vous invite à le découvrir, pour créer votre propre journal. Pour accepter son invitation :`,
      button: "Accepter l'invitation",
      outro: 'Si vous ne connaissez pas cette personne, ignorez cet email.',
      heading: 'Invitation',
      invites: 'a le plaisir de vous inviter à découvrir MyArcheryDiary',
      purpose: "pour y tenir, vous aussi, votre journal de tir à l'arc.",
      howTo: "Acceptez l'invitation, puis créez votre compte pour ouvrir votre premier journal.",
    },
    en: {
      subject: (inviter: string) => `${inviter} invites you to MyArcheryDiary`,
      intro: (inviter: string) =>
        `${inviter} keeps an archery journal on MyArcheryDiary and invites you to discover it, to keep your own journal. To accept the invitation:`,
      button: 'Accept the invitation',
      outro: "If you don't know this person, you can ignore this email.",
      heading: 'Invitation',
      invites: 'is pleased to invite you to discover MyArcheryDiary',
      purpose: 'to keep your own archery journal there too.',
      howTo: 'Accept the invitation, then create your account to open your first journal.',
    },
  },
  coachInvitation: {
    fr: {
      subject: (inviter: string) => `${inviter} vous invite comme coach sur MyArcheryDiary`,
      intro: (inviter: string) =>
        `${inviter} tient son journal de tir à l'arc sur MyArcheryDiary et vous invite comme coach, pour suivre son journal de la saison en cours. Connectez-vous (ou créez votre compte), puis acceptez l'invitation :`,
      button: "Accepter l'invitation",
      outro: 'Si vous ne connaissez pas cette personne, ignorez cet email.',
      // The invitation card (HTML version).
      heading: 'Invitation',
      invites: 'a le plaisir de vous inviter à devenir son coach',
      purpose: "pour suivre son journal de tir à l'arc de la saison en cours sur MyArcheryDiary.",
      howTo: "Connectez-vous (ou créez votre compte), puis acceptez l'invitation.",
    },
    en: {
      subject: (inviter: string) => `${inviter} invites you to MyArcheryDiary as their coach`,
      intro: (inviter: string) =>
        `${inviter} keeps an archery journal on MyArcheryDiary and invites you as their coach, to follow their journal of the current season. Sign in (or create your account), then accept the invitation:`,
      button: 'Accept the invitation',
      outro: "If you don't know this person, you can ignore this email.",
      heading: 'Invitation',
      invites: 'is pleased to invite you to become their coach',
      purpose: 'to follow their archery journal of the current season on MyArcheryDiary.',
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

/**
 * A review of the app, to the moderators (in French): stars, comment, author (name shown, email
 * to reach them), then the link to the page that publishes or refuses it.
 */
export function reviewModerationEmail(
  review: { stars: number; comment: string; authorName: string; email: string },
  link: string,
): RenderedMail {
  const stars = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
  const subject = `Nouvel avis ${stars} de ${review.authorName}`;
  const intro = `${review.authorName} (${review.email}) a noté l'application ${review.stars}/5 :`;
  return {
    subject,
    text: `${intro}\n\n${review.comment}\n\nPublier ou refuser cet avis :\n${link}\n`,
    html: `<p>${escapeHtml(intro)}</p>
<p style="font-size:22px;color:#f5b301;margin:4px 0">${stars}</p>
<blockquote style="margin:12px 0;padding:8px 14px;border-left:4px solid #7a5539;background:#fdfaf1;white-space:pre-wrap">${escapeHtml(review.comment)}</blockquote>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#3f2817;color:#fff;text-decoration:none;border-radius:4px">Publier ou refuser cet avis</a></p>
<p style="color:#666;font-size:13px">Un avis publié s'affiche sur la page d'accueil du site, sous la FAQ.</p>`,
  };
}

/** How long a link stays valid, in words: "24 heures", "1 hour", "30 minutes". */
export function validityOf(locale: MailLocale, seconds: number): string {
  const hours = seconds / 3600;
  const [count, unit] = Number.isInteger(hours)
    ? [hours, locale === 'fr' ? 'heure' : 'hour']
    : [Math.round(seconds / 60), 'minute'];
  return `${count} ${unit}${count > 1 ? 's' : ''}`;
}

/** `ttlSeconds`: how long the link is valid (said in the email). */
export function verificationEmail(
  locale: MailLocale,
  link: string,
  ttlSeconds: number,
): RenderedMail {
  const t = copy.verification[locale];
  const outro = t.outro(validityOf(locale, ttlSeconds));
  return {
    subject: t.subject,
    text: `${t.intro}\n\n${link}\n\n${outro}\n`,
    html: notebookPage(locale, { ...t, outro }, link),
  };
}

/** The notebook's colours (web: `components/notebook/*.module.css`), as plain hex for mail clients. */
const NOTEBOOK = {
  desk: '#efe9dd',
  cover: '#7a5539',
  coverDark: '#5e3f29',
  coverInk: '#f3e6d3',
  band: '#c62828',
  paper: '#fdfaf1',
  ink: '#2f3a4a',
  rule: '#d3deeb',
  margin: '#e3a3a3',
  // The dark leather brown of the sign-in / sign-up buttons.
  button: '#3f2817',
  muted: '#6b7280',
};
/** Caveat (the web's `--font-hand`) where web fonts load, else a handwriting font of the system. */
const HAND = "Caveat, 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
/** Ribeye, the cover's title font. */
const COVER_FONT = "Ribeye, Georgia, 'Times New Roman', serif";
/** The ruling's step, as on the web's pages: every text line sits on a ruled line. */
const STEP = 30;

/**
 * A page of the notebook: the leather cover with its red elastic band around a ruled cream page
 * (red margin), a handwritten heading, then the button to `link`. Tables and inline styles only,
 * for mail clients; the ruling is a background gradient that clients without it simply leave out.
 */
function notebookPage(
  locale: MailLocale,
  t: {
    subject: string;
    heading: string;
    body: string;
    button: string;
    outro: string;
    copyLink: string;
  },
  link: string,
): string {
  const href = escapeHtml(link);
  const n = NOTEBOOK;
  const ruling = `background-color:${n.paper};background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${STEP - 1}px,${n.rule} ${STEP - 1}px,${n.rule} ${STEP}px)`;
  const text = `font-family:${HAND};font-size:21px;line-height:${STEP}px;color:${n.ink}`;
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(t.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&amp;family=Ribeye&amp;display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Ribeye&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${n.desk}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${n.desk}">
<tr><td align="center" style="padding:28px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${n.cover};border-radius:10px 14px 14px 10px;border-left:10px solid ${n.coverDark};box-shadow:0 18px 30px -14px rgba(0,0,0,0.55)">
<tr>
<td style="padding:22px 14px 18px 12px">
<p style="margin:0 0 16px;font-family:${COVER_FONT};font-size:26px;line-height:1.2;text-align:center;color:${n.coverInk};text-shadow:2px 2px 2px rgba(0,0,0,0.55)">MyArcheryDiary</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${ruling};border-radius:2px 6px 6px 2px;box-shadow:2px 3px 0 rgba(0,0,0,0.15)">
<tr><td style="padding:${STEP}px 22px ${STEP}px 20px;border-left:2px solid ${n.margin}">
<h1 style="margin:0 0 ${STEP}px;font-family:${HAND};font-size:40px;line-height:${STEP * 2}px;font-weight:700;color:${n.ink}">${escapeHtml(t.heading)}</h1>
<p style="margin:0 0 ${STEP}px;${text}">${escapeHtml(t.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto ${STEP}px"><tr>
<td style="border-radius:6px;background:${n.button}"><a href="${href}" style="display:inline-block;padding:0 26px;font-family:${HAND};font-size:22px;font-weight:700;line-height:${STEP * 2 - 8}px;color:#fff;text-decoration:none;border-radius:6px">${escapeHtml(t.button)}</a></td>
</tr></table>
<p style="margin:0;${text};font-size:18px;color:${n.muted}">${escapeHtml(t.outro)}</p>
<p style="margin:${STEP}px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:${STEP / 2}px;color:${n.muted}">${escapeHtml(t.copyLink)}<br><a href="${href}" style="color:${n.ink};word-break:break-all">${href}</a></p>
</td></tr>
</table>
</td>
<td width="12" style="width:12px;background:${n.band};border-radius:0 3px 3px 0"></td>
<td width="10" style="width:10px"></td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** `ttlSeconds`: how long the link is valid (said in the email). */
export function passwordResetEmail(
  locale: MailLocale,
  link: string,
  ttlSeconds: number,
): RenderedMail {
  const t = copy.passwordReset[locale];
  return linkEmail(t.subject, t.intro, t.button, t.outro(validityOf(locale, ttlSeconds)), link);
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
<p style="margin:0;font-family:${SERIF};font-size:12px;letter-spacing:4px;text-transform:uppercase;color:${GOLD}">MyArcheryDiary</p>
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
