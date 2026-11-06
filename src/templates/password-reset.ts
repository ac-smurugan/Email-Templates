import { v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';
import { SUPPORT_LINE, signInFallback } from './shared.ts';

/** Someone's password was reset. The password itself is never sent by email. */
export const passwordReset = defineTemplate({
  id: 'password-reset',
  name: 'Password reset',
  group: 'Account & access',
  source: 'authserver, java-utils / UserServiceImpl · template/email/password-reset.html',
  who: 'The person whose password was reset',
  when: 'Their ArmorCode password is reset',
  fields: {
    username: { about: 'Their ArmorCode user name' },
    amcUrl: { about: 'The ArmorCode sign-in page' },
    supportEmail: { about: 'Who to contact when sign-in fails, if not their administrator', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    username: 'john.smith@example.com',
    amcUrl: SAMPLE_APP_URL,
    supportEmail: 'it-help@example.com',
  },
  build: () => ({
    subject: 'Your ArmorCode password was reset',
    preview: 'The password for your ArmorCode account was reset.',
    eyebrow: 'Password reset',
    tone: 'warn',
    title: 'Your password was reset',
    blocks: [
      { kind: 'text', text: 'The password for your ArmorCode account was reset. Your user name is:' },
      { kind: 'details', rows: [{ label: 'User name', value: v('username') }] },
      { kind: 'text', quiet: true, text: ['Didn’t expect this, or can’t sign in? ', ...SUPPORT_LINE] },
      signInFallback,
    ],
    action: { label: 'Sign in to ArmorCode', url: v('amcUrl') },
    reason: 'You got this email because the password for your ArmorCode account was reset.',
    footer: 'transactional',
  }),
});
