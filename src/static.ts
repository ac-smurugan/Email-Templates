/**
 * `node src/static.ts`: writes the preview as a static site into `site/`, for Cloudflare (see
 * `wrangler.jsonc`). It's the same page as `pnpm preview`, with a file per email and scheme instead
 * of a server. Only the sample values are in it; the templates' placeholders are filled here.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LOGO, emailHtml, list, pdfHtml } from './preview/data.ts';
import { page } from './preview/page.ts';
import { PDFS } from './pdf/index.ts';
import { TEMPLATES } from './templates/index.ts';

const SITE = fileURLToPath(new URL('../site/', import.meta.url));

rmSync(SITE, { recursive: true, force: true });
mkdirSync(`${SITE}email`, { recursive: true });
mkdirSync(`${SITE}pdf`, { recursive: true });

const data = list();
const broken = data.emails.filter((e) => e.problems.length);
if (broken.length) throw new Error(`Not publishing: ${broken.map((e) => e.id).join(', ')} have problems (run pnpm build)`);

writeFileSync(`${SITE}index.html`, page(true));
writeFileSync(`${SITE}emails.json`, JSON.stringify(data));
writeFileSync(`${SITE}sample-logo.svg`, LOGO);
for (const t of TEMPLATES)
  for (const scheme of ['light', 'dark'] as const) writeFileSync(`${SITE}email/${t.id}-${scheme}.html`, emailHtml(t, scheme));
for (const p of PDFS) writeFileSync(`${SITE}pdf/${p.id}.html`, pdfHtml(p));

console.log(`Wrote site/: ${TEMPLATES.length} emails (light and dark) and ${PDFS.length} PDF reports.`);
