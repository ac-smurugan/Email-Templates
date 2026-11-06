import { present, v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';
import { when } from '../layout.ts';
import { SUPPORT_LINE, signInFallback } from './shared.ts';

/** A new account: the user name someone signs in with. The password itself is never sent by email. */
export const invite = defineTemplate({
  id: 'invite',
  name: 'Username invite',
  group: 'Account & access',
  source: 'authserver, java-utils / UserRegistrationServiceImpl · template/email/username-password-invite.html',
  who: 'Someone invited to ArmorCode with a user name',
  when: 'An administrator adds them to ArmorCode',
  fields: {
    username: { about: 'Their ArmorCode user name' },
    amcUrl: { about: 'The ArmorCode sign-in page' },
    inviterName: { about: 'Who invited them (“John Smith”)', optional: true, isNew: true },
    organizationName: { about: 'The organization they’re joining (“Example Corp”)', optional: true, isNew: true },
    roleName: { about: 'The role they’re given (“Security Analyst”)', optional: true, isNew: true },
    supportEmail: { about: 'Who to contact when sign-in fails, if not their administrator', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    username: 'john.smith@example.com',
    amcUrl: SAMPLE_APP_URL,
    inviterName: 'Jane Doe',
    organizationName: 'Example Corp',
    roleName: 'Security Analyst',
    supportEmail: 'it-help@example.com',
  },
  build: () => ({
    subject: 'You’re invited to ArmorCode',
    preview: 'You’ve been added to ArmorCode. Here is your user name.',
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
          '. Your user name is:',
        ],
      },
      { kind: 'details', rows: [{ label: 'User name', value: v('username') }] },
      { kind: 'text', quiet: true, text: ['Can’t sign in? ', ...SUPPORT_LINE] },
      signInFallback,
    ],
    action: { label: 'Sign in to ArmorCode', url: v('amcUrl') },
    reason: 'You got this email because an administrator added you to ArmorCode.',
    footer: 'transactional',
  }),
});
