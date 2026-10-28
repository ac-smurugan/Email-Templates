/**
 * Fills a template with sample values, for the preview and the build's checks only: the backend's
 * Velocity does it for real. Covers the Velocity the templates use and throws on anything else, so a
 * template can't use a construct the preview would show wrong:
 *
 * - references, braced or not, quiet or not: `${a.b}`, `$!{a}`, `$a.b`, `$!a.b`, the
 *   `${name:-default}` form of the background-jobs emails, method calls with arguments
 *   (`$m.get("k").toUpperCase()`), and indexes (`$list[$i]`)
 * - `#if` / `#elseif` / `#else` / `#end`, `#foreach($x in …)` and `#set($x = …)`
 * - expressions: refs, "interpolated $strings" (`""` is a quote), 'literal strings', numbers,
 *   true / false / null, `[$a..$b]` ranges, `[a, b]` lists, `+ - * / %`, `== != > < >= <=`,
 *   `&& || !` and parentheses
 *
 * Methods: Java's String (`length()`, `substring(a,b)`, `toUpperCase()`, …), List (`size()`,
 * `get(i)`, …) and Map (`get(k)`, `containsKey(k)`, `keySet()`, …), on JS strings, arrays, Maps and
 * plain objects; and any function a sample value holds (`$URLEncoder.encode($x)`).
 *
 * Like Velocity, it doesn't escape what it fills in.
 */

type Scope = Record<string, unknown>;

type Step = { kind: 'prop'; name: string } | { kind: 'call'; name: string; args: Expr[] } | { kind: 'index'; at: Expr };
interface Ref {
  root: string;
  steps: Step[];
  quiet: boolean;
  fallback?: string;
  /** As written, without `$`, `!` and braces: what `missing` reports. */
  path: string;
}
type Expr =
  | { kind: 'value'; value: unknown }
  | { kind: 'ref'; ref: Ref }
  | { kind: 'string'; parts: (string | Ref)[] }
  | { kind: 'range'; from: Expr; to: Expr }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'not' | 'neg'; of: Expr }
  | { kind: 'op'; op: string; left: Expr; right: Expr };

type Node =
  | { kind: 'text'; text: string }
  | { kind: 'ref'; ref: Ref }
  | { kind: 'if'; branches: { cond: Expr; body: Node[] }[]; otherwise?: Node[] }
  | { kind: 'foreach'; as: string; list: Expr; body: Node[] }
  | { kind: 'set'; name: string; value: Expr };

/** Velocity 2's default space gobbling: a line holding only a directive goes, newline and all. */
const DIRECTIVE_LINE = /^[ \t]*(#\{?(?:if|elseif|foreach|set)\}?\s*\(.*\)|#\{?else\}?|#\{?end\}?)[ \t]*\r?\n/gm;

const IDENT = /[A-Za-z_]\w*/y;

class Parser {
  src: string;
  at = 0;
  constructor(src: string) {
    this.src = src;
  }

  fail(message: string): never {
    throw new Error(`${message} at ${this.at}: ${this.src.slice(this.at, this.at + 40)}`);
  }

  /** Matches `re` (sticky) at the cursor and moves past it. */
  eat(re: RegExp): RegExpExecArray | null {
    const sticky = new RegExp(re.source, re.flags.includes('y') ? re.flags : `${re.flags}y`);
    sticky.lastIndex = this.at;
    const m = sticky.exec(this.src);
    if (m) this.at += m[0].length;
    return m;
  }

  space() {
    this.eat(/\s*/);
  }

  expect(text: string) {
    this.space();
    if (!this.src.startsWith(text, this.at)) this.fail(`Expected ${text}`);
    this.at += text.length;
  }

  // ——— References ———

  /** A reference at the cursor, or null (and the cursor unmoved) when `$` doesn't start one. */
  ref(): Ref | null {
    const start = this.at;
    const head = this.eat(/\$(!?)(\{?)([A-Za-z_]\w*)/);
    if (!head) return null;
    const quiet = head[1] === '!';
    const braced = head[2] === '{';
    const steps: Step[] = [];
    for (;;) {
      if (this.src[this.at] === '.' && /[A-Za-z_]/.test(this.src[this.at + 1] ?? '')) {
        this.at++;
        const name = this.eat(IDENT)![0];
        if (this.src[this.at] === '(') {
          this.at++;
          const args: Expr[] = [];
          this.space();
          if (this.src[this.at] === ')') this.at++;
          else
            for (;;) {
              args.push(this.expr());
              this.space();
              const c = this.src[this.at++];
              if (c === ')') break;
              if (c !== ',') this.fail('Expected , or ) in arguments');
            }
          steps.push({ kind: 'call', name, args });
        } else steps.push({ kind: 'prop', name });
      } else if (this.src[this.at] === '[') {
        this.at++;
        const at = this.expr();
        this.expect(']');
        steps.push({ kind: 'index', at });
      } else break;
    }
    let fallback: string | undefined;
    if (braced) {
      const dflt = this.eat(/:-([^}]*)/);
      if (dflt) fallback = dflt[1];
      if (this.src[this.at] !== '}') this.fail('Unclosed ${');
      this.at++;
    }
    const written = this.src.slice(start, this.at);
    const path = written.replace(/^\$!?\{?/, '').replace(/(:-[^}]*)?\}$/, '');
    return { root: head[3]!, steps, quiet, fallback, path };
  }

  // ——— Expressions ———

  expr(): Expr {
    return this.binary(0);
  }

  static LEVELS: readonly (readonly string[])[] = [['||'], ['&&'], ['==', '!='], ['>=', '<=', '>', '<'], ['+', '-'], ['*', '/', '%']];

  binary(level: number): Expr {
    if (level === Parser.LEVELS.length) return this.unary();
    let left = this.binary(level + 1);
    for (;;) {
      this.space();
      const op = Parser.LEVELS[level]!.find((o) => this.src.startsWith(o, this.at) && !(o === '!' && this.src[this.at + 1] === '='));
      // `!` alone is unary; `.` after a number would be a range's `..`, not an operator.
      if (!op) return left;
      this.at += op.length;
      left = { kind: 'op', op, left, right: this.binary(level + 1) };
    }
  }

  unary(): Expr {
    this.space();
    const c = this.src[this.at];
    if (c === '!' && this.src[this.at + 1] !== '=') {
      this.at++;
      return { kind: 'not', of: this.unary() };
    }
    if (c === '-' && !/\d/.test(this.src[this.at + 1] ?? '')) {
      this.at++;
      return { kind: 'neg', of: this.unary() };
    }
    return this.primary();
  }

  primary(): Expr {
    this.space();
    const c = this.src[this.at];
    if (c === '(') {
      this.at++;
      const inner = this.expr();
      this.expect(')');
      return inner;
    }
    if (c === '$') {
      const ref = this.ref();
      if (!ref) this.fail('Bad reference');
      return { kind: 'ref', ref };
    }
    if (c === '"') return this.string();
    if (c === "'") {
      const m = this.eat(/'((?:[^']|'')*)'/) ?? this.fail('Unclosed string');
      return { kind: 'value', value: m[1]!.replace(/''/g, "'") };
    }
    if (c === '[') {
      this.at++;
      this.space();
      if (this.src[this.at] === ']') {
        this.at++;
        return { kind: 'list', items: [] };
      }
      const first = this.expr();
      this.space();
      if (this.src.startsWith('..', this.at)) {
        this.at += 2;
        const to = this.expr();
        this.expect(']');
        return { kind: 'range', from: first, to };
      }
      const items = [first];
      while (this.src[this.at] === ',') {
        this.at++;
        items.push(this.expr());
        this.space();
      }
      this.expect(']');
      return { kind: 'list', items };
    }
    let m: RegExpExecArray | null;
    if ((m = this.eat(/-?\d+(?:\.\d+)?/))) return { kind: 'value', value: Number(m[0]) };
    if ((m = this.eat(/(true|false|null)\b/))) return { kind: 'value', value: m[1] === 'null' ? null : m[1] === 'true' };
    this.fail('Unexpected');
  }

  /** A double-quoted string: Velocity fills in the references inside it. */
  string(): Expr {
    const m = this.eat(/"((?:[^"]|"")*)"/) ?? this.fail('Unclosed string');
    const body = m[1]!.replace(/""/g, '"');
    const inner = new Parser(body);
    const parts: (string | Ref)[] = [];
    let text = '';
    while (inner.at < body.length) {
      if (body[inner.at] === '#' && /^#\{?(if|elseif|else|end|foreach|set|macro)\b/.test(body.slice(inner.at)))
        inner.fail('Unsupported directive inside a string');
      const ref = body[inner.at] === '$' ? inner.ref() : null;
      if (ref) {
        if (text) parts.push(text);
        text = '';
        parts.push(ref);
      } else text += body[inner.at++];
    }
    if (text) parts.push(text);
    return { kind: 'string', parts };
  }

  /** `(` expression `)` for a directive whose `(` is at the cursor. */
  args<T>(read: () => T): T {
    this.expect('(');
    const value = read();
    this.expect(')');
    return value;
  }

  // ——— Template ———

  template(): Node[] {
    const root: Node[] = [];
    // A stack of open blocks; each collects nodes into its current body.
    const stack: { node: Node | null; body: Node[] }[] = [{ node: null, body: root }];
    let text = '';
    const top = () => stack[stack.length - 1]!;
    const flush = () => {
      if (text) top().body.push({ kind: 'text', text });
      text = '';
    };
    const src = this.src;
    while (this.at < src.length) {
      const c = src[this.at];
      let m: RegExpExecArray | null;
      if (c === '#') {
        if ((m = this.eat(/#\{?(if|elseif|foreach|set)\}?(?=\s*\()/))) {
          flush();
          const kind = m[1]!;
          if (kind === 'if') {
            const body: Node[] = [];
            const node: Node = { kind: 'if', branches: [{ cond: this.args(() => this.expr()), body }] };
            top().body.push(node);
            stack.push({ node, body });
          } else if (kind === 'elseif') {
            const node = top().node;
            if (node?.kind !== 'if' || node.otherwise) this.fail('#elseif outside #if');
            const body: Node[] = [];
            node.branches.push({ cond: this.args(() => this.expr()), body });
            top().body = body;
          } else if (kind === 'foreach') {
            const [as, list] = this.args(() => {
              this.space();
              const v = this.eat(/\$([A-Za-z_]\w*)\s+in\s+/) ?? this.fail('Unsupported #foreach');
              return [v[1]!, this.expr()] as const;
            });
            const body: Node[] = [];
            const node: Node = { kind: 'foreach', as, list, body };
            top().body.push(node);
            stack.push({ node, body });
          } else {
            const [name, value] = this.args(() => {
              this.space();
              const v = this.eat(/\$!?\{?([A-Za-z_]\w*)\}?\s*=/) ?? this.fail('Unsupported #set (only #set($name = …))');
              return [v[1]!, this.expr()] as const;
            });
            top().body.push({ kind: 'set', name, value });
          }
          continue;
        }
        if ((m = this.eat(/#\{else\}|#else(?![A-Za-z])/))) {
          flush();
          const node = top().node;
          if (node?.kind !== 'if' || node.otherwise) this.fail('#else outside #if');
          node.otherwise = [];
          top().body = node.otherwise;
          continue;
        }
        if ((m = this.eat(/#\{end\}|#end(?![A-Za-z])/))) {
          flush();
          if (stack.length === 1) this.fail('#end without a block');
          stack.pop();
          continue;
        }
        if (/^#(\{?(macro|parse|include|define|break|stop|evaluate)\b|[#*@])/.test(src.slice(this.at, this.at + 12)))
          this.fail('Unsupported Velocity');
      } else if (c === '$') {
        const start = this.at;
        const ref = this.ref();
        if (ref) {
          flush();
          top().body.push({ kind: 'ref', ref });
          continue;
        }
        this.at = start;
      }
      text += c;
      this.at++;
    }
    flush();
    if (stack.length !== 1) throw new Error('Unclosed #if or #foreach');
    return root;
  }
}

// ——— Values ———

/** Velocity's truth: null, false, and (2.x) empty strings, lists and maps are false. */
const truthy = (value: unknown) =>
  !(
    value == null ||
    value === false ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (value instanceof Map && value.size === 0)
  );

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Map);

function mapGet(map: unknown, key: unknown): unknown {
  if (map instanceof Map) return map.has(key) ? map.get(key) : map.get(String(key));
  if (isObject(map)) return Object.hasOwn(map, String(key)) ? map[String(key)] : undefined;
  return undefined;
}

/** `$a.b`: a Map's entry, an object's property. */
function property(target: unknown, name: string): unknown {
  if (target instanceof Map || isObject(target)) return mapGet(target, name);
  return undefined;
}

/** Velocity's `==`: numbers by value, the same kind of thing as itself, anything else by its text. */
function equal(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === typeof b) return a === b;
  return String(a) === String(b);
}

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) throw new Error(`Not a number: ${String(value)}`);
  return n;
};

function call(target: unknown, name: string, args: unknown[]): unknown {
  if (target == null) return null;
  const arity = (...counts: number[]) => {
    if (!counts.includes(args.length)) throw new Error(`.${name}() takes ${counts.join(' or ')} arguments, got ${args.length}`);
  };
  if (typeof target === 'string') {
    const s = target;
    switch (name) {
      case 'length':
        return arity(0), s.length;
      case 'substring':
        return arity(1, 2), s.substring(num(args[0]), args[1] === undefined ? undefined : num(args[1]));
      case 'toUpperCase':
        return arity(0), s.toUpperCase();
      case 'toLowerCase':
        return arity(0), s.toLowerCase();
      case 'toString':
        return arity(0), s;
      case 'trim':
        return arity(0), s.trim();
      case 'isEmpty':
        return arity(0), s.length === 0;
      case 'contains':
        return arity(1), s.includes(String(args[0]));
      case 'startsWith':
        return arity(1), s.startsWith(String(args[0]));
      case 'endsWith':
        return arity(1), s.endsWith(String(args[0]));
      case 'equals':
        return arity(1), s === args[0];
      case 'equalsIgnoreCase':
        return arity(1), args[0] != null && s.toLowerCase() === String(args[0]).toLowerCase();
      case 'indexOf':
        return arity(1), s.indexOf(String(args[0]));
      case 'replace':
        return arity(2), s.split(String(args[0])).join(String(args[1]));
    }
  } else if (Array.isArray(target)) {
    switch (name) {
      case 'size':
        return arity(0), target.length;
      case 'get':
        return arity(1), target[num(args[0])];
      case 'isEmpty':
        return arity(0), target.length === 0;
      case 'contains':
        return arity(1), target.some((x) => equal(x, args[0]));
      case 'toString':
        return arity(0), show(target);
    }
  } else if (typeof target === 'number' || typeof target === 'boolean') {
    if (name === 'toString') return arity(0), String(target);
  } else if (target instanceof Map || isObject(target)) {
    const own = isObject(target) && Object.hasOwn(target, name) ? target[name] : undefined;
    if (typeof own === 'function') return (own as (...a: unknown[]) => unknown).apply(target, args);
    const keys = target instanceof Map ? [...target.keys()] : Object.keys(target);
    switch (name) {
      case 'get':
        return arity(1), mapGet(target, args[0]);
      case 'containsKey':
        return arity(1), target instanceof Map ? target.has(args[0]) || target.has(String(args[0])) : Object.hasOwn(target, String(args[0]));
      case 'keySet':
        return arity(0), keys;
      case 'values':
        return arity(0), keys.map((k) => mapGet(target, k));
      case 'size':
        return arity(0), keys.length;
      case 'isEmpty':
        return arity(0), keys.length === 0;
      case 'toString':
        return arity(0), show(target);
    }
  }
  throw new Error(`Unsupported method .${name}() on ${Array.isArray(target) ? 'a list' : typeof target}`);
}

/** How Velocity prints a value. Numbers are grouped, as the emails' samples expect. */
function show(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (Array.isArray(value)) return `[${value.map(show).join(', ')}]`;
  if (value instanceof Map) return `{${[...value].map(([k, v]) => `${k}=${show(v)}`).join(', ')}}`;
  if (isObject(value)) return `{${Object.entries(value).map(([k, v]) => `${k}=${show(v)}`).join(', ')}}`;
  return String(value);
}

class Renderer {
  scope: Scope;
  missing: string[] = [];
  constructor(scope: Scope) {
    this.scope = scope;
  }

  ref(ref: Ref): unknown {
    let value: unknown = Object.hasOwn(this.scope, ref.root) ? this.scope[ref.root] : undefined;
    for (const step of ref.steps) {
      if (step.kind === 'prop') value = property(value, step.name);
      else if (step.kind === 'index') {
        const at = this.eval(step.at);
        value = Array.isArray(value) ? value[num(at)] : mapGet(value, at);
      } else {
        const args = step.args.map((a) => this.eval(a));
        value = call(value, step.name, args);
      }
    }
    return value;
  }

  /** A reference as printed: its value, its default, or nothing (and noted, unless quiet). */
  print(ref: Ref): string {
    const value = this.ref(ref);
    if (value == null || value === '') {
      if (ref.fallback !== undefined) return ref.fallback;
      if (!ref.quiet) this.missing.push(ref.path);
      return '';
    }
    return show(value);
  }

  eval(expr: Expr): unknown {
    switch (expr.kind) {
      case 'value':
        return expr.value;
      case 'ref':
        return this.ref(expr.ref);
      case 'string':
        return expr.parts.map((p) => (typeof p === 'string' ? p : this.print(p))).join('');
      case 'list':
        return expr.items.map((e) => this.eval(e));
      case 'range': {
        const [from, to] = [num(this.eval(expr.from)), num(this.eval(expr.to))];
        const step = from <= to ? 1 : -1;
        return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * step);
      }
      case 'not':
        return !truthy(this.eval(expr.of));
      case 'neg':
        return -num(this.eval(expr.of));
      case 'op': {
        const { op } = expr;
        const left = this.eval(expr.left);
        if (op === '&&') return truthy(left) && truthy(this.eval(expr.right));
        if (op === '||') return truthy(left) || truthy(this.eval(expr.right));
        const right = this.eval(expr.right);
        if (op === '==') return equal(left, right);
        if (op === '!=') return !equal(left, right);
        if (left == null || right == null) return op === '+' || op === '-' || op === '*' || op === '/' || op === '%' ? null : false;
        if (op === '+' && (typeof left === 'string' || typeof right === 'string')) return show(left) + show(right);
        const [a, b] = [num(left), num(right)];
        switch (op) {
          case '>':
            return a > b;
          case '<':
            return a < b;
          case '>=':
            return a >= b;
          case '<=':
            return a <= b;
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '*':
            return a * b;
          case '/':
            // Java's integer division, for whole numbers.
            return Number.isInteger(a) && Number.isInteger(b) ? Math.trunc(a / b) : a / b;
          case '%':
            return a % b;
        }
        throw new Error(`Unknown operator ${op}`);
      }
    }
  }

  render(nodes: Node[]): string {
    let out = '';
    for (const node of nodes) {
      switch (node.kind) {
        case 'text':
          out += node.text;
          break;
        case 'ref':
          out += this.print(node.ref);
          break;
        case 'set':
          // Velocity sets the context's variable, seen after the loop or block it's in.
          this.scope[node.name] = this.eval(node.value);
          break;
        case 'if': {
          const branch = node.branches.find((b) => truthy(this.eval(b.cond)));
          out += this.render(branch ? branch.body : (node.otherwise ?? []));
          break;
        }
        case 'foreach': {
          const raw = this.eval(node.list);
          if (raw != null && !Array.isArray(raw) && !(raw instanceof Map) && !isObject(raw))
            throw new Error(`#foreach over something that isn't a list: ${show(raw)}`);
          // Like Velocity, a Map is iterated over its values.
          const list = raw == null ? [] : Array.isArray(raw) ? raw : raw instanceof Map ? [...raw.values()] : Object.values(raw);
          const had = Object.hasOwn(this.scope, node.as);
          const [saved, savedLoop] = [this.scope[node.as], this.scope.foreach];
          list.forEach((item, i) => {
            this.scope[node.as] = item;
            this.scope.foreach = { index: i, count: i + 1, first: i === 0, last: i === list.length - 1, hasNext: i < list.length - 1 };
            out += this.render(node.body);
          });
          if (had) this.scope[node.as] = saved;
          else delete this.scope[node.as];
          this.scope.foreach = savedLoop;
          if (savedLoop === undefined) delete this.scope.foreach;
          break;
        }
      }
    }
    return out;
  }
}

/** A reference that's missing, outside a quiet `$!{}` or a default: Velocity would print it as written. */
export class MissingValue extends Error {}

/** The template filled with `values`, and the references that had no value. */
export function fill(template: string, values: Scope): { output: string; missing: string[] } {
  // A gobbled `#else` or `#end` is braced, so the next line's text can't run into it (`#elseN/A`).
  const gobbled = template.replace(DIRECTIVE_LINE, (line) => line.trim().replace(/^#\{?(else|end)\}?$/, '#{$1}'));
  const nodes = new Parser(gobbled).template();
  // `#set` writes to a copy, so the sample itself never changes.
  const renderer = new Renderer({ ...values });
  const output = renderer.render(nodes);
  return { output, missing: renderer.missing };
}
