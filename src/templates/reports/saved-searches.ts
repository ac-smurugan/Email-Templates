import { flag, loop, not, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate, type Fields } from '../../template.ts';
import { when, type Block, type Rich } from '../../layout.ts';

// Saved findings views, saved ticket searches and shared search results.

const viewFields = {
  savedSearchName: { about: 'The saved findings view’s name' },
  viewUrl: { about: 'The view in ArmorCode (today’s “clicking this link” link)' },
  customEmailSubject: {
    about: 'The subject the tenant configured for these reports; the default subject when empty',
    optional: true,
  },
  customMessage: {
    about: 'The message configured for the report, when there is one. Rendered from markdown today: give it as already-rendered HTML',
    optional: true,
  },
  findings: {
    about:
      'Up to 10 findings matching the view, each with `id` (today’s findingId) and `summary` (new: the values of the selected export columns, joined with “ · ”). Today each value has a column of its own',
    isNew: true,
  },
  columnNames: {
    about: 'The selected export columns, joined with “, ” (today they are the table’s column headers)',
    optional: true,
    isNew: true,
  },
} satisfies Fields;

const viewSample = {
  ...SAMPLE_BASE,
  savedSearchName: 'Critical open findings in Payments',
  viewUrl: `${SAMPLE_APP_URL}/findings?view=4471`,
  customEmailSubject: '',
  customMessage: 'Please triage anything new in this list before Friday’s review.',
  columnNames: 'Severity, Status, Product, Title',
  findings: [
    { id: '88213409', summary: 'Critical · Open · Payments API · SQL injection in order lookup' },
    { id: '88213377', summary: 'Critical · Open · Payments API · Hard-coded AWS secret key' },
    { id: '88201954', summary: 'Critical · Confirmed · Checkout web · Deserialization of untrusted data' },
  ],
};

const viewSubject: Rich = [
  when(present('customEmailSubject'), v('customEmailSubject'), ['Findings view report: ', v('savedSearchName')]),
];

const message: Block = { kind: 'quote', label: 'Message', text: v('customMessage'), when: present('customMessage') };

const topFindings: Block = {
  kind: 'table',
  title: 'Top 10 findings matching the view',
  columns: [{ label: 'Finding' }, { label: 'Details' }],
  each: loop('findings', 'finding'),
  item: { cells: [v('finding.id'), v('finding.summary')] },
  more: when(present('columnNames'), ['The Details column shows ', v('columnNames'), '.']),
};

const viewWho = 'The people the view is shared with, or the scheduled report’s recipients';
const viewReason = 'You got this email because a saved findings view in ArmorCode was shared with you or sends its report to you.';

/** A saved findings view's report, small enough to attach. */
export const savedViewReport = defineTemplate({
  id: 'saved-view-report',
  name: 'Saved findings view report (CSV attached)',
  group: 'Reports & sharing',
  source: 'java-utils / SavedSearchServiceImpl, EmailService.sendSearchReportShareEmail (in code)',
  who: viewWho,
  when: 'A saved findings view is shared or its schedule runs, and the results are small enough to attach as a CSV',
  fields: viewFields,
  sample: viewSample,
  build: () => ({
    subject: viewSubject,
    preview: ['The CSV of findings from ', v('savedSearchName'), ' is attached.'],
    eyebrow: 'Findings report',
    tone: 'accent',
    title: v('savedSearchName'),
    subtitle: 'Saved findings view report',
    blocks: [
      message,
      { kind: 'text', text: 'The attached CSV has the full list of findings, with all their details.' },
      topFindings,
    ],
    action: { label: 'Open the view', url: v('viewUrl') },
    reason: viewReason,
    footer: 'operational',
  }),
});

/** A saved findings view's report, too large to attach: a download link instead. */
export const savedViewReportLink = defineTemplate({
  id: 'saved-view-report-link',
  name: 'Saved findings view report (download link)',
  group: 'Reports & sharing',
  source: 'java-utils / SavedSearchServiceImpl, EmailService.sendSearchReportShareEmail (in code)',
  who: viewWho,
  when: 'A saved findings view is shared or its schedule runs, and the results are too large to attach',
  fields: {
    ...viewFields,
    downloadUrl: { about: 'The full CSV to download; the link expires (today’s “download the file using this link” link)' },
    expirationTimeInHours: { about: 'How many hours the download link works, as a number' },
  },
  sample: { ...viewSample, downloadUrl: `${SAMPLE_APP_URL}/downloads/findings-view-4471.csv`, expirationTimeInHours: 72 },
  build: () => ({
    subject: viewSubject,
    preview: ['The CSV of findings from ', v('savedSearchName'), ' is ready to download.'],
    eyebrow: 'Findings report',
    tone: 'accent',
    title: v('savedSearchName'),
    subtitle: 'Saved findings view report',
    blocks: [
      message,
      {
        kind: 'text',
        text: [
          'The full list of findings is too large to attach. Download the CSV instead: the link expires in ',
          { strong: [v('expirationTimeInHours'), ' hours'] },
          '.',
        ],
      },
      topFindings,
    ],
    action: { label: 'Download the CSV', url: v('downloadUrl') },
    secondary: { label: 'Open the view in ArmorCode', url: v('viewUrl') },
    reason: viewReason,
    footer: 'operational',
  }),
});

/** Someone shared a saved findings or tickets search. */
export const savedSearchShared = defineTemplate({
  id: 'saved-search-shared',
  name: 'Saved search shared',
  group: 'Reports & sharing',
  source: 'java-utils / SavedSearchServiceImpl (in code)',
  who: 'The newly added users, or the shared teams’ email aliases',
  when: 'Someone shares a saved findings or tickets search with new users or teams',
  fields: {
    sharerDisplayName: { about: 'Who shared it (“Jane Doe”)' },
    businessUnitName: { about: 'The organization (business unit)' },
    savedSearchName: { about: 'The saved search’s name' },
    savedSearchUrl: { about: 'The saved search in ArmorCode (today’s “Click here to access saved search” link)' },
  },
  sample: {
    ...SAMPLE_BASE,
    sharerDisplayName: 'Jane Doe',
    businessUnitName: 'Example Corp Engineering',
    savedSearchName: 'Critical open findings in Payments',
    savedSearchUrl: `${SAMPLE_APP_URL}/findings?view=4471`,
  },
  build: () => ({
    subject: [v('sharerDisplayName'), ' shared a saved search with you'],
    preview: [v('sharerDisplayName'), ' shared ', v('savedSearchName'), ' with you in ArmorCode.'],
    eyebrow: 'Shared',
    tone: 'accent',
    title: [v('sharerDisplayName'), ' shared a saved search with you'],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Saved search', value: { strong: v('savedSearchName') } },
          { label: 'Organization', value: v('businessUnitName') },
        ],
      },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('savedSearchUrl')] },
    ],
    action: { label: 'Open the saved search', url: v('savedSearchUrl') },
    reason: ['You got this email because ', v('sharerDisplayName'), ' shared a saved search with you or your team in ArmorCode.'],
    footer: 'operational',
  }),
});

/** A saved ticket search's report. */
export const ticketSearchReport = defineTemplate({
  id: 'ticket-search-report',
  name: 'Saved ticket search report',
  group: 'Reports & sharing',
  source: 'java-utils / SavedSearchServiceImpl, EmailService.sendTicketSearchReportShareEmail (in code)',
  who: 'The people the search is shared with, or the scheduled report’s recipients',
  when: 'A saved ticket search is shared or its schedule runs',
  fields: {
    frequency: { about: 'How often the report runs: “Daily”, “Weekly” or “Monthly” (today’s {{Daily|Weekly|Monthly}})', optional: true },
    savedSearchName: { about: 'The saved ticket search’s name' },
    ticketsUrl: { about: 'The ticket listing in ArmorCode (today’s “here” link)' },
    noTicketsFound: {
      about: 'true when no tickets match the search, so no CSV is attached (today the backend picks the “No Tickets found” text)',
      optional: true,
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    frequency: 'Weekly',
    savedSearchName: 'Overdue Jira tickets',
    ticketsUrl: `${SAMPLE_APP_URL}/tickets?view=912`,
    noTicketsFound: false,
  },
  build: () => ({
    subject: [
      when(present('frequency'), [v('frequency'), ' ticket search report: '], 'Ticket search report: '),
      v('savedSearchName'),
    ],
    preview: [
      when(
        flag('noTicketsFound'),
        ['No tickets match ', v('savedSearchName'), ' this time.'],
        ['The CSV of tickets from ', v('savedSearchName'), ' is attached.'],
      ),
    ],
    eyebrow: 'Ticket report',
    tone: 'accent',
    title: v('savedSearchName'),
    subtitle: [when(present('frequency'), [v('frequency'), ' saved search report for tickets'], 'Saved search report for tickets')],
    blocks: [
      {
        kind: 'text',
        text: 'The report for your saved ticket search is ready. The attached CSV has the complete list of tickets, with all their details.',
        when: not(flag('noTicketsFound')),
      },
      { kind: 'text', text: 'No tickets match your saved search’s criteria.', when: flag('noTicketsFound') },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('ticketsUrl')] },
    ],
    action: { label: 'View the tickets', url: v('ticketsUrl') },
    reason: 'You got this email because a saved ticket search in ArmorCode was shared with you or sends its report to you.',
    footer: 'operational',
  }),
});

/** Someone shared a search result link. */
export const searchResultShared = defineTemplate({
  id: 'search-result-shared',
  name: 'Search result shared',
  group: 'Reports & sharing',
  source: 'java-utils / EmailService.sendSearchShareEmail (in code)',
  who: 'The person the search result is shared with',
  when: 'Someone shares a search result with them, optionally with a note',
  fields: {
    sharerName: { about: 'Who shared it (“Jane Doe”)' },
    note: { about: 'The note they added, as plain text', optional: true },
    searchResultUrl: { about: 'The search results in ArmorCode (today’s “Click here to view the search results” link)' },
  },
  sample: {
    ...SAMPLE_BASE,
    sharerName: 'Jane Doe',
    note: 'These are the Log4j findings still open on production hosts. Can your team take the first three?',
    searchResultUrl: `${SAMPLE_APP_URL}/search?q=log4j&env=production`,
  },
  build: () => ({
    subject: [v('sharerName'), ' shared a search result with you'],
    preview: [v('sharerName'), ' shared a search result with you in ArmorCode.'],
    eyebrow: 'Shared',
    tone: 'accent',
    title: [v('sharerName'), ' shared a search result with you'],
    blocks: [
      { kind: 'quote', label: 'Their note', text: v('note'), when: present('note') },
      { kind: 'text', text: 'Open the results in ArmorCode to see what they found.' },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('searchResultUrl')] },
    ],
    action: { label: 'View the results', url: v('searchResultUrl') },
    reason: ['You got this email because ', v('sharerName'), ' shared a search result with you in ArmorCode.'],
    footer: 'operational',
  }),
});
