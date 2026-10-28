/**
 * What the project report and the risk register report share: the contents, the summary of
 * findings, each finding in detail and the additional documents. Their Velocity is today's, ported
 * as written; where the two reports differ today, an option says how.
 */
import { card, dot, setRatingColor, statRow } from './layout.ts';
import { RATING_COLORS } from '../tokens.ts';

export interface FindingsOptions {
  /** The project report names severities with the tenant's labels (GLOBAL_SETTINGS `<severity>Name`); the risk register as they are. */
  severityLabels: boolean;
  /** The summary's text when there are no findings. */
  noFindings: string;
  /** More contents rows, after the project details' headings. */
  tocExtra?: string;
  /** The text sections of each finding, in order: [label, Velocity for the content]. */
  sections: readonly (readonly [string, string])[];
}

const DATA = '$FINDINGS_LIST.formattedData.get($finding.dfId)';

/** The text sections, by name, as today's templates fill them. */
export const SECTIONS = {
  summary: ['Summary', `#if ($finding.dfTitle)\n$NotificationReportUtils.sanitizeHtmlTags($finding.dfTitle)\n#else\nN/A\n#end`],
  description: ['Description', `${DATA}.get("description")`],
  stepsToReproduce: ['Steps To Reproduce', `${DATA}.get("stepsToReproduce")`],
  mitigation: ['Mitigation', `${DATA}.get("mitigation")`],
  impact: ['Impact', `${DATA}.get("impact")`],
  components: ['Affected Components', `${DATA}.get("components")`],
} as const;

/** A finding's status, under the tenant's label for it when there is one: today's mapping. */
const STATUS = `#set($status = $finding.action.toString().toLowerCase())
#set($keyName = $status + "Name")
#if($status == "falsepositive")
#set($keyName = "falsePositiveName")
#elseif($status == "acceptrisk")
#set($keyName = "acceptRiskName")
#elseif($status == "triage")
#set($keyName = "triageStatusName")
#elseif($status == "in_progress")
#set($keyName = "inProgressStatusName")
#elseif($status == "controlled")
#set($keyName = "controlledStatusName")
#end
#if($GLOBAL_SETTINGS.containsKey($keyName))
$GLOBAL_SETTINGS.get($keyName)
#else
$status
#end
`;

/** `$acDot`: the severity's color, Unrated's gray for one the design system doesn't know. */
const severityDot = (path: string) => `${setRatingColor('acDot', path)}#if($acDot == '')
#set($acDot = '${RATING_COLORS.unrated}')
#end
${dot('$acDot')}`;

/** A label from GLOBAL_SETTINGS, or `fallback`. */
const label = (key: string, fallback: string) =>
  `#if($GLOBAL_SETTINGS.containsKey("${key}"))$GLOBAL_SETTINGS.get("${key}")#{else}${fallback}#end`;

/** A contents row: a link to `#id` and, in the PDF, the page it's on. */
const tocRow = (href: string, text: string, sub = false) =>
  `<tr><td${sub ? ' class="sub break-content"' : ''}><a href="${href}">${text}</a></td><td class="page"><div href="${href}" class="page-number"></div></td></tr>`;

/** Findings by severity, for the first page. */
export function findingCounts(o: FindingsOptions): string {
  const name = (key: string, fallback: string) => (o.severityLabels ? label(key, fallback) : fallback);
  const counted = (rating: keyof typeof RATING_COLORS, key: string, fallback: string) =>
    [`${dot(RATING_COLORS[rating])}${name(key, fallback)}`, `$acCount${fallback}`] as const;
  return `#set($acCountCritical = 0)
#set($acCountHigh = 0)
#set($acCountMedium = 0)
#set($acCountLow = 0)
#foreach ($finding in $FINDINGS_LIST.data)
#if($finding.armorcodeSeverity == "Critical")
#set($acCountCritical = $acCountCritical + 1)
#elseif($finding.armorcodeSeverity == "High")
#set($acCountHigh = $acCountHigh + 1)
#elseif($finding.armorcodeSeverity == "Medium")
#set($acCountMedium = $acCountMedium + 1)
#elseif($finding.armorcodeSeverity == "Low")
#set($acCountLow = $acCountLow + 1)
#end
#end
<div class="well">${statRow([
    ['Findings', '$FINDINGS_LIST.data.size()'],
    counted('critical', 'criticalName', 'Critical'),
    counted('high', 'highName', 'High'),
    counted('moderate', 'mediumName', 'Medium'),
    counted('minimal', 'lowName', 'Low'),
  ])}</div>`;
}

export function contents(o: FindingsOptions): string {
  return card(
    'Contents',
    `<table id="toc" class="toc">
${tocRow('#exec-summary', '$projectName Details')}
#set($h1count = 0)
#foreach ($h1 in $ProjectDetailsH1s)
${tocRow('#h1$h1count', '$h1', true)}
#set($h1count = $h1count + 1)
#end
${o.tocExtra ?? ''}${tocRow('#summary-findings', 'Summary of Findings')}
${tocRow('#detailed-findings', 'Detailed Findings')}
#foreach ($finding in $FINDINGS_LIST.data)
${tocRow(
  '#$finding.dfId',
  `[$finding.dfId]
#if ($finding.dfTitle.length() > 45)
$NotificationReportUtils.sanitizeHtmlTags($finding.dfTitle.substring(0, 45))...
#else
$NotificationReportUtils.sanitizeHtmlTags($finding.dfTitle)
#end
`,
  true,
)}
#end
${tocRow('#additional-document', 'Additional Documents')}
</table>`,
    { flow: true, breakAfter: true },
  );
}

export const execSummary = card('$projectName Details', '<div class="prose">\n$projectDescription\n</div>', {
  id: 'exec-summary',
  flow: true,
  breakAfter: true,
});

export function summary(o: FindingsOptions): string {
  const severity = o.severityLabels
    ? `#set($severity = $finding.armorcodeSeverity.toLowerCase())
#set($keyName = $severity + "Name")
#if($GLOBAL_SETTINGS.containsKey($keyName))
$GLOBAL_SETTINGS.get($keyName)
#else
$finding.armorcodeSeverity
#end
`
    : '$finding.armorcodeSeverity\n';
  return card(
    'Summary of Findings',
    `#if ($FINDINGS_LIST.data.size() == 0)
<div class="well empty">${o.noFindings}</div>
#else
<table id="summary-table" class="rows">
<thead><tr><th>Summary</th><th width="64" class="right">CVSS Score</th><th width="110">Severity</th><th width="110" class="end">Status</th></tr></thead>
#foreach ($finding in $FINDINGS_LIST.data)
<tr>
<td class="break-content">$NotificationReportUtils.sanitizeHtmlTags($finding.dfTitle)</td>
<td class="right">#if($finding.cveBaseScore) $finding.cveBaseScore #else N/A #end</td>
<td>${severityDot('finding.armorcodeSeverity')}
${severity}</td>
<td class="end">
${STATUS}</td>
</tr>
#end
</table>
#end`,
    { id: 'summary-findings', flow: true, breakAfter: true },
  );
}

/** A map's entries two to a row, as today: `$evenCount` opens and closes the rows. */
const pairs = (map: string, cell: string) => `<div class="well"><table class="pairs">
#set($counter = 0)
#foreach ($entry in ${map}.keySet())
#set($evenCount = $counter%2 == 0)
#if($evenCount)
<tr>
#end
${cell}
#if(!$evenCount)
</tr>
#end
#set($counter = $counter + 1)
#end
#if($evenCount)
</tr>
#end
</table></div>`;

const CVSS = [
  ['AV', 'Attack Vector'],
  ['AC', 'Attack Complexity'],
  ['PR', 'Privileges Required'],
  ['UI', 'User Interaction'],
  ['S', 'Scope'],
  ['C', 'Confidentiality'],
  ['I', 'Integrity'],
  ['A', 'Availability'],
] as const;

function finding(o: FindingsOptions): string {
  const severityName = o.severityLabels
    ? `#set($keyName = $severity.toLowerCase() + "Name")
#if($GLOBAL_SETTINGS.containsKey($keyName))
$GLOBAL_SETTINGS.get($keyName)
#else
$severity
#end
`
    : '$severity\n';
  const general = `<div class="well"><table class="pairs">
#set($severity = $finding.armorcodeSeverity)
<tr>
<td class="k">${label('severityName', 'Severity')}</td>
<td class="v">${severityDot('severity')}
${severityName}</td>
<td class="k">${label('categoryName', 'Category')}</td>
<td class="v">$finding.armorcodeCategory</td>
</tr>
<tr>
<td class="k">Status</td>
<td class="v">
${STATUS}</td>
<td class="k"></td><td class="v"></td>
</tr>
</table></div>`;

  const toolCell = `#set($value = ${DATA}.get("toolInfo").get($entry))
#set($acDot = "")
#if($value == "Critical")
#set($acDot = '${RATING_COLORS.critical}')
#elseif($value == "High")
#set($acDot = '${RATING_COLORS.high}')
#elseif($value == "Medium")
#set($acDot = '${RATING_COLORS.moderate}')
#elseif($value == "Low")
#set($acDot = '${RATING_COLORS.minimal}')
#elseif($value == "Info")
#set($acDot = '${RATING_COLORS.unrated}')
#end
<td class="k">$entry</td>
#if($acDot != "")
<td class="v">${dot('$acDot')}$value</td>
#else
<td class="v break-content">$value</td>
#end`;

  const cvss = `#if (${DATA}.get("cvssVector") != "N/A")
<table id="cvss-table" class="rows cvss">
<thead><tr>${CVSS.map(([, name]) => `<th>${name}</th>`).join('')}</tr></thead>
<tr>
${CVSS.map(
  ([key]) => `<td>
#if($FINDINGS_LIST.cvssData.get($finding.dfId).get("${key}"))
$FINDINGS_LIST.cvssData.get($finding.dfId).get("${key}")
#else
N/A
#end
</td>`,
).join('\n')}
</tr>
</table>
#else
<p>N/A</p>
#end`;

  const section = (title: string, inner: string, flow = false) =>
    `<div class="section${flow ? ' flow' : ''}">\n<p class="label">${title}</p>\n${inner}\n</div>`;

  return `#set($currentNumber = $currentNumber + 1)
#if($currentNumber == $totalFindings)
#set($pageBreak = "")
#else
#set($pageBreak = "page-break-after: always;")
#end
<div id="$finding.dfId" class="card flow" style="$!pageBreak">
<p class="finding-title break-content"><a target="_blank" href="$armorcodeServerUrl/#/findings/$tenant/$businessUnit/$finding.dfId">[$finding.dfId] $NotificationReportUtils.sanitizeHtmlTags($finding.dfTitle)</a></p>
${section(
  'Ticket',
  `<p>
#if ($finding.armorcodeTicketIds && $finding.armorcodeTicketUrls && $finding.armorcodeTicketIds.size() > 0 && $finding.armorcodeTicketUrls.size() > 0)
#set($start = 0)
#set($end = $finding.armorcodeTicketIds.size() - 1)
#if ($finding.armorcodeTicketUrls.size() - 1 < $end)
#set($end = $finding.armorcodeTicketUrls.size() - 1)
#end
#set($range = [$start..$end])
#foreach($i in $range)
<a target="_blank" href="$finding.armorcodeTicketUrls[$i]">$finding.armorcodeTicketIds[$i]</a>&nbsp;&nbsp;
#end
#else
N/A
#end
</p>`,
)}
${section('General Information', general)}
${section('Vulnerability Information', pairs(`${DATA}.get("vulnerabilityInfo")`, `<td class="k">$entry</td>\n<td class="v">${DATA}.get("vulnerabilityInfo").get($entry)</td>`))}
${section('Tool Information', pairs(`${DATA}.get("toolInfo")`, toolCell))}
${section('CVSSv3 Vector', cvss)}
${o.sections.map(([title, content]) => section(title, `<div class="prose break-content">\n${content}\n</div>`, true)).join('\n')}
</div>
`;
}

export function detailed(o: FindingsOptions): string {
  return `#set($totalFindings = $FINDINGS_LIST.data.size())
#set($currentNumber = 0)
<p id="detailed-findings" class="part">Detailed Findings</p>
#foreach ($finding in $FINDINGS_LIST.data)
${finding(o)}#end
`;
}

export const additionalDocuments = card(
  'Additional Documents',
  `<ul class="docs">
#foreach ($imageDocument in $additionalDocumentsImages)
<li><img src="$imageDocument.url" alt="$imageDocument.fileName"></li>
#end
</ul>
<ul class="docs">
#foreach ($nonImageDocument in $additionalDocumentsNonImages)
<li><a href="$nonImageDocument.url" target="_blank">$nonImageDocument.fileName</a></li>
#end
</ul>`,
  { id: 'additional-document', flow: true },
);
