import { present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate, type Fields } from '../../template.ts';
import { when, type Block, type Rich } from '../../layout.ts';

// Dashboard reports and shares. Today's report emails show a snapshot image of the dashboard; the
// layout has no image block, so these point to the live dashboard and the attached PDF instead.

const reportFields = {
  dashboardName: { about: 'The dashboard’s name' },
  dashboardUrl: { about: 'The live dashboard in ArmorCode (today’s “View Full Dashboard on ArmorCode Platform” link)' },
} satisfies Fields;

const reportSample = {
  ...SAMPLE_BASE,
  dashboardName: 'Application security overview',
  dashboardUrl: `${SAMPLE_APP_URL}/dashboards/custom/218`,
};

const defaultSubject: Rich = ['Scheduled dashboard report: ', v('dashboardName')];

const reportBlocks: readonly Block[] = [
  {
    kind: 'text',
    text: ['The scheduled report for ', { strong: v('dashboardName') }, ' is ready. The PDF of the dashboard is attached.'],
  },
  { kind: 'text', text: 'Open the dashboard in ArmorCode to see the latest data and explore it further.' },
  { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('dashboardUrl')] },
];

const reportWho = 'The report’s recipients: its email list plus anyone resolved from its responsibility-based recipients';
const reportReason = 'You got this email because you’re a recipient of a scheduled dashboard report in ArmorCode.';

/** A dashboard report ran on its schedule, with no message of its own. */
export const dashboardReport = defineTemplate({
  id: 'dashboard-report',
  name: 'Scheduled dashboard report',
  group: 'Reports & sharing',
  source: 'java-utils / DashboardEmailSender (in code)',
  who: reportWho,
  when: 'A dashboard report runs on its schedule (daily, weekly or monthly) and has no custom email message',
  fields: reportFields,
  sample: reportSample,
  build: () => ({
    subject: defaultSubject,
    preview: ['The PDF of ', v('dashboardName'), ' is attached, or open the live dashboard in ArmorCode.'],
    eyebrow: 'Dashboard report',
    tone: 'accent',
    title: v('dashboardName'),
    subtitle: 'Scheduled dashboard report',
    blocks: reportBlocks,
    action: { label: 'View the dashboard', url: v('dashboardUrl') },
    reason: reportReason,
    footer: 'operational',
  }),
});

/** A dashboard report ran on its schedule, with a subject or message its owner wrote. */
export const dashboardReportCustom = defineTemplate({
  id: 'dashboard-report-custom',
  name: 'Scheduled dashboard report (custom message)',
  group: 'Reports & sharing',
  source: 'java-utils / DashboardEmailSender (in code)',
  who: reportWho,
  when: 'A dashboard report runs on its schedule and its owner set a custom email subject or message',
  fields: {
    ...reportFields,
    customEmailSubject: { about: 'The subject the report’s owner wrote; the default subject when empty', optional: true },
    customEmailBody: {
      about: 'The message the report’s owner wrote. Rendered from markdown today: give it as already-rendered HTML',
      optional: true,
    },
  },
  sample: {
    ...reportSample,
    customEmailSubject: 'Weekly AppSec overview for the leadership team',
    customEmailBody:
      'Hi all,<br>Critical findings are down this week. Please review the <strong>Payments</strong> section before Thursday’s meeting.<br>Jane',
  },
  build: () => ({
    subject: [when(present('customEmailSubject'), v('customEmailSubject'), defaultSubject)],
    preview: ['The PDF of ', v('dashboardName'), ' is attached, with a message from the report’s owner.'],
    eyebrow: 'Dashboard report',
    tone: 'accent',
    title: v('dashboardName'),
    subtitle: 'Scheduled dashboard report',
    blocks: [{ kind: 'quote', label: 'Message', text: v('customEmailBody'), when: present('customEmailBody') }, ...reportBlocks],
    action: { label: 'View the dashboard', url: v('dashboardUrl') },
    reason: reportReason,
    footer: 'operational',
  }),
});

/** Someone shared a custom dashboard. */
export const dashboardShared = defineTemplate({
  id: 'dashboard-shared',
  name: 'Custom dashboard shared',
  group: 'Reports & sharing',
  source: 'java-utils / CustomDashboardServiceImpl (in code)',
  who: 'The newly added users, or the shared teams’ email aliases',
  when: 'Someone shares a custom dashboard with new users or teams',
  fields: {
    sharerDisplayName: { about: 'Who shared it (“Jane Doe”)' },
    businessUnitName: { about: 'The organization (business unit)' },
    dashboardName: { about: 'The dashboard’s name' },
    dashboardUrl: { about: 'The dashboard in ArmorCode (today’s “Click here to access dashboard” link)' },
  },
  sample: {
    ...SAMPLE_BASE,
    sharerDisplayName: 'Jane Doe',
    businessUnitName: 'Example Corp Engineering',
    dashboardName: 'Application security overview',
    dashboardUrl: `${SAMPLE_APP_URL}/dashboards/custom/218`,
  },
  build: () => ({
    subject: [v('sharerDisplayName'), ' shared a custom dashboard with you'],
    preview: [v('sharerDisplayName'), ' shared ', v('dashboardName'), ' with you in ArmorCode.'],
    eyebrow: 'Shared',
    tone: 'accent',
    title: [v('sharerDisplayName'), ' shared a dashboard with you'],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Dashboard', value: { strong: v('dashboardName') } },
          { label: 'Organization', value: v('businessUnitName') },
        ],
      },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('dashboardUrl')] },
    ],
    action: { label: 'Open the dashboard', url: v('dashboardUrl') },
    reason: ['You got this email because ', v('sharerDisplayName'), ' shared a dashboard with you or your team in ArmorCode.'],
    footer: 'operational',
  }),
});
