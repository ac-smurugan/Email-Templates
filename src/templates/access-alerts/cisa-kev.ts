import { loop, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import type { Block } from '../../layout.ts';

const SOURCE = 'java-utils / CISAKEVEventProcessor (in code)';
const CATALOG_URL = 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog';
const catalog = { label: 'CISA’s Known Exploited Vulnerabilities catalog', url: CATALOG_URL };

const intro: Block = {
  kind: 'text',
  text: [
    'CISA, the US Cybersecurity and Infrastructure Security Agency, keeps a catalog of vulnerabilities known to be exploited in the wild, and strongly recommends every organization prioritize fixing them. ArmorCode checked ',
    { strong: v('tenantName') },
    ' against the vulnerabilities in its latest release.',
  ],
};

const cves: Block = {
  kind: 'items',
  each: loop('cves', 'cve'),
  item: { title: v('cve.cveId'), url: ['https://nvd.nist.gov/vuln/detail/', v('cve.cveId')], meta: ['CISA due date: ', v('cve.dueDate')] },
};

const support: Block = { kind: 'text', quiet: true, text: 'Questions? ArmorCode’s customer service team can help.' };

const FIELDS = {
  tenantName: { about: 'The tenant (environment) checked (“Example Corp”)' },
  cves: {
    about:
      'The CVEs in CISA’s latest release, as today: each with cveId and dueDate',
  },
} as const;

const cve = (cveId: string, dueDate: string) => ({ cveId, dueDate });
const SAMPLE_CVES = [cve('CVE-2026-12345', '2026-11-18'), cve('CVE-2026-23456', '2026-11-18')];

const REASON = [
  'You got this email because you’re an account-level user of ',
  v('tenantName'),
  ' in ArmorCode. ArmorCode sends CISA KEV notices to all account-level users.',
];

const bu = (name: string, status: string) => ({
  businessUnitName: name,
  cveFindingFilterLink: `${SAMPLE_APP_URL}/#/findings?filters={"cve":["CVE-2026-12345","CVE-2026-23456"],"status":"${status}","bu":"${name}"}`,
});

/** CISA's latest KEV release matches findings in the tenant. */
export const cisaKevFound = defineTemplate({
  id: 'cisa-kev-found',
  name: 'CISA KEV vulnerabilities found',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'Every account-level (tenant) user',
  when: 'ArmorCode processes a new CISA KEV release and findings in the tenant match it',
  fields: {
    ...FIELDS,
    unresolvedBusinessUnits: {
      about: 'Business units with unresolved matching findings: each with businessUnitName and cveFindingFilterLink, as today',
      optional: true,
    },
    resolvedBusinessUnits: {
      about: 'Business units with resolved matching findings: each with businessUnitName and cveFindingFilterLink, as today',
      optional: true,
    },
    armorcodeServerUrl: {
      about: 'ArmorCode’s address (“https://acme.armorcode.com”), as other emails have it; the button opens its findings page, where the CVE filter finds these',
      isNew: true,
    },
  },
  sample: {
    ...SAMPLE_BASE,
    tenantName: 'Example Corp',
    cves: SAMPLE_CVES,
    unresolvedBusinessUnits: [bu('Engineering', 'unresolved'), bu('Retail', 'unresolved')],
    resolvedBusinessUnits: [bu('Engineering', 'resolved')],
    armorcodeServerUrl: SAMPLE_APP_URL,
  },
  build: () => ({
    subject: ['Action needed: findings match the latest CISA KEV release in ', v('tenantName')],
    preview: ['Vulnerabilities known to be exploited in the wild match findings in ', v('tenantName'), '.'],
    eyebrow: 'Action needed',
    tone: 'danger',
    title: 'Findings match CISA’s latest exploited vulnerabilities',
    subtitle: ['In ', v('tenantName')],
    blocks: [
      intro,
      cves,
      { kind: 'text', text: 'Open the matching findings by business unit, or use the CVE filter on the findings page.' },
      {
        kind: 'text',
        when: present('unresolvedBusinessUnits'),
        text: { strong: 'Unresolved findings (Open, Confirm, In Progress, Triage)' },
      },
      {
        kind: 'items',
        when: present('unresolvedBusinessUnits'),
        each: loop('unresolvedBusinessUnits', 'bu'),
        item: { title: v('bu.businessUnitName'), url: v('bu.cveFindingFilterLink') },
      },
      {
        kind: 'text',
        when: present('resolvedBusinessUnits'),
        text: { strong: 'Resolved findings (Accept Risk, Suppressed, False Positive, Controlled)' },
      },
      {
        kind: 'items',
        when: present('resolvedBusinessUnits'),
        each: loop('resolvedBusinessUnits', 'bu'),
        item: { title: v('bu.businessUnitName'), url: v('bu.cveFindingFilterLink') },
      },
      {
        kind: 'text',
        text: [
          { strong: 'What to do: ' },
          'reassess these findings’ risk in light of the active exploitation, and assign them to the right teams to fix. You can also update your scanners and run a fresh scan.',
        ],
      },
      support,
    ],
    action: { label: 'Open the findings page', url: [v('armorcodeServerUrl'), '/#/findings'] },
    secondary: catalog,
    reason: REASON,
    footer: 'operational',
  }),
});

/** CISA's latest KEV release matches nothing in the tenant. */
export const cisaKevNone = defineTemplate({
  id: 'cisa-kev-none',
  name: 'CISA KEV vulnerabilities: none found',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'Every account-level (tenant) user',
  when: 'ArmorCode processes a new CISA KEV release and no findings in the tenant match it',
  fields: FIELDS,
  sample: { ...SAMPLE_BASE, tenantName: 'Example Corp', cves: SAMPLE_CVES },
  build: () => ({
    subject: ['No findings match the latest CISA KEV release in ', v('tenantName')],
    preview: ['ArmorCode found no findings in ', v('tenantName'), ' for CISA’s latest exploited vulnerabilities.'],
    eyebrow: 'No matches',
    tone: 'ok',
    title: 'No findings match CISA’s latest exploited vulnerabilities',
    subtitle: ['In ', v('tenantName')],
    blocks: [
      intro,
      cves,
      { kind: 'text', text: ['ArmorCode found no findings for these CVEs in ', v('tenantName'), ' when it sent this email.'] },
      {
        kind: 'text',
        text: [
          { strong: 'What to do: ' },
          'keep re-evaluating as things change, and if needed update your security tools and run a fresh scan.',
        ],
      },
      support,
    ],
    action: { label: 'View the CISA KEV catalog', url: CATALOG_URL },
    reason: REASON,
    footer: 'operational',
  }),
});
