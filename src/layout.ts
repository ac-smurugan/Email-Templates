import { Html, markup, safeUrl, type Piece } from './escape.ts';
import { Cond, ELSE, Vtl, IF_CLOSE, LIST_CLOSE, elseIf, ifOpen, is, listOpen, plain, v, type Loop } from './placeholders.ts';
import {
  DARK,
  FONT,
  LIGHT,
  MSO_FONT,
  RADIUS,
  RATINGS,
  RATING_COLORS,
  RATING_NAMES,
  SPACE,
  TONES,
  WIDTH,
  type,
  type Rating,
  type Tone,
} from './tokens.ts';

// The content model. A template describes its email as an `Email`; the HTML and the plain text are
// both rendered from it, so they always say the same thing.

export type Inline =
  | string
  | Vtl
  | { strong: Rich }
  /** Monospace, for something to type exactly, like a password. */
  | { code: Rich }
  /** A dot in a risk rating's color. */
  | { rating: Rating }
  /** A dot colored by a placeholder holding a rating name ("Critical", "High", …). */
  | { ratingOf: string }
  /** The first branch whose condition holds; `else` (or nothing) when none does. */
  | { choose: readonly (readonly [Cond, Rich])[]; else?: Rich };
export type Rich = Inline | readonly Inline[];

/** Rich text shown only when `cond` holds, or `otherwise`. */
export const when = (cond: Cond, then: Rich, otherwise?: Rich): Inline => ({ choose: [[cond, then]], else: otherwise });

type Each<T> = { items: readonly T[] } | { each: Loop; item: T };

export type Block = (
  /** A paragraph; `quiet` is smaller and muted, for a note. */
  | { kind: 'text'; text: Rich; quiet?: boolean }
  /** Someone's words (a comment, a note), kept as written, in a well. */
  | { kind: 'quote'; text: Rich; label?: string }
  /** Labeled facts in a well; a row with `when` shows only when it holds. */
  | { kind: 'details'; rows: readonly { label: string; value: Rich; when?: Cond }[] }
  /** A short list in a well, under a label. */
  | ({ kind: 'list'; label: Rich; more?: Rich } & Each<Rich>)
  /** Linked items, each with a line under it. */
  | ({ kind: 'items'; more?: Rich } & Each<{ title: Rich; url: Href; meta?: Rich }>)
  /** Headline numbers, with a rating dot and a change under each where there is one. */
  | {
      kind: 'stats';
      items: readonly { label: string; value: Rich; rating?: Rating; change?: Rich; trend?: 'better' | 'worse' | 'same'; when?: Cond }[];
    }
  /** Findings by risk rating, as a bar and a legend. Fixed counts only: the bar is drawn here. */
  | { kind: 'risk'; label: string; counts: Partial<Record<Rating, number>> }
  /** A small table of rows. */
  | ({
      kind: 'table';
      title?: string;
      columns: readonly { label: string; align?: 'left' | 'right' }[];
      more?: Rich;
    } & Each<{ rating?: Rating; ratingOf?: string; cells: readonly Rich[] }>)
) & {
  /** Shown only when this holds. */
  when?: Cond;
};

/**
 * A link's address: a placeholder, fixed text, or both together, like today's
 * `${armorcodeServerUrl}/#/findings/${tenant}/${findingId}`.
 */
export type Href = string | Vtl | readonly (string | Vtl)[];

export interface Link {
  label: Rich;
  url: Href;
}

/** An address for an `href`: fixed text that starts it must be http or https, or it links nowhere. */
function hrefHtml(href: Href): Piece {
  if (!Array.isArray(href)) return safeUrl(href as string | Vtl);
  const first = href[0];
  return typeof first === 'string' && !/^https?:\/\//.test(first) ? 'about:blank' : (href as readonly (string | Vtl)[]);
}

/** An address as plain text. */
const hrefText = (href: Href) => (Array.isArray(href) ? href : [href]).map(String).join('');

export interface Email {
  subject: Rich;
  /** The line inboxes show after the subject. */
  preview: Rich;
  /** What happened, in a word or two, beside a status dot. */
  eyebrow: string;
  tone: Tone;
  title: Rich;
  subtitle?: Rich;
  blocks: readonly Block[];
  /** The one thing to do, as the button. */
  action: Link;
  /** A quieter second link, under the button. */
  secondary?: Link;
  /** Why this person got it, first in the footer. */
  reason: Rich;
  /**
   * `transactional` (a password, an invite): no notification settings. `operational` (mentions,
   * mappings, digests): says notifications are managed in ArmorCode's settings.
   */
  footer: 'transactional' | 'operational';
  /** More footer links, like a scheduled report's unsubscribe link. */
  footerLinks?: readonly Link[];
  /**
   * `substitution`: filled by plain `${name}` substitution (the background-jobs emails), so it uses
   * `plain()` placeholders only, with no conditions or loops. Velocity otherwise.
   */
  engine?: 'velocity' | 'substitution';
}

/** The logo today's background-jobs emails fall back to. */
export const DEFAULT_LOGO_URL = 'https://app.armorcode.com/images/product-logos/app.png';

/** The placeholders the brand row and the footer use, in the email's template language. */
function basePlaceholders(email: Email) {
  return email.engine === 'substitution'
    ? { logoUrl: plain('amcLogoUrl', DEFAULT_LOGO_URL), notificationSettingsUrl: plain('notificationSettingsUrl') }
    : { logoUrl: v('amcLogoUrl'), notificationSettingsUrl: v('notificationSettingsUrl') };
}

export const COMPANY = 'ArmorCode';
/** As today's footers have them. */
export const TERMS_URL = 'https://www.armorcode.com/legal/terms-of-use';
export const PRIVACY_URL = 'https://www.armorcode.com/legal/privacy-policy';
export const ADDRESS = 'ArmorCode Inc. · 2100 Geng Road, Suite 210, Palo Alto, CA 94303 USA';

/** The query the dark scheme hangs on; `pinScheme` swaps it so a preview can show either. */
export const DARK_QUERY = '@media (prefers-color-scheme:dark)';

// ——— Rich text ———

/** Rating names a `ratingOf` placeholder may hold, and the color each gets. Anything else is Unrated. */
const RATING_VALUES: readonly (readonly [string, Rating])[] = [
  ['Critical', 'critical'],
  ['High', 'high'],
  ['Medium', 'moderate'],
  ['Moderate', 'moderate'],
  ['Low', 'minimal'],
  ['Minimal', 'minimal'],
];

function ratingColorOf(name: string): Piece {
  return [
    RATING_VALUES.map(([value, rating], i) => [i ? elseIf(is(name, value)) : ifOpen(is(name, value)), RATING_COLORS[rating]]),
    ELSE,
    RATING_COLORS.unrated,
    IF_CLOSE,
  ];
}

const dot = (color: Piece) => markup`<span style="color:${color}">&#9679;</span>`;

function chooseVtl<T>(inline: Extract<Inline, { choose: unknown }>, render: (rich: Rich) => T): (T | Vtl)[] {
  return [
    ...inline.choose.flatMap(([cond, rich], i) => [i ? elseIf(cond) : ifOpen(cond), render(rich)]),
    ...(inline.else !== undefined ? [ELSE, render(inline.else)] : []),
    IF_CLOSE,
  ];
}

const parts = (rich: Rich) => (Array.isArray(rich) ? rich : [rich]) as readonly Inline[];

function inlineHtml(rich: Rich): Html {
  return markup`${parts(rich).map((part): Piece => {
    if (typeof part === 'string' || part instanceof Vtl) return part;
    if ('strong' in part) return markup`<strong style="font-weight:600">${inlineHtml(part.strong)}</strong>`;
    if ('code' in part)
      return markup`<code style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px">${inlineHtml(part.code)}</code>`;
    if ('rating' in part) return dot(RATING_COLORS[part.rating]);
    if ('ratingOf' in part) return dot(ratingColorOf(part.ratingOf));
    return chooseVtl(part, inlineHtml);
  })}`;
}

/** Rich text as plain text: placeholders and conditions kept, dots dropped with the space after them. */
export function richText(rich: Rich): string {
  return parts(rich)
    .map((part, i, all): string => {
      const prev = all[i - 1];
      const afterDot = typeof prev === 'object' && !(prev instanceof Vtl) && ('rating' in prev || 'ratingOf' in prev);
      if (typeof part === 'string') return afterDot ? part.replace(/^ /, '') : part;
      if (part instanceof Vtl) return part.text;
      if ('strong' in part) return richText(part.strong);
      if ('code' in part) return richText(part.code);
      if ('rating' in part || 'ratingOf' in part) return '';
      return chooseVtl(part, richText).join('');
    })
    .join('');
}

// ——— HTML ———

const css = `:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
body,table,td,th,p,a,h1{font-family:${FONT}}
table{border-collapse:collapse}
img{border:0;outline:none;text-decoration:none}
a{text-decoration:none}
td,p,h1{overflow-wrap:break-word;word-wrap:break-word}
@media (max-width:${WIDTH.phone}px){.zo{padding:${SPACE.canvasPhone}!important}.zp{padding:${SPACE.cardPhone}!important}.zs td{display:block!important;width:auto!important;padding:0 0 14px!important}.zs td:last-child{padding-bottom:0!important}}
${DARK_QUERY}{.zc{background:${DARK.canvas}!important}.zk{background:${DARK.card}!important}.zw{background:${DARK.well}!important}.zf{color:${DARK.fg}!important}.zm{color:${DARK.muted}!important}.za{color:${DARK.link}!important}.zb{background:${DARK.accent}!important}.zt td,.zt th{border-color:${DARK.line}!important}.zg{color:${DARK.better}!important}.zr{color:${DARK.worse}!important}}`;

const MSO = `<!--[if mso]><style>body,table,td,th,p,a,h1{font-family:${MSO_FONT}!important}</style><![endif]-->`;

/** The attributes every layout table carries. */
const T = new Html('role="presentation" cellpadding="0" cellspacing="0"');
const P = `margin:0;${type('body')};color:${LIGHT.fg}`;
const QUIET = `margin:0;${type('small')};color:${LIGHT.muted}`;
const SMALL = `${type('small')};color:${LIGHT.muted}`;

/** Wraps markup in a Velocity condition, when there is one. */
const guard = (cond: Cond | undefined, inner: Html): Html => (cond ? markup`${ifOpen(cond)}${inner}${IF_CLOSE}` : inner);

/** Rows, fixed or repeated by a `#foreach`. */
function eachHtml<T>(each: Each<T>, render: (item: T, i: number) => Html): Html {
  return 'each' in each
    ? markup`${listOpen(each.each)}${render(each.item, 1)}${LIST_CLOSE}`
    : markup`${each.items.map(render)}`;
}

/** A well: the subtle background that sets an area apart, with no border. */
const well = (inner: Html) =>
  markup`<table ${T} width="100%" class="zw" style="background:${LIGHT.well};border-radius:${RADIUS.well}px"><tr><td style="padding:${SPACE.well}">${inner}</td></tr></table>`;

const label = (text: Rich, gap = 4) => markup`<p class="zm" style="margin:0 0 ${gap}px;${SMALL}">${inlineHtml(text)}</p>`;

function blockHtml(block: Block): Html {
  switch (block.kind) {
    case 'text':
      return block.quiet
        ? markup`<p class="zm" style="${QUIET}">${inlineHtml(block.text)}</p>`
        : markup`<p class="zf" style="${P}">${inlineHtml(block.text)}</p>`;
    case 'quote':
      return well(
        markup`${block.label ? label(block.label) : ''}<p class="zf" style="margin:0;${type('detail')};color:${LIGHT.fg};white-space:pre-line">${inlineHtml(block.text)}</p>`,
      );
    case 'details':
      return well(
        markup`<table ${T} width="100%">${block.rows.map((row) =>
          guard(
            row.when,
            markup`<tr><td class="zm" width="112" valign="top" style="padding:3px 12px 3px 0;${SMALL}">${row.label}</td><td class="zf" style="padding:3px 0;font-size:14px;line-height:20px;color:${LIGHT.fg}">${inlineHtml(row.value)}</td></tr>`,
          ),
        )}</table>`,
      );
    case 'list':
      return well(
        markup`${label(block.label)}${eachHtml(block, (item) => markup`<p class="zf" style="margin:0;font-size:14px;line-height:22px;color:${LIGHT.fg}">${inlineHtml(item)}</p>`)}${block.more ? markup`<p class="zm" style="margin:6px 0 0;${SMALL}">${inlineHtml(block.more)}</p>` : ''}`,
      );
    case 'items':
      return markup`<table ${T} width="100%">${eachHtml(
        block,
        (item, i) =>
          markup`<tr><td style="padding-top:${i ? 14 : 0}px"><a class="za" href="${hrefHtml(item.url)}" style="font-size:15px;line-height:22px;font-weight:600;color:${LIGHT.link}">${inlineHtml(item.title)}</a>${item.meta ? markup`<p class="zm" style="${QUIET}">${inlineHtml(item.meta)}</p>` : ''}</td></tr>`,
      )}${block.more ? markup`<tr><td class="zm" style="padding-top:14px;${SMALL}">${inlineHtml(block.more)}</td></tr>` : ''}</table>`;
    case 'stats': {
      const trend = (t: string | undefined) =>
        t === 'better' ? ['zg', LIGHT.better] : t === 'worse' ? ['zr', LIGHT.worse] : ['zm', LIGHT.muted];
      return well(
        markup`<table ${T} width="100%" class="zs"><tr>${block.items.map((stat) => {
          const [cls, color] = trend(stat.trend);
          return markup`<td valign="top" width="${Math.floor(100 / block.items.length)}%" style="padding-right:12px"><p class="zm" style="margin:0;font-size:12px;line-height:16px;color:${LIGHT.muted}">${stat.rating ? markup`${dot(RATING_COLORS[stat.rating])}&nbsp;` : ''}${stat.label}</p><p class="zf" style="margin:2px 0 0;${type('stat')};font-weight:600;color:${LIGHT.fg}">${inlineHtml(stat.value)}</p>${stat.change ? guard(stat.when, markup`<p class="${cls}" style="margin:0;font-size:12px;line-height:16px;color:${color}">${inlineHtml(stat.change)}</p>`) : ''}</td>`;
        })}</tr></table>`,
      );
    }
    case 'risk': {
      const present = RATINGS.filter((r) => block.counts[r]);
      const total = present.reduce((sum, r) => sum + block.counts[r]!, 0);
      const bar = present.map(
        (r) =>
          markup`<td width="${Math.max(1, Math.round((block.counts[r]! / total) * 100))}%" height="6" style="height:6px;background:${RATING_COLORS[r]};font-size:0;line-height:0">&nbsp;</td>`,
      );
      const legend = present.map(
        (r, i) => markup`${i ? markup`&nbsp;&nbsp; ` : ''}${dot(RATING_COLORS[r])}&nbsp;${block.counts[r]!.toLocaleString('en-US')} ${RATING_NAMES[r]}`,
      );
      return markup`${label(block.label, 8)}<table ${T} width="100%" style="border-radius:3px;overflow:hidden"><tr>${bar}</tr></table><p class="zf" style="margin:8px 0 0;${type('small')};color:${LIGHT.fg}">${legend}</p>`;
    }
    case 'table': {
      // Cells inherit the table's type and color, and the dark scheme recolors their lines
      // through the table's class, to keep the markup small.
      const cell = (align: string | undefined) =>
        `padding:9px 12px 9px 0;border-bottom:1px solid ${LIGHT.line}${align === 'right' ? ';text-align:right' : ''}`;
      return markup`${block.title ? label(block.title, 6) : ''}<table ${T} width="100%" class="zf zt" style="font-size:13px;line-height:19px;color:${LIGHT.fg}"><tr>${block.columns.map(
        (column) =>
          markup`<th align="${column.align ?? 'left'}" class="zm" style="${cell(column.align)};font-size:12px;font-weight:500;color:${LIGHT.muted}">${column.label}</th>`,
      )}</tr>${eachHtml(
        block,
        (row) =>
          markup`<tr>${row.cells.map(
            (value, i) =>
              markup`<td style="${cell(block.columns[i]?.align)}">${i === 0 && row.rating ? markup`${dot(RATING_COLORS[row.rating])}&nbsp; ` : ''}${i === 0 && row.ratingOf ? markup`${dot(ratingColorOf(row.ratingOf))}&nbsp; ` : ''}${inlineHtml(value)}</td>`,
          )}</tr>`,
      )}</table>${block.more ? markup`<p class="zm" style="margin:10px 0 0;${SMALL}">${inlineHtml(block.more)}</p>` : ''}`;
    }
  }
}

const row = (top: number, inner: Html) => markup`<tr><td style="padding-top:${top}px">${inner}</td></tr>`;

/** Hidden text after the preview line, so inboxes don't pull the body's first words in after it. */
const SPACER = new Html('&#847;&zwnj;&nbsp;'.repeat(8));

export function toHtml(email: Email): string {
  const base = basePlaceholders(email);
  const button = markup`<table ${T}><tr><td class="zb" bgcolor="${LIGHT.accent}" style="border-radius:${RADIUS.button}px;mso-padding-alt:10px 18px"><a class="zb" href="${hrefHtml(email.action.url)}" style="display:inline-block;padding:10px 18px;border-radius:${RADIUS.button}px;background:${LIGHT.accent};color:#ffffff;font-size:14px;line-height:20px;font-weight:600">${inlineHtml(email.action.label)}</a></td></tr></table>`;
  const content = [
    markup`<tr><td class="zm" style="${SMALL}">${dot(TONES[email.tone])}&nbsp; ${email.eyebrow}</td></tr>`,
    row(
      6,
      markup`<h1 class="zf" style="margin:0;${type('title')};font-weight:600;color:${LIGHT.fg}">${inlineHtml(email.title)}</h1>${email.subtitle ? markup`<p class="zm" style="margin:2px 0 0;${SMALL}">${inlineHtml(email.subtitle)}</p>` : ''}`,
    ),
    email.blocks.map((block, i) => guard(block.when, row(i === 0 ? SPACE.firstBlock : SPACE.block, blockHtml(block)))),
    row(SPACE.button, button),
    email.secondary
      ? row(
          14,
          markup`<p style="margin:0;${type('small')}"><a class="za" href="${hrefHtml(email.secondary.url)}" style="color:${LIGHT.link}">${inlineHtml(email.secondary.label)}</a></p>`,
        )
      : '',
  ];
  const footerLink = (text: Rich, href: Href) =>
    markup`<a class="zm" href="${hrefHtml(href)}" style="color:${LIGHT.muted};text-decoration:underline">${inlineHtml(text)}</a>`;
  const extra = (email.footerLinks ?? []).map((link) => markup`<br>${footerLink(link.label, link.url)}`);
  const settings =
    email.footer === 'operational'
      ? markup`<br>Notifications are managed in ArmorCode’s settings: ${footerLink('Notification settings', base.notificationSettingsUrl)}`
      : '';

  // One line, as mail apps get it: the markup has no whitespace a template didn't put there.
  return markup`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${inlineHtml(email.subject)}</title><style>${new Html(css)}</style>${new Html(MSO)}</head><body class="zc" style="margin:0;padding:0;background:${LIGHT.canvas}"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${inlineHtml(email.preview)}${SPACER}</div><table ${T} width="100%" class="zc" style="background:${LIGHT.canvas}"><tr><td align="center" class="zo" style="padding:${SPACE.canvas}"><!--[if mso]><table ${T} width="${WIDTH.max}"><tr><td><![endif]--><table ${T} width="100%" style="max-width:${WIDTH.max}px"><tr><td style="padding:0 4px 16px"><table ${T}><tr><td style="padding-right:10px"><img src="${base.logoUrl}" height="28" alt="" style="display:block;height:28px;width:auto"></td><td class="zf" style="font-size:14px;line-height:20px;font-weight:600;color:${LIGHT.fg}">${COMPANY}</td></tr></table></td></tr><tr><td class="zk zp" style="background:${LIGHT.card};border-radius:${RADIUS.card}px;padding:${SPACE.card}px;word-break:break-word"><table ${T} width="100%">${content}</table></td></tr><tr><td class="zm" style="padding:20px 4px 0;${type('caption')};color:${LIGHT.muted};word-break:break-word">${inlineHtml(email.reason)}${settings}${extra}<br>${footerLink('Terms', TERMS_URL)} &nbsp;&middot;&nbsp; ${footerLink('Privacy', PRIVACY_URL)}<br>${ADDRESS}</td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`
    .value;
}

// ——— Plain text ———

// Velocity (2.x, space gobbling `lines`, its default) drops a line that holds nothing but a
// directive, newline included, so the text puts each `#if` and `#foreach` on a line of its own, and nothing is left behind when they're empty.

/** Text lines (ending in a newline) shown only when `cond` holds. */
const guardText = (cond: Cond | undefined, text: string) => (cond ? `${ifOpen(cond)}\n${text}${IF_CLOSE}\n` : text);

/** One line of rich text; a line that's wholly one condition becomes a conditional line. */
function lineText(rich: Rich): string {
  const only = parts(rich);
  const single = only.length === 1 ? only[0] : undefined;
  if (single && typeof single === 'object' && 'choose' in single && single.choose.length === 1 && single.else === undefined)
    return guardText(single.choose[0]![0], `${richText(single.choose[0]![1])}\n`);
  return `${richText(rich)}\n`;
}

function eachText<T>(each: Each<T>, render: (item: T) => string): string {
  return 'each' in each ? `${listOpen(each.each)}\n${render(each.item)}${LIST_CLOSE}\n` : each.items.map(render).join('');
}

function blockText(block: Block): string {
  switch (block.kind) {
    case 'text':
      return lineText(block.text);
    case 'quote':
      return `${block.label ? `${block.label}:\n` : ''}${richText(block.text)}\n`;
    case 'details':
      return block.rows.map((row) => guardText(row.when, `${row.label}: ${richText(row.value)}\n`)).join('');
    case 'list':
      return `${richText(block.label)}:\n${eachText(block, (item) => `- ${richText(item)}\n`)}${block.more ? lineText(block.more) : ''}`;
    case 'items':
      return `${eachText(block, (item) => `${richText(item.title)}\n${item.meta ? lineText(item.meta) : ''}${hrefText(item.url)}\n`)}${block.more ? lineText(block.more) : ''}`;
    case 'stats':
      return block.items
        .map((stat) => `${stat.label}: ${richText(stat.value)}${stat.change ? guardText(stat.when, ` (${richText(stat.change)})`).replace(/\n/g, '') : ''}\n`)
        .join('');
    case 'risk':
      return `${block.label}: ${RATINGS.filter((r) => block.counts[r])
        .map((r) => `${block.counts[r]!.toLocaleString('en-US')} ${RATING_NAMES[r]}`)
        .join(', ')}\n`;
    case 'table':
      return `${block.title ? `${block.title}:\n` : ''}${eachText(
        block,
        (row) =>
          `- ${richText(row.cells[0] ?? '')}${row.rating ? ` (${RATING_NAMES[row.rating]})` : ''}${row.cells
            .slice(1)
            .map((value, i) => ` · ${block.columns[i + 1]?.label ?? ''}: ${richText(value)}`)
            .join('')}\n`,
      )}${block.more ? lineText(block.more) : ''}`;
  }
}

export function toText(email: Email): string {
  const base = basePlaceholders(email);
  const head = `${email.eyebrow}\n${lineText(email.title)}${email.subtitle ? lineText(email.subtitle) : ''}`;
  const links = `${richText(email.action.label)}: ${hrefText(email.action.url)}\n${email.secondary ? `${richText(email.secondary.label)}: ${hrefText(email.secondary.url)}\n` : ''}`;
  const footer = [
    lineText(email.reason),
    email.footer === 'operational' ? `Notifications are managed in ArmorCode’s settings: ${base.notificationSettingsUrl}\n` : '',
    ...(email.footerLinks ?? []).map((link) => `${richText(link.label)}: ${hrefText(link.url)}\n`),
    `Terms: ${TERMS_URL}\nPrivacy: ${PRIVACY_URL}\n${ADDRESS}\n`,
  ].join('');
  // Each part ends with its own blank line, inside its condition, so a hidden part leaves no gap.
  const blocks = email.blocks.map((block) => guardText(block.when, `${blockText(block)}\n`));
  return [`${head}\n`, ...blocks, `${links}\n`, `--\n${footer}`].join('');
}

/** For previews: shows the light or the dark scheme whatever the viewer's system uses. */
export function pinScheme(document: string, scheme: 'light' | 'dark'): string {
  return document.split(DARK_QUERY).join(scheme === 'dark' ? '@media all' : '@media not all');
}
