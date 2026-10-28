import { plain } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate, type Fields } from '../template.ts';
import type { Block } from '../layout.ts';

// The runbook emails background-jobs sends when a runbook has no email body of its own. They're
// filled by plain `${name}` substitution, not Velocity, so they have no conditions.

const name = plain('runbook.name', 'Runbook');

const fields = {
  'runbook.name': { about: 'The runbook’s name; “Runbook” when it has none' },
  urls: { about: 'The links to the results, as HTML the backend builds (one link per line)' },
  armorcodeServerUrl: { about: 'ArmorCode’s address, for the button (the email had no button)', isNew: true },
} satisfies Fields;

const sampleUrls = (what: string) =>
  `<a href="${SAMPLE_APP_URL}/${what}?view=critical">Critical ${what} from Daily triage</a><br><a href="${SAMPLE_APP_URL}/${what}?view=high">High ${what} from Daily triage</a>`;

const links = (label: string): Block => ({ kind: 'quote', label, text: plain('urls') });

/** A runbook found findings. */
export const runbookFindings = defineTemplate({
  id: 'runbook-findings',
  name: 'Runbook findings (default)',
  group: 'Tools & runbooks',
  source: 'background-jobs / RunbookEmailNotificationJfcJob · emails/defaultEmail.html',
  who: 'The runbook’s email recipients',
  when: 'A runbook’s Send Email step runs and the runbook has no email body of its own',
  fields,
  sample: { ...SAMPLE_BASE, armorcodeServerUrl: SAMPLE_APP_URL, runbook: { name: 'Daily triage' }, urls: sampleUrls('findings') },
  build: () => ({
    engine: 'substitution',
    subject: [name, ': findings'],
    preview: [name, ' ran. Open the links to see the findings it found.'],
    eyebrow: 'Runbook',
    tone: 'accent',
    title: name,
    subtitle: 'Total findings',
    blocks: [{ kind: 'text', text: 'The runbook ran. Open a link below to see the findings it found.' }, links('Findings')],
    action: { label: 'Open ArmorCode', url: plain('armorcodeServerUrl') },
    reason: 'You got this email because a runbook in ArmorCode sends its results to you.',
    footer: 'operational',
  }),
});

/** A runbook found findings and made a report of them. */
export const runbookFindingsReport = defineTemplate({
  id: 'runbook-findings-report',
  name: 'Runbook findings with report (default)',
  group: 'Tools & runbooks',
  source: 'background-jobs / CSVFileHelper, CSVFileExecutor, ExportEmailHelper · emails/defaultEmail2.html',
  who: 'The runbook’s email recipients',
  when: 'A runbook’s export step finishes and the runbook has no email body of its own',
  fields: {
    'runbook.name': fields['runbook.name'],
    urls: fields.urls,
    downloadReportUrl: {
      about: 'The report to download. Today’s template prints the word “downloadReportUrl” instead of a link',
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    runbook: { name: 'Weekly export' },
    urls: sampleUrls('findings'),
    downloadReportUrl: `${SAMPLE_APP_URL}/downloads/weekly-export.csv`,
  },
  build: () => ({
    engine: 'substitution',
    subject: [name, ': findings report'],
    preview: [name, ' ran. Download the report, or open the findings in ArmorCode.'],
    eyebrow: 'Runbook',
    tone: 'accent',
    title: name,
    subtitle: 'Findings report',
    blocks: [{ kind: 'text', text: 'The runbook ran and made a report of the findings it found.' }, links('Findings')],
    action: { label: 'Download the report', url: plain('downloadReportUrl') },
    reason: 'You got this email because a runbook in ArmorCode sends its results to you.',
    footer: 'operational',
  }),
});

/** A scheduled ticket search ran. */
export const runbookTickets = defineTemplate({
  id: 'runbook-tickets',
  name: 'Scheduled ticket search (default)',
  group: 'Tools & runbooks',
  source: 'background-jobs / RunbookEmailNotificationJfcJob · emails/defaultEmailTicket.html',
  who: 'The runbook’s email recipients',
  when: 'A runbook’s scheduled ticket search runs and the runbook has no email body of its own',
  fields,
  sample: { ...SAMPLE_BASE, armorcodeServerUrl: SAMPLE_APP_URL, runbook: { name: 'Overdue tickets' }, urls: sampleUrls('tickets') },
  build: () => ({
    engine: 'substitution',
    subject: [name, ': scheduled ticket search report'],
    preview: [name, ' ran. Open the links to see the tickets it found.'],
    eyebrow: 'Scheduled ticket search',
    tone: 'accent',
    title: name,
    subtitle: 'Scheduled ticket search report',
    blocks: [{ kind: 'text', text: 'The search ran. Open a link below to see the tickets it found.' }, links('Tickets')],
    action: { label: 'Open ArmorCode', url: plain('armorcodeServerUrl') },
    reason: 'You got this email because a runbook in ArmorCode sends its results to you.',
    footer: 'operational',
  }),
});
