/**
 * The preview's builder, in the browser: an email as a stack of blocks to edit, add, move, hide and
 * delete, with the email and its plain text rendered again on every change and each part
 * selectable by clicking it in the preview. Changes stay in this browser, per email and layout;
 * nothing is written back to the templates (Copy changes lists them, to make in the template).
 * The preview serves this file, and the modules it imports, with their types stripped.
 */
import { Cond, Vtl } from '../placeholders.ts';
import { blocksToMarkdown, emailToMarkdown, hrefToText, markdownToBlocks, parseHref, parseRich, serializeRich, vtlText, type Engine } from './body.ts';
import { pinScheme, richText, toHtml, toText, type Block, type Email, type Inline, type Rich } from '../layout.ts';
import { fill } from './fill.ts';

interface Field {
  about: string;
  optional?: boolean;
}

export interface Model {
  id: string;
  fields: Record<string, Field>;
  sample: Record<string, unknown>;
  layouts: { id: string; label: string; email: Email }[];
}

/** A block in the builder: where it came from in the template (none when added), and whether it's hidden. */
type BuiltBlock = Block & { from?: number; hidden?: boolean; ref?: number };
type Doc = Omit<Email, 'blocks'> & { blocks: BuiltBlock[] };

/** What the builder keeps for an email layout: the edited email, and edited sample values. */
interface Saved {
  doc: Doc;
  sample: Record<string, string>;
}

// ——— Loading and saving ———

/** JSON keeps Velocity code and conditions as marked objects; `revive` turns them back into `Vtl` and `Cond`. */
const marked = (_key: string, value: unknown) =>
  value instanceof Vtl ? { $vtl: [value.html, value.text] } : value instanceof Cond ? { $cond: value.expr } : value;
const revive = (_key: string, value: unknown) =>
  value && typeof value === 'object' && '$vtl' in value
    ? new Vtl(...(value as { $vtl: [string, string] }).$vtl)
    : value && typeof value === 'object' && '$cond' in value
      ? new Cond((value as { $cond: string }).$cond)
      : value;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value, marked), revive);

/** An email's model from the preview. */
export async function loadModel(id: string): Promise<Model> {
  const response = await fetch(`/model/${id}.json`);
  if (!response.ok) throw new Error(`No model for ${id}`);
  return JSON.parse(await response.text(), revive) as Model;
}

const storageKey = (id: string, layout: string) => `ac-build:${id}:${layout}`;
/** V0 is the template's own key, so edits made before versions existed still show; other versions have their own. */
export const scopeOf = (layout: string, version = 'v0') => (version === 'v0' ? layout : `${layout}@${version}`);
const layoutOf = (model: Model, id: string) => model.layouts.find((l) => l.id === id) ?? model.layouts[0]!;

/** The template as written, as a builder document: each block knows where it came from. */
function original(model: Model, layout: string): Doc {
  const doc = copy(layoutOf(model, layout).email) as Doc;
  doc.blocks.forEach((block, i) => (block.from = i));
  return doc;
}

function load(model: Model, layout: string, version: string): Saved {
  try {
    const saved = localStorage.getItem(storageKey(model.id, scopeOf(layout, version)));
    if (saved) return JSON.parse(saved, revive) as Saved;
  } catch {
    // Unreadable, or no storage: start from the template.
  }
  return { doc: original(model, layout), sample: {} };
}

/** The document as comparable text: where a block came from doesn't count as a change. */
const stable = (doc: Doc) => JSON.stringify(doc, (key, value) => (key === 'from' || key === 'ref' ? undefined : marked(key, value)));
const isEdited = (model: Model, layout: string, saved: Saved) =>
  Object.keys(saved.sample).length > 0 || stable(saved.doc) !== stable(original(model, layout));

function save(model: Model, layout: string, version: string, saved: Saved) {
  try {
    const key = storageKey(model.id, scopeOf(layout, version));
    if (isEdited(model, layout, saved)) localStorage.setItem(key, JSON.stringify(saved, marked));
    else localStorage.removeItem(key);
  } catch {
    // Storage can be off (a private window); changes then last until the page reloads.
  }
}

/** Whether an email layout has changes saved in this browser. */
export function hasEdits(id: string, scope: string): boolean {
  try {
    return localStorage.getItem(storageKey(id, scope)) !== null;
  } catch {
    return false;
  }
}

/** Drops an email layout's changes, back to the template as written. */
export function clearEdits(id: string, layout: string, version = 'v0') {
  try {
    localStorage.removeItem(storageKey(id, scopeOf(layout, version)));
  } catch {
    // Nothing stored.
  }
}

// ——— Rich text as editable text ———
// A field shows rich text as one line or paragraph: `{name}` for a placeholder, `**bold**`, and
// `[optional: …]` for text that only shows when a value is there. Anything else (a severity dot,
// a repeated list, either-or text) is kept as it is, as a ⟦marker⟧ that can be deleted but not changed.

const TOKEN = /^\$!?\{([^{}]+)\}$/;
const isPlaceholder = (x: unknown): x is Vtl => x instanceof Vtl && TOKEN.test(x.text);
const placeholderName = (x: Vtl) => x.text.match(TOKEN)![1]!;
const INLINE_KEYS = ['strong', 'code', 'rating', 'ratingOf', 'choose', 'link', 'tidy', 'each'];
const isInline = (x: unknown) =>
  typeof x === 'string' || x instanceof Vtl || (!!x && typeof x === 'object' && !Array.isArray(x) && INLINE_KEYS.some((k) => k in x));
const isRich = (x: unknown) => isInline(x) || (Array.isArray(x) && x.length > 0 && x.every(isInline));

interface TextForm {
  text: string;
  /** Placeholders and tidied values, by the name shown. */
  names: Map<string, Inline>;
  /** Kept parts, in the order of their markers. */
  kept: Inline[];
  /** The conditions of `[optional: …]` parts, in order. */
  conditions: Cond[];
}

const partsOf = (rich: Rich): readonly Inline[] => (Array.isArray(rich) ? rich : [rich]) as readonly Inline[];

function keptLabel(inline: Inline): string {
  if (typeof inline === 'object' && !(inline instanceof Vtl)) {
    if ('ratingOf' in inline || 'rating' in inline) return '⟦dot⟧';
    if ('each' in inline) return '⟦repeated list⟧';
    if ('link' in inline) return `⟦link: ${richText(inline.link)}⟧`;
    if ('code' in inline) return `⟦code: ${richText(inline.code)}⟧`;
    if ('choose' in inline) return '⟦either-or text⟧';
  }
  return '⟦kept⟧';
}

function asForm(rich: Rich | undefined, form: TextForm = { text: '', names: new Map(), kept: [], conditions: [] }): TextForm {
  for (const part of partsOf(rich ?? '')) {
    if (typeof part === 'string') form.text += part;
    else if (isPlaceholder(part)) {
      form.names.set(placeholderName(part), part);
      form.text += `{${placeholderName(part)}}`;
    } else if (typeof part === 'object' && 'tidy' in part) {
      form.names.set(part.tidy, part);
      form.text += `{${part.tidy}}`;
    } else if (typeof part === 'object' && 'strong' in part && partsOf(part.strong).every((p) => typeof p === 'string' || isPlaceholder(p))) {
      form.text += '**';
      asForm(part.strong, form);
      form.text += '**';
    } else if (typeof part === 'object' && 'choose' in part && part.choose.length === 1 && part.else === undefined) {
      form.conditions.push(part.choose[0]![0]);
      form.text += '[optional: ';
      asForm(part.choose[0]![1], form);
      form.text += ']';
    } else {
      form.kept.push(part);
      form.text += keptLabel(part);
    }
  }
  return form;
}

/** Typed text back into rich text, with the placeholders, conditions and kept parts of `form`. */
function fromForm(text: string, form: TextForm): Rich {
  let keptAt = 0;
  let conditionAt = 0;
  const read = (source: string): Inline[] => {
    const out: Inline[] = [];
    let plain = '';
    const flush = () => {
      if (plain) out.push(plain);
      plain = '';
    };
    for (let i = 0; i < source.length; ) {
      const rest = source.slice(i);
      if (rest.startsWith('[optional:')) {
        // The matching bracket, counting nested ones.
        let depth = 0;
        let end = -1;
        for (let j = i; j < source.length && end < 0; j++) {
          if (source[j] === '[') depth++;
          if (source[j] === ']' && --depth === 0) end = j;
        }
        if (end > 0) {
          flush();
          const inner = read(source.slice(i + '[optional:'.length, end).replace(/^ /, ''));
          const condition = form.conditions[conditionAt++];
          if (condition) out.push({ choose: [[condition, inner]] });
          else out.push(...inner);
          i = end + 1;
          continue;
        }
      }
      const bold = rest.startsWith('**') ? source.indexOf('**', i + 2) : -1;
      if (bold > 0) {
        flush();
        out.push({ strong: read(source.slice(i + 2, bold)) });
        i = bold + 2;
        continue;
      }
      const keptEnd = rest.startsWith('⟦') ? source.indexOf('⟧', i) : -1;
      if (keptEnd > 0) {
        flush();
        const kept = form.kept[keptAt++];
        if (kept !== undefined) out.push(kept);
        i = keptEnd + 1;
        continue;
      }
      const placeholder = rest.match(/^\{([^{}\s]+)\}/);
      if (placeholder && form.names.has(placeholder[1]!)) {
        flush();
        out.push(form.names.get(placeholder[1]!)!);
        i += placeholder[0].length;
        continue;
      }
      plain += source[i];
      i++;
    }
    flush();
    return out;
  };
  const result = read(text);
  return result.length === 1 && typeof result[0] === 'string' ? result[0] : result;
}

/** The placeholder names a value uses, anywhere inside it. */
function namesIn(value: unknown, out = new Set<string>()): Set<string> {
  if (isPlaceholder(value)) out.add(placeholderName(value).replace(/:-.*$/, '').replace(/\.size\(\)$/, ''));
  else if (Array.isArray(value)) value.forEach((v) => namesIn(v, out));
  else if (value && typeof value === 'object' && !(value instanceof Vtl) && !(value instanceof Cond)) {
    for (const key of ['tidy', 'ratingOf'] as const) if (key in value) out.add((value as Record<string, string>)[key]!);
    if ('each' in value) out.add((value as { each: { list: string } }).each.list);
    Object.values(value).forEach((v) => namesIn(v, out));
  }
  return out;
}

/** A block's first words, for its card. */
function summary(block: Block): string {
  const words: string[] = [];
  const walk = (value: unknown) => {
    if (words.join('').length > 80) return;
    if (typeof value === 'string') words.push(value);
    else if (isPlaceholder(value)) words.push(`{${placeholderName(value)}}`);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object' && !(value instanceof Cond))
      for (const [k, v] of Object.entries(value)) if (!['kind', 'when', 'each', 'url', 'src', 'align', 'tone', 'rating', 'ratingOf', 'quiet', 'from', 'hidden', 'ref'].includes(k)) walk(v);
  };
  walk(block);
  const text = words.join(' ').replace(/\s+/g, ' ').replace(/ ([,.:;])/g, '$1').trim();
  return text.length > 70 ? `${text.slice(0, 70)}…` : text;
}

const KIND_NAMES: Record<string, string> = {
  text: 'Paragraph', quote: 'Quote', details: 'Details', list: 'List', items: 'Links', stats: 'Stats',
  risk: 'Risk bar', table: 'Table', records: 'Cards', image: 'Image',
};
const kindName = (block: Block) => (block.kind === 'text' && block.quiet ? 'Note' : (KIND_NAMES[block.kind] ?? block.kind));

/** New blocks, with words to replace. */
const NEW_BLOCKS: Record<string, () => Block> = {
  Paragraph: () => ({ kind: 'text', text: 'Write a paragraph here.' }),
  Note: () => ({ kind: 'text', quiet: true, text: 'A short note.' }),
  Details: () => ({ kind: 'details', rows: [{ label: 'Label', value: 'Value' }] }),
  Quote: () => ({ kind: 'quote', label: 'Message', text: 'Quoted text.' }),
  List: () => ({ kind: 'list', label: 'List', items: ['First item', 'Second item'] }),
  Stats: () => ({ kind: 'stats', items: [{ label: 'Total', value: '42' }, { label: 'Critical', value: '3', rating: 'critical' }] }),
  Image: () => ({ kind: 'image', src: '/samples/dashboard-snapshot.png', alt: 'Image', width: 520 }),
};

// ——— Sample values ———

const get = (obj: unknown, path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

function set(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  let node = obj;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  if (value === undefined) delete node[keys.at(-1)!];
  else node[keys.at(-1)!] = value;
}

const asText = (value: unknown) =>
  value === undefined ? '' : typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value);

/** Typed text back into a value of the original's kind; empty means "missing". */
function asValue(text: string, original: unknown): unknown {
  if (text === '') return undefined;
  if (typeof original === 'number' && !Number.isNaN(Number(text))) return Number(text);
  if (typeof original === 'boolean') return text === 'true';
  if (typeof original === 'object' && original !== null) return JSON.parse(text);
  return text;
}

function withSample(model: Model, edits: Record<string, string>): Record<string, unknown> {
  const sample = structuredClone(model.sample);
  for (const [name, text] of Object.entries(edits)) {
    try {
      set(sample, name, asValue(text, get(model.sample, name)));
    } catch {
      // Half-typed JSON: keep the sample's own value until it reads.
    }
  }
  return sample;
}

// ——— Rendering ———

export interface Rendered {
  subject: string;
  html: string;
  text: string;
  edited: boolean;
}

/** Placeholders that fill the brand row and footer, not the email's own text. */
const NOT_FOR_TEXT = new Set(['amcLogoUrl', 'iconBaseUrl', 'notificationSettingsUrl']);

/**
 * The sample with every value replaced by its own placeholder (`${findings.total.count}`), so the
 * email shows what a developer writes. A list keeps one item, named for the loop that repeats it
 * (`${finding.id}`). The logo, badges and an image's source keep their real values, so nothing breaks.
 */
function placeholderSample(doc: Doc, base: Record<string, unknown>): Record<string, unknown> {
  const loops = new Map<string, string>();
  const keep = new Set(NOT_FOR_TEXT);
  const scan = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === 'object' && !(value instanceof Vtl) && !(value instanceof Cond)) {
      const each = (value as { each?: { list?: string; as?: string } }).each;
      if (each?.list && each.as) loops.set(each.list, each.as);
      if ((value as { kind?: string }).kind === 'image') namesIn((value as { src?: unknown }).src).forEach((n) => keep.add(n));
      Object.values(value).forEach(scan);
    }
  };
  scan(doc);
  const walk = (value: unknown, path: string): unknown => {
    if (Array.isArray(value)) return value.length ? [walk(value[0], loops.get(path) ?? 'item')] : [];
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, `${path}.${k}`)]));
    return value === undefined || value === null ? value : `\${${path}}`;
  };
  const out = { ...base };
  for (const [key, value] of Object.entries(base)) if (!keep.has(key)) out[key] = walk(value, key);
  return out;
}

/** What fills the placeholders: the sample values, or (the template view) their own names. */
export type View = 'template' | 'sample';

function render(model: Model, layout: string, saved: Saved, scheme: 'light' | 'dark', view: View = 'sample'): Rendered {
  const blocks = saved.doc.blocks.map((b, i) => ({ ...b, ref: i })).filter((b) => !b.hidden);
  const email = { ...saved.doc, blocks } as Email;
  const values = withSample(model, saved.sample);
  const sample = view === 'template' ? placeholderSample(saved.doc, values) : values;
  return {
    subject: fill(richText(email.subject), sample).output,
    html: pinScheme(fill(toHtml(email, { annotate: true }), sample).output, scheme).replace('<head>', '<head><base target="_blank">'),
    text: fill(toText(email), sample).output,
    edited: isEdited(model, layout, saved),
  };
}

// ——— Changes, to paste back ———

/** A block's text in full, for the list of changes: a paragraph or quote as written, others summed up. */
const wording = (block: Block) =>
  block.kind === 'text' || block.kind === 'quote' ? asForm(block.text).text.replace(/\s+/g, ' ').trim() : summary(block);

function changesText(model: Model, layout: string, version: string, saved: Saved): string {
  const before = original(model, layout);
  const after = saved.doc;
  const shown = (rich: Rich | undefined) => (rich === undefined ? '(none)' : asForm(rich).text);
  const lines = [`Changes to ${model.id}${layout === 'default' ? '' : ` (${layout} layout)`}${version === 'v0' ? '' : ` in ${version.toUpperCase()}`}:`];
  const top: [string, Rich | undefined, Rich | undefined][] = [
    ['Subject', before.subject, after.subject],
    ['Inbox preview line', before.preview, after.preview],
    ['Eyebrow', before.eyebrow, after.eyebrow],
    ['Title', before.title, after.title],
    ['Subtitle', before.subtitle, after.subtitle],
    ['Button', before.action.label, after.action.label],
    ['Second link', before.secondary?.label, after.secondary?.label],
    ['Footer', before.reason, after.reason],
  ];
  for (const [name, a, b] of top) if (shown(a) !== shown(b)) lines.push(`- ${name}: "${shown(a)}" → "${shown(b)}"`);
  if (before.tone !== after.tone) lines.push(`- Tone: ${before.tone} → ${after.tone}`);

  const kept = after.blocks.filter((b) => b.from !== undefined).map((b) => b.from!);
  for (const [i, block] of before.blocks.entries())
    if (!kept.includes(i)) lines.push(`- Deleted block ${i + 1} (${kindName(block)}): "${summary(block)}"`);
  if (kept.some((from, i) => i > 0 && from < kept[i - 1]!))
    lines.push(`- New block order: ${after.blocks.map((b) => (b.from === undefined ? `new ${kindName(b)}` : `${b.from + 1} (${kindName(b)})`)).join(', ')}`);
  const plain = (b: BuiltBlock) => JSON.stringify({ ...b, from: undefined, hidden: undefined, ref: undefined }, marked);
  for (const block of after.blocks) {
    if (block.from === undefined) {
      lines.push(`- Added ${kindName(block)}: "${wording(block)}"`);
      continue;
    }
    const was = before.blocks[block.from]!;
    if (block.hidden) lines.push(`- Hid block ${block.from + 1} (${kindName(was)}): "${summary(was)}"`);
    if (plain(block) !== plain(was)) lines.push(`- Changed block ${block.from + 1} (${kindName(was)}): "${wording(was)}" → "${wording(block)}"`);
  }
  const samples = Object.entries(saved.sample);
  if (samples.length)
    lines.push('', 'Sample values', ...samples.map(([name, text]) => `- ${name}: ${JSON.stringify(asText(get(model.sample, name)))} → ${JSON.stringify(text)}`));
  return lines.length > 1 ? lines.join('\n') : `${lines[0]} none.`;
}

// ——— The builder ———

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text) node.textContent = text;
  return node;
}

/** A labelled text box: one line, or a paragraph box for long or multi-line text. */
function textBox(label: string, value: string, change: (text: string) => void, options: { long?: boolean; hint?: string } = {}) {
  const wrap = el('label', { class: 'b-f' });
  if (label) wrap.append(el('span', { class: 'b-l' }, label));
  if (options.hint) wrap.append(el('span', { class: 'b-h' }, options.hint));
  const long = options.long ?? (value.length > 56 || value.includes('\n'));
  const box = long ? el('textarea', { rows: String(Math.min(8, Math.max(2, Math.ceil(value.length / 52) + value.split('\n').length - 1))) }) : el('input', { type: 'text' });
  box.value = value;
  box.addEventListener('input', () => change(box.value));
  wrap.append(box);
  return wrap;
}

/** A field for rich text: edits come back as rich text with the original's placeholders and kept parts. */
function richBox(label: string, rich: Rich | undefined, change: (rich: Rich) => void, options: { long?: boolean; hint?: string } = {}) {
  const form = asForm(rich);
  return textBox(label, form.text, (text) => change(fromForm(text, form)), options);
}

export interface Builder {
  /** Selects a part by its preview marker (a block's index, or `heading`, `button`, `footer`), or nothing. */
  select(part: string | null): void;
  /** The part selected, if any. */
  selected(): string | null;
}

/**
 * Puts the builder for an email's layout in `container`. `rendered` gets the email rendered with the
 * changes, on every change (they're saved first).
 */
export function mount(
  container: HTMLElement,
  model: Model,
  layout: string,
  scheme: 'light' | 'dark',
  rendered: (r: Rendered) => void,
  version = 'v0',
): Builder {
  const saved = load(model, layout, version);
  const doc = saved.doc;
  let open: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  container.replaceChildren();
  const bar = el('div', { class: 'b-bar' });
  const copyButton = el('button', { type: 'button' }, 'Copy changes');
  const status = el('span', { class: 'b-s' });
  bar.append(copyButton, status);
  const list = el('div', { class: 'b-list' });
  container.append(bar, el('p', { class: 'b-n' }, 'Click a part of the email, or a card, to edit it. {name} is a placeholder, **text** is bold, and [optional: …] only shows when its value is there. Changes stay in this browser.'), list);

  /** Saves, then renders: at once, or after a short pause while typing. */
  const changed = (now = false) => {
    save(model, layout, version, saved);
    clearTimeout(timer);
    const run = () => {
      try {
        rendered(render(model, layout, saved, scheme));
        status.textContent = '';
      } catch (error) {
        status.textContent = `Can’t render this yet: ${(error as Error).message}`;
      }
    };
    if (now) run();
    else timer = setTimeout(run, 120);
  };
  /** A change to the cards themselves: save, render and draw them again. */
  const rebuilt = () => {
    changed(true);
    draw();
  };

  copyButton.addEventListener('click', async () => {
    const text = changesText(model, layout, version, saved);
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = isEdited(model, layout, saved) ? 'Copied' : 'No changes yet';
    } catch {
      status.textContent = 'Couldn’t copy: select the text below';
      list.append(el('pre', {}, text));
    }
  });

  /** A sample-value field. */
  const sampleBox = (name: string) => {
    const field = model.fields[name]!;
    const original = asText(get(model.sample, name));
    return textBox(name, saved.sample[name] ?? original, (text) => {
      if (text === original) delete saved.sample[name];
      else saved.sample[name] = text;
      changed();
    }, { hint: `${field.about}${field.optional ? ' (optional)' : ''}`, long: original.includes('\n') });
  };

  /** The sample values of the placeholders a part uses, inside its card. */
  const samplesFor = (value: unknown, body: HTMLElement) => {
    const names = [...namesIn(value)].filter((n) => n in model.fields);
    if (!names.length) return;
    const box = el('div', { class: 'b-samples' });
    box.append(el('span', { class: 'b-sub' }, 'Sample values'));
    for (const name of names) box.append(sampleBox(name));
    body.append(box);
  };

  /** Label and value pairs, with rows to add and remove. */
  const pairs = (rows: { label: string; value: Rich }[], body: HTMLElement, noun: string, fresh: () => { label: string; value: Rich }) => {
    const grid = el('div', { class: 'b-rows' });
    grid.append(el('span', { class: 'b-sub' }, 'Label'), el('span', { class: 'b-sub' }, 'Value'), el('span'));
    rows.forEach((row, i) => {
      const label = el('input', { type: 'text', 'aria-label': `${noun} ${i + 1} label` });
      label.value = row.label;
      label.addEventListener('input', () => ((row.label = label.value), changed()));
      const form = asForm(row.value);
      const value = el('input', { type: 'text', 'aria-label': `${noun} ${i + 1} value` });
      value.value = form.text;
      value.addEventListener('input', () => ((row.value = fromForm(value.value, form)), changed()));
      const remove = el('button', { type: 'button', title: `Remove ${noun.toLowerCase()}`, 'aria-label': `Remove ${noun.toLowerCase()} ${i + 1}` }, '✕');
      remove.addEventListener('click', () => (rows.splice(i, 1), rebuilt()));
      grid.append(label, value, remove);
    });
    const add = el('button', { type: 'button', class: 'b-add' }, `＋ Add ${noun.toLowerCase()}`);
    add.addEventListener('click', () => (rows.push(fresh()), rebuilt()));
    body.append(grid, add);
  };

  /** A field for every piece of text in a block the builder has no special editor for. */
  const anyFields = (holder: Record<string, unknown>, body: HTMLElement, label = '') => {
    const SKIP = new Set(['kind', 'tone', 'align', 'rating', 'ratingOf', 'tidy', 'url', 'src', 'each', 'width', 'height', 'nowrap', 'hideOnPhone', 'when', 'quiet', 'from', 'hidden', 'ref']);
    for (const [key, value] of Object.entries(holder)) {
      if (SKIP.has(key) || value === undefined) continue;
      const name = `${label}${label ? ' · ' : ''}${/^\d+$/.test(key) ? Number(key) + 1 : key}`;
      if (isRich(value)) body.append(richBox(name, value as Rich, (r) => ((holder[key] = r), changed())));
      else if (value && typeof value === 'object' && !(value instanceof Cond)) anyFields(value as Record<string, unknown>, body, name);
    }
  };

  /** The editor for one block, by its kind. */
  const blockEditor = (block: BuiltBlock, body: HTMLElement) => {
    if ('each' in block && block.each) body.append(el('p', { class: 'b-n' }, `Repeats for every item in ${block.each.list}.`));
    switch (block.kind) {
      case 'text': {
        body.append(richBox('', block.text, (r) => ((block.text = r), changed()), { long: true }));
        const note = el('label', { class: 'b-check' });
        const check = el('input', { type: 'checkbox' });
        check.checked = !!block.quiet;
        check.addEventListener('change', () => ((block.quiet = check.checked || undefined), rebuilt()));
        note.append(check, ' Note style: smaller and muted');
        body.append(note);
        break;
      }
      case 'quote':
        body.append(textBox('Label', block.label ?? '', (t) => ((block.label = t || undefined), changed())));
        body.append(richBox('Text', block.text, (r) => ((block.text = r), changed()), { long: true }));
        break;
      case 'details':
        pairs(block.rows as { label: string; value: Rich }[], body, 'Row', () => ({ label: 'Label', value: 'Value' }));
        break;
      case 'stats':
        pairs(block.items as { label: string; value: Rich }[], body, 'Stat', () => ({ label: 'Label', value: '0' }));
        break;
      case 'list':
        body.append(richBox('Label', block.label, (r) => ((block.label = r), changed())));
        if ('items' in block)
          body.append(
            textBox('Items, one per line', block.items.map((i) => asForm(i).text).join('\n'), (t) => {
              (block as { items: Rich[] }).items = t.split('\n').filter((line) => line.trim());
              changed();
            }, { long: true }),
          );
        else body.append(richBox('Each item', block.item, (r) => (((block as { item: Rich }).item = r), changed())));
        break;
      case 'image':
        body.append(textBox('Description (alt text)', asForm(block.alt as Rich).text, (t) => ((block.alt = t), changed())));
        break;
      default:
        anyFields(block as unknown as Record<string, unknown>, body);
    }
    samplesFor(block, body);
  };

  /** A card: its header (name, summary, actions) and, when it's the open one, its editor. */
  const card = (key: string, name: string, line: string, fill: (body: HTMLElement) => void, actions?: HTMLElement) => {
    const node = el('div', { class: `b-card${open === key ? ' b-open' : ''}`, 'data-key': key });
    const head = el('div', { class: 'b-head' });
    const toggle = el('button', { type: 'button', class: 'b-t', 'aria-expanded': String(open === key) });
    toggle.append(el('span', { class: 'b-k' }, name), el('span', { class: 'b-line' }, line));
    toggle.addEventListener('click', () => select(open === key ? null : key));
    head.append(toggle);
    if (actions) head.append(actions);
    node.append(head);
    if (open === key) {
      const body = el('div', { class: 'b-body' });
      fill(body);
      node.append(body);
    }
    return node;
  };

  const blockActions = (i: number) => {
    const blocks = doc.blocks;
    const block = blocks[i]!;
    const box = el('span', { class: 'b-acts' });
    const act = (label: string, title: string, run: () => void, disabled = false) => {
      const b = el('button', { type: 'button', title, 'aria-label': `${title}: block ${i + 1}` }, label);
      b.disabled = disabled;
      b.addEventListener('click', () => (run(), rebuilt()));
      box.append(b);
    };
    const move = (to: number) => {
      blocks.splice(to, 0, blocks.splice(i, 1)[0]!);
      if (open === String(i)) open = String(to);
    };
    act('↑', 'Move up', () => move(i - 1), i === 0);
    act('↓', 'Move down', () => move(i + 1), i === blocks.length - 1);
    act(block.hidden ? 'Show' : 'Hide', block.hidden ? 'Show' : 'Hide', () => (block.hidden = !block.hidden || undefined));
    act('⧉', 'Duplicate', () => blocks.splice(i + 1, 0, { ...copy(block), from: undefined }));
    act('✕', 'Delete', () => {
      blocks.splice(i, 1);
      open = null;
    });
    return box;
  };

  const draw = () => {
    list.replaceChildren(
      card('subject', 'Subject', asForm(doc.subject).text, (body) => {
        body.append(richBox('Subject', doc.subject, (r) => ((doc.subject = r), changed())));
        body.append(richBox('Inbox preview line', doc.preview, (r) => ((doc.preview = r), changed()), { long: true }));
        samplesFor([doc.subject, doc.preview], body);
      }),
      card('heading', 'Heading', `${doc.eyebrow} · ${asForm(doc.title).text}`, (body) => {
        body.append(textBox('Eyebrow', doc.eyebrow, (t) => ((doc.eyebrow = t), changed())));
        body.append(richBox('Title', doc.title, (r) => ((doc.title = r), changed())));
        body.append(richBox('Subtitle', doc.subtitle, (r) => ((doc.subtitle = asForm(r).text ? r : undefined), changed())));
        const tone = el('label', { class: 'b-f' });
        tone.append(el('span', { class: 'b-l' }, 'Tone'));
        const pick = el('select');
        const TONE_NAMES = { accent: 'Accent (purple)', ok: 'OK (green)', warn: 'Warning (amber)', danger: 'Danger (red)' };
        for (const [value, name] of Object.entries(TONE_NAMES)) pick.append(el('option', { value }, name));
        pick.value = doc.tone;
        pick.addEventListener('change', () => ((doc.tone = pick.value as Doc['tone']), changed(true)));
        tone.append(pick);
        body.append(tone);
        samplesFor([doc.title, doc.subtitle], body);
      }),
    );

    doc.blocks.forEach((block, i) => {
      const node = card(String(i), kindName(block), summary(block) || '(empty)', (body) => blockEditor(block, body), blockActions(i));
      if (block.hidden) node.classList.add('b-hidden');
      if (block.when) node.querySelector('.b-k')!.append(el('span', { class: 'b-tag', title: 'Only shows when its value is there' }, 'optional'));
      list.append(node);
    });

    const add = el('div', { class: 'b-addblock' });
    const addButton = el('button', { type: 'button' }, open !== null && /^\d+$/.test(open) ? '＋ Add block below the open one' : '＋ Add block');
    const menu = el('div', { class: 'b-menu' });
    menu.hidden = true;
    for (const name of Object.keys(NEW_BLOCKS)) {
      const b = el('button', { type: 'button' }, name);
      b.addEventListener('click', () => {
        const at = open !== null && /^\d+$/.test(open) ? Number(open) + 1 : doc.blocks.length;
        doc.blocks.splice(at, 0, NEW_BLOCKS[name]!() as BuiltBlock);
        open = String(at);
        rebuilt();
      });
      menu.append(b);
    }
    addButton.addEventListener('click', () => (menu.hidden = !menu.hidden));
    add.append(addButton, menu);
    list.append(add);

    list.append(
      card('button', 'Button', asForm(doc.action.label).text, (body) => {
        body.append(richBox('Button label', doc.action.label, (r) => ((doc.action.label = r), changed())));
        body.append(richBox('Button link', doc.action.url as Rich, (r) => ((doc.action.url = r as typeof doc.action.url), changed())));
        if (doc.secondary) {
          const second = doc.secondary;
          body.append(richBox('Second link', second.label, (r) => ((second.label = r), changed())));
        }
        samplesFor([doc.action, doc.secondary], body);
      }),
      card('footer', 'Footer', asForm(doc.reason).text, (body) => {
        body.append(richBox('Why they got it', doc.reason, (r) => ((doc.reason = r), changed()), { long: true }));
        samplesFor(doc.reason, body);
      }),
      card('more', 'All sample values', 'What fills each placeholder', (body) => {
        body.append(el('p', { class: 'b-n' }, 'Clear one to see the email without it.'));
        for (const name of Object.keys(model.fields)) body.append(sampleBox(name));
      }),
    );
  };

  const select = (key: string | null) => {
    open = key;
    draw();
    changed(true);
    if (key) list.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  draw();
  changed(true);
  return { select, selected: () => open };
}

/**
 * Wires a freshly rendered preview to the builder: hovering a part outlines it, clicking selects
 * it, and the selected part stays outlined.
 */
export function connect(frame: HTMLIFrameElement, builder: Builder, accent: string) {
  const doc = frame.contentDocument;
  if (!doc?.head) return;
  const style = doc.createElement('style');
  style.textContent = `[data-block],[data-part]{cursor:pointer}[data-block]:hover>td,[data-part]:hover>td,td[data-part]:hover{outline:1px dashed ${accent};outline-offset:2px}[data-sel]>td,td[data-sel]{outline:2px solid ${accent}!important;outline-offset:2px}`;
  doc.head.append(style);
  const part = builder.selected();
  if (part !== null) {
    const selector = /^\d+$/.test(part) ? `[data-block="${part}"]` : `[data-part="${part}"]`;
    doc.querySelectorAll(selector).forEach((n) => n.setAttribute('data-sel', ''));
  }
  doc.addEventListener('click', (e) => {
    const hit = (e.target as Element).closest('[data-block],[data-part]');
    if (!hit) return;
    e.preventDefault();
    const key = hit.getAttribute('data-block') ?? hit.getAttribute('data-part')!;
    builder.select(builder.selected() === key ? null : key);
  });
}

export { changesText };

// ——— The V1 edit form ———
// A form on the email itself: Subject, Body as text a developer writes (see body.ts), and a call to
// action. Save applies it, Cancel drops it, Reset goes back to the template. The title, eyebrow
// and footer stay as the template has them.

type Cta = 'none' | 'button' | 'link';

export interface Form {
  /** Opens the form on the email. */
  open(): void;
  /** Shows the email with its placeholders (`template`) or with sample values (`sample`). */
  setView(view: View): void;
  /** The email as a file in a format, as it is now (saved changes included). */
  exportFile(kind: ExportKind): ExportFile;
}

/**
 * Puts the Edit button and form in `stage` (which holds the preview frame, an `.ebtn` button and a
 * `.formhost`). `rendered` gets the email rendered with the saved changes, on mount and on every Save.
 */
export function mountForm(
  stage: HTMLElement,
  model: Model,
  layout: string,
  scheme: 'light' | 'dark',
  rendered: (r: Rendered) => void,
  version = 'v1',
  initialView: View = 'template',
  viewChanged: (view: View) => void = () => {},
): Form {
  const saved = load(model, layout, version);
  let view: View = initialView;
  const engine = (layoutOf(model, layout).email.engine ?? 'velocity') as Engine;
  const frame = stage.querySelector('iframe') as HTMLIFrameElement;
  const host = stage.querySelector('.formhost') as HTMLElement;
  const editButton = (stage.querySelector('.ebtn') ?? document.getElementById('editBtn')) as HTMLButtonElement;
  host.dataset.scheme = scheme;
  const show = () => rendered(render(model, layout, saved, scheme, view));
  const previewButton = document.getElementById('previewBtn');
  const exportWrap = document.querySelector('.expwrap') as HTMLElement | null;

  const close = () => {
    if (previewButton) previewButton.hidden = false;
    if (exportWrap) exportWrap.hidden = false;
    host.hidden = true;
    host.replaceChildren();
    frame.hidden = false;
    editButton.hidden = false;
  };

  const open = () => {
    const doc = saved.doc;
    const link = doc.action ?? doc.secondary;
    const initial = {
      subject: serializeRich(doc.subject),
      body: blocksToMarkdown(doc.blocks),
      cta: (doc.action ? 'button' : doc.secondary ? 'link' : 'none') as Cta,
      label: serializeRich(link?.label),
      url: hrefToText(link?.url),
    };
    const originals = [...doc.blocks];

    const form = el('div', { class: 'fm' });

    // Brand row, with the branding link.
    const brand = el('div', { class: 'fm-brand' });
    const logo = el('img', { alt: '', height: '28' });
    logo.src = String(saved.sample.amcLogoUrl ?? model.sample.amcLogoUrl ?? '');
    const customize = el('button', { type: 'button', class: 'fm-link' }, '⚙ Customize Branding');
    brand.append(logo, el('span', { class: 'fm-name' }, 'ArmorCode'), customize);
    const branding = el('div', { class: 'fm-box' });
    branding.hidden = true;
    const brandingInput = el('input', { type: 'text', 'aria-label': 'Logo URL' });
    brandingInput.value = String(saved.sample.amcLogoUrl ?? model.sample.amcLogoUrl ?? '');
    brandingInput.addEventListener('input', () => {
      logo.src = brandingInput.value;
      if (brandingInput.value === String(model.sample.amcLogoUrl ?? '')) delete saved.sample.amcLogoUrl;
      else saved.sample.amcLogoUrl = brandingInput.value;
      save(model, layout, version, saved);
      show();
    });
    branding.append(el('span', { class: 'fm-l' }, 'Logo URL'), brandingInput, el('p', { class: 'fm-n' }, 'The image shown beside ArmorCode at the top of every email.'));
    customize.addEventListener('click', () => (branding.hidden = !branding.hidden));

    // Fields, each with an (i) that picks a variable.
    const picker = el('div', { class: 'fm-pick' });
    picker.hidden = true;
    let target: HTMLInputElement | HTMLTextAreaElement | null = null;
    for (const [name, field] of Object.entries(model.fields)) {
      if (NOT_FOR_TEXT.has(name)) continue;
      const row = el('button', { type: 'button', class: 'fm-pickrow' });
      row.append(el('code', {}, `\${${name}}`), el('span', {}, field.about));
      row.addEventListener('click', () => {
        if (!target) return;
        const at = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? at;
        const text = `\${${name}}`;
        target.value = target.value.slice(0, at) + text + target.value.slice(end);
        target.focus();
        target.setSelectionRange(at + text.length, at + text.length);
        picker.hidden = true;
      });
      picker.append(row);
    }
    const field = (label: string, box: HTMLInputElement | HTMLTextAreaElement, required = true, pick = false) => {
      const wrap = el('div', { class: 'fm-f' });
      const head = el('div', { class: 'fm-lh' });
      head.append(el('span', { class: 'fm-l' }, `${required ? '* ' : ''}${label}`));
      if (pick) {
        const info = el('button', { type: 'button', class: 'fm-i', title: 'Insert a variable', 'aria-label': `Insert a variable into ${label}` }, 'i');
        info.addEventListener('click', (e) => {
          e.stopPropagation();
          target = box;
          wrap.append(picker);
          picker.hidden = !picker.hidden;
        });
        head.append(info);
      }
      wrap.append(head, box);
      return wrap;
    };
    const subject = el('input', { type: 'text' });
    subject.value = initial.subject;
    const body = el('textarea', { class: 'fm-code', rows: String(Math.min(22, Math.max(8, initial.body.split('\n').length + 2))), spellcheck: 'false' });
    body.value = initial.body;
    const label = el('input', { type: 'text' });
    label.value = initial.label;
    const url = el('input', { type: 'text' });
    url.value = initial.url;

    // Call to action: none, a button, or a quiet link.
    let cta: Cta = initial.cta;
    const ctaWrap = el('div', { class: 'fm-f' });
    ctaWrap.append(el('span', { class: 'fm-l' }, 'Call to action'));
    const ctaSeg = el('span', { class: 'seg' });
    const labelField = field('Button text', label, true);
    const urlField = field('URL', url, true, true);
    const showCta = () => {
      for (const b of ctaSeg.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.cta === cta));
      labelField.hidden = urlField.hidden = cta === 'none';
      labelField.querySelector('.fm-l')!.textContent = `* ${cta === 'link' ? 'Link text' : 'Button text'}`;
    };
    for (const [value, name] of [['none', 'None'], ['button', 'Button'], ['link', 'Link']] as const) {
      const b = el('button', { type: 'button', 'data-cta': value }, name);
      b.addEventListener('click', () => ((cta = value), showCta()));
      ctaSeg.append(b);
    }
    ctaWrap.append(ctaSeg);

    // Save, Cancel, Reset.
    const error = el('p', { class: 'fm-err' });
    error.hidden = true;
    const actions = el('div', { class: 'fm-actions' });
    const saveButton = el('button', { type: 'button', class: 'fm-primary' }, 'Save');
    const cancelButton = el('button', { type: 'button' }, 'Cancel');
    const resetButton = el('button', { type: 'button', class: 'fm-reset' }, 'Reset');
    actions.append(saveButton, cancelButton, resetButton);

    const fail = (message: string) => {
      error.textContent = message;
      error.hidden = false;
    };
    saveButton.addEventListener('click', () => {
      if (!subject.value.trim() || !body.value.trim()) return fail('Subject and Body are required.');
      if (cta !== 'none' && (!label.value.trim() || !url.value.trim())) return fail(`${cta === 'link' ? 'Link text' : 'Button text'} and URL are required.`);
      try {
        // Only what changed is rebuilt, so the rest of the email stays exactly as the template has it.
        if (subject.value !== initial.subject) doc.subject = parseRich(subject.value, engine);
        if (body.value !== initial.body) doc.blocks = markdownToBlocks(body.value, originals, engine, copy) as BuiltBlock[];
        if (cta !== initial.cta || label.value !== initial.label || url.value !== initial.url) {
          if (cta === 'none') {
            delete doc.action;
            delete doc.secondary;
          } else {
            const next = { label: parseRich(label.value, engine), url: parseHref(url.value, engine) };
            if (cta === 'button') {
              doc.action = next;
              if (initial.cta === 'link') delete doc.secondary;
            } else {
              doc.secondary = next;
              delete doc.action;
            }
          }
        }
        render(model, layout, saved, scheme);
      } catch (problem) {
        return fail(`Can’t save this yet: ${(problem as Error).message}`);
      }
      save(model, layout, version, saved);
      close();
      // After a Save the email shows its template again, with the new wording.
      view = 'template';
      viewChanged(view);
      show();
    });
    cancelButton.addEventListener('click', close);
    resetButton.addEventListener('click', () => {
      clearEdits(model.id, layout, version);
      const fresh = load(model, layout, version);
      saved.doc = fresh.doc;
      saved.sample = fresh.sample;
      show();
      open();
    });

    form.append(
      brand,
      branding,
      field('Subject', subject, true, true),
      field('Body', body, true, true),
      el('p', { class: 'fm-n fm-md' }, 'Markdown: **bold**, [link](url), - list, > quote, # heading, <small>note</small>, and tables for details and stats. <!-- if $name -->…<!-- /if --> shows text only when a value is there.'),
      ctaWrap,
      labelField,
      urlField,
      el('hr', { class: 'fm-rule' }),
      el('p', { class: 'fm-from' }, 'From ArmorCode'),
      error,
      actions,
    );
    showCta();
    host.replaceChildren(form);
    host.hidden = false;
    frame.hidden = true;
    editButton.hidden = true;
    if (previewButton) previewButton.hidden = true;
    if (exportWrap) exportWrap.hidden = true;
    document.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('.fm-pick')) picker.hidden = true;
    });
    subject.focus();
  };

  const exportFile = (kind: ExportKind) => buildExport(model, layout, saved, kind, view);

  // The Export menu: a format per row, to download or copy.
  const exportButton = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('expMenu');
  if (exportButton && exportMenu) {
    const notes: Record<ExportKind, () => string> = {
      html: () => (view === 'template' ? 'The template, with placeholders' : 'With the sample data'),
      markdown: () => 'The whole email, with placeholders',
      json: () => 'The email as structured content',
    };
    const draw = () => {
      exportMenu.replaceChildren();
      for (const [kind, name] of [['html', 'HTML'], ['markdown', 'Markdown'], ['json', 'JSON']] as const) {
        const row = el('div', { class: 'exp-row' });
        const label = el('span', { class: 'exp-l' });
        label.append(el('strong', {}, name), el('span', { class: 'exp-n' }, notes[kind]()));
        const status = el('span', { class: 'exp-s' });
        const download = el('button', { type: 'button' }, 'Download');
        const copy = el('button', { type: 'button' }, 'Copy');
        download.addEventListener('click', () => {
          const file = exportFile(kind);
          downloadFile(file);
          status.textContent = `Saved ${file.name}`;
        });
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(exportFile(kind).text);
            status.textContent = 'Copied';
          } catch {
            status.textContent = 'Couldn’t copy';
          }
        });
        row.append(label, download, copy, status);
        exportMenu.append(row);
      }
    };
    exportButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (exportMenu.hidden) draw();
      exportMenu.hidden = !exportMenu.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('.expwrap')) exportMenu.hidden = true;
    });
  }

  editButton.addEventListener('click', open);
  show();
  return {
    open,
    setView(next) {
      view = next;
      show();
    },
    exportFile,
  };
}

// ——— Export ———

export type ExportKind = 'html' | 'markdown' | 'json';
export interface ExportFile {
  name: string;
  type: string;
  text: string;
}

/** Builder-internal keys, and Velocity code and conditions as text, for the JSON. */
const forJson = (key: string, value: unknown) => {
  if (key === 'from' || key === 'ref' || key === 'hidden') return undefined;
  if (value instanceof Vtl) return vtlText(value);
  if (value instanceof Cond) return { if: value.expr };
  return value;
};

/**
 * The email, as saved, in a format. HTML is the real email (no preview markers): the template with
 * its placeholders while the template view is on, filled with the sample data in Preview. Markdown
 * and JSON are always the template, with placeholders.
 */
function buildExport(model: Model, layout: string, saved: Saved, kind: ExportKind, view: View): ExportFile {
  const base = `${model.id}${layout === 'default' ? '' : `.${layout}`}`;
  const email = { ...saved.doc, blocks: saved.doc.blocks.filter((b) => !b.hidden) } as Email;
  if (kind === 'html') {
    const html = toHtml(email);
    const sample = view === 'sample';
    return { name: `${base}${sample ? '-sample' : ''}.html`, type: 'text/html', text: sample ? fill(html, withSample(model, saved.sample)).output : html };
  }
  if (kind === 'markdown') return { name: `${base}.md`, type: 'text/markdown', text: emailToMarkdown(email) };
  const engine = layoutOf(model, layout).email.engine ?? 'velocity';
  const json = { id: model.id, layout, engine, email, sample: withSample(model, saved.sample) };
  return { name: `${base}.json`, type: 'application/json', text: `${JSON.stringify(json, forJson, 2)}\n` };
}

/** Saves a file from the browser. */
function downloadFile(file: ExportFile) {
  const url = URL.createObjectURL(new Blob([file.text], { type: `${file.type};charset=utf-8` }));
  const link = el('a', { href: url, download: file.name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
