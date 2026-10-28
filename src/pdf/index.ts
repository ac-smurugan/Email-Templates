import type { Fields, Sample } from '../template.ts';
import { dailyDigest } from './daily-digest.ts';
import { weeklyDigest } from './weekly-digest.ts';
import { projectReport } from './project-report.ts';
import { riskRegisterReport } from './risk-register-report.ts';

/** A PDF report: a print page the backend renders to PDF (openhtmltopdf). */
export interface PdfReport {
  id: string;
  name: string;
  /** Where it's made today: repo, and the class or template file. */
  source: string;
  when: string;
  fields: Fields;
  sample: Sample;
  html: string;
}

/** Every PDF report, in the order the preview and the README list them. */
export const PDFS: readonly PdfReport[] = [dailyDigest, weeklyDigest, projectReport, riskRegisterReport];
