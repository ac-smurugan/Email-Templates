import { GROUPS, type EmailTemplate } from '../template.ts';
import { assetMention } from './asset-mention.ts';
import { invite } from './invite.ts';
import { passwordReset } from './password-reset.ts';
import { projectMapping } from './project-mapping.ts';
import { runbookFindings, runbookFindingsReport, runbookTickets } from './runbook-defaults.ts';
import { toolMappingNote } from './tool-mapping-note.ts';
import { EMAILS as accessAlerts } from './access-alerts/index.ts';
import { EMAILS as exports } from './exports/index.ts';
import { EMAILS as reports } from './reports/index.ts';
import { EMAILS as riskNotices } from './risk-notices/index.ts';

const ALL: EmailTemplate[] = [
  passwordReset,
  invite,
  assetMention,
  toolMappingNote,
  projectMapping,
  runbookFindings,
  runbookFindingsReport,
  runbookTickets,
  ...accessAlerts,
  ...reports,
  ...exports,
  ...riskNotices,
];

/** Every email, by group, in the order the preview and the README list them. */
export const TEMPLATES: readonly EmailTemplate[] = GROUPS.flatMap((group) => ALL.filter((t) => t.group === group));
