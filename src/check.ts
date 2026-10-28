/**
 * `node src/check.ts <module>`: runs the build's checks on the emails one module exports (an
 * `EMAILS` array, or single templates), without the rest. For working on one group at a time.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { problems } from './build.ts';
import { fill } from './preview/fill.ts';
import type { EmailTemplate } from './template.ts';

const path = process.argv[2];
if (!path) throw new Error('Usage: node src/check.ts src/templates/<group>/index.ts');
const mod = (await import(pathToFileURL(resolve(path)).href)) as Record<string, unknown>;
const isTemplate = (x: unknown): x is EmailTemplate => typeof x === 'object' && x !== null && 'html' in x && 'fields' in x;
const found = Object.values(mod).flatMap((x) => (Array.isArray(x) ? x.filter(isTemplate) : isTemplate(x) ? [x] : []));
const seen = new Set<string>();
let failed = 0;
for (const t of found) {
  if (seen.has(t.id)) continue;
  seen.add(t.id);
  const list = problems(t);
  failed += list.length;
  console.log(`${list.length ? '✗' : '✓'} ${t.id}: ${fill(t.subject, t.sample).output}`);
  for (const p of list) console.log(`    ${p}`);
}
console.log(`\n${seen.size} emails, ${failed} problems.`);
if (process.argv.includes('--text')) for (const t of found) console.log(`\n===== ${t.id}\n${fill(t.text, t.sample).output}`);
process.exit(failed ? 1 : 0);
