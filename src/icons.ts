/**
 * The icon in each email's eyebrow badge. The glyphs are from ArmorCode Zero's icon set (the
 * Central Icon System), copied into `assets/icons/glyphs/`; `src/make-icons.ts` turns each one into
 * the PNG a mail client can show. The badge is the email's tone (a tinted circle, the glyph in the full color), so the icon says what the
 * email is about and the color says how it went. Failures all use one icon, `exclamation`,
 * so that "something went wrong" doesn't rest on color alone. (`exclamation` is Zero's
 * `exclamation-circle` without the circle: icons that are circles look like a ring inside the round
 * badge. Zero's `warning-sign` is a road-works barrier, not a hazard triangle, so it isn't used.)
 */
import type { Tone } from './tokens.ts';

export const ICON_BY_ID: Record<string, string> = {
  // Account & access
  'password-reset': 'key-1',
  invite: 'user-add',
  'login-request': 'lock',
  // Findings & alerts
  'asset-mention': 'at',
  'finding-assigned': 'user',
  'finding-assigned-many': 'user-group',
  'finding-assigned-bulk': 'user-group',
  'proposal-needs-approval': 'square-checklist',
  'proposal-decided': 'square-check',
  'alert-triggered': 'bell-active',
  'alert-propose-action': 'bell-active',
  'cisa-kev-found': 'shield-break',
  'cisa-kev-none': 'checkmark-1',
  notification: 'bell',
  // Reports & sharing
  'dashboard-report': 'layout-dashboard',
  'dashboard-report-custom': 'layout-dashboard',
  'dashboard-shared': 'share-arrow-down',
  'compliance-assessments': 'shield-check',
  'saved-view-report': 'filter-1',
  'saved-view-report-link': 'filter-1',
  'saved-search-shared': 'share-arrow-down',
  'scheduled-report': 'calendar-clock',
  'ticket-search-report': 'ticket',
  'search-result-shared': 'share-arrow-down',
  // Exports: ready
  'findings-csv-ready': 'file-download',
  'advanced-search-export-ready': 'magnifying-glass',
  'asset-csv-ready': 'server',
  'tickets-csv-ready': 'ticket',
  'sbom-ready': 'package',
  'composite-sbom-ready': '3-d-package',
  'discovered-tools-csv-ready': 'toolbox',
  'engagement-report-ready': 'file-chart',
  'products-csv-ready': 'box',
  'sub-products-csv-ready': 'layers-two',
  'audit-log-export-ready': 'file-text',
  'ai-inventory-export-ready': 'robot',
  'component-export-ready': 'components',
  'findings-under-review-export-ready': 'eye-open',
  // Uploads: complete
  'product-upload-created': 'cloud-upload',
  'product-upload-updated': 'cloud-upload',
  'sub-product-upload-created': 'cloud-upload',
  'sub-product-upload-updated': 'cloud-upload',
  'draft-findings-upload-created': 'cloud-upload',
  // Risk register
  'risk-register-submitted': 'checklist',
  'risk-register-approved': 'checkmark-1',
  'risk-register-rejected': 'cross-medium',
  'risk-register-completed': 'shield-check',
  'risk-register-expiring': 'hourglass',
  'risk-register-comment': 'bubble-2',
  'risk-register-report-ready': 'file-chart',
  // Tools & runbooks
  'tool-mapping-note': 'at',
  'project-mapping': 'connectors-1',
  'runbook-findings': 'play',
  'runbook-findings-report': 'play',
  'runbook-tickets': 'ticket',
  // Platform notices
  'project-cloned': 'square-behind-square-1',
  'aql-migration': 'code-brackets',
  'anya-usage-alert': 'gauge',
};

/** Every failure, whatever it was doing. */
export const FAILED_ICON = 'exclamation';

const FAILED_IDS = [
  'advanced-search-export-failed',
  'audit-log-export-too-large',
  'audit-log-export-failed',
  'audit-log-csv-export-failed',
  'ai-inventory-export-failed',
  'component-export-failed',
  'findings-under-review-export-failed',
  'draft-findings-upload-wrong-columns',
  'draft-findings-upload-too-many-rows',
  'runbook-report-fallback',
];
for (const id of FAILED_IDS) ICON_BY_ID[id] = FAILED_ICON;

/** The badge image for an icon in a tone, as `make-icons.ts` names it. */
export const badgeFile = (icon: string, tone: Tone) => `${icon}-${tone}.png`;
