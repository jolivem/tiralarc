import { invitationEmail } from './templates.js';

describe('invitation emails', () => {
  const link = 'https://tiralarc.test/fr/invitations/accept?token=abc';

  it("lays a coach's invitation out as a card, the inviter's name in calligraphy", () => {
    const mail = invitationEmail('fr', 'Léa <Archère>', link, true);
    expect(mail.subject).toBe('Léa <Archère> vous invite comme coach sur Tiralarc');
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
    expect(mail.subject).toBe('Lea invites you to Tiralarc');
    expect(mail.html).toContain('Great Vibes');
    expect(mail.html).toContain('is pleased to invite you to discover Tiralarc');
    expect(mail.html).not.toContain('coach');
    expect(mail.text).toContain(link);
    expect(invitationEmail('en', 'Lea', link, true).html).toContain(
      'is pleased to invite you to become their coach',
    );
  });
});
