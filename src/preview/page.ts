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
[hidden]{display:none!important}
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
.reset{border:0;background:var(--well);color:var(--fg);font:inherit;padding:4px 14px;border-radius:8px;cursor:pointer}
.reset:disabled{color:var(--muted);opacity:.5;cursor:default}
.problems{background:${RATING_COLORS.critical}1a;border-radius:8px;padding:10px 14px;margin-bottom:16px;color:var(--fg)}
.views{display:flex;gap:20px;align-items:flex-start}
iframe{border:0;border-radius:12px;background:#fff;flex:none;box-shadow:0 0 0 1px var(--line)}
pre{flex:1;min-width:280px;margin:0;padding:16px;background:var(--card);border-radius:12px;white-space:pre-wrap;font:12px/18px ui-monospace,Menlo,Consolas,monospace;box-shadow:0 0 0 1px var(--line)}
h2.name{margin:0;font-size:20px}
.side{flex:1;min-width:300px;display:flex;flex-direction:column;gap:10px}
.ed{background:var(--card);border-radius:12px;box-shadow:0 0 0 1px var(--line);padding:14px 16px}
.ed pre{margin-top:10px}
.b-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.b-bar button,.b-add,.b-addblock>button,.b-menu button{border:0;background:var(--well);color:var(--fg);font:inherit;font-size:13px;padding:5px 12px;border-radius:6px;cursor:pointer}
.b-s{color:var(--muted);font-size:12px}
.b-n{color:var(--muted);font-size:12px;line-height:17px;margin:8px 0 10px}
.b-list{display:flex;flex-direction:column;gap:6px}
.b-card{background:var(--well);border-radius:10px}
.b-open{background:var(--card);box-shadow:0 0 0 2px var(--accent)}
.b-hidden .b-t{opacity:.45}
.b-head{display:flex;align-items:center;gap:4px;padding-right:6px}
.b-t{flex:1;min-width:0;display:flex;gap:10px;align-items:baseline;border:0;background:none;color:var(--fg);font:inherit;text-align:left;padding:9px 12px;cursor:pointer}
.b-k{font-weight:600;font-size:13px;flex:none}
.b-line{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.b-tag{margin-left:6px;font-size:10px;font-weight:500;color:var(--muted);background:var(--card);padding:1px 6px;border-radius:999px}
.b-acts{display:flex;gap:1px;flex:none}
.b-acts button{border:0;background:none;color:var(--muted);font:inherit;font-size:12px;padding:4px 6px;border-radius:5px;cursor:pointer}
.b-acts button:hover:not(:disabled){background:var(--card);color:var(--fg)}
.b-acts button:disabled{opacity:.3;cursor:default}
.b-body{padding:2px 12px 12px}
.b-f{display:block;margin:0 0 10px}
.b-l,.b-sub{display:block;font-size:12px;color:var(--muted);margin-bottom:3px}
.b-h{display:block;font-size:11px;line-height:15px;color:var(--muted);opacity:.85;margin:-1px 0 4px}
.ed input[type=text],.ed textarea,.ed select{width:100%;font:13px/18px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--fg);background:var(--well);border:0;border-radius:6px;padding:6px 8px;resize:vertical}
.ed input:focus,.ed textarea:focus,.ed select:focus{outline:2px solid var(--accent);outline-offset:0}
.b-rows{display:grid;grid-template-columns:2fr 3fr auto;gap:6px;align-items:center;margin-bottom:8px}
.b-rows button{border:0;background:none;color:var(--muted);cursor:pointer;padding:4px 6px}
.b-samples{margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
.b-check{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);margin-top:-2px}
.b-menu{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
</style></head><body>
<nav id="nav"><h1>ArmorCode emails</h1></nav>
<main id="main"></main>
<script>
const WIDTHS={desktop:640,phone:375};
const STATIC=${isStatic};
const emailSrc=(id,scheme,variant)=>{const v=variant&&variant!=='default'?variant:'';return STATIC?'/email/'+id+'-'+scheme+(v?'-'+v:'')+'.html':'/email/'+id+'?scheme='+scheme+(v?'&variant='+v:'');};
const pdfSrc=id=>STATIC?'/pdf/'+id+'.html':'/pdf/'+id;
let data, width=localStorage.width||'desktop', scheme=localStorage.scheme||'light', variant=localStorage.variant||'default', pane=localStorage.pane||'text', ticket=0;
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
  // The layout last picked, if this email has it; otherwise its own.
  const shownVariant=e.variants.some(v=>v.id===variant)?variant:'default';
  const text=(e.variants.find(v=>v.id===shownVariant)||{text:e.text}).text;
  m.innerHTML='<h2 class="name">'+esc(e.name)+' <span class="tag" id="edited" hidden>Edited</span></h2>'
   +'<dl class="meta"><dt>Subject</dt><dd id="subj"><strong>'+esc(e.subject)+'</strong> <span style="color:var(--muted)">· '+e.subject.length+' characters</span></dd>'
   +'<dt>Who</dt><dd>'+esc(e.who)+'</dd><dt>When</dt><dd>'+esc(e.when)+'</dd><dt>Source</dt><dd>'+esc(e.source)+'</dd>'
   +'<dt>Type</dt><dd><span class="tag">'+e.kind+'</span><span class="tag">'+(e.engine==='velocity'?'Velocity':'Plain substitution')+'</span></dd>'
   +(e.newFields.length?'<dt>New</dt><dd class="new">'+e.newFields.map(f=>'<code>'+esc(f)+'</code>').join(' ')+'</dd>':'')+'</dl>'
   +(e.problems.length?'<div class="problems"><strong>Problems</strong><br>'+e.problems.map(esc).join('<br>')+'</div>':'')
   +'<div class="bar">'+seg('width',[['desktop','Desktop'],['phone','Phone']],width)+seg('scheme',[['light','Light'],['dark','Dark']],scheme)+(e.variants.length?seg('variant',e.variants.map(v=>[v.id,v.label]),shownVariant):'')+'<button class="reset" id="resetTop" disabled title="Undo your edits to this email">Reset</button></div>'
   +'<div class="views"><iframe title="Email" src="'+emailSrc(e.id,scheme,shownVariant)+'" style="width:'+WIDTHS[width]+'px;height:700px"></iframe>'
   +'<div class="side">'+seg('pane',[['text','Plain text'],['edit','Edit']],pane)+'<div class="problems" id="ederr" hidden></div><pre id="txt"'+(pane==='text'?'':' hidden')+'>'+esc(text)+'</pre><div class="ed" id="ed"'+(pane==='edit'?'':' hidden')+'>Loading…</div></div></div>';
  const f=m.querySelector('iframe');f.onload=()=>fit(f);
  for(const b of m.querySelectorAll('[data-width]'))b.onclick=()=>{width=localStorage.width=b.dataset.width;show()};
  for(const b of m.querySelectorAll('[data-scheme]'))b.onclick=()=>{scheme=localStorage.scheme=b.dataset.scheme;show()};
  for(const b of m.querySelectorAll('[data-variant]'))b.onclick=()=>{variant=localStorage.variant=b.dataset.variant;show()};
  for(const b of m.querySelectorAll('[data-pane]'))b.onclick=()=>{pane=localStorage.pane=b.dataset.pane;show()};
  edit(e,shownVariant,text);
}
// The Edit tab: a builder for the email (js/editor.js). In it, and whenever the email has
// changes, the frame and the plain text are rendered in the browser, so this works on the static
// site; clicking a part of the email selects it in the builder.
async function edit(e,layout,text){
  const my=++ticket,box=document.getElementById('ed'),err=document.getElementById('ederr');
  let ed,model;
  try{ed=await import('/js/editor.js');model=await ed.loadModel(e.id)}
  catch(x){if(my===ticket){box.textContent='The builder didn’t load: '+x.message}return}
  if(my!==ticket)return;
  const f=document.querySelector('#main iframe'),pre=document.getElementById('txt'),subj=document.getElementById('subj'),tag=document.getElementById('edited'),reset=document.getElementById('resetTop');
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const subject=s=>'<strong>'+esc(s)+'</strong> <span style="color:var(--muted)">· '+s.length+' characters</span>';
  reset.onclick=()=>{ed.clearEdits(e.id,layout);show()};
  let builder=null;
  const rendered=r=>{
    if(my!==ticket)return;
    err.hidden=true;tag.hidden=!r.edited;reset.disabled=!r.edited;
    if(pane!=='edit'&&!r.edited){if(f.hasAttribute('srcdoc'))f.removeAttribute('srcdoc');pre.textContent=text;subj.innerHTML=subject(e.subject);return}
    f.onload=()=>{fit(f);if(builder)ed.connect(f,builder,accent)};
    f.srcdoc=r.html;pre.textContent=r.text;subj.innerHTML=subject(r.subject);
  };
  builder=ed.mount(box,model,layout,scheme,rendered);
}
addEventListener('hashchange',show);load();
</script></body></html>`;

export const PAGE = page(false);
