import type { EmailTemplate } from '../../template.ts';
import { PLATFORM_NOTICE_EMAILS } from './platform-notices.ts';
import { RISK_REGISTER_EMAILS } from './risk-register.ts';

export const EMAILS: EmailTemplate[] = [...RISK_REGISTER_EMAILS, ...PLATFORM_NOTICE_EMAILS];
