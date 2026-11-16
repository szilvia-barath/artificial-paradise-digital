// The HTML for the links and footnotes laid over the exhibition's texts. No browser APIs:
// the site (panels, viewer, Concept page) and the accessible version's build step
// (scripts/text-edition.mjs) both call it with their own t() and language, so the two
// pages carry the same links. The texts themselves (src/i18n) are not changed.
import { locate, locateFootnotes, linkFor } from './refs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

export function refHTML(refs, { t, lang }) {
  const byId = new Map(refs.items.map((it) => [it.id, it]));

  // A link to an outside site: a new tab, no opener or referrer, and its name says so. A
  // link that falls back to the other language carries that language's mark ("EN", "HU")
  // after its words; a screen reader hears it in words.
  // html: the link's words, already escaped. context: words added to the name only.
  const out = (href, html, { mark = '', context = '', cls = 'ref' } = {}) => {
    const said = [context, mark && t(`concept.in.${mark.toLowerCase()}`), t('concept.newTab')].filter(Boolean).join(', ');
    return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener noreferrer"${mark ? ` hreflang="${mark.toLowerCase()}"` : ''}>${html}${mark ? `<span class="lang-mark" aria-hidden="true">${mark}</span>` : ''}<span class="sr-only"> (${esc(said)})</span></a>`;
  };
  // An item's (or a theme's) link in the page language, or just the words if it has none.
  const itemLink = (it, html, opts) => {
    const l = linkFor(it, lang);
    return l ? out(l.href, html, { ...opts, mark: l.mark }) : html;
  };

  // A text's paragraphs with its links, and in the opening speech the footnote markers.
  // Returns the inner HTML of each paragraph.
  const paragraphs = (key, paras) => {
    const { hits } = locate(refs.items, key, paras, lang);
    const marks = key === 'openingSpeech' ? locateFootnotes(refs.footnotes, paras, lang) : [];
    return paras.map((p, i) => {
      const cuts = [
        ...hits.filter((h) => h.para === i).map((h) => ({ at: h.start, end: h.end, id: h.id })),
        ...marks.filter((m) => m.para === i).map((m) => ({ at: m.at, end: m.at, n: m.n })),
      ].sort((a, b) => a.at - b.at || (a.n ? 1 : -1));
      let html = '';
      let pos = 0;
      for (const c of cuts) {
        if (c.at > pos) { html += esc(p.slice(pos, c.at)); pos = c.at; }
        if (c.n) html += `<sup class="fn"><a href="#fn-${c.n}" id="fnref-${c.n}" data-fn="${c.n}" aria-label="${esc(t('concept.footnote', { n: c.n }))}">${c.n}</a></sup>`;
        else if (c.at >= pos) { html += itemLink(byId.get(c.id), esc(p.slice(c.at, c.end))); pos = c.end; }
      }
      return html + esc(p.slice(pos));
    });
  };

  // A citation, marked with its language where that is not the page's.
  const cite = (f) => (f.lang && f.lang !== lang ? `<span lang="${f.lang}">${esc(f.citation)}</span>` : esc(f.citation));

  // The notes under the opening speech: the citation as the table has it (the same in both
  // languages), a link to the source and a link back to the marker. tag: the heading's level.
  const notes = (tag = 'h4') => `<${tag} class="fn-h">${esc(t('concept.notes'))}</${tag}>
<ol class="footnotes">${refs.footnotes.map((f) => `
<li id="fn-${f.n}" tabindex="-1">${cite(f)} ${out(f.url, esc(host(f.url)))} <a class="fn-back" href="#fnref-${f.n}" data-fnref="${f.n}" aria-label="${esc(t('concept.backToText', { n: f.n }))}">↩</a></li>`).join('')}
</ol>`;

  // The supporters' line of the credits: each name is the link to its reference.
  const supporters = (value) => {
    const names = value.split(refs.supporters.sep);
    if (names.length !== refs.supporters.ids.length) return esc(value);
    return names.map((n, i) => itemLink(byId.get(refs.supporters.ids[i]), esc(n))).join(esc(refs.supporters.sep));
  };
  // The credits' values, the supporters' line with its links.
  const credit = (value, row) => (row === refs.supporters.row ? supporters(value) : esc(value));

  return { byId, out, itemLink, paragraphs, notes, cite, supporters, credit, host };
}
