/**
 * An email's content as Markdown a developer can edit, and back. The edit form's Body is Markdown:
 *
 *   You have ${findings.total.count} findings.
 *
 *   |          |                                |
 *   |----------|--------------------------------|
 *   | Critical | ${severity.critical.count}     |
 *
 * A blank line starts a new paragraph, and a line break inside one is kept. Blocks:
 *
 *   - paragraph        plain text, with `**bold**`, `` `code` ``, `[text](url)` and `${name}`
 *   - heading          `# text` (written as a bold paragraph)
 *   - note             `<small>smaller, muted text</small>`
 *   - quote            `> text`, with `> [!Label]` first for a label
 *   - list             `- item` lines, with a `**Label**` line directly above for its label
 *   - details          a table with an empty header: one `| Label | value |` row per fact
 *   - stats            a table with the labels as its header and one row of values
 *   - image            `![description](source)`
 *
 * What Markdown can't say is written as HTML comments, so the Markdown still reads and previews
 * everywhere else: `<!-- if $name -->…<!-- elseif $other -->…<!-- else -->…<!-- /if -->` for text
 * that depends on a value (alone on a line, around a block, for a whole block);
 * `<!-- each list as item sep=", " -->…<!-- /each -->` for a repeated item; `<!-- dot critical -->`
 * for a severity dot; `<!-- when $name -->` at the start of a table row's first cell, for a row
 * that only shows when its value is there; and `<!-- keep N: kind -->` for a block this syntax
 * can't write (cards, tables of findings…), where N is its place when the form opened. `${name|…}`
 * is written `$tidy{name}`: a trailing `.0` is dropped and a rating name colored.
 *
 * The preview serves this file, with its types stripped, to run in the browser.
 */
import { Cond, Vtl, plain, v } from '../placeholders.ts';
import type { Block, Email, Href, Inline, Rich } from '../layout.ts';

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

export const vtlText = (value: Vtl) => (TOKEN.test(value.text) ? `\${${value.text.match(TOKEN)![1]}}` : value.text);

// ——— Rich text to text ———

export function serializeRich(rich: Rich | undefined): string {
  return partsOf(rich)
    .map((part): string => {
      if (typeof part === 'string') return part;
      if (part instanceof Vtl) return vtlText(part);
      if ('strong' in part) return `**${serializeRich(part.strong)}**`;
      if ('code' in part) return `\`${serializeRich(part.code)}\``;
      if ('tidy' in part) return `$tidy{${part.tidy}}`;
      if ('rating' in part) return `<!-- dot ${part.rating} -->`;
      if ('ratingOf' in part) return `<!-- dot \${${part.ratingOf}} -->`;
      if ('link' in part) return `[${serializeRich(part.link)}](${hrefToText(part.url)})`;
      if ('each' in part)
        return `<!-- each ${part.each.list} as ${part.each.as}${part.separator ? ` sep="${part.separator}"` : ''} -->${serializeRich(part.item)}<!-- /each -->`;
      if ('choose' in part) {
        const branches = part.choose.map(([cond, then], i) => `<!-- ${i ? 'elseif' : 'if'} ${cond.expr} -->${serializeRich(then)}`).join('');
        return `${branches}${part.else !== undefined ? `<!-- else -->${serializeRich(part.else)}` : ''}<!-- /if -->`;
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
  /** The text from `i` up to ` -->`, with `i` after it. */
  const comment = (): string => {
    const end = src.indexOf(' -->', i);
    if (end < 0) throw new Error('An <!-- comment --> is missing its -->');
    const inner = src.slice(i, end);
    i = end + 4;
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
      const rest = src.slice(i);
      const tidy = rest.match(/^\$tidy\{([^{}]+)\}/);
      const placeholderMatch = rest.match(/^\$\{([^{}]+)\}/);
      if (tidy) {
        flush();
        out.push({ tidy: tidy[1]! });
        i += tidy[0].length;
      } else if (placeholderMatch) {
        flush();
        out.push(placeholder(placeholderMatch[1]!, engine));
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
        out.push({ code: parseRich(src.slice(i + 1, end), engine) });
        i = end + 1;
      } else if (at('<!-- if ')) {
        flush();
        const choose: [Cond, Rich][] = [];
        let otherwise: Rich | undefined;
        i += 8;
        let expr = comment();
        for (;;) {
          const branch = until(['<!-- elseif ', '<!-- else -->', '<!-- /if -->']);
          choose.push([new Cond(expr), simplify(branch.nodes)]);
          if (branch.stop === '<!-- elseif ') {
            i += 12;
            expr = comment();
          } else if (branch.stop === '<!-- else -->') {
            i += 13;
            const rest = until(['<!-- /if -->']);
            otherwise = simplify(rest.nodes);
            if (rest.stop) i += 12;
            break;
          } else {
            if (branch.stop) i += 12;
            break;
          }
        }
        out.push({ choose, ...(otherwise !== undefined ? { else: otherwise } : {}) });
      } else if (at('<!-- each ')) {
        flush();
        i += 10;
        const header = comment().match(/^(\S+) as (\S+)(?: sep="([^"]*)")?$/);
        if (!header) throw new Error('<!-- each --> needs: <!-- each list as item -->');
        const inner = until(['<!-- /each -->']);
        if (inner.stop) i += 14;
        out.push({ each: { list: header[1]!, as: header[2]! }, item: simplify(inner.nodes), ...(header[3] ? { separator: header[3] } : {}) });
      } else if (at('<!-- dot ')) {
        flush();
        i += 9;
        const what = comment().trim();
        const named = what.match(/^\$\{([^{}]+)\}$/);
        out.push(named ? { ratingOf: named[1]! } : { rating: what as 'critical' });
      } else if (at('[') && /^\[[^\]\n]*\]\([^)\n]*\)/.test(rest)) {
        // A link: [text](address).
        flush();
        const close = src.indexOf('](', i);
        const end = src.indexOf(')', close);
        out.push({ link: parseRich(src.slice(i + 1, close), engine), url: parseHref(src.slice(close + 2, end), engine) });
        i = end + 1;
      } else {
        text += src[i];
        i++;
      }
    }
    flush();
    return { nodes: out, stop: null };
  };

  return simplify(until([]).nodes);
}

// ——— Blocks to Markdown ———

type Row = { label: string; value: Rich; when?: Cond; [key: string]: unknown };

/** A label, with its condition ahead of it when the row only shows when a value is there. */
const labelCell = (row: Row) => `${row.when ? `<!-- when ${row.when.expr} -->` : ''}${row.label}`;
const rowLine = (cells: string[]) => `| ${cells.join(' | ')} |`;

function blockMarkdown(block: Block, index: number): string {
  let text: string;
  switch (block.kind) {
    case 'text':
      text = block.quiet ? `<small>${serializeRich(block.text)}</small>` : serializeRich(block.text);
      break;
    case 'quote':
      text = [...(block.label ? [`[!${block.label}]`] : []), ...serializeRich(block.text).split('\n')].map((line) => `> ${line}`).join('\n');
      break;
    case 'details':
      text = ['|   |   |', '|---|---|', ...(block.rows as Row[]).map((row) => rowLine([labelCell(row), serializeRich(row.value)]))].join('\n');
      break;
    case 'stats': {
      const items = block.items as Row[];
      text = [rowLine(items.map(labelCell)), rowLine(items.map(() => '---')), rowLine(items.map((item) => serializeRich(item.value)))].join('\n');
      break;
    }
    case 'list':
      text =
        'items' in block
          ? [...(serializeRich(block.label) ? [`**${serializeRich(block.label)}**`] : []), ...block.items.map((item) => `- ${serializeRich(item)}`)].join('\n')
          : `<!-- keep ${index}: list -->`;
      break;
    default:
      text = `<!-- keep ${index}: ${block.kind} -->`;
  }
  return block.when ? `<!-- if ${block.when.expr} -->\n${text}\n<!-- /if -->` : text;
}

/** The blocks as the Markdown body of the edit form. */
export function blocksToMarkdown(blocks: readonly Block[]): string {
  return blocks.map(blockMarkdown).join('\n\n');
}

const quoted = (value: string) => JSON.stringify(value);

/** A whole email as Markdown: its settings as a short header, then the body. */
export function emailToMarkdown(email: Email): string {
  const link = email.action ?? email.secondary;
  const header = [
    `subject: ${quoted(serializeRich(email.subject))}`,
    `preview: ${quoted(serializeRich(email.preview))}`,
    `eyebrow: ${quoted(email.eyebrow)}`,
    `tone: ${email.tone}`,
    `title: ${quoted(serializeRich(email.title))}`,
    ...(email.subtitle !== undefined ? [`subtitle: ${quoted(serializeRich(email.subtitle))}`] : []),
    `cta: ${email.action ? 'button' : email.secondary ? 'link' : 'none'}`,
    ...(link ? [`cta_text: ${quoted(serializeRich(link.label))}`, `cta_url: ${quoted(hrefToText(link.url))}`] : []),
    `footer: ${quoted(serializeRich(email.reason))}`,
  ];
  return `---\n${header.join('\n')}\n---\n\n${blocksToMarkdown(email.blocks)}\n`;
}

// ——— Markdown to blocks ———

const WRAPPER_IF = /^<!-- if ((?:(?! -->).)+) -->$/;
const BULLET = /^[-*] /;
/** Lines that start a block of their own, so a paragraph before them ends. */
const STARTS_BLOCK = (line: string) =>
  /^(\||>|#{1,6}\s|!\[)/.test(line) || BULLET.test(line) || /^<!-- keep /.test(line) || WRAPPER_IF.test(line) || line === '<!-- /if -->';

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

/**
 * The Markdown body back into blocks. `originals` are the blocks the form opened with: `<!-- keep N -->`
 * brings back the Nth, and a details or stats row with a label it had keeps its settings (when,
 * rating…). `clone` copies a block, so a kept one isn't shared.
 */
export function markdownToBlocks(text: string, originals: readonly Block[], engine: Engine, clone: <T>(value: T) => T): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let at = 0;
  const seen: Record<string, number> = {};

  /** The original details or stats block that is the nth of its kind, for its rows' settings. */
  const original = (kind: 'details' | 'stats'): Row[] => {
    const n = (seen[kind] = (seen[kind] ?? -1) + 1);
    const found = originals.filter((b) => b.kind === kind)[n] as { rows?: Row[]; items?: Row[] } | undefined;
    return found?.rows ?? found?.items ?? [];
  };

  /** A label cell: its condition, and the label. */
  const label = (cell: string): { label: string; when?: Cond } => {
    const when = cell.match(/^<!-- when ((?:(?! -->).)+) -->(.*)$/);
    return when ? { label: when[2]!.trim(), when: new Cond(when[1]!) } : { label: cell };
  };

  const table = (): Block => {
    const rows: string[][] = [];
    while (at < lines.length && lines[at]!.trim().startsWith('|')) rows.push(cells(lines[at++]!));
    if (rows.length < 2 || !rows[1]!.every((cell) => /^:?-{1,}:?$/.test(cell)))
      throw new Error('A table needs a header row and a |---|---| row under it');
    const [header, , ...body] = rows as [string[], string[], ...string[][]];
    if (header.every((cell) => cell === '')) {
      const was = original('details');
      const out = body.map(([cell = '', value = '']) => {
        const { label: name, when } = label(cell);
        const row: Row = { ...(was.find((r) => r.label === name) ?? {}), label: name, value: parseRich(value, engine) };
        if (when) row.when = when;
        else delete row.when;
        return row;
      });
      return { kind: 'details', rows: out } as unknown as Block;
    }
    if (body.length !== 1) throw new Error('A stats table has one row of values under its labels');
    const was = original('stats');
    const items = header.map((cell, i) => {
      const { label: name, when } = label(cell);
      const item: Row = { ...(was.find((r) => r.label === name) ?? {}), label: name, value: parseRich(body[0]![i] ?? '', engine) };
      if (when) item.when = when;
      else delete item.when;
      return item;
    });
    return { kind: 'stats', items } as unknown as Block;
  };

  const block = (): Block | null => {
    while (at < lines.length && !lines[at]!.trim()) at++;
    if (at >= lines.length) return null;
    const line = lines[at]!.trim();

    // A whole block that only shows when a value is there.
    const wrapper = line.match(WRAPPER_IF);
    if (wrapper) {
      at++;
      const inner = block();
      while (at < lines.length && !lines[at]!.trim()) at++;
      if (lines[at]?.trim() !== '<!-- /if -->') throw new Error('Missing <!-- /if --> after a conditional block');
      at++;
      if (!inner) throw new Error('A conditional block needs a block inside it');
      return { ...inner, when: new Cond(wrapper[1]!) } as Block;
    }
    const keep = line.match(/^<!-- keep (\d+)(?::[^>]*)? -->$/);
    if (keep) {
      at++;
      const found = originals[Number(keep[1])];
      if (!found) throw new Error(`<!-- keep ${keep[1]} --> has no block to keep`);
      return clone(found);
    }
    if (line.startsWith('|')) return table();
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (at < lines.length && lines[at]!.trim().startsWith('>')) quote.push(lines[at++]!.trim().replace(/^>\s?/, ''));
      const named = quote[0]?.match(/^\[!(.+)\]$/);
      const body = parseRich((named ? quote.slice(1) : quote).join('\n'), engine);
      return { kind: 'quote', ...(named ? { label: named[1] } : {}), text: body } as Block;
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      at++;
      return { kind: 'text', text: { strong: parseRich(heading[1]!, engine) } } as Block;
    }
    const image = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (image) {
      at++;
      return { kind: 'image', src: parseHref(image[2]!, engine), alt: image[1]!, width: 520 } as unknown as Block;
    }
    // A list, with a bold line directly above it for its label.
    const bold = line.match(/^\*\*(.+)\*\*$/);
    const listLabel = bold && BULLET.test(lines[at + 1]?.trim() ?? '') ? bold[1]! : null;
    if (listLabel !== null || BULLET.test(line)) {
      if (listLabel !== null) at++;
      const items: string[] = [];
      while (at < lines.length && BULLET.test(lines[at]!.trim())) items.push(lines[at++]!.trim().replace(BULLET, ''));
      return { kind: 'list', label: parseRich(listLabel ?? '', engine), items: items.map((item) => parseRich(item, engine)) } as Block;
    }
    // A paragraph: lines up to a blank line or the next block.
    const paragraph = [lines[at++]!];
    while (at < lines.length && lines[at]!.trim() && !STARTS_BLOCK(lines[at]!.trim())) paragraph.push(lines[at++]!);
    const joined = paragraph.join('\n').trim();
    const small = joined.match(/^<small>([\s\S]*)<\/small>$/);
    return small
      ? ({ kind: 'text', quiet: true, text: parseRich(small[1]!, engine) } as Block)
      : ({ kind: 'text', text: parseRich(paragraph.join('\n'), engine) } as Block);
  };

  const out: Block[] = [];
  for (let next = block(); next; next = block()) out.push(next);
  return out;
}
