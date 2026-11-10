/**
 * The preview's builder, in the browser: an email as a stack of blocks to edit, add, move, hide and
 * delete, with the email and its plain text rendered again on every change and each part
 * selectable by clicking it in the preview. Changes stay in this browser, per email and layout;
 * nothing is written back to the templates (Copy changes lists them, to make in the template).
 * The preview serves this file, and the modules it imports, with their types stripped.
 */
import { Cond, Vtl } from '../placeholders.ts';
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
const layoutOf = (model: Model, id: string) => model.layouts.find((l) => l.id === id) ?? model.layouts[0]!;

/** The template as written, as a builder document: each block knows where it came from. */
function original(model: Model, layout: string): Doc {
  const doc = copy(layoutOf(model, layout).email) as Doc;
  doc.blocks.forEach((block, i) => (block.from = i));
  return doc;
}

function load(model: Model, layout: string): Saved {
  try {
    const saved = localStorage.getItem(storageKey(model.id, layout));
    if (saved) return JSON.parse(saved, revive) as Saved;
  } catch {
    // Unreadable, or no storage: start from the template.
  }
  return { doc: original(model, layout), sample: {} };
}

const isEdited = (model: Model, layout: string, saved: Saved) =>
  Object.keys(saved.sample).length > 0 || JSON.stringify(saved.doc, marked) !== JSON.stringify(original(model, layout), marked);

function save(model: Model, layout: string, saved: Saved) {
  try {
    if (isEdited(model, layout, saved)) localStorage.setItem(storageKey(model.id, layout), JSON.stringify(saved, marked));
    else localStorage.removeItem(storageKey(model.id, layout));
  } catch {
    // Storage can be off (a private window); changes then last until the page reloads.
  }
}

/** Whether an email layout has changes saved in this browser. */
export function hasEdits(id: string, layout: string): boolean {
  try {
    return localStorage.getItem(storageKey(id, layout)) !== null;
  } catch {
    return false;
  }
}

/** Drops an email layout's changes, back to the template as written. */
export function clearEdits(id: string, layout: string) {
  try {
    localStorage.removeItem(storageKey(id, layout));
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

function render(model: Model, layout: string, saved: Saved, scheme: 'light' | 'dark'): Rendered {
  const blocks = saved.doc.blocks.map((b, i) => ({ ...b, ref: i })).filter((b) => !b.hidden);
  const email = { ...saved.doc, blocks } as Email;
  const sample = withSample(model, saved.sample);
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

function changesText(model: Model, layout: string, saved: Saved): string {
  const before = original(model, layout);
  const after = saved.doc;
  const shown = (rich: Rich | undefined) => (rich === undefined ? '(none)' : asForm(rich).text);
  const lines = [`Changes to ${model.id}${layout === 'default' ? '' : ` (${layout} layout)`}:`];
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
export function mount(container: HTMLElement, model: Model, layout: string, scheme: 'light' | 'dark', rendered: (r: Rendered) => void): Builder {
  const saved = load(model, layout);
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
    save(model, layout, saved);
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
    const text = changesText(model, layout, saved);
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
