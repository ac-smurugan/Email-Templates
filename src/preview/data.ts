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
import { stripTypeScriptTypes } from 'node:module';
import { Cond, Vtl } from '../placeholders.ts';
import { fill } from './fill.ts';

/** What `${amcLogoUrl}` should show: ArmorCode's mark, without the white wordmark (the emails set the name as text). */
export const LOGO = readFileSync(fileURLToPath(new URL('../../assets/armorcode-mark.svg', import.meta.url)), 'utf8');

/** A PNG from `assets/icons/` (badges) or `assets/samples/` (sample images), or nothing. */
export function asset(folder: 'icons' | 'samples', file: string): Buffer | undefined {
  if (!/^[\w-]+\.png$/.test(file)) return undefined;
  try {
    return readFileSync(fileURLToPath(new URL(`../../assets/${folder}/${file}`, import.meta.url)));
  } catch {
    return undefined;
  }
}

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
    // Other layouts, to compare: their ids, labels and plain text.
    variants: t.variants.map((v) => ({ id: v.id, label: v.label, text: fill(v.text, t.sample).output })),
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

export function emailHtml(t: EmailTemplate, scheme: 'light' | 'dark', variant = 'default'): string {
  const html = t.variants.find((v) => v.id === variant)?.html ?? t.html;
  return outside(pinScheme(fill(html, t.sample).output, scheme));
}

export function pdfHtml(p: NonNullable<ReturnType<typeof findPdf>>): string {
  return outside(fill(p.html, p.sample).output);
}

// ——— The editor ———
// The preview's Edit tab renders in the browser, so it works on the static site too: it gets each
// email's content model as JSON, and the modules that render it, with their types stripped.

/** The modules the editor runs, by the name it imports them as. */
const BROWSER_MODULES: Record<string, string> = {
  layout: '../layout.ts',
  escape: '../escape.ts',
  placeholders: '../placeholders.ts',
  tokens: '../tokens.ts',
  icons: '../icons.ts',
  fill: './fill.ts',
  editor: './editor.ts',
};
export const BROWSER_MODULE_NAMES = Object.keys(BROWSER_MODULES);

/** A module as the browser loads it: types stripped, and every `.ts` import pointing at `./name.js`. */
export function browserModule(name: string): string | undefined {
  const source = BROWSER_MODULES[name];
  if (!source) return undefined;
  const ts = readFileSync(fileURLToPath(new URL(source, import.meta.url)), 'utf8');
  // Node calls type stripping experimental and warns every time; it's what runs these files anyway.
  const emit = process.emitWarning;
  process.emitWarning = () => {};
  let js: string;
  try {
    js = stripTypeScriptTypes(ts);
  } finally {
    process.emitWarning = emit;
  }
  return js.replace(/from '(?:\.\.?\/)+(?:[\w-]+\/)*([\w-]+)\.ts'/g, "from './$1.js'");
}

/**
 * An email's model for the editor: its placeholders, sample values, and each layout's content.
 * Velocity code and conditions are marked so the browser can turn them back into `Vtl` and `Cond`.
 */
export function model(t: EmailTemplate): string {
  const layouts = t.variants.length
    ? t.variants.map((v) => ({ id: v.id, label: v.label, email: v.email }))
    : [{ id: 'default', label: '', email: t.email }];
  return JSON.stringify({ id: t.id, fields: t.fields, sample: t.sample, layouts }, (_key, value) =>
    value instanceof Vtl ? { $vtl: [value.html, value.text] } : value instanceof Cond ? { $cond: value.expr } : value,
  );
}
