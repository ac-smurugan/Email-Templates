import { DARK, LIGHT, RATING_COLORS } from '../tokens.ts';

/**
 * The preview page: a list of emails, and the picked one in a frame beside its plain text. The
 * static copy (for Cloudflare) has a file per scheme instead of a query string, and `.html` pages.
 */
export const page = (isStatic: boolean) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ArmorCode emails</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:light dark;--bg:${LIGHT.canvas};--card:${LIGHT.card};--well:${LIGHT.well};--fg:${LIGHT.fg};--muted:${LIGHT.muted};--line:${LIGHT.line};--accent:${LIGHT.accent};--link:${LIGHT.link}}
@media (prefers-color-scheme:dark){:root{--bg:${DARK.canvas};--card:${DARK.card};--well:${DARK.well};--fg:${DARK.fg};--muted:${DARK.muted};--line:${DARK.line};--accent:${DARK.accent};--link:${DARK.link}}}
*{box-sizing:border-box}
body{margin:0;font:14px/20px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg);display:flex;height:100vh}
nav{width:260px;flex:none;overflow:auto;padding:20px 12px;border-right:1px solid var(--line);background:var(--card)}
nav h1{font-size:15px;margin:0 8px 16px}
nav h2{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:16px 8px 4px;font-weight:600}
nav a{display:block;padding:5px 8px;border-radius:6px;color:var(--fg);text-decoration:none}
nav a:hover{background:var(--well)}
nav a[aria-current]{background:var(--accent);color:#fff}
nav a .bad{color:${RATING_COLORS.critical}}
main{flex:1;overflow:auto;padding:24px 28px}
.meta{display:grid;grid-template-columns:80px 1fr;gap:4px 12px;margin:10px 0 16px;max-width:980px}
.meta dt{color:var(--muted)}.meta dd{margin:0}
.tag{display:inline-block;padding:0 7px;border-radius:999px;background:var(--well);color:var(--muted);font-size:12px;margin-right:6px}
.new code{background:var(--well);padding:0 4px;border-radius:4px;font-size:12px}
.bar{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.seg{display:inline-flex;background:var(--well);border-radius:8px;padding:2px}
.seg button{border:0;background:none;color:var(--muted);font:inherit;padding:4px 12px;border-radius:6px;cursor:pointer}
.seg button[aria-pressed=true]{background:var(--card);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.12)}
.problems{background:${RATING_COLORS.critical}1a;border-radius:8px;padding:10px 14px;margin-bottom:16px;color:var(--fg)}
.views{display:flex;gap:20px;align-items:flex-start}
iframe{border:0;border-radius:12px;background:#fff;flex:none;box-shadow:0 0 0 1px var(--line)}
pre{flex:1;min-width:280px;margin:0;padding:16px;background:var(--card);border-radius:12px;white-space:pre-wrap;font:12px/18px ui-monospace,Menlo,Consolas,monospace;box-shadow:0 0 0 1px var(--line)}
h2.name{margin:0;font-size:20px}
</style></head><body>
<nav id="nav"><h1>ArmorCode emails</h1></nav>
<main id="main"></main>
<script>
const WIDTHS={desktop:640,phone:375};
const STATIC=${isStatic};
const emailSrc=(id,scheme)=>STATIC?'/email/'+id+'-'+scheme+'.html':'/email/'+id+'?scheme='+scheme;
const pdfSrc=id=>STATIC?'/pdf/'+id+'.html':'/pdf/'+id;
let data, width=localStorage.width||'desktop', scheme=localStorage.scheme||'light';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function load(){data=await (await fetch('/emails.json')).json();nav();show();}
function nav(){
  const n=document.getElementById('nav');
  let h='<h1>ArmorCode emails</h1>';
  for(const g of data.groups){const es=data.emails.filter(e=>e.group===g);if(!es.length)continue;
    h+='<h2>'+esc(g)+'</h2>'+es.map(e=>'<a href="#'+e.id+'">'+esc(e.name)+(e.problems.length?' <span class="bad">●</span>':'')+'</a>').join('');}
  if(data.pdfs.length)h+='<h2>PDF reports</h2>'+data.pdfs.map(p=>'<a href="#pdf:'+p.id+'">'+esc(p.name)+'</a>').join('');
  n.innerHTML=h;
}
function seg(name,opts,cur){return '<span class="seg">'+opts.map(([v,l])=>'<button data-'+name+'="'+v+'" aria-pressed="'+(v===cur)+'">'+l+'</button>').join('')+'</span>';}
function fit(f){try{f.style.height=f.contentDocument.documentElement.scrollHeight+'px'}catch{}}
function show(){
  const id=location.hash.slice(1)||data.emails[0].id;
  for(const a of document.querySelectorAll('nav a'))a.toggleAttribute('aria-current',a.getAttribute('href')==='#'+id);
  const m=document.getElementById('main');
  if(id.startsWith('pdf:')){const p=data.pdfs.find(x=>'pdf:'+x.id===id);if(!p)return;
    m.innerHTML='<h2 class="name">'+esc(p.name)+'</h2><dl class="meta"><dt>When</dt><dd>'+esc(p.when)+'</dd><dt>Source</dt><dd>'+esc(p.source)+'</dd></dl><div class="views"><iframe title="Report" src="'+pdfSrc(p.id)+'" style="width:820px;height:1100px"></iframe></div>';
    const f=m.querySelector('iframe');f.onload=()=>fit(f);return;}
  const e=data.emails.find(x=>x.id===id);if(!e)return;
  m.innerHTML='<h2 class="name">'+esc(e.name)+'</h2>'
   +'<dl class="meta"><dt>Subject</dt><dd><strong>'+esc(e.subject)+'</strong> <span style="color:var(--muted)">· '+e.subject.length+' characters</span></dd>'
   +'<dt>Who</dt><dd>'+esc(e.who)+'</dd><dt>When</dt><dd>'+esc(e.when)+'</dd><dt>Source</dt><dd>'+esc(e.source)+'</dd>'
   +'<dt>Type</dt><dd><span class="tag">'+e.kind+'</span><span class="tag">'+(e.engine==='velocity'?'Velocity':'Plain substitution')+'</span></dd>'
   +(e.newFields.length?'<dt>New</dt><dd class="new">'+e.newFields.map(f=>'<code>'+esc(f)+'</code>').join(' ')+'</dd>':'')+'</dl>'
   +(e.problems.length?'<div class="problems"><strong>Problems</strong><br>'+e.problems.map(esc).join('<br>')+'</div>':'')
   +'<div class="bar">'+seg('width',[['desktop','Desktop'],['phone','Phone']],width)+seg('scheme',[['light','Light'],['dark','Dark']],scheme)+'</div>'
   +'<div class="views"><iframe title="Email" src="'+emailSrc(e.id,scheme)+'" style="width:'+WIDTHS[width]+'px;height:700px"></iframe><pre>'+esc(e.text)+'</pre></div>';
  const f=m.querySelector('iframe');f.onload=()=>fit(f);
  for(const b of m.querySelectorAll('[data-width]'))b.onclick=()=>{width=localStorage.width=b.dataset.width;show()};
  for(const b of m.querySelectorAll('[data-scheme]'))b.onclick=()=>{scheme=localStorage.scheme=b.dataset.scheme;show()};
}
addEventListener('hashchange',show);load();
</script></body></html>`;

export const PAGE = page(false);
