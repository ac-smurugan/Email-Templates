/**
 * Escaping. The `markup` tag escapes whatever text is interpolated into it, unless it's `Html` this
 * package built or Velocity code (`Vtl`), which go in as they are. A template never
 * concatenates text into markup by hand.
 */
import { Vtl } from './placeholders.js';

const ENTITIES                         = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text safe to put in HTML content or a quoted attribute. */
export function escape(value        )         {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] );
}

/** Markup this package built itself, so it isn't escaped again. */
export class Html {
           value        ;
  constructor(value        ) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

                                                                                               

function piece(value       )         {
  if (value instanceof Html) return value.value;
  if (value instanceof Vtl) return value.html;
  if (Array.isArray(value)) return value.map(piece).join('');
  if (value === null || value === undefined || value === false) return '';
  return escape(String(value));
}

/** A template literal for markup: text is escaped; `Html`, `Vtl` and arrays of them go in as they are. */
export function markup(strings                      , ...values         )       {
  let out = strings[0] ;
  values.forEach((value, i) => (out += piece(value) + strings[i + 1] ));
  return new Html(out);
}

/**
 * A link's address: a placeholder as it is (the backend supplies it), or fixed text only if it's
 * http or https, so a mistyped `javascript:` link goes nowhere.
 */
export function safeUrl(value              )               {
  if (value instanceof Vtl) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : 'about:blank';
  } catch {
    return 'about:blank';
  }
}
