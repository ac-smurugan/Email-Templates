/** The build's checks for a PDF report: that it fills from its sample, and lists what it uses. */
import { fill } from '../preview/fill.ts';
import type { PdfReport } from './index.ts';

/**
 * The top-level variables a template reads: every `$name` but loop variables, and names it `#set`s
 * before it first reads them (a name read first, like the risk register's `$status`, is the backend's).
 */
export function topLevel(template: string): Set<string> {
  const firstSet = new Map<string, number>();
  for (const m of template.matchAll(/#(?:set|foreach)\s*\(\s*\$!?\{?(\w+)/g)) if (!firstSet.has(m[1]!)) firstSet.set(m[1]!, m.index);
  const names = new Set<string>();
  for (const m of template.matchAll(/(?<!#(?:set|foreach)\s*\(\s*)\$!?\{?([A-Za-z_]\w*)/g)) {
    const name = m[1]!;
    const set = firstSet.get(name);
    if (name !== 'foreach' && (set === undefined || m.index < set)) names.add(name);
  }
  return names;
}

/** What's wrong with a report, if anything. */
export function pdfProblems(p: PdfReport): string[] {
  const out: string[] = [];
  const used = topLevel(p.html);
  for (const name of used) if (!(name in p.fields)) out.push(`uses $${name} but doesn't list it in fields`);
  for (const name of Object.keys(p.fields)) if (!used.has(name)) out.push(`lists ${name} but doesn't use it`);
  for (const name of Object.keys(p.fields)) if (!(name in p.sample)) out.push(`sample has no value for ${name}`);
  try {
    const { output, missing } = fill(p.html, p.sample);
    if (missing.length) out.push(`sample leaves ${[...new Set(missing)].join(', ')} empty`);
    const left = output.match(/\$!?\{?[A-Za-z_]|#\{?(?:if|elseif|foreach|set)\}?\s*\(|#\{?(?:else|end)/);
    if (left) out.push(`Velocity left over after filling: ${output.slice(left.index, left.index! + 40)}`);
  } catch (error) {
    out.push(`doesn't fill: ${(error as Error).message}`);
  }
  return out;
}
