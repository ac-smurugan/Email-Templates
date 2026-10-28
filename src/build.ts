/**
 * `pnpm build`: writes `dist/<id>.html` and `dist/<id>.txt` for every email, and `dist/emails.json`
 * with each one's subject and placeholders. Fails if an email doesn't hold together: a placeholder
 * it uses but doesn't list, one it lists but doesn't use, a sample that leaves one empty, or a
 * subject that's too long once filled.
 *
 * Also writes each PDF report's Velocity template, unfilled, to `dist/pdf/<id>.html`, and fails if
 * one doesn't fill from its sample, leaves Velocity behind, or uses a variable it doesn't list.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pdfProblems } from './pdf/check.ts';
import { PDFS } from './pdf/index.ts';
import { fill } from './preview/fill.ts';
import type { EmailTemplate } from './template.ts';
import { TEMPLATES } from './templates/index.ts';
import { SUBJECT_MAX } from './tokens.ts';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

/** The placeholder names a template refers to, leaving out loop variables and their fields. */
export function referenced(template: string): Set<string> {
  const loopVars = new Set([...template.matchAll(/#foreach\(\$(\w+) in \$[\w.]+\)/g)].map((m) => m[1]!));
  const names = new Set<string>();
  const add = (path: string) => {
    const clean = path.replace(/\.size\(\)$/, '');
    if (!loopVars.has(clean.split('.')[0]!)) names.add(clean);
  };
  for (const m of template.matchAll(/\$!?\{([\w.]+?(?:\.size\(\))?)(?::-[^}]*)?\}/g)) add(m[1]!);
  for (const m of template.matchAll(/#(?:if|elseif|foreach)\(([^\n]*?)\)(?=[^)]|$)/g))
    for (const r of m[1]!.matchAll(/\$([\w.]+(?:\.size\(\))?)/g)) add(r[1]!);
  return names;
}

/** What's wrong with a template, if anything. */
export function problems(t: EmailTemplate): string[] {
  const out: string[] = [];
  const declared = new Set(Object.keys(t.fields));
  const used = new Set([...referenced(t.html), ...referenced(t.text), ...referenced(t.subject)]);
  const isDeclared = (name: string) => declared.has(name) || declared.has(name.split('.')[0]!);
  for (const name of used) if (!isDeclared(name)) out.push(`uses \${${name}} but doesn't list it in fields`);
  for (const name of declared)
    if (![...used].some((u) => u === name || u.startsWith(`${name}.`))) out.push(`lists ${name} but doesn't use it`);
  for (const [name, field] of Object.entries(t.fields)) {
    const value = name.split('.').reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], t.sample);
    if (!field.optional && (value === undefined || value === '')) out.push(`sample has no value for required ${name}`);
  }
  if (t.engine === 'substitution' && /#if|#foreach|\$!/.test(t.html + t.text))
    out.push('is filled by plain substitution, but uses Velocity conditions, loops or quiet references');
  for (const [label, template] of [['HTML', t.html], ['text', t.text], ['subject', t.subject]] as const) {
    try {
      const { output, missing } = fill(template, t.sample);
      if (missing.length) out.push(`${label}: sample leaves ${missing.join(', ')} empty`);
      if (/\$!?\{|#if\(|#foreach\(|#\{?end\}?/.test(output)) out.push(`${label}: Velocity left over after filling`);
      if (label === 'subject' && output.length > SUBJECT_MAX)
        out.push(`subject is ${output.length} characters with the sample (most ${SUBJECT_MAX}): ${output}`);
    } catch (error) {
      out.push(`${label}: ${(error as Error).message}`);
    }
  }
  return out;
}

function main() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });
  let failed = 0;
  for (const t of TEMPLATES) {
    writeFileSync(`${DIST}${t.id}.html`, t.html);
    writeFileSync(`${DIST}${t.id}.txt`, t.text);
    for (const problem of problems(t)) {
      console.error(`✗ ${t.id}: ${problem}`);
      failed++;
    }
  }
  const manifest = TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    group: t.group,
    kind: t.kind,
    engine: t.engine,
    source: t.source,
    who: t.who,
    when: t.when,
    subject: t.subject,
    preview: t.preview,
    fields: t.fields,
  }));
  writeFileSync(`${DIST}emails.json`, JSON.stringify(manifest, null, 2) + '\n');
  mkdirSync(`${DIST}pdf`, { recursive: true });
  for (const p of PDFS) {
    writeFileSync(`${DIST}pdf/${p.id}.html`, p.html);
    for (const problem of pdfProblems(p)) {
      console.error(`✗ pdf/${p.id}: ${problem}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`\n${failed} problem${failed === 1 ? '' : 's'}; dist/ was still written.`);
    process.exit(1);
  }
  console.log(`Built ${TEMPLATES.length} emails and ${PDFS.length} PDF reports into dist/.`);
}

if (import.meta.main) main();
