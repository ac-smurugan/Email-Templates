import { present, v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';

/** Someone mentioned a person on an asset. */
export const assetMention = defineTemplate({
  id: 'asset-mention',
  name: 'Asset mention',
  group: 'Findings & alerts',
  source: 'authserver, java-utils / AssetUpdateServiceImpl · template/email/asset-user-mention-notification-email.html',
  who: 'The person mentioned',
  when: 'Someone mentions them in a comment on an asset',
  fields: {
    whoMentioned: { about: 'Who mentioned them (“Jane Doe”)' },
    assetName: { about: 'The asset’s name' },
    assetUrl: { about: 'The asset in ArmorCode' },
    amcLogoUrl: { about: 'The ArmorCode logo (this email had `${logoUrl}` at the bottom; the brand row uses `amcLogoUrl` like the others)', isNew: true },
    assetType: { about: 'The asset’s type (“Repository”, “Host”)', optional: true, isNew: true },
    mentionText: { about: 'What they wrote, as plain text', optional: true, isNew: true },
    mentionedAt: { about: 'When, as text (“October 14, 2026 at 3:42 PM UTC”)', optional: true, isNew: true },
    assetRiskRating: { about: 'The asset’s risk: Critical, High, Medium or Low', optional: true, isNew: true },
    assetOwner: { about: 'Who owns the asset', optional: true, isNew: true },
    assetTeam: { about: 'The team the asset belongs to', optional: true, isNew: true },
    openFindings: { about: 'How many open findings the asset has, as a number', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    whoMentioned: 'Jane Doe',
    assetName: 'example-corp/payments-api',
    assetType: 'Repository',
    assetUrl: `${SAMPLE_APP_URL}/assets/1042`,
    mentionText: '@John Smith can you confirm whether this repository still ships to production? Two critical findings point at it.',
    mentionedAt: 'October 14, 2026 at 3:42 PM UTC',
    assetRiskRating: 'High',
    assetOwner: 'John Smith',
    assetTeam: 'Payments',
    openFindings: 37,
  },
  build: () => ({
    subject: [v('whoMentioned'), ' mentioned you on ', v('assetName')],
    preview: [v('whoMentioned'), ' mentioned you in a comment on an asset in ArmorCode.'],
    eyebrow: 'Mention',
    tone: 'accent',
    title: [v('whoMentioned'), ' mentioned you'],
    subtitle: ['On the asset ', v('assetName')],
    blocks: [
      { kind: 'quote', label: 'What they wrote', text: v('mentionText'), when: present('mentionText') },
      {
        kind: 'details',
        rows: [
          { label: 'Asset', value: { strong: v('assetName') } },
          { label: 'Type', value: v('assetType'), when: present('assetType') },
          { label: 'Risk', value: [{ ratingOf: 'assetRiskRating' }, ' ', v('assetRiskRating')], when: present('assetRiskRating') },
          { label: 'Owner', value: v('assetOwner'), when: present('assetOwner') },
          { label: 'Team', value: v('assetTeam'), when: present('assetTeam') },
          { label: 'Open findings', value: v('openFindings'), when: present('openFindings') },
          { label: 'Mentioned', value: v('mentionedAt'), when: present('mentionedAt') },
        ],
      },
      { kind: 'text', text: ['Open the asset to read the comment in context and reply to ', v('whoMentioned'), ' there.'] },
    ],
    action: { label: 'View the comment', url: v('assetUrl') },
    reason: ['You got this email because ', v('whoMentioned'), ' mentioned you in ArmorCode.'],
    footer: 'operational',
  }),
});
