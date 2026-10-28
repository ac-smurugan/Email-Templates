/** Sample findings for the project and risk register reports: fictional, Example Corp's. */
import { SAMPLE_APP_URL } from '../samples.ts';
import { SAMPLE_LOGO } from './shared.ts';

const CVSS_FULL = { AV: 'Network', AC: 'Low', PR: 'None', UI: 'None', S: 'Changed', C: 'High', I: 'High', A: 'High' };

interface Spec {
  dfId: string;
  dfTitle: string;
  cveBaseScore: number | null;
  armorcodeSeverity: string;
  action: string;
  armorcodeCategory: string;
  tickets: string[];
  tool: string;
  toolSeverity: string;
  cve: string;
  cvssVector: string;
  cvss: Record<string, string>;
}

const SPECS: Spec[] = [
  {
    dfId: '2384715',
    dfTitle: 'Remote code execution via JNDI lookup in <b>log4j-core</b> 2.14.1',
    cveBaseScore: 9.8,
    armorcodeSeverity: 'Critical',
    action: 'OPEN',
    armorcodeCategory: 'Vulnerable Dependency',
    tickets: ['SEC-4821', 'SEC-4822'],
    tool: 'Snyk',
    toolSeverity: 'Critical',
    cve: 'EXM-2026-4410',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
    cvss: CVSS_FULL,
  },
  {
    dfId: '2384722',
    dfTitle: 'SQL injection in the /api/v2/orders search parameter allows reading arbitrary customer records',
    cveBaseScore: 8.6,
    armorcodeSeverity: 'High',
    action: 'IN_PROGRESS',
    armorcodeCategory: 'Injection',
    tickets: ['SEC-4830'],
    tool: 'Burp Suite',
    toolSeverity: 'High',
    cve: 'N/A',
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',
    cvss: { AV: 'Network', AC: 'Low', PR: 'None', UI: 'None', S: 'Unchanged', C: 'High', I: 'Low', A: 'None' },
  },
  {
    dfId: '2384730',
    dfTitle: 'Outdated OpenSSL 3.0.7 in the payments-api base image',
    cveBaseScore: 5.9,
    armorcodeSeverity: 'Medium',
    action: 'ACCEPTRISK',
    armorcodeCategory: 'Container Image',
    tickets: [],
    tool: 'Wiz',
    toolSeverity: 'Medium',
    cve: 'EXM-2026-1187',
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
    cvss: { AV: 'Network', AC: 'High', PR: 'None', UI: 'None', S: 'Unchanged', C: 'High', I: 'None', A: '' },
  },
  {
    dfId: '2384741',
    dfTitle: 'Missing Content-Security-Policy header on checkout.example.com',
    cveBaseScore: null,
    armorcodeSeverity: 'Low',
    action: 'FALSEPOSITIVE',
    armorcodeCategory: 'Security Misconfiguration',
    tickets: [],
    tool: 'ZAP',
    toolSeverity: 'Low',
    cve: 'N/A',
    cvssVector: 'N/A',
    cvss: {},
  },
  {
    dfId: '2384756',
    dfTitle: 'Server banner discloses the nginx version',
    cveBaseScore: null,
    armorcodeSeverity: 'Info',
    action: 'TRIAGE',
    armorcodeCategory: 'Information Disclosure',
    tickets: [],
    tool: 'Tenable',
    toolSeverity: 'Info',
    cve: 'N/A',
    cvssVector: 'N/A',
    cvss: {},
  },
];

/** `FINDINGS_LIST`, as the backend builds it. */
export const SAMPLE_FINDINGS_LIST = {
  data: SPECS.map((s) => ({
    dfId: s.dfId,
    dfTitle: s.dfTitle,
    cveBaseScore: s.cveBaseScore,
    armorcodeSeverity: s.armorcodeSeverity,
    action: s.action,
    armorcodeCategory: s.armorcodeCategory,
    armorcodeTicketIds: s.tickets.length ? s.tickets : null,
    armorcodeTicketUrls: s.tickets.length ? s.tickets.map((t) => `https://example-corp.atlassian.example.com/browse/${t}`) : null,
  })),
  formattedData: Object.fromEntries(
    SPECS.map((s) => [
      s.dfId,
      {
        // Java's LinkedHashMap keeps its order; so does a Map.
        vulnerabilityInfo: new Map([
          ['CVE', s.cve],
          ['CWE', s.armorcodeSeverity === 'Critical' ? 'CWE-917' : 'CWE-89'],
          ['First Seen', 'Sep 14, 2026'],
          ['Last Seen', 'Oct 27, 2026'],
          ['Environment', 'Production'],
        ]),
        toolInfo: new Map([
          ['Tool', s.tool],
          ['Tool Severity', s.toolSeverity],
          ['Scan Type', s.tool === 'Snyk' ? 'SCA' : 'DAST'],
          ['Rule', `${s.tool.toLowerCase().replace(/\s/g, '-')}-rule-${s.dfId.slice(-3)}`],
        ]),
        cvssVector: s.cvssVector,
        description: `<p>${s.dfTitle.replace(/<[^>]*>/g, '')} was found in <code>example-corp/payments-api</code>.</p>`,
        stepsToReproduce: '<ol><li>Sign in as a test customer.</li><li>Send the request below with the payload in the search field.</li></ol><pre><code>GET /api/v2/orders?q=%27%20OR%201%3D1-- HTTP/1.1\nHost: api.example.com</code></pre>',
        mitigation: '<p>Upgrade to the patched version and redeploy. Until then, block the pattern at the WAF.</p>',
        impact: '<p>An unauthenticated attacker could read or change customer data.</p>',
        components: '<ul><li>example-corp/payments-api</li><li>example-corp/billing-service</li></ul>',
      },
    ]),
  ),
  cvssData: Object.fromEntries(SPECS.map((s) => [s.dfId, s.cvss])),
};

export const SAMPLE_PROJECT = {
  ProjectDetailsH1s: ['Scope', 'Methodology'],
  projectDescription:
    '<h1 id="h10">Scope</h1><p>The payments platform: payments-api, billing-service and the checkout web app, in production.</p><h1 id="h11">Methodology</h1><p>Automated scans (SCA, DAST, container) from September 14 to October 27, 2026, triaged by John Smith.</p>',
  tenant: 'example-corp',
  businessUnit: '1042',
  footer: 'Confidential: Example Corp',
  additionalDocumentsImages: [{ url: SAMPLE_LOGO, fileName: 'architecture-diagram.svg' }],
  additionalDocumentsNonImages: [
    { url: `${SAMPLE_APP_URL}/files/pentest-scope.pdf`, fileName: 'pentest-scope.pdf' },
    { url: `${SAMPLE_APP_URL}/files/data-flow.xlsx`, fileName: 'data-flow.xlsx' },
  ],
};
