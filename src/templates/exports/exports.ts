import { v } from '../../placeholders.ts';
import { exportFailed, exportReady, TRY_AGAIN } from './factories.ts';

// 29–40 in in-code-email-templates.html: an export finished, or didn't.

const SUPPORT = 'If it keeps failing, contact ArmorCode support.';

/** 29. */
export const findingsCsvReady = exportReady({
  id: 'findings-csv-ready',
  name: 'Findings CSV ready',
  source: 'java-utils / FindingDownloadServiceImpl (in code)',
  when: 'A findings CSV export someone requested has finished',
  subject: 'Your findings CSV is ready to download',
  title: 'Your findings CSV is ready',
  lead: 'The findings you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: 'placeholder',
  reasonWhat: 'exported findings',
  file: 'findings-2026-10-28.csv',
});

/** 30, ready. */
export const advancedSearchExportReady = exportReady({
  id: 'advanced-search-export-ready',
  name: 'Advanced Search export ready',
  source: 'java-utils / AdvancedSearchExportOrchestrationServiceImpl (in code)',
  when: 'A CSV export from the Advanced Search Result widget has finished',
  subject: 'Your Advanced Search CSV export is ready to download',
  title: 'Your Advanced Search export is ready',
  lead: 'The CSV you exported from the Advanced Search Result widget is ready to download.',
  button: 'Download the CSV',
  expiry: { hours: 24 },
  reasonWhat: 'exported Advanced Search results',
  file: 'advanced-search-2026-10-28.csv',
});

/** 30, failed. */
export const advancedSearchExportFailed = exportFailed({
  id: 'advanced-search-export-failed',
  name: 'Advanced Search export failed',
  source: 'java-utils / AdvancedSearchExportOrchestrationServiceImpl (in code)',
  when: 'A CSV export from the Advanced Search Result widget fails',
  subject: 'Your Advanced Search CSV export failed',
  preview: 'ArmorCode couldn’t build the CSV and is looking into it.',
  title: 'Your Advanced Search export failed',
  lead: 'ArmorCode couldn’t build the CSV you exported from the Advanced Search Result widget, and is looking into it.',
  next: 'In the meantime, you can contact ArmorCode support.',
  button: 'Open Advanced Search',
  page: 'the Advanced Search Result widget',
  path: '/advanced-search',
  reasonWhat: 'exported Advanced Search results',
});

/** 31. */
export const assetCsvReady = exportReady({
  id: 'asset-csv-ready',
  name: 'Asset data CSV ready',
  source: 'java-utils / AssetDownloadServiceImpl (in code)',
  when: 'An asset-data CSV export someone requested has finished',
  subject: 'Your asset data CSV is ready to download',
  title: 'Your asset data CSV is ready',
  lead: 'The asset data you exported from ArmorCode is ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: 'placeholder',
  reasonWhat: 'exported asset data',
  file: 'assets-2026-10-28.csv',
});

/** 32. */
export const ticketsCsvReady = exportReady({
  id: 'tickets-csv-ready',
  name: 'Tickets CSV ready',
  source: 'java-utils / TicketServiceImpl (in code)',
  when: 'A tickets CSV export someone requested has finished',
  subject: 'Your tickets CSV is ready to download',
  title: 'Your tickets CSV is ready',
  lead: 'The tickets you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: { hours: 6 },
  reasonWhat: 'exported tickets',
  file: 'tickets-2026-10-28.csv',
});

/** 33, one application. */
export const sbomReady = exportReady({
  id: 'sbom-ready',
  name: 'SBOM ready',
  source: 'java-utils / SBOMExportServiceImpl (in code)',
  when: 'An SBOM export for one application has finished',
  subject: ['The SBOM for ', v('applicationName'), ' is ready to download'],
  title: ['The SBOM for ', v('applicationName'), ' is ready'],
  lead: ['The SBOM (software bill of materials) file you exported for ', { strong: v('applicationName') }, ' is ready to download.'],
  button: 'Download the SBOM',
  expiry: 'placeholder',
  reasonWhat: 'exported an SBOM',
  fields: { applicationName: { about: 'The application the SBOM is for' } },
  sample: { applicationName: 'payments-api' },
  file: 'payments-api-sbom.json',
});

/** 33, composite. */
export const compositeSbomReady = exportReady({
  id: 'composite-sbom-ready',
  name: 'Composite SBOM ready',
  source: 'java-utils / SBOMExportServiceImpl (in code)',
  when: 'A composite SBOM export has finished',
  subject: ['The composite SBOM for ', v('rootName'), ' is ready to download'],
  title: ['The composite SBOM for ', v('rootName'), ' is ready'],
  lead: [
    'The composite SBOM (software bill of materials) file you exported for ',
    { strong: v('rootName') },
    ' is ready to download.',
  ],
  button: 'Download the SBOM',
  expiry: 'placeholder',
  reasonWhat: 'exported a composite SBOM',
  fields: { rootName: { about: 'What the composite SBOM is rooted at (its top-level product or application)' } },
  sample: { rootName: 'Payments platform' },
  file: 'payments-platform-composite-sbom.json',
});

/** 34. */
export const discoveredToolsCsvReady = exportReady({
  id: 'discovered-tools-csv-ready',
  name: 'Discovered security tools CSV ready',
  source: 'java-utils / ToolDiscoveryServiceImpl (in code)',
  when: 'A CSV of discovered security tools someone requested has finished',
  subject: 'Your discovered security tools CSV is ready to download',
  title: 'Your discovered security tools CSV is ready',
  lead: 'The discovered security tools you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: 'placeholder',
  reasonWhat: 'exported discovered security tools',
  file: 'discovered-tools-2026-10-28.csv',
});

/** 35. */
export const engagementReportReady = exportReady({
  id: 'engagement-report-ready',
  name: 'Engagement report ready',
  source: 'java-utils / EngagementReportJob (in code)',
  when: 'An engagement report someone requested has finished generating',
  who: 'The person who requested the report',
  subject: 'Your engagement report is ready to download',
  title: 'Your engagement report is ready',
  lead: 'The engagement report you requested in ArmorCode is ready to download.',
  button: 'Download the report',
  expiry: 'placeholder',
  reasonWhat: 'requested an engagement report',
  file: 'engagement-report-2026-10-28.csv',
});

/** 36, products. */
export const productsCsvReady = exportReady({
  id: 'products-csv-ready',
  name: 'Products CSV ready',
  source: 'java-utils / BulkProductServiceImpl (in code)',
  when: 'A products CSV export someone requested has finished',
  subject: 'Your products CSV is ready to download',
  title: 'Your products CSV is ready',
  lead: 'The products you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: { hours: 24 },
  reasonWhat: 'exported products',
  file: 'products-2026-10-28.csv',
});

/** 36, sub-products. */
export const subProductsCsvReady = exportReady({
  id: 'sub-products-csv-ready',
  name: 'Sub-products CSV ready',
  source: 'java-utils / BulkSubProductServiceImpl (in code)',
  when: 'A sub-products CSV export someone requested has finished',
  subject: 'Your sub-products CSV is ready to download',
  title: 'Your sub-products CSV is ready',
  lead: 'The sub-products you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: { hours: 24 },
  reasonWhat: 'exported sub-products',
  file: 'sub-products-2026-10-28.csv',
});

/** 37, ready. */
export const auditLogExportReady = exportReady({
  id: 'audit-log-export-ready',
  name: 'Audit log export ready',
  source: 'background-jobs / AuditLogExportJobProcessor (in code)',
  when: 'An audit log export someone requested has finished',
  subject: 'Your audit log export is ready to download',
  title: 'Your audit log export is ready',
  lead: 'The audit log you exported from ArmorCode is ready to download as a compressed file.',
  button: 'Download the file',
  expiry: 'placeholder',
  reasonWhat: 'exported the audit log',
  file: 'audit-log-2026-10-28.zip',
});

const auditLog = {
  button: 'Open the audit log',
  page: 'the audit log page',
  path: '/settings/audit-log',
  reasonWhat: 'exported the audit log',
} as const;

/** 37, failed: the download would be too large. */
export const auditLogExportTooLarge = exportFailed({
  ...auditLog,
  id: 'audit-log-export-too-large',
  name: 'Audit log export failed (too large)',
  source: 'background-jobs / AuditLogExportJobProcessor (in code)',
  when: 'An audit log export fails because the download would exceed the size limit',
  subject: 'Your audit log export failed: it’s over the size limit',
  preview: 'The export is larger than ArmorCode can download. Export less and try again.',
  title: 'Your audit log export is too large',
  lead: 'ArmorCode couldn’t finish your audit log export: the file would be larger than the download size limit.',
  blocks: [{ kind: 'quote', label: 'Error', text: v('errorMessage') }],
  next: `Narrow the export so it covers fewer entries, then export again. ${SUPPORT}`,
  fields: { errorMessage: { about: 'The error the export stopped with, as the backend reports it (technical)' } },
  sample: { errorMessage: 'Export size 2.4 GB exceeds the maximum download size of 2 GB' },
});

/** 37, failed: anything else. */
export const auditLogExportFailed = exportFailed({
  ...auditLog,
  id: 'audit-log-export-failed',
  name: 'Audit log export failed',
  source: 'background-jobs / AuditLogExportJobProcessor (in code)',
  when: 'An audit log export fails with an unexpected error',
  subject: 'Your audit log export failed',
  preview: 'Something went wrong while building it. Export again from ArmorCode.',
  title: 'Your audit log export failed',
  lead: 'Something went wrong while ArmorCode was processing your audit log export.',
  next: TRY_AGAIN,
});

/** 37, failed: the CSV export's own failure path. */
export const auditLogCsvExportFailed = exportFailed({
  ...auditLog,
  id: 'audit-log-csv-export-failed',
  name: 'Audit log CSV export failed',
  source: 'java-utils / AuditLogCsvExportServiceImpl (in code)',
  when: 'An audit log CSV export fails to process',
  subject: 'Your audit log CSV export failed',
  preview: 'ArmorCode couldn’t process it. Export again from ArmorCode.',
  title: 'Your audit log CSV export failed',
  lead: 'ArmorCode couldn’t process your audit log CSV export.',
  next: TRY_AGAIN,
});

/** 38, ready. */
export const aiInventoryExportReady = exportReady({
  id: 'ai-inventory-export-ready',
  name: 'AI inventory export ready',
  source: 'background-jobs / AiInventoryExportJFCJob (in code)',
  when: 'An AI inventory CSV export (summary or detailed) someone requested has finished',
  subject: 'Your AI inventory CSV export is ready to download',
  title: 'Your AI inventory export is ready',
  lead: 'The AI inventory you exported from ArmorCode is ready to download as a CSV file.',
  details: [{ label: 'Export', value: [v('exportType'), ' CSV'] }],
  button: 'Download the CSV',
  expiry: 'placeholder',
  reasonWhat: 'exported the AI inventory',
  fields: { exportType: { about: 'Which export: “Summary” or “Detailed”' } },
  sample: { exportType: 'Detailed' },
  file: 'ai-inventory-detailed-2026-10-28.csv',
});

/** 38, failed. */
export const aiInventoryExportFailed = exportFailed({
  id: 'ai-inventory-export-failed',
  name: 'AI inventory export failed',
  source: 'background-jobs / AiInventoryExportJFCJob (in code)',
  when: 'An AI inventory CSV export fails',
  subject: 'Your AI inventory CSV export failed',
  preview: 'ArmorCode couldn’t build the CSV. Export again from ArmorCode.',
  title: 'Your AI inventory export failed',
  lead: 'ArmorCode couldn’t build your AI inventory CSV export.',
  next: TRY_AGAIN,
  button: 'Open the AI inventory',
  page: 'the AI inventory page',
  path: '/ai-inventory',
  reasonWhat: 'exported the AI inventory',
});

/** 39, ready. */
export const componentExportReady = exportReady({
  id: 'component-export-ready',
  name: 'Component export ready',
  source: 'background-jobs / ComponentExportJob (in code)',
  when: 'A component CSV export someone requested has finished',
  subject: 'Your component CSV export is ready to download',
  title: 'Your component export is ready',
  lead: 'The components you exported from ArmorCode are ready to download as a CSV file.',
  button: 'Download the CSV',
  expiry: 'none',
  reasonWhat: 'exported components',
  file: 'components-2026-10-28.csv',
});

/** 39, failed. */
export const componentExportFailed = exportFailed({
  id: 'component-export-failed',
  name: 'Component export failed',
  source: 'background-jobs / ComponentExportJob (in code)',
  when: 'A component CSV export fails',
  subject: 'Your component CSV export failed',
  preview: 'ArmorCode couldn’t build the CSV. Export again from ArmorCode.',
  title: 'Your component export failed',
  lead: 'ArmorCode couldn’t build your component CSV export.',
  next: TRY_AGAIN,
  button: 'Open components',
  page: 'the components page',
  path: '/components',
  reasonWhat: 'exported components',
});

/** 40, ready. */
export const findingsUnderReviewExportReady = exportReady({
  id: 'findings-under-review-export-ready',
  name: 'Findings under review export ready',
  source: 'background-jobs / FindingUnderReviewExportJob (in code)',
  when: 'A Findings Under Review export someone requested has finished',
  subject: 'Your findings under review export is ready to download',
  title: 'Your findings under review export is ready',
  lead: 'The findings under review you exported from ArmorCode are ready to download as a compressed file.',
  button: 'Download the file',
  expiry: 'placeholder',
  reasonWhat: 'exported findings under review',
  file: 'findings-under-review-2026-10-28.zip',
});

/** 40, failed. */
export const findingsUnderReviewExportFailed = exportFailed({
  id: 'findings-under-review-export-failed',
  name: 'Findings under review export failed',
  source: 'background-jobs / FindingUnderReviewExportJob (in code)',
  when: 'A Findings Under Review export fails to process',
  subject: 'Your findings under review export failed',
  preview: 'Something went wrong while building it. Export again from ArmorCode.',
  title: 'Your findings under review export failed',
  lead: 'Something went wrong while ArmorCode was processing your findings under review export.',
  next: TRY_AGAIN,
  button: 'Open findings under review',
  page: 'the Findings Under Review page',
  path: '/findings/under-review',
  reasonWhat: 'exported findings under review',
});
