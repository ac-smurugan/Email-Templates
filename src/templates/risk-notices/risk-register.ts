import { when, type Block } from '../../layout.ts';
import { equals, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate, type Fields } from '../../template.ts';

// The risk register workflow emails (45a–45g). Tenants rename "Risk register" (to "Exception",
// "Risk acceptance", …), so every mention goes through `riskRegisterCustomTitle`, as today.

const SOURCE = 'java-utils / RiskRegisterNotificationService (in code)';
const GROUP = 'Risk register';

const TITLE = v('riskRegisterCustomTitle');
const NAME = v('name');

const COMMON = {
  riskRegisterCustomTitle: { about: 'What the tenant calls a risk register entry (“Risk register”, “Exception”)' },
  name: { about: 'The entry’s name' },
} as const satisfies Fields;

const ITEM_URL = {
  riskRegisterUrl: { about: 'The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here)', isNew: true },
} as const satisfies Fields;

const PDF_FIELDS = {
  pdfReportUrl: { about: 'The time-limited PDF report download link (today’s email links it; it gets its own placeholder here)', isNew: true },
  pdfReportExpiryInHours: { about: 'How many hours the download link works for, as a number' },
} as const satisfies Fields;

const SAMPLE = {
  ...SAMPLE_BASE,
  riskRegisterCustomTitle: 'Risk exception',
  name: 'Legacy TLS on payments-gateway',
  riskRegisterUrl: `${SAMPLE_APP_URL}/risk-register/2187`,
};

/** The facts every workflow email shows about the entry. */
const entryRows = [
  { label: 'Type', value: TITLE },
  { label: 'Name', value: { strong: NAME } },
] as const;

const reviewed = (tone: 'ok' | 'danger', eyebrow: string, id: string, label: string, sampleAction: string) =>
  defineTemplate({
    id,
    name: `Risk register ${label}`,
    group: GROUP,
    source: SOURCE,
    who: 'The submitter and the other people in the review workflow',
    when: `An approver ${label === 'approved' ? 'approves' : 'rejects'} a risk register entry`,
    fields: {
      ...COMMON,
      ...ITEM_URL,
      action: { about: `What the reviewer did, as a past-tense word (“${sampleAction}”)` },
      reviewer: { about: 'Who reviewed it (“Jane Doe”)' },
    },
    sample: { ...SAMPLE, action: sampleAction, reviewer: 'Jane Doe' },
    build: () => ({
      subject: [TITLE, ': ', NAME, ' ', v('action'), ' by ', v('reviewer')],
      preview: [v('reviewer'), ' ', v('action'), ' this ', TITLE, '. Open it for the latest status.'],
      eyebrow,
      tone,
      title: [NAME, ' was ', v('action')],
      subtitle: [TITLE, ' · reviewed by ', v('reviewer')],
      blocks: [
        {
          kind: 'details',
          rows: [...entryRows, { label: 'Outcome', value: [v('action'), ' by ', v('reviewer')] }],
        },
        { kind: 'text', text: ['Open the ', TITLE, ' in ArmorCode for its latest status.'] },
      ],
      action: { label: ['View the ', TITLE], url: v('riskRegisterUrl') },
      reason: ['You got this email because you’re part of the review workflow for this ', TITLE, '.'],
      footer: 'operational',
    }),
  });

/** 45a. Submitted and routed to the next approver. */
export const riskRegisterSubmitted = defineTemplate({
  id: 'risk-register-submitted',
  name: 'Risk register submitted for review',
  group: GROUP,
  source: SOURCE,
  who: 'The next approver in the workflow',
  when: 'A risk register entry is submitted and routed to an approver for acceptance',
  fields: {
    ...COMMON,
    ...ITEM_URL,
    submittedBy: { about: 'Who submitted it (“John Smith”)' },
  },
  sample: { ...SAMPLE, submittedBy: 'John Smith' },
  build: () => ({
    subject: [TITLE, ': ', NAME, ' needs your review'],
    preview: [v('submittedBy'), ' submitted this ', TITLE, ' for your acceptance.'],
    eyebrow: 'Review needed',
    tone: 'accent',
    title: ['Review ', NAME],
    subtitle: [v('submittedBy'), ' submitted this ', TITLE, ' for your acceptance.'],
    blocks: [
      {
        kind: 'details',
        rows: [...entryRows, { label: 'Submitted by', value: v('submittedBy') }],
      },
      { kind: 'text', text: ['Review the ', TITLE, ' in ArmorCode, then accept or reject it.'] },
    ],
    action: { label: 'Review and accept or reject', url: v('riskRegisterUrl') },
    reason: ['You got this email because you’re the next approver for this ', TITLE, '.'],
    footer: 'operational',
  }),
});

/** 45b. */
export const riskRegisterApproved = reviewed('ok', 'Approved', 'risk-register-approved', 'approved', 'approved');
/** 45c. */
export const riskRegisterRejected = reviewed('danger', 'Rejected', 'risk-register-rejected', 'rejected', 'rejected');

/** 45d. The last reviewer acted: the entry is done, and a PDF report was made. */
export const riskRegisterCompleted = defineTemplate({
  id: 'risk-register-completed',
  name: 'Risk register completed by all reviewers',
  group: GROUP,
  source: SOURCE,
  who: 'The people in the review workflow and the configured report recipients',
  when: 'The last reviewer acts, completing the workflow for all reviewers; a PDF report is generated',
  fields: {
    ...COMMON,
    ...ITEM_URL,
    ...PDF_FIELDS,
    action: { about: 'What the reviewers did, as a past-tense word (“approved”)' },
    reviewer: { about: 'The last reviewer (“Jane Doe”)' },
  },
  sample: { ...SAMPLE, action: 'approved', reviewer: 'Jane Doe', pdfReportUrl: `${SAMPLE_APP_URL}/downloads/rr-2187.pdf`, pdfReportExpiryInHours: 72 },
  build: () => ({
    subject: [TITLE, ': ', NAME, ' ', v('action'), ' by all reviewers'],
    preview: ['Every reviewer has acted. A PDF report of the ', TITLE, ' is ready to download.'],
    eyebrow: 'Completed',
    tone: 'ok',
    title: [NAME, ' was ', v('action'), ' by all reviewers'],
    subtitle: [TITLE, ' · last reviewed by ', v('reviewer')],
    blocks: [
      {
        kind: 'details',
        rows: [
          ...entryRows,
          { label: 'Last review', value: [v('action'), ' by ', v('reviewer')] },
          { label: 'Status', value: [v('action'), ' by all reviewers'] },
        ],
      },
      { kind: 'text', text: ['A PDF report of this ', TITLE, ' was generated. Download it with the button below.'] },
      { kind: 'text', quiet: true, text: ['The download link expires in ', v('pdfReportExpiryInHours'), ' hours.'] },
    ],
    action: { label: 'Download the PDF report', url: v('pdfReportUrl') },
    secondary: { label: ['View the ', TITLE, ' in ArmorCode'], url: v('riskRegisterUrl') },
    reason: ['You got this email because you’re part of the review workflow for this ', TITLE, '.'],
    footer: 'operational',
  }),
});

const DAYS = when(equals('reportExpiryInDays', 1), '1 day', [v('reportExpiryInDays'), ' days']);

/** 45e. An approved entry nears its end date. */
export const riskRegisterExpiring = defineTemplate({
  id: 'risk-register-expiring',
  name: 'Risk register expiring',
  group: GROUP,
  source: 'java-utils / RiskRegisterExtensionServiceImpl (in code)',
  who: 'The entry’s owner and the people involved in it',
  when: 'An approved risk register entry is approaching its end date',
  fields: {
    ...COMMON,
    ...ITEM_URL,
    creator: { about: 'Who created it (“John Smith”)' },
    finalApprovalDate: { about: 'When it was finally approved, as text' },
    reportExpiryInDays: { about: 'Days until it expires, as a number' },
    endDate: { about: 'When it expires, as text' },
  },
  sample: {
    ...SAMPLE,
    creator: 'John Smith',
    finalApprovalDate: 'May 4, 2026',
    reportExpiryInDays: 14,
    endDate: 'November 11, 2026',
  },
  build: () => ({
    subject: [TITLE, ': ', NAME, ' expires in ', DAYS],
    preview: ['It ends on ', v('endDate'), '. You can extend it in ArmorCode.'],
    eyebrow: 'Expiring soon',
    tone: 'warn',
    title: [NAME, ' expires in ', DAYS],
    subtitle: [TITLE, ' · ends ', v('endDate')],
    blocks: [
      {
        kind: 'details',
        rows: [
          ...entryRows,
          { label: 'Created by', value: v('creator') },
          { label: 'Approved', value: v('finalApprovalDate') },
          { label: 'Ends', value: { strong: v('endDate') } },
        ],
      },
      {
        kind: 'text',
        text: ['To keep it in place, extend this ', TITLE, ' in ArmorCode. You can extend it within 30 days of its end date.'],
      },
    ],
    action: { label: ['Review the ', TITLE], url: v('riskRegisterUrl') },
    reason: ['You got this email because you’re involved in this ', TITLE, '.'],
    footer: 'operational',
  }),
});

/** 45f. */
export const riskRegisterComment = defineTemplate({
  id: 'risk-register-comment',
  name: 'Risk register comment',
  group: GROUP,
  source: 'java-utils / RiskRegisterCommentAddedEventHandler (in code)',
  who: 'The entry’s participants and watchers',
  when: 'Someone comments on a risk register entry',
  fields: {
    ...COMMON,
    ...ITEM_URL,
    userName: { about: 'Who commented (“Jane Doe”)' },
    comment: { about: 'The comment, as plain text' },
  },
  sample: {
    ...SAMPLE,
    userName: 'Jane Doe',
    comment: 'The vendor patch is scheduled for the December release. Can we keep this exception open until then?',
  },
  build: () => ({
    subject: [v('userName'), ' commented on ', TITLE, ': ', NAME],
    preview: [v('userName'), ' added a comment on a ', TITLE, ' in ArmorCode.'],
    eyebrow: 'Comment',
    tone: 'accent',
    title: [v('userName'), ' commented'],
    subtitle: ['On the ', TITLE, ' ', NAME],
    blocks: [
      { kind: 'quote', label: 'Comment', text: v('comment') },
      { kind: 'text', text: ['Open the ', TITLE, ' to read it in context and reply.'] },
    ],
    action: { label: 'View the comment', url: v('riskRegisterUrl') },
    reason: ['You got this email because you follow this ', TITLE, ' in ArmorCode.'],
    footer: 'operational',
  }),
});

/** 45g. A requested PDF report finished generating. */
export const riskRegisterReportReady = defineTemplate({
  id: 'risk-register-report-ready',
  name: 'Risk register report ready',
  group: GROUP,
  source: 'java-utils / RiskRegisterReportJob, RiskRegisterEmailSender (in code)',
  who: 'The report’s configured recipients',
  when: 'A requested risk register PDF report has finished generating',
  fields: {
    riskRegisterCustomTitle: COMMON.riskRegisterCustomTitle,
    ...PDF_FIELDS,
  },
  sample: { ...SAMPLE_BASE, riskRegisterCustomTitle: 'Risk exception', pdfReportUrl: `${SAMPLE_APP_URL}/downloads/rr-report-0412.pdf`, pdfReportExpiryInHours: 72 },
  build: () => ({
    subject: ['Your ', TITLE, ' report is ready to download'],
    preview: ['The download link works for ', v('pdfReportExpiryInHours'), ' hours.'],
    eyebrow: 'Report ready',
    tone: 'ok',
    title: ['Your ', TITLE, ' report is ready'],
    blocks: [
      { kind: 'text', text: ['The ', TITLE, ' PDF report has finished generating.'] },
      { kind: 'text', quiet: true, text: ['The download link expires in ', v('pdfReportExpiryInHours'), ' hours.'] },
    ] satisfies Block[],
    action: { label: 'Download the report', url: v('pdfReportUrl') },
    reason: ['You got this email because you’re a recipient of this ', TITLE, ' report.'],
    footer: 'operational',
  }),
});

export const RISK_REGISTER_EMAILS = [
  riskRegisterSubmitted,
  riskRegisterApproved,
  riskRegisterRejected,
  riskRegisterCompleted,
  riskRegisterExpiring,
  riskRegisterComment,
  riskRegisterReportReady,
];
