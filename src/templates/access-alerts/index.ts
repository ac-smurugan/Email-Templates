import type { EmailTemplate } from '../../template.ts';
import { alertProposeAction, alertTriggered, notification } from './alerts.ts';
import { cisaKevFound, cisaKevNone } from './cisa-kev.ts';
import { findingAssigned, findingAssignedBulk, findingAssignedMany } from './finding-assigned.ts';
import { loginRequest } from './login-request.ts';
import { proposalDecided, proposalNeedsApproval } from './proposals.ts';

export const EMAILS: EmailTemplate[] = [
  loginRequest,
  findingAssigned,
  findingAssignedMany,
  findingAssignedBulk,
  proposalNeedsApproval,
  proposalDecided,
  alertTriggered,
  alertProposeAction,
  cisaKevFound,
  cisaKevNone,
  notification,
];
