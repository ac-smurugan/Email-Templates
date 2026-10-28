import type { PdfReport } from './index.ts';
import { card, cover, details, dot, page, setRatingColor, stats } from './layout.ts';
import { DIGEST_FIELDS, SAMPLE_DIGEST, TEAM_NAME, count } from './shared.ts';
import { RATING_COLORS } from '../tokens.ts';

const summary = card(
  'Summary',
  `#set($findingsOverdueHref = "{$DAILY_DIGEST.findingsOverdueHref}")
#set($findingsNext7DaysHref = "{$DAILY_DIGEST.findingsNext7DaysHref}")
#set($ticketsOverdueHref = "{$DAILY_DIGEST.ticketsOverdueHref}")
#set($ticketsNext7DaysHref = "{$DAILY_DIGEST.ticketsNext7DaysHref}")
${stats([
  ['Findings overdue', count('$DAILY_DIGEST.findingsOverdue', 'findingsOverdueHref', 'findings')],
  ['Findings due in next 7 days', count('$DAILY_DIGEST.findingsNext7Days', 'findingsNext7DaysHref', 'findings')],
  ['Tickets overdue', count('$DAILY_DIGEST.ticketsOverdue', 'ticketsOverdueHref', 'ticketListing')],
  ['Tickets due in next 7 days', count('$DAILY_DIGEST.ticketsNext7Days', 'ticketsNext7DaysHref', 'ticketListing')],
], true)}`,
);

/**
 * Sets `$color` as today does, from SEVERITY_COLORS, but the design system's color comes first for
 * the severities it knows; SEVERITY_COLORS is the fallback for any other, then Unrated's gray.
 */
const severityColor = (path: string, key: string) => `${setRatingColor('color', path)}#if($color == '')
#set($color = $SEVERITY_COLORS.get(${key}))
#end
#if(!$color)
#set($color = '${RATING_COLORS.unrated}')
#end
`;

const findings = card(
  `Top 5 findings#if($DAILY_DIGEST.top5FindingsList.size() == 0) <span class="muted">&nbsp;(No Data)</span>#end`,
  `#if($DAILY_DIGEST.top5FindingsList.size() != 0)
<table class="rows">
<thead><tr><th width="92">Severity</th><th>Finding</th><th width="110">Source</th><th width="80" class="end">Due date</th></tr></thead>
#foreach ($finding in $DAILY_DIGEST.top5FindingsList)
#set($titleFinding = $finding.title)
#if($titleFinding.length() > 60)
#set($titleFinding = $titleFinding.substring(0, 60) + "...")
#end
${severityColor('finding.severity.value', '$finding.severity.value.toUpperCase()')}<tr>
<td class="nowrap">${dot('$color')}$!finding.severity.value</td>
<td><a target="_blank" href="$armorcodeServerUrl/#/findings/$tenant/$businessUnit/$finding.id">$titleFinding</a></td>
<td>$finding.source</td>
<td class="end nowrap">$DAILY_DIGEST.formattedData.get($finding.id).get("slaDueDate")</td>
</tr>
#end
</table>
<p class="more"><a target="_blank" href="$armorcodeServerUrl/#/findings?filters=$URLEncoder.encode($DAILY_DIGEST.topFindingsViewMoreLink)">Show more</a></p>
#end`,
  { flow: true },
);

const tickets = card(
  `Top 5 tickets#if($DAILY_DIGEST.top5tickets.size() == 0) <span class="muted">&nbsp;(No Data)</span>#end`,
  `#if($DAILY_DIGEST.top5tickets.size() != 0)
<table class="rows">
<thead><tr><th width="92">Severity</th><th width="110">Ticket</th><th>Title</th><th width="80" class="end">Due date</th></tr></thead>
#foreach ($ticket in $DAILY_DIGEST.top5tickets)
${severityColor('ticket.severity', '$ticket.severity')}#set($title = $ticket.title)
#if($title.length() > 50)
#set($title = $title.substring(0, 50) + "...")
#end
<tr>
<td class="nowrap">${dot('$color')}$!ticket.severity</td>
<td class="nowrap"><a href="$ticket.url" target="_blank">$ticket.ticketId</a></td>
<td style="$ELLIPSIS_STYLE">$title</td>
<td class="end nowrap">$ticket.date</td>
</tr>
#end
</table>
#set($filterStringAssignee = "{""assignee"":[""$userEmail""]}")
<p class="more"><a target="_blank" href="$armorcodeServerUrl/#/ticketListing?filters=$URLEncoder.encode($filterStringAssignee)">Show more</a></p>
#end`,
  { flow: true },
);

const html = page({
  report: 'Daily Digest',
  prelude: TEAM_NAME,
  body: `<div id="$reportDate">
${cover({
  eyebrow: 'Daily Digest',
  title: '$organizationName Daily Digest',
  facts: details([
    ['Account', '$accountName'],
    ['Organization', '$businessUnitName'],
    ['$teamName', '$teams'],
    ['Report Date', '$reportDate'],
  ]),
})}${summary}${findings}${tickets}</div>`,
});

// Ids as strings: the preview groups numbers' digits (1,234), which Velocity doesn't.
const finding = (id: string, title: string, severity: string, source: string) => ({ id, title, severity: { value: severity }, source });
const ticket = (n: number, title: string, severity: string, date: string) => ({
  ticketId: `SEC-${n}`,
  title,
  severity,
  date,
  url: `https://example-corp.atlassian.example.com/browse/SEC-${n}`,
});

export const dailyDigest: PdfReport = {
  id: 'daily-digest',
  name: 'Daily Digest',
  source: 'java-utils / NotificationReportServiceImpl: digest-templates/daily-digest.html',
  when: 'Every day, attached to the scheduled daily digest email',
  fields: {
    ...DIGEST_FIELDS,
    DAILY_DIGEST: {
      about:
        'The digest: findingsOverdue, findingsNext7Days, ticketsOverdue, ticketsNext7Days and their …Href filters; top5FindingsList (id, title, severity.value, source) with formattedData[id].slaDueDate and topFindingsViewMoreLink; top5tickets (ticketId, title, severity, date, url)',
    },
    SEVERITY_COLORS: { about: 'Severity (upper case) → color. Now the fallback for severities the design system has no color for' },
    tenant: { about: 'Tenant id, in finding links' },
    businessUnit: { about: 'Business unit id, in finding links' },
    ELLIPSIS_STYLE: { about: 'Inline CSS for a ticket title cell, as today' },
    userEmail: { about: 'The recipient’s email, for the “Show more” tickets filter (assignee)' },
  },
  sample: {
    ...SAMPLE_DIGEST,
    fileName: 'Example Corp Daily Digest 2026-10-28',
    tenant: 'example-corp',
    businessUnit: '1042',
    userEmail: 'john.smith@example.com',
    ELLIPSIS_STYLE: 'overflow:hidden;text-overflow:ellipsis;',
    // The backend's own map; only a severity the design system doesn't know (here a ticket's Blocker, looked up as given) uses it.
    SEVERITY_COLORS: new Map([
      ['CRITICAL', RATING_COLORS.critical],
      ['HIGH', RATING_COLORS.high],
      ['MEDIUM', RATING_COLORS.moderate],
      ['LOW', RATING_COLORS.minimal],
      ['Blocker', RATING_COLORS.critical],
    ]),
    DAILY_DIGEST: {
      findingsOverdue: 37,
      findingsOverdueHref: '"slaStatus":["BREACHED"]',
      findingsNext7Days: 12,
      findingsNext7DaysHref: '"slaStatus":["DUE_IN_7_DAYS"]',
      ticketsOverdue: 0,
      ticketsOverdueHref: '"ticketSla":["BREACHED"]',
      ticketsNext7Days: 4,
      ticketsNext7DaysHref: '"ticketSla":["DUE_IN_7_DAYS"]',
      top5FindingsList: [
        finding('2384715', 'Remote code execution in log4j-core JNDI lookup (EXM-2026-4410)', 'Critical', 'Snyk'),
        finding('2384722', 'SQL injection in /api/v2/orders search parameter allows reading arbitrary customer records', 'High', 'Burp Suite'),
        finding('2384730', 'Outdated OpenSSL 3.0.7 in payments-api base image (EXM-2026-1187)', 'Medium', 'Wiz'),
        finding('2384741', 'Missing Content-Security-Policy header on checkout.example.com', 'Low', 'ZAP'),
        finding('2384756', 'Server banner discloses nginx version', 'Info', 'Tenable'),
      ],
      formattedData: {
        '2384715': { slaDueDate: 'Oct 21, 2026' },
        '2384722': { slaDueDate: 'Oct 25, 2026' },
        '2384730': { slaDueDate: 'Nov 2, 2026' },
        '2384741': { slaDueDate: 'Nov 30, 2026' },
        '2384756': { slaDueDate: 'Dec 28, 2026' },
      },
      topFindingsViewMoreLink: '{"slaStatus":["BREACHED","DUE_IN_7_DAYS"]}',
      top5tickets: [
        ticket(4821, 'Upgrade log4j-core to 2.17.1 in billing-service and invoice-worker', 'Critical', 'Oct 24, 2026'),
        ticket(4830, 'Parameterize order search query', 'High', 'Oct 29, 2026'),
        ticket(4833, 'Rebuild payments-api on patched base image', 'Blocker', 'Nov 3, 2026'),
        ticket(4840, 'Add CSP header to checkout', 'Low', 'Nov 30, 2026'),
      ],
    },
  },
  html,
};
