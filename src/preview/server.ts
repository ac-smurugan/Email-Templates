/**
 * `pnpm preview`: a local page listing every email, each in a Desktop (640px) or Phone (375px)
 * frame, light or dark, with its plain text beside it. Placeholders are filled with the sample
 * values here only; the built templates keep them.
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { pinScheme } from '../layout.ts';
import { problems } from '../build.ts';
import { TEMPLATES } from '../templates/index.ts';
import { GROUPS } from '../template.ts';
import { PDFS } from '../pdf/index.ts';
import { fill } from './fill.ts';
import { PAGE } from './page.ts';

const PORT = Number(process.env.PORT ?? 4300);

/** What `${amcLogoUrl}` should show: ArmorCode's mark, without the white wordmark (the emails set the name as text). */
const LOGO = readFileSync(fileURLToPath(new URL('../../assets/armorcode-mark.svg', import.meta.url)), 'utf8');

function list() {
  const emails = TEMPLATES.map((t) => {
    const subject = fill(t.subject, t.sample).output;
    return {
      id: t.id,
      name: t.name,
      group: t.group,
      kind: t.kind,
      engine: t.engine,
      source: t.source,
      who: t.who,
      when: t.when,
      subject,
      text: fill(t.text, t.sample).output,
      problems: problems(t),
      newFields: Object.entries(t.fields)
        .filter(([, f]) => f.isNew)
        .map(([name]) => name),
    };
  });
  const pdfs = PDFS.map((p) => ({ id: p.id, name: p.name, source: p.source, when: p.when }));
  return { groups: GROUPS, emails, pdfs };
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (status: number, type: string, body: string) => {
    res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
    res.end(body);
  };
  try {
    if (url.pathname === '/') return send(200, 'text/html', PAGE);
    if (url.pathname === '/emails.json') return send(200, 'application/json', JSON.stringify(list()));
    if (url.pathname === '/sample-logo.svg') return send(200, 'image/svg+xml', LOGO);
    const email = url.pathname.match(/^\/email\/([\w-]+)$/);
    if (email) {
      const t = TEMPLATES.find((x) => x.id === email[1]);
      if (!t) return send(404, 'text/plain', 'No such email');
      const scheme = url.searchParams.get('scheme') === 'dark' ? 'dark' : 'light';
      // Links open outside the frame.
      const html = pinScheme(fill(t.html, t.sample).output, scheme).replace('<head>', '<head><base target="_blank">');
      return send(200, 'text/html', html);
    }
    const pdf = url.pathname.match(/^\/pdf\/([\w-]+)$/);
    if (pdf) {
      const p = PDFS.find((x) => x.id === pdf[1]);
      if (!p) return send(404, 'text/plain', 'No such report');
      return send(200, 'text/html', fill(p.html, p.sample).output.replace('<head>', '<head><base target="_blank">'));
    }
    send(404, 'text/plain', 'Not found');
  } catch (error) {
    send(500, 'text/plain', String((error as Error).stack ?? error));
  }
}).listen(PORT, () => console.log(`Email preview: http://localhost:${PORT}`));
