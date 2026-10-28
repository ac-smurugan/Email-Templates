import { flag, present, v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';
import { when } from '../layout.ts';
import { SUPPORT_LINE, signInFallback } from './shared.ts';

/** A new password, after an admin or the system reset someone's. */
export const passwordReset = defineTemplate({
  id: 'password-reset',
  name: 'Password reset',
  group: 'Account & access',
  source: 'authserver, java-utils / UserServiceImpl · template/email/password-reset.html',
  who: 'The person whose password was reset',
  when: 'Their ArmorCode password is reset',
  fields: {
    username: { about: 'Their ArmorCode user name' },
    newPassword: { about: 'The new password' },
    amcUrl: { about: 'The ArmorCode sign-in page' },
    passwordExpiresAt: { about: 'When the new password stops working, as text (“October 15, 2026 at 12:00 AM UTC”)', optional: true, isNew: true },
    mustChangePassword: { about: 'true when they must choose their own password at sign-in', optional: true, isNew: true },
    supportEmail: { about: 'Who to contact when sign-in fails, if not their administrator', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    username: 'john.smith@example.com',
    newPassword: 'Tq7#mV2p!xR9',
    amcUrl: SAMPLE_APP_URL,
    passwordExpiresAt: 'October 15, 2026 at 12:00 AM UTC',
    mustChangePassword: true,
    supportEmail: 'it-help@example.com',
  },
  build: () => ({
    subject: 'Your ArmorCode password was reset',
    preview: 'Sign in with the new password in this email.',
    eyebrow: 'Password reset',
    tone: 'warn',
    title: 'Your password was reset',
    subtitle: 'Sign in to ArmorCode with these details.',
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'User name', value: v('username') },
          { label: 'New password', value: { code: v('newPassword') } },
          { label: 'Works until', value: v('passwordExpiresAt'), when: present('passwordExpiresAt') },
        ],
      },
      {
        kind: 'text',
        text: [
          'Keep this password to yourself: don’t share it or forward this email.',
          when(flag('mustChangePassword'), ' You’ll choose a new password of your own when you sign in.'),
        ],
      },
      { kind: 'text', quiet: true, text: ['Didn’t expect this, or the password stopped working? ', ...SUPPORT_LINE] },
      signInFallback,
    ],
    action: { label: 'Sign in to ArmorCode', url: v('amcUrl') },
    reason: 'You got this email because the password for your ArmorCode account was reset.',
    footer: 'transactional',
  }),
});
