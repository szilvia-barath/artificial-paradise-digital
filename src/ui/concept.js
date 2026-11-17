import { t, lang, titleLang } from '../i18n.js';
import refs from '../data/references.json';
import { refHTML } from '../refhtml.js';
import { locate, locateFootnotes, linkFor, textParagraphs } from '../refs.js';

// The Concept page: the references, concepts and themes of the exhibition's texts and the
// works they lead to, all from src/data/references.json (scripts/make_references.mjs).
// Four views behind tabs (WAI-ARIA tabs pattern): Themes, Works, Timeline, Network. It is
// one of the panels (panels.js shows it and keeps its focus, Esc and inert handling); this
// file writes its HTML and runs what happens inside it. No images: works are named and
// linked. The network is a plain SVG drawn from positions worked out at build time.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const TABS = ['themes', 'works', 'timeline', 'network'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The sentence of paragraph p that holds p[start, end): from the last sentence end before
// it to the next one after it.
function sentenceAt(p, start, end) {
  let from = 0;
  let to = p.length;
  for (const m of p.matchAll(/[.!?]["”’»)]*\s+(?=["“„»(]?\p{Lu})/gu)) {
    const next = m.index + m[0].length; // where the following sentence starts
    if (next <= start) from = next;
    else if (m.index + 1 >= end) { to = next; break; }
  }
  return p.slice(from, to).trim();
}

// body: the panel's body element. onGotoWork(work): close the panel and go to the work.
export function setupConcept(data, body, { onGotoWork }) {
  const items = refs.items;
  const byId = new Map(items.map((it) => [it.id, it]));
  const themeById = new Map(refs.themes.map((th) => [th.id, th]));
  const works = () => data.works.filter((w) => !w.id.endsWith('-screen'));
  const workById = (id) => data.works.find((w) => w.id === id);
  const neighbours = new Map();
  for (const e of refs.network.edges) {
    for (const [a, b] of [[e.a, e.b], [e.b, e.a]]) neighbours.set(a, (neighbours.get(a) || new Set()).add(b));
  }

  let tab = 'themes';
  let cardFor = null; // Network: the reference whose card is open under the diagram
  let hl = null; // Network: the highlighted node
  let dismissed = null; // the node whose highlight Esc cleared, until the pointer or focus leaves it
  let drawnWidth = 0;
  let R = refHTML(refs, { t, lang: lang() });

  const label = (x) => x.label[lang()] || x.label.en;
  const workTitle = (w) => `<span${titleLang(w) ? ` lang="${titleLang(w)}"` : ''}>${esc(w.title)}</span>`;
  // A work, as a button that closes the panel and goes to it in the 3D view.
  const workButton = (w) => `<button class="concept-work" data-goto="${esc(w.id)}"><span class="no">${esc(t('viewer.no', { no: w.no }))}</span> ${workTitle(w)}<span class="sr-only"> (${esc(t('concept.goto'))})</span></button>`;
  const themeButton = (th) => `<button class="concept-theme-link" data-theme="${esc(th.id)}">${esc(label(th))}<span class="sr-only"> (${esc(t('concept.openTheme'))})</span></button>`;
  const typeWord = (it) => t(`concept.type.${it.type}`);
  const typeLine = (it) => [cap(typeWord(it)), it.subtype && t(`concept.subtype.${it.subtype}`)].filter(Boolean).join(' · ');
  const dateText = (it) => {
    const key = `concept.dates.${it.id}`;
    const s = t(key);
    return s === key ? it.date : s;
  };

  // A text's name: the opening speech by its author and title, an artist's text by the work
  // or series it is about, the supporters by where they are named.
  const textName = (key) => {
    if (key === 'openingSpeech') return `${esc(data.openingSpeech.author)}: <cite>${esc(data.openingSpeech.title)}</cite>`;
    if (key === 'credits.supporters') return esc(t('concept.supporters'));
    const def = refs.texts[key];
    const artist = data.meta.artist.split(' / ')[0];
    return `${esc(artist)}: <cite${lang() !== 'en' ? ' lang="en"' : ''}>${esc(def.title)}</cite>${def.kind ? ` (${esc(t(`concept.textKind.${def.kind}`))})` : ''}`;
  };

  // The sentences of the texts that hold the items' anchors (for R02, the sentence its
  // footnote follows), in reading order, each once: [{ key, sentence }].
  const passagesFor = (ids) => {
    const out = [];
    const seen = new Set();
    const add = (key, sentence, at) => {
      if (seen.has(`${key}|${sentence}`)) return;
      seen.add(`${key}|${sentence}`);
      out.push({ key, sentence, at });
    };
    const keys = [...new Set(ids.flatMap((id) => byId.get(id).texts))].filter((k) => k !== 'credits.supporters');
    const order = Object.keys(refs.texts);
    keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const key of keys) {
      const paras = textParagraphs(data, key);
      const here = ids.map((id) => byId.get(id)).filter((it) => it.texts.includes(key));
      for (const h of locate(here, key, paras, lang()).hits) add(key, sentenceAt(paras[h.para], h.start, h.end), h.para * 1e6 + h.start);
      if (key !== 'openingSpeech') continue;
      const marks = locateFootnotes(refs.footnotes.filter((f) => ids.includes(f.ref) && !byId.get(f.ref).inline), paras, lang());
      for (const m of marks) add(key, sentenceAt(paras[m.para], m.at - 2, m.at - 1), m.para * 1e6 + m.at);
    }
    return out.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key) || a.at - b.at);
  };

  // A reference's card. tag: its heading's level.
  const card = (it, tag = 'h5') => {
    const links = [];
    const main = linkFor(it, lang());
    const name = (href) => (/\bwikipedia\.org$/.test(R.host(href)) ? t('concept.wikipedia') : R.host(href));
    if (main && main.href !== it.url.primary) links.push(R.out(main.href, esc(name(main.href)), { mark: main.mark, context: label(it) }));
    if (it.url.primary && !(it.fixed && links.length)) links.push(R.out(it.url.primary, `${esc(t('concept.source'))}: ${esc(R.host(it.url.primary))}`, { context: label(it) }));
    const fn = refs.footnotes.find((f) => f.ref === it.id);
    const citation = it.citation ? `<span class="cite">${fn ? R.cite(fn) : esc(it.citation)}</span>` : '';
    return `<article class="ref-card">
      <${tag} tabindex="-1">${esc(label(it))}</${tag}>
      <p class="ref-type">${esc(typeLine(it))}</p>
      <dl>
        ${it.date ? `<dt>${esc(t('concept.dateLabel'))}</dt><dd>${esc(dateText(it))}</dd>` : ''}
        ${links.length ? `<dt>${esc(t('concept.linksLabel'))}</dt><dd>${links.join(' · ')}${citation}</dd>` : ''}
        <dt>${esc(t('concept.mentionedIn'))}</dt><dd>${it.texts.map(textName).join('; ')}</dd>
      </dl>
    </article>`;
  };

  const themesHTML = () => refs.themes.map((th) => {
    const intro = th.confirmed && th.intro[lang()] ? `<p>${esc(th.intro[lang()])}</p>` : '';
    const wiki = linkFor(th, lang());
    return `<section class="concept-theme" aria-labelledby="concept-theme-${th.id}">
      <h3 id="concept-theme-${th.id}" tabindex="-1">${esc(label(th))}</h3>
      ${wiki ? `<p class="theme-wiki">${R.out(wiki.href, esc(t('concept.wikipedia')), { mark: wiki.mark, context: label(th) })}</p>` : ''}
      ${intro}
      <h4>${esc(t('concept.passages'))}</h4>
      ${passagesFor(th.refs).map((p) => `<figure class="passage"><blockquote><p>${esc(p.sentence)}</p></blockquote><figcaption>${textName(p.key)}</figcaption></figure>`).join('')}
      <h4>${esc(t('concept.references'))}</h4>
      <ul class="ref-cards">${th.refs.map((id) => `<li>${card(byId.get(id))}</li>`).join('')}</ul>
      <h4>${esc(t('concept.works'))}</h4>
      ${th.works === 'all' ? `<p>${esc(t('concept.allWorks'))}</p>` : `<ul class="work-links">${th.works.map((id) => `<li>${workButton(workById(id))}</li>`).join('')}</ul>`}
    </section>`;
  }).join('');

  // What touches a work: the references that name it and the themes that lead to it. The
  // viewer's "Connections" line uses the same.
  const connections = (w) => ({
    items: items.filter((it) => it.works.includes(w.id)),
    themes: refs.themes.filter((th) => th.works === 'all' || th.works.includes(w.id)),
  });
  const worksHTML = () => works().map((w) => ({ w, c: connections(w) })).filter(({ c }) => c.items.length).map(({ w, c }) => `
    <section class="concept-work-sec">
      <h3>${workButton(w)}</h3>
      <h4>${esc(t('concept.references'))}</h4>
      <ul class="plain">${c.items.map((it) => `<li>${R.itemLink(it, esc(label(it)))} <span class="ref-type">${esc(typeLine(it))}</span></li>`).join('')}</ul>
      <h4>${esc(t('concept.themes'))}</h4>
      <ul class="plain">${c.themes.map((th) => `<li>${themeButton(th)}</li>`).join('')}</ul>
    </section>`).join('');

  const timelineHTML = () => {
    const dated = items.filter((it) => it.year).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
    return `<ol class="timeline">
      ${dated.map((it) => `<li><span class="year">${it.year}</span><span>${R.itemLink(it, esc(label(it)))} <span class="ref-type">${esc(typeLine(it))}${dateText(it) !== String(it.year) ? ` · ${esc(dateText(it))}` : ''}</span></span></li>`).join('')}
      <li><span class="year">2025</span><span><span${lang() !== 'en' ? ' lang="en"' : ''}>${esc(data.meta.title)}</span> <span class="ref-type">${esc(t('concept.exhibition'))} · ${esc(data.meta.dates)}</span></span></li>
    </ol>`;
  };

  const swatch = (inner) => `<svg class="swatch" width="34" height="16" viewBox="0 0 34 16" aria-hidden="true" focusable="false">${inner}</svg>`;
  const networkHTML = () => `
    <p class="note">${esc(t('concept.netHelp'))}</p>
    <div class="concept-net-wrap"><svg class="concept-net" role="group" aria-label="${esc(t('concept.netLabel'))}"></svg></div>
    <p class="net-note">${esc(t('concept.netNote'))}</p>
    <div id="concept-card" hidden></div>
    <h3 class="legend-h">${esc(t('concept.legend'))}</h3>
    <ul class="net-legend">
      <li>${swatch('<circle class="shape theme" cx="17" cy="8" r="7"/>')}${esc(t('concept.legendTheme'))}</li>
      <li>${swatch('<circle class="shape item" cx="17" cy="8" r="4"/>')}${esc(t('concept.legendItem'))}</li>
      <li>${swatch('<rect class="shape work" x="12" y="3" width="10" height="10"/>')}${esc(t('concept.legendWork'))}</li>
      <li>${swatch('<line class="edge item-theme" x1="1" y1="8" x2="33" y2="8"/>')}${esc(t('concept.legendItemTheme'))}</li>
      <li>${swatch('<line class="edge item-work" x1="1" y1="8" x2="33" y2="8"/>')}${esc(t('concept.legendItemWork'))}</li>
      <li>${swatch('<line class="edge theme-work" x1="1" y1="8" x2="33" y2="8"/>')}${esc(t('concept.legendThemeWork'))}</li>
    </ul>`;

  const VIEWS = { themes: themesHTML, works: worksHTML, timeline: timelineHTML, network: networkHTML };
  const html = () => {
    R = refHTML(refs, { t, lang: lang() });
    return `
    <div class="concept">
    <p class="eyebrow">${esc(t('concept.eyebrow'))}</p>
    <h2 id="panel-title">${esc(t('concept.title'))}</h2>
    <div class="concept-tabs" role="tablist" aria-label="${esc(t('concept.tablist'))}">
      ${TABS.map((n) => `<button role="tab" id="concept-tab-${n}" data-tab="${n}" aria-controls="concept-view-${n}" aria-selected="${n === tab}" tabindex="${n === tab ? 0 : -1}">${esc(t(`concept.tabs.${n}`))}</button>`).join('')}
    </div>
    ${TABS.map((n) => `<div role="tabpanel" id="concept-view-${n}" aria-labelledby="concept-tab-${n}"${n === tab ? '' : ' hidden'}>${VIEWS[n]()}</div>`).join('')}
    </div>`;
  };

  // ---- The network ----
  const SVG = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}, text) => {
    const n = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const nodeInfo = (n) => {
    if (n.kind === 'theme') return { label: label(themeById.get(n.id)), type: t('concept.type.theme') };
    if (n.kind === 'work') return { label: workById(n.id).title, type: t('concept.type.work'), lang: titleLang(workById(n.id)) };
    return { label: label(byId.get(n.id)), type: typeWord(byId.get(n.id)) };
  };
  // Tab order: the themes, then the references and concepts by label, then the works in
  // catalogue order.
  const ordered = () => {
    const ns = refs.network.nodes;
    const collator = new Intl.Collator(lang());
    return [
      ...ns.filter((n) => n.kind === 'theme'),
      ...ns.filter((n) => n.kind === 'item').sort((a, b) => collator.compare(label(byId.get(a.id)), label(byId.get(b.id)))),
      ...ns.filter((n) => n.kind === 'work').sort((a, b) => workById(a.id).no - workById(b.id).no),
    ];
  };
  // Words of a label broken into lines of at most `max` letters.
  const wrap = (s, max) => {
    const lines = [];
    for (const w of s.split(' ')) {
      if (lines.length && `${lines[lines.length - 1]} ${w}`.length <= max) lines[lines.length - 1] += ` ${w}`;
      else lines.push(w);
    }
    return lines;
  };
  // Drawn at the panel's real width, in CSS pixels, so the type keeps its size (12 px at
  // least) however wide the panel is. A narrow panel gets a taller picture: positions carry
  // no meaning, so stretching them is free.
  function draw() {
    const svg = body.querySelector('.concept-net');
    if (!svg) return;
    const focused = document.activeElement?.closest?.('[data-node]')?.dataset.node;
    const width = Math.max(280, Math.round(svg.parentElement.clientWidth));
    const narrow = width < 600;
    const height = Math.round(narrow ? width * 1.45 : width * refs.network.aspect);
    drawnWidth = width;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const font = narrow ? 12 : 13;
    const at = new Map(refs.network.nodes.map((n) => [n.id, { x: n.x * width, y: n.y * height }]));
    const kids = [];
    for (const e of refs.network.edges) {
      const a = at.get(e.a);
      const b = at.get(e.b);
      kids.push(el('line', { class: `edge ${e.kind}`, 'data-a': e.a, 'data-b': e.b, x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1) }));
    }
    const labels = el('g', { class: 'labels', 'aria-hidden': 'true' });
    for (const n of ordered()) {
      const p = at.get(n.id);
      const info = nodeInfo(n);
      const g = el('g', {
        class: `node ${n.kind}`, 'data-node': n.id, tabindex: '0', role: 'button',
        'aria-label': t(n.links === 1 ? 'concept.nodeNameOne' : 'concept.nodeName', { label: info.label, type: info.type, n: n.links }),
      });
      const r = n.kind === 'theme' ? (narrow ? 10 : 13) : n.kind === 'item' ? 5.5 : 5;
      g.append(el('circle', { class: 'hit', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: Math.max(r + 3, 13) }));
      if (n.kind === 'work') g.append(el('rect', { class: 'shape work', x: (p.x - r).toFixed(1), y: (p.y - r).toFixed(1), width: r * 2, height: r * 2 }));
      else g.append(el('circle', { class: `shape ${n.kind}`, cx: p.x.toFixed(1), cy: p.y.toFixed(1), r }));
      kids.push(g);
      // the label: under the node, kept inside the picture
      const lines = wrap(info.label, n.kind === 'theme' ? (narrow ? 14 : 20) : 26);
      const half = (Math.max(...lines.map((l) => l.length)) * font * 0.56) / 2;
      const x = Math.min(Math.max(p.x, half + 4), width - half - 4);
      const text = el('text', { class: `lbl ${n.kind}`, 'data-for': n.id, x: x.toFixed(1), y: (p.y + r + font + 3).toFixed(1), 'text-anchor': 'middle', 'font-size': font });
      lines.forEach((l, i) => text.append(el('tspan', { x: x.toFixed(1), dy: i ? font * 1.2 : 0 }, l)));
      labels.append(text);
    }
    svg.replaceChildren(...kids, labels);
    paint();
    if (focused) svg.querySelector(`[data-node="${focused}"]`)?.focus({ preventScroll: true });
  }
  // The highlight: the node, its neighbours and the lines between them stay; the rest dims.
  function paint() {
    const svg = body.querySelector('.concept-net');
    if (!svg) return;
    const near = hl ? neighbours.get(hl) || new Set() : null;
    svg.classList.toggle('dim', !!hl);
    for (const g of svg.querySelectorAll('[data-node]')) g.classList.toggle('hl', !!hl && (g.dataset.node === hl || near.has(g.dataset.node)));
    for (const l of svg.querySelectorAll('line.edge')) l.classList.toggle('hl', !!hl && (l.dataset.a === hl || l.dataset.b === hl));
    for (const x of svg.querySelectorAll('.lbl')) {
      x.classList.toggle('on', x.dataset.for === hl);
      x.classList.toggle('hl', !!hl && (x.dataset.for === hl || near.has(x.dataset.for)));
    }
  }
  const setHL = (id) => {
    if (id === hl) return;
    hl = id;
    paint();
  };
  const over = (id) => { if (id !== dismissed) setHL(id); };
  const out = (id) => {
    if (dismissed === id) dismissed = null;
    // a node that still has keyboard focus keeps its highlight when the pointer leaves another
    const f = document.activeElement?.closest?.('[data-node]')?.dataset.node;
    setHL(f && f !== id && f !== dismissed ? f : null);
  };

  const themeHeading = (id) => body.querySelector(`#concept-theme-${id}`);
  function select(name, { focus = false } = {}) {
    tab = name;
    for (const b of body.querySelectorAll('[role="tab"]')) {
      const on = b.dataset.tab === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const n of TABS) body.querySelector(`#concept-view-${n}`).hidden = n !== name;
    if (name === 'network') draw();
  }
  function openTheme(id) {
    select('themes');
    const h = themeHeading(id);
    h?.scrollIntoView({ block: 'start' });
    h?.focus({ preventScroll: true });
  }
  function showCard(id, { focus = true } = {}) {
    const slot = body.querySelector('#concept-card');
    if (!slot) return;
    cardFor = id;
    slot.innerHTML = `${card(byId.get(id), 'h3')}<p><button class="link mono" data-back="${esc(id)}">${esc(t('concept.backToDiagram'))}</button></p>`;
    slot.hidden = false;
    if (!focus) return;
    const h = slot.querySelector('h3');
    h.scrollIntoView({ block: 'nearest' });
    h.focus({ preventScroll: true });
  }
  function activate(id) {
    if (themeById.has(id)) openTheme(id);
    else if (byId.has(id)) showCard(id);
    else onGotoWork(workById(id));
  }

  // One set of listeners on the panel's body, for as long as the page lives; they act only
  // on the Concept page's own elements.
  body.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.concept [role="tab"]');
    if (tabBtn) { select(tabBtn.dataset.tab); return; }
    const go = e.target.closest('.concept [data-goto]');
    if (go) { onGotoWork(workById(go.dataset.goto)); return; }
    const th = e.target.closest('.concept [data-theme]');
    if (th) { openTheme(th.dataset.theme); return; }
    const back = e.target.closest('.concept [data-back]');
    if (back) { body.querySelector(`[data-node="${back.dataset.back}"]`)?.focus(); return; }
    const node = e.target.closest('.concept [data-node]');
    if (node) activate(node.dataset.node);
  });
  body.addEventListener('keydown', (e) => {
    const tabBtn = e.target.closest?.('.concept [role="tab"]');
    if (tabBtn) {
      const i = TABS.indexOf(tabBtn.dataset.tab);
      const to = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(TABS[to], { focus: true });
      return;
    }
    const node = e.target.closest?.('.concept [data-node]');
    if (node && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      activate(node.dataset.node);
    }
  });
  body.addEventListener('pointerover', (e) => { const n = e.target.closest?.('.concept [data-node]'); if (n) over(n.dataset.node); });
  body.addEventListener('pointerout', (e) => { const n = e.target.closest?.('.concept [data-node]'); if (n && !n.contains(e.relatedTarget)) out(n.dataset.node); });
  body.addEventListener('focusin', (e) => { const n = e.target.closest?.('.concept [data-node]'); if (n) over(n.dataset.node); });
  body.addEventListener('focusout', (e) => { const n = e.target.closest?.('.concept [data-node]'); if (n) { if (dismissed === n.dataset.node) dismissed = null; setHL(null); } });
  // the diagram follows the panel's width
  new ResizeObserver(() => {
    const svg = body.querySelector('.concept-net');
    if (!svg || tab !== 'network') return;
    if (Math.max(280, Math.round(svg.parentElement.clientWidth)) !== drawnWidth) draw();
  }).observe(body);

  return {
    html,
    connections,
    // A fresh opening starts on Themes with no card; a rebuild (language switch) keeps both.
    reset() { tab = 'themes'; cardFor = null; hl = null; dismissed = null; },
    // After the page's HTML is in the panel.
    mount() {
      hl = null;
      if (tab === 'network') {
        draw();
        if (cardFor) showCard(cardFor, { focus: false });
      }
    },
    themeHeading,
    openTheme,
    // Esc: a highlight in the diagram is cleared first (true), and the next Esc closes the panel.
    clearHighlight() {
      if (tab !== 'network' || !hl) return false;
      dismissed = hl;
      setHL(null);
      return true;
    },
  };
}
