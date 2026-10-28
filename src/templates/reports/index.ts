import type { EmailTemplate } from '../../template.ts';
import { dashboardReport, dashboardReportCustom, dashboardShared } from './dashboards.ts';
import { savedSearchShared, savedViewReport, savedViewReportLink, searchResultShared, ticketSearchReport } from './saved-searches.ts';
import { complianceAssessments, runbookReportFallback, scheduledReport } from './scheduled.ts';

export const EMAILS: EmailTemplate[] = [
  dashboardReport,
  dashboardReportCustom,
  dashboardShared,
  complianceAssessments,
  savedViewReport,
  savedViewReportLink,
  savedSearchShared,
  scheduledReport,
  ticketSearchReport,
  searchResultShared,
  runbookReportFallback,
];
