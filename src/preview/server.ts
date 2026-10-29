/**
 * `pnpm preview`: a local page listing every email, each in a Desktop (640px) or Phone (375px)
 * frame, light or dark, with its plain text beside it. Placeholders are filled with the sample
 * values here only; the built templates keep them.
 */
import { createServer } from 'node:http';
import { LOGO, badge, emailHtml, findEmail, findPdf, list, pdfHtml } from './data.ts';
import { PAGE } from './page.ts';

const PORT = Number(process.env.PORT ?? 4300);

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
    const icon = url.pathname.match(/^\/icons\/([\w-]+\.png)$/);
    if (icon) {
      const png = badge(icon[1]!);
      if (!png) return send(404, 'text/plain', 'No such icon');
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
      return res.end(png);
    }
    const email = url.pathname.match(/^\/email\/([\w-]+)$/);
    if (email) {
      const t = findEmail(email[1]!);
      if (!t) return send(404, 'text/plain', 'No such email');
      const scheme = url.searchParams.get('scheme') === 'dark' ? 'dark' : 'light';
      return send(200, 'text/html', emailHtml(t, scheme));
    }
    const pdf = url.pathname.match(/^\/pdf\/([\w-]+)$/);
    if (pdf) {
      const p = findPdf(pdf[1]!);
      if (!p) return send(404, 'text/plain', 'No such report');
      return send(200, 'text/html', pdfHtml(p));
    }
    send(404, 'text/plain', 'Not found');
  } catch (error) {
    send(500, 'text/plain', String((error as Error).stack ?? error));
  }
}).listen(PORT, () => console.log(`Email preview: http://localhost:${PORT}`));
