/**
 * What the preview shows, shared by the local server (`pnpm preview`) and the static export
 * (`src/static.ts`, for Cloudflare): the list of emails, each email and PDF filled with its sample
 * values, and the logo.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pinScheme } from '../layout.ts';
import { problems } from '../build.ts';
import { PDFS } from '../pdf/index.ts';
import { GROUPS, type EmailTemplate } from '../template.ts';
import { TEMPLATES } from '../templates/index.ts';
import { fill } from './fill.ts';

/** What `${amcLogoUrl}` should show: ArmorCode's mark, without the white wordmark (the emails set the name as text). */
export const LOGO = readFileSync(fileURLToPath(new URL('../../assets/armorcode-mark.svg', import.meta.url)), 'utf8');

export function list() {
  const emails = TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    group: t.group,
    kind: t.kind,
    engine: t.engine,
    source: t.source,
    who: t.who,
    when: t.when,
    subject: fill(t.subject, t.sample).output,
    text: fill(t.text, t.sample).output,
    problems: problems(t),
    newFields: Object.entries(t.fields)
      .filter(([, f]) => f.isNew)
      .map(([name]) => name),
  }));
  const pdfs = PDFS.map((p) => ({ id: p.id, name: p.name, source: p.source, when: p.when }));
  return { groups: GROUPS, emails, pdfs };
}

export const findEmail = (id: string): EmailTemplate | undefined => TEMPLATES.find((t) => t.id === id);
export const findPdf = (id: string) => PDFS.find((p) => p.id === id);

/** Links open outside the frame. */
const outside = (html: string) => html.replace('<head>', '<head><base target="_blank">');

export function emailHtml(t: EmailTemplate, scheme: 'light' | 'dark'): string {
  return outside(pinScheme(fill(t.html, t.sample).output, scheme));
}

export function pdfHtml(p: NonNullable<ReturnType<typeof findPdf>>): string {
  return outside(fill(p.html, p.sample).output);
}
