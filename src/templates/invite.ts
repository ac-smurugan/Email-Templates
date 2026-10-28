import { flag, present, v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';
import { when } from '../layout.ts';
import { SUPPORT_LINE, signInFallback } from './shared.ts';

/** A new account: the user name and password someone signs in with the first time. */
export const invite = defineTemplate({
  id: 'invite',
  name: 'Username and password invite',
  group: 'Account & access',
  source: 'authserver, java-utils / UserRegistrationServiceImpl · template/email/username-password-invite.html',
  who: 'Someone invited to ArmorCode with a user name and password',
  when: 'An administrator adds them to ArmorCode',
  fields: {
    username: { about: 'Their ArmorCode user name' },
    password: { about: 'Their first password' },
    amcUrl: { about: 'The ArmorCode sign-in page' },
    inviterName: { about: 'Who invited them (“John Smith”)', optional: true, isNew: true },
    organizationName: { about: 'The organization they’re joining (“Example Corp”)', optional: true, isNew: true },
    roleName: { about: 'The role they’re given (“Security Analyst”)', optional: true, isNew: true },
    passwordExpiresAt: { about: 'When the first password stops working, as text', optional: true, isNew: true },
    mustChangePassword: { about: 'true when they must choose their own password at sign-in', optional: true, isNew: true },
    supportEmail: { about: 'Who to contact when sign-in fails, if not their administrator', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    username: 'john.smith@example.com',
    password: 'Tq7#mV2p!xR9',
    amcUrl: SAMPLE_APP_URL,
    inviterName: 'Jane Doe',
    organizationName: 'Example Corp',
    roleName: 'Security Analyst',
    passwordExpiresAt: 'November 4, 2026 at 12:00 AM UTC',
    mustChangePassword: true,
    supportEmail: 'it-help@example.com',
  },
  build: () => ({
    subject: 'You’re invited to ArmorCode',
    preview: 'Your user name and password to sign in for the first time.',
    eyebrow: 'Invitation',
    tone: 'accent',
    title: 'You’re invited to ArmorCode',
    subtitle: when(present('organizationName'), ['Join ', v('organizationName'), ' on ArmorCode.']),
    blocks: [
      {
        kind: 'text',
        text: [
          when(present('inviterName'), [v('inviterName'), ' added you to ArmorCode'], 'You’ve been added to ArmorCode'),
          when(present('roleName'), [' as ', { strong: v('roleName') }]),
          '. Sign in with these details:',
        ],
      },
      {
        kind: 'details',
        rows: [
          { label: 'User name', value: v('username') },
          { label: 'Password', value: { code: v('password') } },
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
      { kind: 'text', quiet: true, text: ['Can’t sign in? ', ...SUPPORT_LINE] },
      signInFallback,
    ],
    action: { label: 'Sign in to ArmorCode', url: v('amcUrl') },
    reason: 'You got this email because an administrator added you to ArmorCode.',
    footer: 'transactional',
  }),
});
