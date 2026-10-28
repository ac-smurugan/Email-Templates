import type { PdfReport } from './index.ts';
import { additionalDocuments, contents, detailed, execSummary, findingCounts, SECTIONS, summary, type FindingsOptions } from './findings.ts';
import { cover, page } from './layout.ts';
import { SAMPLE_FINDINGS_LIST, SAMPLE_PROJECT } from './sample-findings.ts';
import { PROJECT_FIELDS, SAMPLE_BASE, SAMPLE_PROJECT_TOOLS } from './shared.ts';

const options: FindingsOptions = {
  severityLabels: true,
  noFindings: 'No Vulnerabilities found for this $projectName',
  sections: [SECTIONS.summary, SECTIONS.description, SECTIONS.stepsToReproduce, SECTIONS.mitigation, SECTIONS.impact, SECTIONS.components],
};

const html = page({
  report: 'Project Report',
  note: '$footer',
  body: `${cover({ eyebrow: 'Project Report', title: '$projectName', facts: findingCounts(options) })}${contents(options)}${execSummary}${summary(options)}${detailed(options)}${additionalDocuments}`,
});

export const projectReport: PdfReport = {
  id: 'project-report',
  name: 'Project Report',
  source: 'java-utils / ProjectServiceImpl: project-templates/project-report.html',
  when: 'On demand, from a project: downloaded or emailed',
  fields: { ...PROJECT_FIELDS },
  sample: {
    ...SAMPLE_BASE,
    ...SAMPLE_PROJECT_TOOLS,
    ...SAMPLE_PROJECT,
    fileName: 'Payments Platform Pentest 2026 - Project Report',
    projectName: 'Payments Platform Pentest 2026',
    GLOBAL_SETTINGS: new Map([
      ['openName', 'Active'],
      ['falsePositiveName', 'Not an Issue'],
      ['acceptRiskName', 'Risk Accepted'],
      ['categoryName', 'Finding Category'],
    ]),
    FINDINGS_LIST: SAMPLE_FINDINGS_LIST,
  },
  html,
};
