import { above, is, loop, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import { when, type Block, type Href, type Rich } from '../../layout.ts';

const SOURCE = 'java-utils / AbstractProposeFindingUpdateService (in code)';

/** A finding in ArmorCode, as today's proposal emails link it. */
const findingHref: Href = [v('serverUrl'), '/#/findings/', v('tenant'), '/', v('businessUnitId'), '/', v('finding.id')];

/** “ and 3 more”, after the first finding's id, when there are others. */
const andMore: Rich = when(above('moreCount', 0), [' and ', v('moreCount'), ' more']);

/** The proposal's findings, a row each as today, linked; then today's CSV link past 100 rows. */
const findingsBlocks: Block[] = [
  {
    kind: 'items',
    each: loop('findings', 'finding'),
    item: {
      title: [v('finding.id'), ' · ', v('finding.title')],
      url: findingHref,
      meta: [
        'Proposed: ',
        v('finding.proposedAction'),
        ' · ',
        v('productLabel'),
        ': ',
        v('finding.productName'),
        ' · ',
        v('subProductLabel'),
        ': ',
        v('finding.subProductName'),
        ' · Environment: ',
        v('finding.environmentName'),
      ],
    },
    more: when(above('remainingCount', 0), ['And ', v('remainingCount'), ' more findings, in the full list.']),
  },
  {
    kind: 'items',
    when: present('downloadLink'),
    items: [{ title: 'Download the full list (CSV)', url: v('downloadLink'), meta: 'Every finding in this proposal.' }],
  },
];

const FIELDS = {
  firstFindingId: { about: 'The first finding’s id, for the subject' },
  moreCount: { about: 'How many findings besides the first, as a number (the N in today’s “And N More”); 0 or empty for one', optional: true },
  findings: {
    about:
      'The findings, up to 100, as today’s table rows: each with id, title (cut to 150 characters), productName, subProductName, environmentName, and proposedAction',
  },
  serverUrl: { about: 'ArmorCode’s address (“https://acme.armorcode.com”)' },
  tenant: { about: 'The tenant, as in finding links' },
  businessUnitId: { about: 'The business unit’s id, as in finding links' },
  productLabel: { about: 'What the tenant calls a product (“Product”, “Application”)' },
  subProductLabel: { about: 'What the tenant calls a sub-product (“Sub-product”, “Component”)' },
  remainingCount: { about: 'How many findings past the first 100 aren’t listed, as a number', optional: true },
  downloadLink: { about: 'The full list as a CSV, when there are more than 100 findings', optional: true },
} as const;

const SAMPLE_FINDINGS = {
  serverUrl: SAMPLE_APP_URL,
  tenant: 'example-corp',
  businessUnitId: '12',
  firstFindingId: '48213',
  moreCount: 2,
  productLabel: 'Product',
  subProductLabel: 'Sub-product',
  findings: [
    { id: '48213', title: 'SQL injection in /api/v1/payments/search' },
    { id: '48214', title: 'Outdated TLS configuration on payments gateway' },
    { id: '48230', title: 'Hard-coded credential in config/settings.py' },
  ].map((f) => ({
    ...f,
    productName: 'Payments',
    subProductName: 'payments-api',
    environmentName: 'Production',
    proposedAction: 'Mark as false positive',
  })),
};

/** Someone proposed a change to findings that the recipient has to approve or reject. */
export const proposalNeedsApproval = defineTemplate({
  id: 'proposal-needs-approval',
  name: 'Finding update needs your approval',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'The security owners or finding owners who must act on the proposal',
  when: 'Someone proposes a change to one or more findings that needs approval',
  fields: {
    ...FIELDS,
    proposerName: { about: 'Who proposed the change (“Jane Doe”)' },
    proposeStatusLabel: { about: 'What they proposed (“False positive”, “Accept risk”)' },
    notes: { about: 'The note they wrote with the proposal', optional: true },
    reviewUrl: { about: 'Where they approve or reject proposals in ArmorCode (Findings Under Review)', isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_FINDINGS,
    proposerName: 'Jane Doe',
    proposeStatusLabel: 'False positive',
    notes: 'These come from a test fixture that never ships to production.',
    reviewUrl: `${SAMPLE_APP_URL}/#/findings-under-review`,
  },
  build: () => ({
    subject: ['Review ', v('proposerName'), '’s proposal on finding ', v('firstFindingId'), andMore],
    preview: [v('proposerName'), ' proposed a change to findings, and it needs your approval.'],
    eyebrow: 'Approval needed',
    tone: 'warn',
    title: [v('proposerName'), ' proposed a change'],
    subtitle: ['To finding ', v('firstFindingId'), andMore, '. It needs your approval.'],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Proposed by', value: v('proposerName') },
          { label: 'Proposal', value: { strong: v('proposeStatusLabel') } },
        ],
      },
      { kind: 'quote', label: 'Their note', text: v('notes'), when: present('notes') },
      ...findingsBlocks,
    ],
    action: { label: 'Review the proposal', url: v('reviewUrl') },
    reason: ['You got this email because you can approve changes to these findings in ArmorCode.'],
    footer: 'operational',
  }),
});

const decided: Rich = { choose: [[is('decision', 'Approved'), 'approved'], [is('decision', 'Rejected'), 'rejected']], else: v('decision') };

/** The proposal the recipient made was approved or rejected. */
export const proposalDecided = defineTemplate({
  id: 'proposal-decided',
  name: 'Finding proposal approved or rejected',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'The person who proposed the change',
  when: 'A security owner approves or rejects their proposed change to findings',
  fields: {
    ...FIELDS,
    decision: { about: 'Approved or Rejected' },
    actorName: { about: 'Who approved or rejected it (“John Smith”)' },
    notes: { about: 'The note they wrote with their decision', optional: true },
    findingIds: {
      about: 'The listed findings’ ids, comma-separated (“48213,48214”), for the button’s filtered findings page, as the bulk owner-change email’s {{findingIds}}',
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_FINDINGS,
    moreCount: 104,
    remainingCount: 102,
    downloadLink: `${SAMPLE_APP_URL}/downloads/proposal-48213.csv`,
    decision: 'Approved',
    actorName: 'John Smith',
    notes: 'Agreed: the fixture is excluded from the production build.',
    findingIds: '48213,48214,48230',
  },
  build: () => ({
    subject: ['Your proposal on finding ', v('firstFindingId'), andMore, ' was ', decided],
    preview: [v('actorName'), ' ', decided, ' your proposed change to findings.'],
    eyebrow: 'Proposal decided',
    tone: 'accent',
    title: [v('actorName'), ' ', decided, ' your proposal'],
    subtitle: ['On finding ', v('firstFindingId'), andMore],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Decision', value: { strong: v('decision') } },
          { label: 'By', value: v('actorName') },
        ],
      },
      { kind: 'quote', label: 'Their note', text: v('notes'), when: present('notes') },
      ...findingsBlocks,
    ],
    action: { label: 'View the findings', url: [v('serverUrl'), '/#/findings?filters={"id":[', v('findingIds'), ']}'] },
    reason: ['You got this email because you proposed a change to these findings in ArmorCode.'],
    footer: 'operational',
  }),
});
