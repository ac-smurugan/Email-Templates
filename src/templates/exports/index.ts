import type { EmailTemplate } from '../../template.ts';
import * as e from './exports.ts';
import * as u from './uploads.ts';

/** In the source document's order: 29–40, then 42–44. */
export const EMAILS: EmailTemplate[] = [
  e.findingsCsvReady,
  e.advancedSearchExportReady,
  e.advancedSearchExportFailed,
  e.assetCsvReady,
  e.ticketsCsvReady,
  e.sbomReady,
  e.compositeSbomReady,
  e.discoveredToolsCsvReady,
  e.engagementReportReady,
  e.productsCsvReady,
  e.subProductsCsvReady,
  e.auditLogExportReady,
  e.auditLogExportTooLarge,
  e.auditLogExportFailed,
  e.auditLogCsvExportFailed,
  e.aiInventoryExportReady,
  e.aiInventoryExportFailed,
  e.componentExportReady,
  e.componentExportFailed,
  e.findingsUnderReviewExportReady,
  e.findingsUnderReviewExportFailed,
  u.productUploadCreated,
  u.productUploadUpdated,
  u.subProductUploadCreated,
  u.subProductUploadUpdated,
  u.draftFindingsUploadCreated,
  u.draftFindingsUploadWrongColumns,
  u.draftFindingsUploadTooManyRows,
];
