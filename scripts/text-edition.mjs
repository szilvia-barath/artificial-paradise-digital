// The text edition: the exhibition as plain HTML, in English (text/) and Hungarian
// (text/hu/). It is written at build time from the same files the 3D walk reads
// (src/data/exhibition.json, src/i18n/*.json, the rooms in src/world/layout.js and the
// route in src/world/route.js), so the two cannot drift apart. The pages have no images,
// no external files and need no JavaScript; one small inline script applies the walk's
// language rule (?lang= → saved choice → browser language) where JavaScript is on.
//
// Used as a Vite plugin (vite.config.js): `npm run build` writes dist/text/index.html and
// dist/text/hu/index.html, and `npm run dev` serves the same pages at /text/ and /text/hu/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROOMS } from '../src/world/layout.js';
import { visitOrder, isPart, placeOf } from '../src/world/route.js';
import { localizeData, translator } from '../src/localize.js';

const SITE = 'https://artificial-paradise.netlify.app/';
const SOURCES = ['../src/data/exhibition.json', '../src/i18n/en.json', '../src/i18n/hu.json'].map((p) => fileURLToPath(new URL(p, import.meta.url)));
const readJSON = (file) => JSON.parse(readFileSync(file, 'utf8'));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Hungarian wording still to be confirmed carries " [HU: confirm]" in hu.json. A line put
// together from several such strings shows the mark once, at its end.
const MARK = ' [HU: confirm]';
const joinMarked = (parts) => {
  const marked = parts.some((p) => p.includes(MARK));
  return parts.map((p) => p.replaceAll(MARK, '')).join(' ') + (marked ? MARK : '');
};

const CSS = `
:root{color-scheme:light dark;--bg:#fbfbf9;--fg:#16181d;--muted:#4a4f5a;--link:#072fcc;--line:#c9ccd3}
@media (prefers-color-scheme:dark){:root{--bg:#0b0c0e;--fg:#f2f1ed;--muted:#b9b9b5;--link:#a9c1ff;--line:#3a3d44}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:1.0625rem/1.65 "Helvetica Neue",Helvetica,Arial,system-ui,sans-serif;overflow-wrap:break-word}
.page{max-width:44rem;margin:0 auto;padding:1.25rem 1rem 4rem}
h1{font-size:clamp(1.8rem,7vw,2.6rem);line-height:1.15;font-weight:300;margin:1.5rem 0 1rem}
h2{font-size:1.5rem;line-height:1.25;font-weight:400;margin:3rem 0 .5rem;padding-top:1rem;border-top:2px solid var(--fg)}
h3{font-size:1.2rem;line-height:1.3;margin:2.4rem 0 .4rem}
h4{font-size:1rem;margin:1.4rem 0 .2rem}
p{margin:.6rem 0}
a{color:var(--link);text-underline-offset:.2em}
a:focus-visible{outline:3px solid var(--link);outline-offset:3px;border-radius:2px}
dl{display:grid;grid-template-columns:minmax(5.5rem,max-content) 1fr;gap:.25rem 1rem;margin:.6rem 0}
dt{font-weight:600}
dd{margin:0}
.top{display:flex;flex-wrap:wrap;gap:.4rem 1.5rem;margin:0}
.sub,.note{color:var(--muted)}
.note{font-size:.95rem}
nav ul{margin:.4rem 0;padding-left:1.2rem}
@media (max-width:30rem){dl{grid-template-columns:1fr;gap:0}dd{margin-bottom:.5rem}}
`.trim();

// The walk's language rule. The English page is the default address: an explicit ?lang=,
// then the saved choice, then the browser's language decide. The Hungarian page is itself
// a choice, so only an explicit ?lang=en leaves it. Nothing is written to storage.
const langScript = (here) => `(function(){var here='${here}',q=new URLSearchParams(location.search).get('lang'),s=null;try{s=localStorage.getItem('ap-lang')}catch(e){}var ok=function(v){return v==='hu'||v==='en'};var want=ok(q)?q:here==='hu'?'hu':ok(s)?s:/^hu\\b/i.test(navigator.language||'')?'hu':'en';if(want!==here)location.replace((want==='hu'?'hu/':'../')+location.search+location.hash)})();`;

function page(lang, raw) {
  const en = raw.en;
  const loc = raw[lang];
  const data = localizeData(structuredClone(raw.data), en, loc);
  const t = translator(loc, en);
  const works = visitOrder(data.works);
  const toWalk = lang === 'hu' ? '../../' : '../';
  // Titles are the official English ones; on the Hungarian page they are marked as English
  // so a screen reader pronounces them as such.
  const title = (s) => (lang === 'en' ? esc(s) : `<span lang="en">${esc(s)}</span>`);
  const no = (w) => t('viewer.no', { no: w.no });
  const heading = (w) => `${esc(no(w))}: ${title(w.title)}`;
  const plainHeading = (w) => `${no(w)}: ${w.title}`;
  const roomName = (id) => data.rooms[id].name;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const where = (item, { order = true } = {}) => {
    const p = placeOf(item, data.works);
    if (!p) return '';
    if (p.kind === 'floor') return t(`textEdition.pos.floor${cap(p.depth)}`);
    const parts = [t(`textEdition.pos.${p.wall}`)];
    const side = p.wall === 'left' || p.wall === 'right';
    if (order) {
      if (p.count === 1) parts.push(t('textEdition.pos.only'));
      else parts.push(t(side ? 'textEdition.pos.orderSide' : 'textEdition.pos.orderFacing', { i: p.index, n: p.count }));
    }
    if (side && (!order || p.count === 1)) parts.push(t(`textEdition.pos.along${cap(p.along)}`));
    if (p.door) parts.push(t(`textEdition.pos.door${cap(p.wall)}${cap(p.door)}`, { room: roomName(p.doorRoom) }));
    return joinMarked(parts);
  };

  // The artist's texts belong to a series: printed in full under the first work of the
  // series, linked from the others.
  const textAt = {};
  const artistText = (w) => {
    const d = w.desc && data.descriptions[w.desc];
    if (!d) return '';
    if (textAt[w.desc]) {
      const first = textAt[w.desc];
      const [before, after] = t('textEdition.textAbove').split('{ref}');
      return `<p>${esc(before)}<a href="#${esc(first.id)}">${heading(first)}</a>${esc(after)}</p>`;
    }
    textAt[w.desc] = w;
    return `<h4>${esc(d.heading)}</h4>
${d.text.map((p) => `<p>${esc(p)}</p>`).join('\n')}${d.note ? `\n<p class="note">${esc(d.note)}</p>` : ''}`;
  };

  const workHTML = (w) => {
    const rows = [
      ['medium', esc(w.medium)],
      ['size', w.size ? esc(w.size) : ''],
      ['year', esc(w.year)],
    ];
    const parts = data.works.filter((o) => isPart(o) && o.room === w.room && o.no === w.no);
    const place = joinMarked([where(w), ...parts.map((o) => t('textEdition.part', { where: where(o, { order: false }) }))]);
    rows.push(['where', esc(place)]);
    return `<article id="${esc(w.id)}">
<h3>${heading(w)}</h3>
<dl>
${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(t(`textEdition.label.${k}`))}</dt><dd>${v}</dd>`).join('\n')}
</dl>${w.caption ? `\n<p>${esc(w.caption)}</p>` : ''}
${artistText(w)}
<p><a href="${toWalk}?lang=${lang}&amp;work=${encodeURIComponent(w.id)}">${esc(t('textEdition.openInWalk', { no: w.no, title: w.title }))}</a></p>
</article>`;
  };

  const roomHTML = (r, i) => {
    const inRoom = works.filter((w) => w.room === r.id);
    const lead = [
      i === 0 ? t('textEdition.enterStairs') : t('textEdition.enterFrom', { room: roomName(ROOMS[i - 1].id) }),
      t('textEdition.roomCount', { n: inRoom.length }),
    ];
    for (const sh of data.sheets || []) {
      const p = placeOf({ hang: sh }, data.works);
      if (p && p.room === r.id) lead.push(t('textEdition.sheet', { where: where({ hang: sh }, { order: false }) }));
    }
    return `<section id="room-${r.id}" aria-labelledby="room-${r.id}-h">
<h2 id="room-${r.id}-h">${esc(data.rooms[r.id].name)}</h2>
<p class="sub">${esc(data.rooms[r.id].subtitle)}</p>
<p>${esc(joinMarked(lead))}</p>
${inRoom.map(workHTML).join('\n')}
</section>`;
  };

  const m = data.meta;
  // The curator is the second line of the credits in both languages.
  const curator = data.credits[1];
  const speech = data.openingSpeech;
  const name = t('textEdition.name');
  const sections = [
    ...ROOMS.map((r) => [`room-${r.id}`, data.rooms[r.id].name]),
    ['exhibition-text', t('viewer.exhibitionText')],
    ...(speech ? [['opening-speech', t('panels.speech')]] : []),
    ['controls', t('panels.controls')],
    ['credits', t('panels.credits')],
    ['rights', t('textEdition.rights')],
  ];
  const other = lang === 'en'
    ? '<a href="hu/?lang=hu" lang="hu" hreflang="hu">Magyar</a>'
    : '<a href="../?lang=en" lang="en" hreflang="en">English</a>';

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t('textEdition.docTitle').replace(MARK, ''))}</title>
<meta name="description" content="${esc(t('textEdition.docDescription').replace(MARK, ''))}">
<meta name="color-scheme" content="light dark">
<script>${langScript(lang)}</script>
<link rel="canonical" href="${SITE}text/${lang === 'hu' ? 'hu/' : ''}">
<link rel="alternate" hreflang="en" href="${SITE}text/">
<link rel="alternate" hreflang="hu" href="${SITE}text/hu/">
<link rel="icon" type="image/svg+xml" href="${toWalk}favicon.svg">
<style>${CSS}</style>
</head>
<body>
<div class="page">
<header>
<p class="top"><a href="${toWalk}?lang=${lang}">${esc(t('textEdition.toWalk'))}</a> ${other}</p>
<h1>${title(m.title)}: ${esc(name.charAt(0).toLowerCase() + name.slice(1))}</h1>
<p>${esc(t('textEdition.intro', { count: works.length }))}</p>
<dl>
<dt>${esc(t('textEdition.facts.artist'))}</dt><dd>${esc(m.artist)}</dd>
<dt>${esc(t('textEdition.facts.venue'))}</dt><dd>${esc(t('panels.address', { venue: m.venue, address: m.address }))}</dd>
<dt>${esc(t('textEdition.facts.dates'))}</dt><dd>${esc(m.dates)}</dd>
<dt>${esc(t('textEdition.facts.curator'))}</dt><dd>${esc(curator[1])}</dd>
</dl>
<p class="note">${esc(t('textEdition.positionsNote'))} ${esc(data.source || '')}</p>
</header>
<nav aria-label="${esc(t('textEdition.onThisPage'))}">
<ul>
${sections.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('\n')}
</ul>
</nav>
<main>
${ROOMS.map(roomHTML).join('\n')}
<section id="exhibition-text" aria-labelledby="exhibition-text-h">
<h2 id="exhibition-text-h">${esc(t('viewer.exhibitionText'))}</h2>
${data.text.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<p class="note">${esc(data.textCredit)}</p>
</section>${speech ? `
<section id="opening-speech" aria-labelledby="opening-speech-h">
<h2 id="opening-speech-h">${esc(t('panels.speech'))}</h2>
<p>${esc(speech.author)}: <em>${esc(speech.title)}</em></p>
${speech.text.map((p) => `<p>${esc(p)}</p>`).join('\n')}${speech.note ? `\n<p class="note">${esc(speech.note)}</p>` : ''}
</section>` : ''}
<section id="controls" aria-labelledby="controls-h">
<h2 id="controls-h">${esc(t('panels.controls'))}</h2>
<p>${esc(t('panels.controlsDesk'))}</p>
<p>${esc(t('panels.controlsTouch'))}</p>
<p><a href="${toWalk}?lang=${lang}">${esc(t('textEdition.toWalk'))}</a></p>
</section>
<section id="credits" aria-labelledby="credits-h">
<h2 id="credits-h">${esc(t('panels.credits'))}</h2>
<dl>
${data.credits.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n')}
</dl>
</section>
<section id="rights" aria-labelledby="rights-h">
<h2 id="rights-h">${esc(t('textEdition.rights'))}</h2>
<p>${esc(t('footer.rights'))}. ${esc(t('footer.digital'))}.</p>
<p>${esc(t('panels.rights'))}</p>
</section>
</main>
</div>
</body>
</html>
`;
}

// The two pages: [{ file: 'text/index.html', html }, { file: 'text/hu/index.html', html }]
export function buildTextEdition() {
  const [data, en, hu] = SOURCES.map(readJSON);
  // the curator's line is found by position, so make sure it is still there
  if (en.credits[1][0] !== 'Curator') throw new Error('text edition: the second line of "credits" in en.json is no longer the curator');
  const raw = { data, en, hu };
  return [
    { file: 'text/index.html', html: page('en', raw) },
    { file: 'text/hu/index.html', html: page('hu', raw) },
  ];
}

export function textEdition() {
  return {
    name: 'text-edition',
    buildStart() {
      for (const f of SOURCES) this.addWatchFile(f);
    },
    generateBundle() {
      for (const { file, html } of buildTextEdition()) this.emitFile({ type: 'asset', fileName: file, source: html });
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        const file = path === '/text/' ? 'text/index.html' : path === '/text/hu/' ? 'text/hu/index.html' : null;
        if (!file) return next();
        try {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(buildTextEdition().find((p) => p.file === file).html);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}
