import { above, loop, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import { when, type Href } from '../../layout.ts';

const SOURCE = 'java-utils / EmailService.sendOwnerChangedEmail (in code)';

/** A finding in ArmorCode, as today's emails link it. */
const findingHref = (id: string): Href => [v('armorcodeServerUrl'), '/#/findings/', v('tenant'), '/', v('businessUnitId'), '/', v(id)];
/** The findings page filtered to some findings' ids, as today's bulk email links it. */
const filterHref = (ids: string): Href => [v('armorcodeServerUrl'), '/#/findings?filters={"id":[', v(ids), ']}'];

const LINK_FIELDS = {
  armorcodeServerUrl: { about: 'ArmorCode’s address (“https://acme.armorcode.com”)' },
  tenant: { about: 'The tenant, as in finding links' },
  businessUnitId: { about: 'The business unit’s id, as in finding links' },
} as const;

const SAMPLE_LINKS = { armorcodeServerUrl: SAMPLE_APP_URL, tenant: 'example-corp', businessUnitId: '12' };

/** One finding's owner changed to them. */
export const findingAssigned = defineTemplate({
  id: 'finding-assigned',
  name: 'Finding assigned to you',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'The person the finding was assigned to',
  when: 'Someone changes a finding’s owner to them',
  fields: {
    ...LINK_FIELDS,
    assignerName: { about: 'Who assigned it (“Jane Doe”)' },
    findingId: { about: 'The finding’s id' },
    findingTitle: { about: 'The finding’s title', optional: true, isNew: true },
    findingSeverity: { about: 'The finding’s severity: Critical, High, Medium or Low', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_LINKS,
    assignerName: 'Jane Doe',
    findingId: '48213',
    findingTitle: 'SQL injection in /api/v1/payments/search',
    findingSeverity: 'High',
  },
  build: () => ({
    subject: [v('assignerName'), ' assigned you finding ', v('findingId')],
    preview: [v('assignerName'), ' made you the owner of a finding in ArmorCode.'],
    eyebrow: 'Assigned',
    tone: 'accent',
    title: ['Finding ', v('findingId'), ' is yours'],
    subtitle: [v('assignerName'), ' assigned it to you.'],
    blocks: [
      {
        kind: 'details',
        rows: [
          { label: 'Finding', value: { strong: v('findingId') } },
          { label: 'Title', value: v('findingTitle'), when: present('findingTitle') },
          { label: 'Severity', value: [{ ratingOf: 'findingSeverity' }, ' ', v('findingSeverity')], when: present('findingSeverity') },
          { label: 'Assigned by', value: v('assignerName') },
        ],
      },
    ],
    action: { label: 'View the finding', url: findingHref('findingId') },
    reason: ['You got this email because ', v('assignerName'), ' assigned a finding to you in ArmorCode.'],
    footer: 'operational',
  }),
});

const findingItem = { title: ['Finding ', v('finding.id')], url: findingHref('finding.id') };

/** Several findings' owner changed to them at once. */
export const findingAssignedMany = defineTemplate({
  id: 'finding-assigned-many',
  name: 'Findings assigned to you',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'The person the findings were assigned to',
  when: 'Someone changes the owner of several findings to them (for example through a proposed update)',
  fields: {
    ...LINK_FIELDS,
    assignerName: { about: 'Who assigned them (“Jane Doe”)' },
    findingCount: { about: 'How many findings, as a number' },
    findings: { about: 'The findings, each with id (today’s {{findingId}})' },
    findingIds: {
      about: 'The findings’ ids, comma-separated (“48213,48214”), for the button’s filtered findings page, as the bulk email’s {{findingIds}}',
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_LINKS,
    assignerName: 'Jane Doe',
    findingCount: 3,
    findings: [{ id: '48213' }, { id: '48214' }, { id: '48230' }],
    findingIds: '48213,48214,48230',
  },
  build: () => ({
    subject: [v('assignerName'), ' assigned ', v('findingCount'), ' findings to you'],
    preview: [v('assignerName'), ' made you the owner of ', v('findingCount'), ' findings in ArmorCode.'],
    eyebrow: 'Assigned',
    tone: 'accent',
    title: [v('findingCount'), ' findings are yours'],
    subtitle: [v('assignerName'), ' assigned them to you.'],
    blocks: [{ kind: 'items', each: loop('findings', 'finding'), item: findingItem }],
    action: { label: 'View the findings', url: filterHref('findingIds') },
    reason: ['You got this email because ', v('assignerName'), ' assigned findings to you in ArmorCode.'],
    footer: 'operational',
  }),
});

/** A bulk owner change: the first five findings, then links to them all, 100 at a time. */
export const findingAssignedBulk = defineTemplate({
  id: 'finding-assigned-bulk',
  name: 'Findings assigned to you in bulk',
  group: 'Findings & alerts',
  source: 'java-utils / EmailService.sendBulkOwnerChangedEmail (in code)',
  who: 'The person the findings were assigned to',
  when: 'A bulk owner change assigns many findings to them at once',
  fields: {
    ...LINK_FIELDS,
    assignerName: { about: 'Who assigned them (“Jane Doe”)' },
    findings: { about: 'The first 5 findings, as today, each with id (today’s {{findingId}})' },
    pages: {
      about:
        'Every finding, 100 per page, as today: each with pageStart, pageEnd and findingIds (that page’s ids, comma-separated, for the filtered findings page)',
    },
    findingsUrl: { about: 'The findings page in ArmorCode, filtered to the findings they own (today’s email has no such link)', isNew: true },
    findingCount: { about: 'How many findings were assigned, as a number', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_LINKS,
    assignerName: 'Jane Doe',
    findings: ['48213', '48214', '48230', '48231', '48302'].map((id) => ({ id })),
    pages: [
      { pageStart: 1, pageEnd: 100, findingIds: '48213,48214,48230' },
      { pageStart: 101, pageEnd: 200, findingIds: '49120,49121,49122' },
      { pageStart: 201, pageEnd: 236, findingIds: '49544,49545,49546' },
    ],
    findingsUrl: `${SAMPLE_APP_URL}/#/findings?filters={"owner":["john.smith@example.com"]}`,
    findingCount: 236,
  },
  build: () => ({
    subject: [v('assignerName'), ' assigned findings to you'],
    preview: [
      v('assignerName'),
      ' made you the owner of ',
      when(above('findingCount', 0), [v('findingCount'), ' findings'], 'findings'),
      ' in ArmorCode.',
    ],
    eyebrow: 'Assigned',
    tone: 'accent',
    title: when(above('findingCount', 0), [v('findingCount'), ' findings are yours'], 'Findings assigned to you'),
    subtitle: [v('assignerName'), ' assigned them to you in bulk.'],
    blocks: [
      {
        kind: 'items',
        each: loop('findings', 'finding'),
        item: findingItem,
        more: when(above('findingCount', 5), ['The first 5 of ', v('findingCount'), '. All of them are linked below.']),
      },
      { kind: 'text', text: 'All the findings, 100 at a time:' },
      {
        kind: 'items',
        each: loop('pages', 'page'),
        item: { title: ['Findings ', v('page.pageStart'), ' to ', v('page.pageEnd')], url: filterHref('page.findingIds') },
      },
    ],
    action: { label: 'View your findings', url: v('findingsUrl') },
    reason: ['You got this email because ', v('assignerName'), ' assigned findings to you in ArmorCode.'],
    footer: 'operational',
  }),
});
