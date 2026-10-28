/**
 * Velocity, the template language the platform's Java backend fills these emails with. Every
 * Velocity construct the templates use is made here, so a change of syntax is a change to this file
 * alone. Templates never write `$`, `#if` or `#foreach` themselves.
 *
 * What's made here goes into the HTML and the plain text as it is: this package never HTML-escapes
 * it. Velocity doesn't escape what it fills in either, unless `ESCAPE_HTML` is on (see the README).
 */

/** Velocity code, written into the output unescaped: one form for the HTML, one for the text. */
export class Vtl {
  readonly html: string;
  readonly text: string;
  constructor(html: string, text = html) {
    this.html = html;
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

/** A condition, as `#if( … )` takes it. */
export class Cond {
  readonly expr: string;
  constructor(expr: string) {
    this.expr = expr;
  }
}

/**
 * On: values in the HTML go through the EscapeTool (`$esc.html(…)`), which the backend's Velocity
 * context must then provide as `esc`. Off: they go in as they are, as they do today.
 */
export const ESCAPE_HTML = false;

const ref = (name: string) => `$${name}`;

/**
 * A value: `${username}`, `${project.name}`. Empty when it's missing: `$!{…}` is Velocity's quiet
 * reference, which prints nothing for a null instead of the reference itself.
 */
export const v = (name: string) =>
  new Vtl(ESCAPE_HTML ? `$!esc.html(${ref(name)})` : `$!{${name}}`, `$!{${name}}`);

/** The number of items in a list: `${projects.size()}`. */
export const size = (list: string) => new Vtl(`$!{${list}.size()}`);

/** The value is there: not null, not false, not empty. */
export const present = (name: string) => new Cond(ref(name));
/** A yes/no; missing counts as no. */
export const flag = (name: string) => new Cond(ref(name));
/** A number is there and more than `n`. */
export const above = (name: string, n: number) => new Cond(`${ref(name)} && ${ref(name)} > ${n}`);
/** A number is exactly `n`. */
export const equals = (name: string, n: number) => new Cond(`${ref(name)} == ${n}`);
/** A list has exactly `n` items. */
export const sizeIs = (list: string, n: number) => new Cond(`${ref(list)}.size() == ${n}`);
/** A value is this text. */
export const is = (name: string, text: string) => new Cond(`${ref(name)} == "${text.replace(/["\\]/g, '\\$&')}"`);
/** Both hold. */
export const and = (...conds: Cond[]) => new Cond(conds.map((c) => `(${c.expr})`).join(' && '));
/** Doesn't hold. */
export const not = (cond: Cond) => new Cond(`!(${cond.expr})`);

export const ifOpen = (cond: Cond) => new Vtl(`#if(${cond.expr})`);
export const elseIf = (cond: Cond) => new Vtl(`#elseif(${cond.expr})`);
export const ELSE = new Vtl('#{else}');
export const IF_CLOSE = new Vtl('#{end}');

/** Repeats rows: `#foreach($project in $projects)`. A row reads its fields with `v('project.name')`. */
export interface Loop {
  list: string;
  as: string;
}
export const loop = (list: string, as: string): Loop => ({ list, as });
export const listOpen = (l: Loop) => new Vtl(`#foreach(${ref(l.as)} in ${ref(l.list)})`);
export const LIST_CLOSE = new Vtl('#{end}');

/**
 * For the background-jobs emails, which are filled by plain `${name}` substitution, not Velocity:
 * `${name}`, or `${name:-default}`. Conditions, loops and quiet references don't work there.
 */
export const plain = (name: string, fallback?: string) => new Vtl(`\${${name}${fallback !== undefined ? `:-${fallback}` : ''}}`);
