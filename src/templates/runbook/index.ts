import { plain } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate, type EmailTemplate, type Fields } from '../../template.ts';
import type { Block, Email, Rich } from '../../layout.ts';

// The templates a runbook's Send Email step can use (Global Settings › Runbook › Email Templates):
// the two defaults, one per template type, and three examples of templates people write. Runbook
// emails are filled by plain `${name}` substitution, so these use no conditions or loops.

const p = plain;
const SOURCE = 'Runbook › Send Email step · Global Settings › Runbook › Email Templates';
const WHO = 'The runbook’s email recipients';
const REASON = 'You got this email because a runbook in ArmorCode sends it to you.';

// ——— Individual finding: one finding, for the New Finding trigger ———

const findingFields = {
  'finding.id': { about: 'The finding’s ID' },
  'finding.title': { about: 'The finding’s summary' },
  'finding.severity.value': { about: 'Its severity: Critical, High, Medium, Low or Info' },
  'finding.toolName': { about: 'The tool that found it' },
  'finding.owner.name': { about: 'Who owns it' },
  'finding.resolutionDueDate': { about: 'When it’s due to be resolved, as text' },
  'finding.product.name': { about: 'Its product' },
  'finding.subProduct.name': { about: 'Its sub-product' },
  'finding.envName': { about: 'Its environment' },
  'finding.armorcodeurl': { about: 'The finding in ArmorCode' },
} satisfies Fields;

const finding = (title: string) => ({
  id: '88213409',
  title,
  severity: { value: 'Critical' },
  toolName: 'Snyk',
  owner: { name: 'John Smith' },
  resolutionDueDate: 'November 24, 2026',
  product: { name: 'Payments Platform' },
  subProduct: { name: 'payments-api' },
  envName: 'Production',
  armorcodeurl: `${SAMPLE_APP_URL}/findings/88213409`,
});

const findingLink = p('finding.armorcodeurl');
const fallback = (url: Rich): Block => ({
  kind: 'text',
  quiet: true,
  text: ['Button not working? Paste this link into your browser: ', url],
});

/** Only the fields a template uses, so the build's check that every listed field is used holds. */
const only = <K extends keyof typeof findingFields>(...keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, findingFields[k]])) as Pick<typeof findingFields, K>;

export const runbookDefaultFinding = defineTemplate({
  id: 'runbook-default-finding',
  name: 'Default (Individual finding)',
  group: 'Runbook templates',
  source: SOURCE,
  who: WHO,
  when: 'A runbook’s Send Email step runs on a new finding (trigger: New Finding) with the default template',
  fields: findingFields,
  sample: { ...SAMPLE_BASE, finding: finding('payments-api: SQL injection in the order lookup endpoint') },
  build: (): Email => ({
    engine: 'substitution',
    subject: ['New finding: ', p('finding.product.name'), ' / ', p('finding.subProduct.name'), ' / ', p('finding.envName')],
    preview: [p('finding.severity.value'), ' finding from ', p('finding.toolName'), ': ', p('finding.title')],
    eyebrow: 'New finding',
    tone: 'accent',
    title: p('finding.title'),
    subtitle: [p('finding.product.name'), ' / ', p('finding.subProduct.name'), ' / ', p('finding.envName')],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Finding ID', value: p('finding.id') },
          { label: 'Severity', value: { strong: p('finding.severity.value') } },
          { label: 'Source tool', value: p('finding.toolName') },
          { label: 'Owner', value: p('finding.owner.name') },
          { label: 'Due date', value: p('finding.resolutionDueDate') },
        ],
      },
      fallback(findingLink),
    ],
    action: { label: 'View the finding', url: findingLink },
    reason: REASON,
    footer: 'operational',
  }),
});

export const runbookCriticalAlert = defineTemplate({
  id: 'runbook-critical-alert',
  name: 'Critical finding alert',
  group: 'Runbook templates',
  source: SOURCE,
  who: WHO,
  when: 'A runbook’s Send Email step runs on a new finding (trigger: New Finding) with this template',
  fields: only('finding.title', 'finding.severity.value', 'finding.toolName', 'finding.armorcodeurl'),
  sample: { ...SAMPLE_BASE, finding: finding('Hard-coded AWS key in deploy script') },
  build: (): Email => ({
    engine: 'substitution',
    subject: ['New security finding detected: ', p('finding.severity.value'), ' | ', p('finding.title')],
    preview: ['A new ', p('finding.severity.value'), ' finding from ', p('finding.toolName'), ' needs review.'],
    eyebrow: 'Security alert',
    tone: 'danger',
    title: p('finding.title'),
    blocks: [
      { kind: 'text', text: 'A new security finding was ingested and needs review.' },
      {
        kind: 'details',
        rows: [
          { label: 'Severity', value: { strong: p('finding.severity.value') } },
          { label: 'Source tool', value: p('finding.toolName') },
        ],
      },
      fallback(findingLink),
    ],
    action: { label: 'Review the finding', url: findingLink },
    reason: REASON,
    footer: 'operational',
  }),
});

// ——— Grouped findings: counts and a list, for Scheduled Finding Search, Scheduled Ticket Search,
// Moved Findings and Finding Change Proposed ———

const groupedFields = {
  'findings.total.count': { about: 'How many findings, in all' },
  'severity.critical.count': { about: 'How many are critical' },
  'severity.high.count': { about: 'How many are high' },
  'severity.medium.count': { about: 'How many are medium' },
  'severity.low.count': { about: 'How many are low' },
  'findings.list.url': { about: 'The list of these findings in ArmorCode' },
} satisfies Fields;

const groupedSample = {
  ...SAMPLE_BASE,
  findings: { total: { count: 42 }, list: { url: `${SAMPLE_APP_URL}/findings?view=4471` } },
  severity: { critical: { count: 3 }, high: { count: 12 }, medium: { count: 19 }, low: { count: 8 } },
};

const groupedWhen = (template: string) =>
  `A runbook’s Send Email step runs with ${template} (triggers: Scheduled Finding Search, Scheduled Ticket Search, Moved Findings, Finding Change Proposed)`;

const listLink = p('findings.list.url');

const pickGrouped = <K extends keyof typeof groupedFields>(...keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, groupedFields[k]])) as Pick<typeof groupedFields, K>;

export const runbookDefaultGrouped = defineTemplate({
  id: 'runbook-default-grouped',
  name: 'Default (Grouped findings)',
  group: 'Runbook templates',
  source: SOURCE,
  who: WHO,
  when: groupedWhen('the default template'),
  fields: groupedFields,
  sample: groupedSample,
  build: (): Email => ({
    engine: 'substitution',
    subject: [p('findings.total.count'), ' findings need your attention'],
    preview: [p('severity.critical.count'), ' critical and ', p('severity.high.count'), ' high among them.'],
    eyebrow: 'Findings',
    tone: 'accent',
    title: [p('findings.total.count'), ' findings need your attention'],
    blocks: [
      {
        kind: 'stats',
        items: [
          { label: 'Critical', rating: 'critical', value: p('severity.critical.count') },
          { label: 'High', rating: 'high', value: p('severity.high.count') },
          { label: 'Medium', rating: 'moderate', value: p('severity.medium.count') },
          { label: 'Low', rating: 'minimal', value: p('severity.low.count') },
        ],
      },
      { kind: 'text', text: 'Open the list in ArmorCode to see each finding.' },
      fallback(listLink),
    ],
    action: { label: 'View all findings', url: listLink },
    reason: REASON,
    footer: 'operational',
  }),
});

export const runbookWeeklyDigest = defineTemplate({
  id: 'runbook-weekly-digest',
  name: 'Weekly VP digest',
  group: 'Runbook templates',
  source: SOURCE,
  who: WHO,
  when: groupedWhen('this template, usually on a weekly Scheduled Finding Search'),
  fields: pickGrouped('findings.total.count', 'severity.critical.count', 'severity.high.count', 'findings.list.url'),
  sample: groupedSample,
  build: (): Email => ({
    engine: 'substitution',
    subject: ['Weekly vulnerability digest: ', p('findings.total.count'), ' open findings'],
    preview: [p('severity.critical.count'), ' critical and ', p('severity.high.count'), ' high this week.'],
    eyebrow: 'Weekly digest',
    tone: 'accent',
    title: 'Weekly vulnerability digest',
    subtitle: 'Weekly summary',
    blocks: [
      {
        kind: 'stats',
        items: [
          { label: 'Total open', value: p('findings.total.count') },
          { label: 'Critical', rating: 'critical', value: p('severity.critical.count') },
          { label: 'High', rating: 'high', value: p('severity.high.count') },
        ],
      },
      fallback(listLink),
    ],
    action: { label: 'Open the list', url: listLink },
    reason: REASON,
    footer: 'operational',
  }),
});

export const runbookOwnerNudge = defineTemplate({
  id: 'runbook-owner-nudge',
  name: 'Owner nudge',
  group: 'Runbook templates',
  source: SOURCE,
  who: WHO,
  when: groupedWhen('this template, on a search for findings someone owns'),
  fields: pickGrouped('findings.total.count', 'severity.high.count', 'findings.list.url'),
  sample: groupedSample,
  build: (): Email => ({
    engine: 'substitution',
    subject: ['Action needed: ', p('severity.high.count'), ' high findings assigned to you'],
    preview: ['You own ', p('findings.total.count'), ' findings. Review them in ArmorCode.'],
    eyebrow: 'Action needed',
    tone: 'warn',
    title: ['You own ', p('findings.total.count'), ' findings'],
    blocks: [
      {
        kind: 'stats',
        items: [
          { label: 'Assigned to you', value: p('findings.total.count') },
          { label: 'High', rating: 'high', value: p('severity.high.count') },
        ],
      },
      { kind: 'text', text: 'Review them in ArmorCode.' },
      fallback(listLink),
    ],
    action: { label: 'Review your findings', url: listLink },
    reason: REASON,
    footer: 'operational',
  }),
});

/** In the order Global Settings › Runbook › Email Templates lists them. */
export const EMAILS: EmailTemplate[] = [
  runbookDefaultFinding,
  runbookDefaultGrouped,
  runbookCriticalAlert,
  runbookWeeklyDigest,
  runbookOwnerNudge,
];
