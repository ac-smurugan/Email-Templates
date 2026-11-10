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
           html        ;
           text        ;
  constructor(html        , text = html) {
    this.html = html;
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

/** A condition, as `#if( … )` takes it. */
export class Cond {
           expr        ;
  constructor(expr        ) {
    this.expr = expr;
  }
}

/**
 * On: values in the HTML go through the EscapeTool (`$esc.html(…)`), which the backend's Velocity
 * context must then provide as `esc`. Off: they go in as they are, as they do today.
 */
export const ESCAPE_HTML = false;

const ref = (name        ) => `$${name}`;

/**
 * A value: `${username}`, `${project.name}`. Empty when it's missing: `$!{…}` is Velocity's quiet
 * reference, which prints nothing for a null instead of the reference itself.
 */
export const v = (name        ) =>
  new Vtl(ESCAPE_HTML ? `$!esc.html(${ref(name)})` : `$!{${name}}`, `$!{${name}}`);

/** The number of items in a list: `${projects.size()}`. */
export const size = (list        ) => new Vtl(`$!{${list}.size()}`);

/** The value is there: not null, not false, not empty. */
export const present = (name        ) => new Cond(ref(name));
/** A yes/no; missing counts as no. */
export const flag = (name        ) => new Cond(ref(name));
/** A number is there and more than `n`. */
export const above = (name        , n        ) => new Cond(`${ref(name)} && ${ref(name)} > ${n}`);
/** A number is exactly `n`. */
export const equals = (name        , n        ) => new Cond(`${ref(name)} == ${n}`);
/** A list has exactly `n` items. */
export const sizeIs = (list        , n        ) => new Cond(`${ref(list)}.size() == ${n}`);
/** A value is this text. */
export const is = (name        , text        ) => new Cond(`${ref(name)} == "${text.replace(/["\\]/g, '\\$&')}"`);
/** Both hold. */
export const and = (...conds        ) => new Cond(conds.map((c) => `(${c.expr})`).join(' && '));
/** Doesn't hold. */
export const not = (cond      ) => new Cond(`!(${cond.expr})`);

export const ifOpen = (cond      ) => new Vtl(`#if(${cond.expr})`);
export const elseIf = (cond      ) => new Vtl(`#elseif(${cond.expr})`);
export const ELSE = new Vtl('#{else}');
export const IF_CLOSE = new Vtl('#{end}');

/** Repeats rows: `#foreach($project in $projects)`. A row reads its fields with `v('project.name')`. */
                       
               
             
 
export const loop = (list        , as        )       => ({ list, as });
export const listOpen = (l      ) => new Vtl(`#foreach(${ref(l.as)} in ${ref(l.list)})`);
export const LIST_CLOSE = new Vtl('#{end}');
/** Inside a `#foreach`: there's another item after this one (`$foreach.hasNext`, Velocity 1.7 and later). */
export const HAS_NEXT = new Cond('$foreach.hasNext');
/** Inside a `#foreach`: this is a multiple of `n`, and not the last item: the end of a row of `n`. */
export const rowEnd = (n        ) => new Cond(`$foreach.count % ${n} == 0 && $foreach.hasNext`);

/**
 * For the background-jobs emails, which are filled by plain `${name}` substitution, not Velocity:
 * `${name}`, or `${name:-default}`. Conditions, loops and quiet references don't work there.
 */
export const plain = (name        , fallback         ) => new Vtl(`\${${name}${fallback !== undefined ? `:-${fallback}` : ''}}`);

/** A value with a rating name to color: its opening tag for the HTML, and the rating's name. */
                            
                
               
 

/**
 * A value, tidied: a whole number the backend sends as `328.0` is shown as `328`, and (in the HTML)
 * a rating name (Critical, High, …) is wrapped in `ratings`' opening tag. Anything else is shown
 * as it is, so dates, text and versions like `v2.0` are never touched. `$acV` is this construct's
 * own variable.
 */
export function tidy(name        , ratings                       = [])      {
  const set = `#set($acV = "$!{${name}}")#if($acV.matches("^\\d+\\.0$"))#set($acV = $acV.substring(0, $acV.length() - 2))#end`;
  const shown = ESCAPE_HTML ? '$!esc.html($acV)' : '$acV';
  const colored = ratings.length
    ? `${ratings.map((r, i) => `#${i ? 'elseif' : 'if'}($acV == "${r.value}")${r.open}${shown}</span>`).join('')}#{else}${shown}#{end}`
    : shown;
  return new Vtl(`${set}${colored}`, `${set}$acV`);
}
