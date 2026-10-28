/** Fields, samples and Velocity the reports share. */
import type { Fields } from '../template.ts';
import { SAMPLE_APP_URL } from '../samples.ts';

/** Every report has these. */
export const BASE_FIELDS = {
  fileName: { about: 'The PDF’s file name, as its <title>' },
  armorcodeLogo: {
    about: 'The ArmorCode logo, in the brand row of every page; shown 22px high on a light background, so it must be a mark that reads on light (today’s sat on a dark header image)',
  },
  armorcodeServerUrl: { about: 'The app’s base URL, for links into ArmorCode' },
  GLOBAL_SETTINGS: { about: 'The tenant’s custom labels (a map): teamName, productName, riskScoreName, severityName, criticalName, …' },
} as const satisfies Fields;

/** The digests' facts, and the URL encoder their links use. */
export const DIGEST_FIELDS = {
  ...BASE_FIELDS,
  organizationName: { about: 'The organization, in the title' },
  accountName: { about: 'Account, in the facts' },
  businessUnitName: { about: 'Organization (business unit), in the facts' },
  teams: { about: 'The teams the digest covers, under the tenant’s team label' },
  reportDate: { about: 'The report’s date, in the facts (and, as today, the content’s id)' },
  URLEncoder: { about: 'Java’s URLEncoder, for the filter in each link' },
} as const satisfies Fields;

/** The project and risk register reports' shared fields. */
export const PROJECT_FIELDS = {
  ...BASE_FIELDS,
  footer: { about: 'The footer line on every page (above ArmorCode’s address now)' },
  projectName: { about: 'The project’s name (or the tenant’s label for projects), in headings' },
  projectDescription: { about: 'The project’s details, as HTML' },
  ProjectDetailsH1s: { about: 'The headings in the project’s details, for the contents (each links to #h1<n>)' },
  FINDINGS_LIST: {
    about:
      'data: the findings (dfId, dfTitle, cveBaseScore, armorcodeSeverity, action, armorcodeCategory, armorcodeTicketIds, armorcodeTicketUrls); formattedData[dfId]: vulnerabilityInfo and toolInfo maps, cvssVector, description, stepsToReproduce, mitigation, impact, components; cvssData[dfId]: AV, AC, PR, UI, S, C, I, A',
  },
  NotificationReportUtils: { about: 'The backend helper whose sanitizeHtmlTags() strips tags from titles' },
  tenant: { about: 'Tenant id, in finding links' },
  businessUnit: { about: 'Business unit id, in finding links' },
  additionalDocumentsImages: { about: 'Attached images (url, fileName), shown inline' },
  additionalDocumentsNonImages: { about: 'Other attachments (url, fileName), as links' },
} as const satisfies Fields;

/** Java's URLEncoder.encode, for the preview: spaces as +, and !'()~ encoded too. */
const javaUrlEncode = (s: unknown) =>
  encodeURIComponent(String(s))
    .replace(/%20/g, '+')
    .replace(/[!'()~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export const SAMPLE_LOGO = '/sample-logo.svg';

export const SAMPLE_BASE = {
  armorcodeLogo: SAMPLE_LOGO,
  armorcodeServerUrl: SAMPLE_APP_URL,
};

export const SAMPLE_DIGEST = {
  ...SAMPLE_BASE,
  URLEncoder: { encode: javaUrlEncode },
  organizationName: 'Example Corp',
  accountName: 'Example Corp',
  businessUnitName: 'Payments',
  teams: 'Checkout, Billing, Platform Security',
  reportDate: 'Oct 28, 2026',
  GLOBAL_SETTINGS: new Map([
    ['teamName', 'Squad'],
    ['productName', 'Application'],
    ['subProductName', 'Service'],
  ]),
};

export const SAMPLE_PROJECT_TOOLS = {
  NotificationReportUtils: { sanitizeHtmlTags: (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, '') },
};

/** Today's digests: the tenant's label for teams, or "Team". */
export const TEAM_NAME = `#if($GLOBAL_SETTINGS.containsKey("teamName"))
#set($teamName = $GLOBAL_SETTINGS.get("teamName"))
#else
#set($teamName = "Team")
#end
`;

/** A count, linked to its filtered view when it isn't 0: today's `#if(… == 0)` pattern. */
export const count = (value: string, hrefVar: string, view: 'findings' | 'ticketListing') => `#if(${value} == 0)
0
#else
<a target="_blank" href="$armorcodeServerUrl/#/${view}?filters=$URLEncoder.encode($${hrefVar})">${value}</a>
#end
`;
