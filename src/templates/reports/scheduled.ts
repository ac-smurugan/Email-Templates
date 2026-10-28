import { flag, loop, plain, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import { when } from '../../layout.ts';

/**
 * A scheduled notification report, including the daily and weekly digests. Today the widgets are
 * drawn inline as images and tables; the layout has no image block, so the email lists the widgets
 * and points to the report and its PDF.
 */
export const scheduledReport = defineTemplate({
  id: 'scheduled-report',
  name: 'Scheduled report (and daily or weekly digest)',
  group: 'Reports & sharing',
  source: 'java-utils / NotificationReportServiceImpl (in code)',
  who: 'The report’s recipient email list',
  when: 'A scheduled notification report runs, including the daily and weekly digests',
  fields: {
    reportName: { about: 'The report’s name' },
    reportDate: { about: 'The day it ran, as MM-dd-yyyy (today’s {{MM-dd-yyyy}})' },
    reportDescription: {
      about: 'The report’s description and filter summary, as the HTML the backend builds today',
      optional: true,
    },
    widgets: { about: 'The report’s widgets, in layout order, each with `name` (today’s widgetName)' },
    resourcesUrl: { about: 'The help page about the report’s widgets (today’s “resources” link)' },
    unsubscribeUrl: { about: 'Where they edit or end this subscription (today’s “You may edit this subscription here” link)' },
    tenantFooterMessage: { about: 'The tenant’s footer message, as plain text', optional: true },
    reportUrl: { about: 'The report’s widgets in ArmorCode, for the button (today the widgets are drawn in the email)', isNew: true },
    pdfAttached: {
      about: 'true when the report’s PDF is attached: when the body is large, and always for the daily and weekly digests',
      optional: true,
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    reportName: 'Weekly digest',
    reportDate: '10-26-2026',
    reportDescription: 'Findings in <strong>Example Corp Engineering</strong>, all products, opened in the last 7 days.',
    widgets: [
      { name: 'Open findings by severity' },
      { name: 'New vs. closed findings' },
      { name: 'Top 10 products by risk' },
      { name: 'SLA breaches by team' },
    ],
    resourcesUrl: 'https://docs.armorcode.example.com/reports/widgets',
    unsubscribeUrl: `${SAMPLE_APP_URL}/reports/subscriptions/77/edit`,
    tenantFooterMessage: 'Example Corp internal: do not forward outside the company.',
    reportUrl: `${SAMPLE_APP_URL}/reports/77`,
    pdfAttached: true,
  },
  build: () => ({
    subject: [v('reportName'), ' for ', v('reportDate')],
    preview: [
      v('reportName'),
      ' for ',
      v('reportDate'),
      ' is ready.',
      when(flag('pdfAttached'), ' The PDF is attached.'),
    ],
    eyebrow: 'Scheduled report',
    tone: 'accent',
    title: v('reportName'),
    subtitle: v('reportDate'),
    blocks: [
      { kind: 'quote', label: 'About this report', text: v('reportDescription'), when: present('reportDescription') },
      {
        kind: 'text',
        text: [
          'Your scheduled report is ready.',
          when(flag('pdfAttached'), ' The PDF of the report is attached.'),
          ' Open it in ArmorCode to see each widget.',
        ],
      },
      { kind: 'list', label: 'Widgets in this report', each: loop('widgets', 'widget'), item: v('widget.name') },
      { kind: 'text', quiet: true, text: v('tenantFooterMessage'), when: present('tenantFooterMessage') },
    ],
    action: { label: 'View the report', url: v('reportUrl') },
    secondary: { label: 'Learn more about the widgets', url: v('resourcesUrl') },
    reason: 'You got this email because you’re subscribed to a scheduled report in ArmorCode.',
    footer: 'operational',
    footerLinks: [{ label: 'Edit or unsubscribe', url: v('unsubscribeUrl') }],
  }),
});

/** A compliance assessments report finished generating. */
export const complianceAssessments = defineTemplate({
  id: 'compliance-assessments',
  name: 'Compliance assessments report ready',
  group: 'Reports & sharing',
  source: 'background-jobs / ReportsApplicationEventHandler (in code)',
  who: 'The people set up to receive the report',
  when: 'A compliance assessments report finishes generating',
  fields: {
    assessmentsUrl: { about: 'The report in ArmorCode (today’s “click here for Assessments” link)' },
  },
  sample: { ...SAMPLE_BASE, assessmentsUrl: `${SAMPLE_APP_URL}/compliance/assessments` },
  build: () => ({
    subject: 'Your compliance assessments report is ready',
    preview: 'Open the report in ArmorCode to see your compliance assessments.',
    eyebrow: 'Report ready',
    tone: 'ok',
    title: 'Your compliance assessments report is ready',
    blocks: [
      { kind: 'text', text: 'The compliance assessments report has finished generating. Open it in ArmorCode to see the assessments.' },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('assessmentsUrl')] },
    ],
    action: { label: 'View the assessments', url: v('assessmentsUrl') },
    reason: 'You got this email because you’re set up to receive compliance assessments reports in ArmorCode.',
    footer: 'operational',
  }),
});

const runbookLabel = plain('runbookLabel');

/** The runbook or pipeline export report, when its email template couldn't be read. */
export const runbookReportFallback = defineTemplate({
  id: 'runbook-report-fallback',
  name: 'Runbook export report (fallback)',
  group: 'Tools & runbooks',
  source: 'background-jobs / CSVFileHelper, CSVFileExecutor, ExportEmailHelper (in-code fallback)',
  who: 'The configured recipients: assignee, team, owner, security owner or finding-tag group',
  when: 'A runbook or pipeline export report is sent, but its HTML email template couldn’t be read',
  fields: {
    runbookLabel: { about: 'The runbook’s or pipeline’s name' },
    armorcodeServerUrl: { about: 'ArmorCode’s address, for the button (the email had no link)', isNew: true },
  },
  sample: { ...SAMPLE_BASE, runbookLabel: 'Weekly export', armorcodeServerUrl: SAMPLE_APP_URL },
  build: () => ({
    engine: 'substitution',
    subject: [runbookLabel, ' report'],
    preview: ['Something went wrong building the ', runbookLabel, ' report email. Contact ArmorCode support.'],
    eyebrow: 'Report failed',
    tone: 'danger',
    title: ['We couldn’t build the ', runbookLabel, ' report email'],
    blocks: [
      {
        kind: 'text',
        text: ['Something went wrong while building this email, so it doesn’t include the report from ', runbookLabel, '.'],
      },
      { kind: 'text', text: 'Please contact ArmorCode support so they can look into it.' },
    ],
    action: { label: 'Open ArmorCode', url: plain('armorcodeServerUrl') },
    reason: 'You got this email because a runbook or pipeline in ArmorCode sends its reports to you.',
    footer: 'operational',
  }),
});
