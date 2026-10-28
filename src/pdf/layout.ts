/**
 * The page chrome and CSS every PDF report shares. The backend renders these with openhtmltopdf:
 * CSS 2.1 plus paged media (`@page`, margin boxes, `position: running()`), so there's no flexbox,
 * grid, CSS variables or JS, and tables do the layout. Web fonts may not load, so the font stack
 * ends in Helvetica and Arial. Light only: they're for print.
 *
 * Each helper returns a piece of the Velocity template as a string; the reports write the rest of
 * their Velocity in template literals, as today's files do.
 */
import { ADDRESS, COMPANY } from '../layout.ts';
import { FONT, LIGHT, RADIUS, RATING_COLORS, TONES, TYPE } from '../tokens.ts';

const px = (name: keyof typeof TYPE) => `font-size:${TYPE[name][0]}px;line-height:${TYPE[name][1]}px`;

/**
 * A4 portrait. The content box is 182mm (about 688px at openhtmltopdf's 96px per inch), close to
 * today's 690px reports. The top margin holds the running brand row, the bottom one the footer.
 */
export const PAGE_MARGIN = '22mm 14mm 20mm 14mm';

const CSS = `@page{size:A4 portrait;margin:${PAGE_MARGIN};background-color:${LIGHT.canvas};
@top-center{content:element(pdfHeader);vertical-align:bottom;padding-bottom:4mm}
@bottom-left{content:element(pdfFooter);vertical-align:top;padding-top:4mm}
@bottom-right{content:"Page " counter(page) " of " counter(pages);vertical-align:top;padding-top:4mm;text-align:right;font-family:${FONT};${px('caption')};color:${LIGHT.muted}}}
html,body{margin:0;padding:0;background-color:${LIGHT.canvas}}
body{font-family:${FONT};${px('small')};color:${LIGHT.fg}}
table{border-collapse:collapse;border-spacing:0}
td,th{font-family:${FONT};vertical-align:top;padding:0}
img{border:0}
a{color:${LIGHT.link};text-decoration:none}
p{margin:0}
#pdf-header{position:running(pdfHeader)}
#pdf-footer{position:running(pdfFooter);${px('caption')};color:${LIGHT.muted}}
.brand-logo{padding-right:8px;vertical-align:middle}
.brand-name{font-size:14px;line-height:20px;font-weight:600;color:${LIGHT.fg};vertical-align:middle}
.brand-report{${px('small')};color:${LIGHT.muted};text-align:right;vertical-align:middle}
.card{background-color:${LIGHT.card};border-radius:${RADIUS.card}px;padding:24px 28px;margin:0 0 12px;page-break-inside:avoid}
.card.flow{page-break-inside:auto}
.label{${px('small')};color:${LIGHT.muted};margin:0 0 8px}
.eyebrow{${px('small')};color:${LIGHT.muted};margin:0 0 6px}
.title{${px('title')};font-weight:600;color:${LIGHT.fg};margin:0}
.subtitle{${px('small')};color:${LIGHT.muted};margin:2px 0 0}
.heading{font-size:16px;line-height:22px;font-weight:600;color:${LIGHT.fg};margin:0 0 4px}
.section{margin-top:18px;page-break-inside:avoid}
.section.flow{page-break-inside:auto}
.well{background-color:${LIGHT.well};border-radius:${RADIUS.well}px;padding:14px 16px;page-break-inside:avoid}
.gap{margin-top:12px}
.details{width:100%}
.details td{padding:3px 0;font-size:14px;line-height:20px;color:${LIGHT.fg}}
.details td.k{width:112px;padding-right:12px;${px('small')};color:${LIGHT.muted}}
.stats{width:100%}
.stats td{padding-right:12px}
.stat-label{font-size:12px;line-height:16px;color:${LIGHT.muted}}
.stat-label.two{height:32px}
.score{font-size:15px;line-height:22px;font-weight:600;color:${LIGHT.fg}}
.stat-value{margin-top:2px;${px('stat')};font-weight:600;color:${LIGHT.fg}}
.rows{width:100%;-fs-table-paginate:paginate;font-size:13px;line-height:19px;color:${LIGHT.fg}}
.rows thead{display:table-header-group}
.rows tr{page-break-inside:avoid}
.rows th{padding:9px 12px 9px 0;border-bottom:1px solid ${LIGHT.line};text-align:left;font-size:12px;line-height:16px;font-weight:500;color:${LIGHT.muted}}
.rows td{padding:9px 12px 9px 0;border-bottom:1px solid ${LIGHT.line}}
.rows .end{padding-right:0}
.right{text-align:right}
.nowrap{white-space:nowrap}
.muted{color:${LIGHT.muted}}
.more{margin-top:10px;${px('small')};text-align:right}
.empty{${px('small')};color:${LIGHT.muted}}
.dot{display:inline-block;width:8px;height:8px;border-radius:4px;margin-right:6px}
.trend-up{display:inline-block;width:0;height:0;margin-left:6px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${LIGHT.worse}}
.trend-down{display:inline-block;width:0;height:0;margin-left:6px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${LIGHT.better}}
.trend-flat{display:inline-block;width:10px;height:3px;margin-left:6px;background-color:${RATING_COLORS.unrated}}
.break-content{word-wrap:break-word;white-space:normal}
.prose{font-size:14px;line-height:21px;color:${LIGHT.fg};word-wrap:break-word}
.prose p{margin:0 0 8px}
.prose h1,.prose h2,.prose h3,.prose h4{font-weight:600;color:${LIGHT.fg};margin:14px 0 6px}
.prose h1{font-size:18px;line-height:24px}
.prose h2{font-size:16px;line-height:22px}
.prose h3,.prose h4{font-size:14px;line-height:21px}
.prose img{max-width:100%}
.prose pre{background-color:${LIGHT.well};border-radius:${RADIUS.well}px;padding:10px 12px;white-space:pre-wrap;word-wrap:break-word;font-size:12px;line-height:18px}
.prose pre>code{white-space:pre-wrap;word-wrap:break-word}
.prose table{border-collapse:collapse}
.prose td,.prose th{border-bottom:1px solid ${LIGHT.line};padding:4px 8px 4px 0}
.toc{width:100%;font-size:14px;line-height:20px}
.toc td{padding:8px 0;border-bottom:1px solid ${LIGHT.line}}
.toc tr{page-break-inside:avoid}
.toc .sub{padding-left:16px;font-size:13px}
.toc .sub a{color:${LIGHT.fg}}
.toc .page{width:48px;text-align:right;color:${LIGHT.muted}}
#toc .page-number::after{content:target-counter(attr(href),page)}
.page-break{page-break-after:always}
.part{font-size:16px;line-height:22px;font-weight:600;color:${LIGHT.fg};margin:4px 4px 12px}
.finding-title{font-size:18px;line-height:24px;font-weight:600;margin:0}
.pairs{width:100%}
.pairs td{padding:3px 0;font-size:13px;line-height:19px;color:${LIGHT.fg}}
.pairs td.k{width:20%;padding-right:10px;color:${LIGHT.muted}}
.pairs td.v{width:30%;padding-right:16px}
.pairs tr{page-break-inside:avoid}
.cvss th,.cvss td{font-size:11px;line-height:15px;padding-right:8px}
.docs{margin:0;padding:0 0 0 18px}
.docs li{margin:0 0 8px}
.docs img{max-width:100%}
@media screen{body{display:table;width:182mm;margin:24px auto;padding:0 16px}#pdf-header{margin-bottom:12px}#pdf-footer{display:table-footer-group}}`;
// The `@media screen` rules are for the preview only (openhtmltopdf lays pages out as print):
// there the running header and footer stay in the page's flow, and `display:table-footer-group`
// puts the footer, which comes first in the markup for openhtmltopdf, at the bottom.

/** A dot in a color: a CSS circle, since Helvetica, the PDF's fallback font, has no ● glyph. */
export const dot = (color: string) => `<span class="dot" style="background-color:${color}"></span>`;

/** The accent dot of an eyebrow. */
export const accentDot = dot(TONES.accent);

/**
 * Velocity: sets `$<into>` to the design system's color for the severity or risk rating named by
 * `path` (a reference without its `$`, in any case), or to '' for a name it doesn't know, so a
 * report can fall back to the backend's own colors or tag styles for that one.
 */
export function setRatingColor(into: string, path: string): string {
  const is = (...names: string[]) => names.map((n) => `$acKey == "${n}"`).join(' || ');
  return `#set($acKey = "$!${path}")
#set($acKey = $acKey.toUpperCase())
#if(${is('CRITICAL')})
#set($${into} = '${RATING_COLORS.critical}')
#elseif(${is('HIGH')})
#set($${into} = '${RATING_COLORS.high}')
#elseif(${is('MEDIUM', 'MODERATE')})
#set($${into} = '${RATING_COLORS.moderate}')
#elseif(${is('LOW', 'MINIMAL')})
#set($${into} = '${RATING_COLORS.minimal}')
#elseif(${is('INFO', 'INFORMATIONAL', 'UNRATED', 'NONE')})
#set($${into} = '${RATING_COLORS.unrated}')
#else
#set($${into} = '')
#end
`;
}

/** Velocity: an arrow for a risk trend held by `ref` ("1" worse, "-1" better, else flat), as today. */
export const trend = (ref: string) => `#if(${ref} == "1")
<span class="trend-up"></span>
#elseif(${ref} == "-1")
<span class="trend-down"></span>
#else
<span class="trend-flat"></span>
#end
`;

/** A card: a white panel on the canvas, with a small muted label. `flow` lets a long one break across pages. */
export function card(label: string, inner: string, opts: { id?: string; flow?: boolean; breakAfter?: boolean } = {}): string {
  const cls = ['card', opts.flow ? 'flow' : '', opts.breakAfter ? 'page-break' : ''].filter(Boolean).join(' ');
  return `<div${opts.id ? ` id="${opts.id}"` : ''} class="${cls}">
${label ? `<p class="label">${label}</p>\n` : ''}${inner}
</div>
`;
}

/** Labeled facts in a well. A row is [label, value], or [label, value, Velocity condition]. */
export function details(rows: readonly (readonly [string, string, string?])[]): string {
  return `<div class="well"><table class="details">
${rows
  .map(([k, v, cond]) => {
    const tr = `<tr><td class="k">${k}</td><td>${v}</td></tr>`;
    return cond ? `#if(${cond})\n${tr}\n#end\n` : `${tr}\n`;
  })
  .join('')}</table></div>`;
}

/**
 * Headline numbers in a row: [label, value markup]. Labels get two lines' height when `twoLines`, so
 * values line up when some labels wrap.
 */
export function statRow(items: readonly (readonly [string, string])[], twoLines = false): string {
  const width = Math.floor(100 / items.length);
  const label = twoLines ? 'stat-label two' : 'stat-label';
  return `<table class="stats"><tr>
${items.map(([text, value]) => `<td width="${width}%"><p class="${label}">${text}</p><p class="stat-value">${value}</p></td>`).join('\n')}
</tr></table>`;
}

/** Headline numbers in a well. */
export const stats = (items: readonly (readonly [string, string])[], twoLines = false) =>
  `<div class="well">${statRow(items, twoLines)}</div>`;

/** The top of the first page: an eyebrow, the report's title and its facts. */
export function cover(o: { eyebrow: string; title: string; subtitle?: string; facts?: string }): string {
  return card(
    '',
    `<p class="eyebrow">${accentDot}${o.eyebrow}</p>
<p class="title">${o.title}</p>
${o.subtitle ? `<p class="subtitle">${o.subtitle}</p>\n` : ''}${o.facts ? `<div class="gap">${o.facts}</div>` : ''}`,
  );
}

/**
 * A whole report: the running brand row and footer, then `body`. `prelude` is the Velocity that
 * sets values up before anything prints; `note` goes in the footer above the address.
 */
export function page(o: { report: string; prelude?: string; note?: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>$fileName</title>
<style>
${CSS}
</style>
</head>
<body>
${o.prelude ?? ''}<div id="pdf-header"><table width="100%"><tr>
<td class="brand-logo" width="30"><img src="$armorcodeLogo" height="22" alt=""></td>
<td class="brand-name">${COMPANY}</td>
<td class="brand-report">${o.report}</td>
</tr></table></div>
<div id="pdf-footer">${o.note ? `${o.note}<br>` : ''}${ADDRESS}</div>
${o.body}
</body>
</html>
`;
}
