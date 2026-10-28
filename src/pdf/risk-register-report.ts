import type { PdfReport } from './index.ts';
import { additionalDocuments, contents, detailed, execSummary, findingCounts, SECTIONS, summary, type FindingsOptions } from './findings.ts';
import { card, cover, details, page } from './layout.ts';
import { SAMPLE_FINDINGS_LIST, SAMPLE_PROJECT } from './sample-findings.ts';
import { PROJECT_FIELDS, SAMPLE_BASE, SAMPLE_PROJECT_TOOLS } from './shared.ts';

const tocRow = (href: string, text: string) =>
  `<tr><td><a href="${href}">${text}</a></td><td class="page"><div href="${href}" class="page-number"></div></td></tr>`;

const options: FindingsOptions = {
  severityLabels: false,
  noFindings: 'No Data',
  tocExtra: `#if($exceptionType)
${tocRow('#exception-approval-summary', '$projectName Approval Summary')}
#end
#if($isProjectReportEnabled)
${tocRow('#report', '$projectName Report')}
#end
`,
  sections: [SECTIONS.summary, SECTIONS.impact, SECTIONS.components, SECTIONS.description, SECTIONS.stepsToReproduce, SECTIONS.mitigation],
};

/** An exception's request, on the first page (today's header showed it on every page). */
const exception = `#if($exceptionType)
${details([
  ['Submitted By', '$submittedBy'],
  ['Submitted On', '$submittedOn'],
  ['Approved On', '$approvedOn'],
  ['Start Date', '$startDate'],
  ['End Date', '$endDate'],
  ['Status', '$status'],
])}
#end
`;

const approvals = `#if($exceptionHistoryPresent)
${card(
  '$projectName Approval Summary',
  `<table id="exception-summary-table" class="rows">
<thead><tr><th width="150">Approver’s Name</th><th width="90">Status</th><th width="110">Date</th><th class="end">Comments</th></tr></thead>
#foreach ($approval in $approvals)
<tr>
<td>$!approval.approverName</td>
<td>$!approval.status</td>
<td class="nowrap">$!approval.createdAt</td>
<td class="end break-content">$!approval.notes</td>
</tr>
#end
</table>`,
  { id: 'exception-approval-summary', flow: true, breakAfter: true },
)}#end
`;

const report = `#if($isProjectReportEnabled)
${card('$projectName Report', '<div class="prose">\n$projectReport\n</div>', { id: 'report', flow: true, breakAfter: true })}#end
`;

const html = page({
  report: 'Risk Register Report',
  note: '$footer',
  body: `${cover({ eyebrow: 'Risk Register Report', title: '$riskRegisterOrProjectName', facts: `${exception}#if($exceptionType)
<div class="gap"></div>
#end
${findingCounts(options)}` })}${contents(options)}${execSummary}${approvals}${report}${summary(options)}${detailed(options)}${additionalDocuments}`,
});

export const riskRegisterReport: PdfReport = {
  id: 'risk-register-report',
  name: 'Risk Register Report',
  source:
    'java-utils / RiskRegisterReportBuilderImpl; background-jobs / RiskRegisterPdfReportJobProcessorImpl: project-templates/risk-register-report.html',
  when: 'On demand or from a workflow, for a risk register entry (an exception, or a project): emailed as a download link',
  fields: {
    ...PROJECT_FIELDS,
    riskRegisterOrProjectName: { about: 'The risk register entry’s or project’s name, as the title' },
    exceptionType: { about: 'Set for an exception: shows its request facts and the approval summary in the contents', optional: true },
    submittedBy: { about: 'Who requested the exception', optional: true },
    submittedOn: { about: 'When it was requested', optional: true },
    approvedOn: { about: 'When it was approved', optional: true },
    startDate: { about: 'When the exception starts', optional: true },
    endDate: { about: 'When it ends', optional: true },
    status: { about: 'The exception’s status', optional: true },
    exceptionHistoryPresent: { about: 'Shows the approval summary', optional: true },
    approvals: { about: 'The approval history: approverName, status, createdAt, notes', optional: true },
    isProjectReportEnabled: { about: 'Shows the project report section', optional: true },
    projectReport: { about: 'The project report, as HTML', optional: true },
  },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_PROJECT_TOOLS,
    ...SAMPLE_PROJECT,
    fileName: 'Accept log4j risk in billing-service - Risk Register Report',
    riskRegisterOrProjectName: 'Accept log4j risk in billing-service',
    projectName: 'Exception',
    exceptionType: 'RISK_ACCEPTANCE',
    submittedBy: 'John Smith',
    submittedOn: 'Oct 2, 2026',
    approvedOn: 'Oct 6, 2026',
    startDate: 'Oct 6, 2026',
    endDate: 'Jan 6, 2027',
    status: 'Approved',
    exceptionHistoryPresent: true,
    approvals: [
      { approverName: 'Jane Doe', status: 'Approved', createdAt: 'Oct 4, 2026 10:12', notes: 'Compensating control: WAF rule blocks JNDI lookups at the edge.' },
      { approverName: 'John Smith', status: 'Approved', createdAt: 'Oct 6, 2026 16:40', notes: null },
    ],
    isProjectReportEnabled: true,
    projectReport:
      '<p>billing-service can’t take log4j-core 2.17.1 until the Q1 2027 platform upgrade. The JNDI lookup path is blocked at the WAF and the service has no outbound internet access.</p>',
    GLOBAL_SETTINGS: new Map([
      ['acceptRiskName', 'Risk Accepted'],
      ['inProgressStatusName', 'In Progress'],
    ]),
    FINDINGS_LIST: SAMPLE_FINDINGS_LIST,
  },
  html,
};
