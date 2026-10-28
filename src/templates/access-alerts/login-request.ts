import { present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import { when } from '../../layout.ts';

/** Someone without access tried to sign in; their tenant's administrators hear about it. */
export const loginRequest = defineTemplate({
  id: 'login-request',
  name: 'Access request after a failed sign-in',
  group: 'Account & access',
  source: 'background-jobs / FailedLoginAccessRequestEventHandler (in code)',
  who: 'Every administrator of the tenant',
  when: 'Someone without access tries to sign in, which raises an access request for the tenant',
  fields: {
    requesterEmail: { about: 'The email address they tried to sign in with' },
    accessRequestsUrl: { about: 'Where administrators see access requests and manage users in ArmorCode', isNew: true },
    tenantName: { about: 'The tenant (account) they asked to join (“Example Corp”)', optional: true, isNew: true },
    attemptedAt: { about: 'When they tried to sign in, as text (“October 28, 2026 at 9:14 AM UTC”)', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    requesterEmail: 'john.smith@example.com',
    accessRequestsUrl: `${SAMPLE_APP_URL}/settings/users`,
    tenantName: 'Example Corp',
    attemptedAt: 'October 28, 2026 at 9:14 AM UTC',
  },
  build: () => ({
    subject: ['Access request from ', v('requesterEmail')],
    preview: [v('requesterEmail'), ' tried to sign in to ArmorCode but doesn’t have access yet.'],
    eyebrow: 'Access request',
    tone: 'accent',
    title: 'Someone asked for access to ArmorCode',
    subtitle: when(present('tenantName'), ['To ', v('tenantName')]),
    blocks: [
      {
        kind: 'text',
        text: [
          { strong: v('requesterEmail') },
          ' tried to sign in to ArmorCode',
          when(present('tenantName'), [' for ', v('tenantName')]),
          ', but doesn’t have access. If they should, give them access in ArmorCode.',
        ],
      },
      {
        kind: 'details',
        rows: [
          { label: 'Email', value: v('requesterEmail') },
          { label: 'Tenant', value: v('tenantName'), when: present('tenantName') },
          { label: 'Tried to sign in', value: v('attemptedAt'), when: present('attemptedAt') },
        ],
      },
      { kind: 'text', quiet: true, text: 'Don’t recognize this address? Nothing to do: they can’t sign in without access.' },
    ],
    action: { label: 'Review access', url: v('accessRequestsUrl') },
    reason: [
      'You got this email because you’re an administrator',
      when(present('tenantName'), [' of ', v('tenantName')]),
      ' in ArmorCode.',
    ],
    footer: 'operational',
  }),
});
