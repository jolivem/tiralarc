import { invitationEmail, passwordResetEmail, validityOf, verificationEmail } from './templates.js';

describe('link emails', () => {
  it('say how long their link is valid, from the configured lifetime', () => {
    expect(verificationEmail('fr', 'https://x.test', 86_400).text).toContain(
      'Ce lien est valable 24 heures.',
    );
    expect(passwordResetEmail('fr', 'https://x.test', 3600).text).toContain(
      "Ce lien est valable 1 heure et ne sert qu'une fois.",
    );
    expect(passwordResetEmail('en', 'https://x.test', 3600).text).toContain(
      'This link is valid for 1 hour and works once.',
    );
    expect(validityOf('en', 86_400)).toBe('24 hours');
    expect(validityOf('fr', 1800)).toBe('30 minutes');
  });
});

describe('verification email', () => {
  it('is laid out as a page of the notebook, the link escaped', () => {
    const link = 'https://tiralarc.test/fr/verify-email?token=a&b';
    const mail = verificationEmail('fr', link, 86_400);
    expect(mail.subject).toBe('Confirmez votre adresse email');
    expect(mail.html).toContain('<!doctype html>');
    expect(mail.html).toContain('Caveat');
    // Leather cover, red elastic band, ruled paper.
    expect(mail.html).toContain('#7a5539');
    expect(mail.html).toContain('#c62828');
    expect(mail.html).toContain('repeating-linear-gradient');
    expect(mail.html).toContain('Bienvenue !');
    expect(mail.html).toContain('href="https://tiralarc.test/fr/verify-email?token=a&#38;b"');
    expect(mail.html).toContain('Ce lien est valable 24 heures.');
    expect(mail.text).toContain(link);
    expect(verificationEmail('en', link, 86_400).html).toContain('Your archery diary is waiting');
  });
});

describe('invitation emails', () => {
  const link = 'https://tiralarc.test/fr/invitations/accept?token=abc';

  it("lays a coach's invitation out as a card, the inviter's name in calligraphy", () => {
    const mail = invitationEmail('fr', 'Léa <Archère>', link, true);
    expect(mail.subject).toBe('Léa <Archère> vous invite comme coach sur MyArcheryDiary');
    expect(mail.html).toContain('<!doctype html>');
    expect(mail.html).toContain('Great Vibes');
    expect(mail.html).toContain('border:3px double');
    // The name is escaped.
    expect(mail.html).toContain('Léa &#60;Archère&#62;');
    expect(mail.html).not.toContain('<Archère>');
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.html).toContain('a le plaisir de vous inviter à devenir son coach');
    // Mail clients without HTML get the same message.
    expect(mail.text).toContain(link);
    expect(mail.text).toContain('vous invite comme coach');
  });

  it("uses the same card for a guest's invitation, in English too", () => {
    const mail = invitationEmail('en', 'Lea', link);
    expect(mail.subject).toBe('Lea invites you to MyArcheryDiary');
    expect(mail.html).toContain('Great Vibes');
    expect(mail.html).toContain('is pleased to invite you to discover MyArcheryDiary');
    expect(mail.html).not.toContain('coach');
    expect(mail.text).toContain(link);
    expect(invitationEmail('en', 'Lea', link, true).html).toContain(
      'is pleased to invite you to become their coach',
    );
  });
});
