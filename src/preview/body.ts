/**
 * An email's content as text a developer can edit, and back. The V1 edit form shows a body like:
 *
 *   You have ${findings.total.count} findings.
 *
 *   [stats]
 *   Critical: ${severity.critical.count}
 *   [/stats]
 *
 * A blank line starts a new paragraph. Blocks are written between tags: `[details]`, `[stats]`
 * (one `Label: value` per line), `[list Label]` (one `- item` per line), `[quote Label]`, and
 * `[note]`. Inside text: `${name}` is a placeholder (`${name|tidy}` drops a trailing `.0` and
 * colors a rating), `**bold**`, `` `code` ``, `[link URL]text[/link]`, `[dot critical]`,
 * `[if $name]…[elseif $other]…[else]…[/if]` for text that depends on a value, and
 * `[each list as item sep=", "]…[/each]` for a repeated item. `[if $name]` alone on a line, with
 * `[/if]` alone after the block, makes a whole block conditional. A block this syntax can't write
 * (cards, tables, images…) is kept as `[keep N: Kind]`, where N is its place when the form opened.
 *
 * The preview serves this file, with its types stripped, to run in the browser.
 */
import { Cond, Vtl, plain, v } from '../placeholders.ts';
import type { Block, Href, Inline, Rich } from '../layout.ts';

export type Engine = 'velocity' | 'substitution';

const TOKEN = /^\$!?\{([^{}]+)\}$/;
const partsOf = (rich: Rich | undefined): readonly Inline[] => (rich === undefined ? [] : (Array.isArray(rich) ? rich : [rich])) as readonly Inline[];

// ——— Placeholders ———

/** A placeholder as the email's template language builds it. */
function placeholder(name: string, engine: Engine): Vtl {
  if (engine === 'substitution') {
    const withDefault = name.match(/^(.+?):-(.*)$/);
    return withDefault ? plain(withDefault[1]!, withDefault[2]) : plain(name);
  }
  return v(name);
}

const vtlText = (value: Vtl) => (TOKEN.test(value.text) ? `\${${value.text.match(TOKEN)![1]}}` : value.text);

// ——— Rich text to text ———

export function serializeRich(rich: Rich | undefined): string {
  return partsOf(rich)
    .map((part): string => {
      if (typeof part === 'string') return part;
      if (part instanceof Vtl) return vtlText(part);
      if ('strong' in part) return `**${serializeRich(part.strong)}**`;
      if ('code' in part) return `\`${serializeRich(part.code)}\``;
      if ('tidy' in part) return `\${${part.tidy}|tidy}`;
      if ('rating' in part) return `[dot ${part.rating}]`;
      if ('ratingOf' in part) return `[dot \${${part.ratingOf}}]`;
      if ('link' in part) return `[link ${hrefToText(part.url)}]${serializeRich(part.link)}[/link]`;
      if ('each' in part)
        return `[each ${part.each.list} as ${part.each.as}${part.separator ? ` sep="${part.separator}"` : ''}]${serializeRich(part.item)}[/each]`;
      if ('choose' in part) {
        const branches = part.choose.map(([cond, then], i) => `[${i ? 'elseif' : 'if'} ${cond.expr}]${serializeRich(then)}`).join('');
        return `${branches}${part.else !== undefined ? `[else]${serializeRich(part.else)}` : ''}[/if]`;
      }
      return '';
    })
    .join('');
}

/** A link's address as text: placeholders as `${name}`, the rest as written. */
export function hrefToText(href: Href | undefined): string {
  if (href === undefined) return '';
  return (Array.isArray(href) ? href : [href]).map((part) => (part instanceof Vtl ? vtlText(part) : part)).join('');
}

/** Text back into a link's address. */
export function parseHref(text: string, engine: Engine): Href {
  const parts = text
    .split(/(\$\{[^{}]+\})/)
    .filter((p) => p !== '')
    .map((p) => (p.startsWith('${') ? placeholder(p.slice(2, -1), engine) : p));
  return parts.length === 1 ? parts[0]! : parts.length === 0 ? '' : parts;
}

// ——— Text to rich text ———

const simplify = (nodes: Inline[]): Rich => (nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : nodes.length === 0 ? '' : nodes);

export function parseRich(src: string, engine: Engine): Rich {
  let i = 0;
  const at = (s: string) => src.startsWith(s, i);
  /** The text from `i` up to the matching `]`, with `i` after it. */
  const bracket = (): string => {
    const end = src.indexOf(']', i);
    if (end < 0) throw new Error('A [ tag is missing its ]');
    const inner = src.slice(i, end);
    i = end + 1;
    return inner;
  };

  const until = (stops: string[]): { nodes: Inline[]; stop: string | null } => {
    const out: Inline[] = [];
    let text = '';
    const flush = () => {
      if (text) out.push(text);
      text = '';
    };
    while (i < src.length) {
      const stop = stops.find((s) => at(s));
      if (stop) {
        flush();
        return { nodes: out, stop };
      }
      const placeholderMatch = src.slice(i).match(/^\$\{([^{}]+)\}/);
      if (placeholderMatch) {
        flush();
        const name = placeholderMatch[1]!;
        out.push(name.endsWith('|tidy') ? { tidy: name.slice(0, -5) } : placeholder(name, engine));
        i += placeholderMatch[0].length;
      } else if (at('**')) {
        flush();
        i += 2;
        const inner = until(['**']);
        if (inner.stop) i += 2;
        out.push({ strong: simplify(inner.nodes) });
      } else if (at('`') && src.indexOf('`', i + 1) > 0) {
        flush();
        const end = src.indexOf('`', i + 1);
        const inner = parseRich(src.slice(i + 1, end), engine);
        out.push({ code: inner });
        i = end + 1;
      } else if (at('[if ')) {
        flush();
        const choose: [Cond, Rich][] = [];
        let otherwise: Rich | undefined;
        i += 4;
        let expr = bracket();
        for (;;) {
          const branch = until(['[elseif ', '[else]', '[/if]']);
          choose.push([new Cond(expr), simplify(branch.nodes)]);
          if (branch.stop === '[elseif ') {
            i += 8;
            expr = bracket();
          } else if (branch.stop === '[else]') {
            i += 6;
            const rest = until(['[/if]']);
            otherwise = simplify(rest.nodes);
            if (rest.stop) i += 5;
            break;
          } else {
            if (branch.stop) i += 5;
            break;
          }
        }
        out.push({ choose, ...(otherwise !== undefined ? { else: otherwise } : {}) });
      } else if (at('[each ')) {
        flush();
        i += 6;
        const header = bracket().match(/^(\S+) as (\S+)(?: sep="([^"]*)")?$/);
        if (!header) throw new Error('[each] needs: [each list as item]');
        const inner = until(['[/each]']);
        if (inner.stop) i += 7;
        out.push({ each: { list: header[1]!, as: header[2]! }, item: simplify(inner.nodes), ...(header[3] ? { separator: header[3] } : {}) });
      } else if (at('[link ')) {
        flush();
        i += 6;
        const url = bracket();
        const inner = until(['[/link]']);
        if (inner.stop) i += 7;
        out.push({ link: simplify(inner.nodes), url: parseHref(url, engine) });
      } else if (at('[dot ')) {
        flush();
        i += 5;
        const what = bracket().trim();
        const named = what.match(/^\$\{([^{}]+)\}$/);
        out.push(named ? { ratingOf: named[1]! } : { rating: what as 'critical' });
      } else {
        text += src[i];
        i++;
      }
    }
    flush();
    return { nodes: out, stop: null };
  };

  const result = until([]);
  return simplify(result.nodes);
}

// ——— Blocks to text ———

type Row = { label: string; value: Rich; when?: Cond; [key: string]: unknown };

const rowText = (row: Row) => {
  const line = `${row.label}: ${serializeRich(row.value)}`;
  return row.when ? `[if ${row.when.expr}]${line}[/if]` : line;
};

function blockText(block: Block, index: number): string {
  let text: string;
  switch (block.kind) {
    case 'text':
      text = block.quiet ? `[note]\n${serializeRich(block.text)}\n[/note]` : serializeRich(block.text);
      break;
    case 'quote':
      text = `[quote${block.label ? ` ${block.label}` : ''}]\n${serializeRich(block.text)}\n[/quote]`;
      break;
    case 'details':
      text = `[details]\n${(block.rows as Row[]).map(rowText).join('\n')}\n[/details]`;
      break;
    case 'stats':
      text = `[stats]\n${(block.items as Row[]).map(rowText).join('\n')}\n[/stats]`;
      break;
    case 'list':
      text =
        'items' in block
          ? `[list ${serializeRich(block.label)}]\n${block.items.map((item) => `- ${serializeRich(item)}`).join('\n')}\n[/list]`
          : `[list ${serializeRich(block.label)} each ${block.each.list} as ${block.each.as}]\n- ${serializeRich(block.item)}\n[/list]`;
      break;
    default:
      text = `[keep ${index}: ${block.kind}]`;
  }
  return block.when ? `[if ${block.when.expr}]\n${text}\n[/if]` : text;
}

/** The blocks as the body text of the edit form. */
export function blocksToText(blocks: readonly Block[]): string {
  return blocks.map(blockText).join('\n\n');
}

// ——— Text to blocks ———

const OPENERS = /^\[(details|stats|note|quote|list|keep|if)\b/;
const wrapperIf = (line: string) => /^\[if [^\]]+\]$/.test(line.trim());

/**
 * The body text back into blocks. `originals` are the blocks the form opened with: `[keep N]` brings
 * back the Nth, and a details or stats row with a label it had keeps its settings (when, rating…).
 * `clone` copies a block, so a kept one isn't shared.
 */
export function textToBlocks(text: string, originals: readonly Block[], engine: Engine, clone: <T>(value: T) => T): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let at = 0;
  const seen: Record<string, number> = {};

  /** The original details or stats block that is the nth of its kind, for its rows' settings. */
  const original = (kind: 'details' | 'stats'): Row[] => {
    const n = (seen[kind] = (seen[kind] ?? -1) + 1);
    const found = originals.filter((b) => b.kind === kind)[n] as { rows?: Row[]; items?: Row[] } | undefined;
    return found?.rows ?? found?.items ?? [];
  };

  const rows = (closing: string, was: Row[]): Row[] => {
    const out: Row[] = [];
    while (at < lines.length && lines[at]!.trim() !== closing) {
      const raw = lines[at++]!.trim();
      if (!raw) continue;
      const conditional = raw.match(/^\[if ([^\]]+)\](.*)\[\/if\]$/);
      const line = conditional ? conditional[2]! : raw;
      const colon = line.indexOf(': ');
      const label = colon < 0 ? line : line.slice(0, colon);
      const row: Row = { ...(was.find((r) => r.label === label) ?? {}), label, value: parseRich(colon < 0 ? '' : line.slice(colon + 2), engine) };
      if (conditional) row.when = new Cond(conditional[1]!);
      else delete row.when;
      out.push(row);
    }
    if (at >= lines.length) throw new Error(`Missing ${closing}`);
    at++;
    return out;
  };

  const block = (): Block | null => {
    while (at < lines.length && !lines[at]!.trim()) at++;
    if (at >= lines.length) return null;
    const line = lines[at]!.trim();

    if (wrapperIf(line)) {
      const expr = line.slice(4, -1);
      at++;
      const inner = block();
      while (at < lines.length && !lines[at]!.trim()) at++;
      if (lines[at]?.trim() !== '[/if]') throw new Error('Missing [/if] after a conditional block');
      at++;
      if (!inner) throw new Error('A conditional block needs a block inside it');
      return { ...inner, when: new Cond(expr) } as Block;
    }
    if (line === '[details]') {
      at++;
      return { kind: 'details', rows: rows('[/details]', original('details')) } as unknown as Block;
    }
    if (line === '[stats]') {
      at++;
      return { kind: 'stats', items: rows('[/stats]', original('stats')) } as unknown as Block;
    }
    const wrapped = line.match(/^\[(note|quote)(?: (.*))?\]$/);
    if (wrapped) {
      at++;
      const inner: string[] = [];
      while (at < lines.length && lines[at]!.trim() !== `[/${wrapped[1]}]`) inner.push(lines[at++]!);
      if (at >= lines.length) throw new Error(`Missing [/${wrapped[1]}]`);
      at++;
      const text = parseRich(inner.join('\n').trim(), engine);
      return wrapped[1] === 'note'
        ? ({ kind: 'text', quiet: true, text } as Block)
        : ({ kind: 'quote', ...(wrapped[2] ? { label: wrapped[2] } : {}), text } as Block);
    }
    const list = line.match(/^\[list(?: (.*?))?(?: each (\S+) as (\S+))?\]$/);
    if (list) {
      at++;
      const items: string[] = [];
      while (at < lines.length && lines[at]!.trim() !== '[/list]') {
        const item = lines[at++]!.trim();
        if (item) items.push(item.replace(/^- ?/, ''));
      }
      if (at >= lines.length) throw new Error('Missing [/list]');
      at++;
      const label = parseRich(list[1] ?? '', engine);
      return list[2]
        ? ({ kind: 'list', label, each: { list: list[2], as: list[3]! }, item: parseRich(items[0] ?? '', engine) } as unknown as Block)
        : ({ kind: 'list', label, items: items.map((item) => parseRich(item, engine)) } as Block);
    }
    const keep = line.match(/^\[keep (\d+)(?::[^\]]*)?\]$/);
    if (keep) {
      at++;
      const found = originals[Number(keep[1])];
      if (!found) throw new Error(`[keep ${keep[1]}] has no block to keep`);
      return clone(found);
    }
    // A paragraph: lines up to a blank line or the next block.
    const paragraph: string[] = [];
    while (at < lines.length && lines[at]!.trim() && lines[at]!.trim() !== '[/if]' && !(paragraph.length > 0 && OPENERS.test(lines[at]!.trim()) && (!lines[at]!.trim().startsWith('[if') || wrapperIf(lines[at]!)))) {
      paragraph.push(lines[at++]!);
    }
    return { kind: 'text', text: parseRich(paragraph.join('\n'), engine) } as Block;
  };

  const out: Block[] = [];
  for (let next = block(); next; next = block()) out.push(next);
  return out;
}
