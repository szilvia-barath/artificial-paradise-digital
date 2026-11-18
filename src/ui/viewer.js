import { t, lang, titleLang } from '../i18n.js';
import { focusDialog } from './dialog.js';
import { announce, unannounce } from './announce.js';
import { readAloudButton } from './readAloud.js';
import { workDescriptions, roomDescription } from '../localize.js';
import { isPart } from '../world/route.js';
import refs from '../data/references.json';
import { refHTML } from '../refhtml.js';

// Artwork overlay: a link to the work on kristoflab.com where it has a page; large image (for the video works, the loop with its sound, and on
// request the full video from YouTube or Google Drive), caption, the artist's
// text on the work or its series, exhibition text, prev/next, "in situ" photos, and a
// "walk to this work" shortcut.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A work's installation photos: its own list, or the one cut from its source photo.
const situPhotos = (w) => w.situ || [`${w.image}-situ`];

// A full video's player, made only when its button is pressed: YouTube's embed from
// youtube-nocookie.com where the entry has a 'youtube' id (it wins over 'drive'), otherwise
// Google Drive's. No autoplay: the visitor starts the video in the player. rel=0 keeps the
// videos suggested at the end to the same channel; hl gives the player's controls the
// site's language.
const playerSrc = (v) => (v.youtube
  ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}?rel=0&hl=${lang()}`
  : `https://drive.google.com/file/d/${encodeURIComponent(v.drive)}/preview`);

// onMedia(isVideo) tells the sound mix whether a video (with its own sound) is showing;
// isMuted() is the site's sound switch.
// connections(work): the references and themes that touch a work (the Concept page's data);
// onTheme(id): open the Concept page at a theme.
export function setupViewer(data, { onOpen, onClose, onGoto, onMedia, isMuted, focusFallback, connections, onTheme }) {
  const el = document.getElementById('viewer');
  const closeBtn = el.querySelector('[data-close]');
  // Focus goes to the Close button on opening and back to the opener on closing.
  const dialog = focusDialog(el, { initial: () => closeBtn, fallback: focusFallback });
  const img = document.getElementById('viewer-img');
  const video = document.getElementById('viewer-video');
  const frame = document.getElementById('viewer-frame');
  const videoBtns = document.getElementById('viewer-videos');
  const loading = el.querySelector('.viewer-loading');
  const title = document.getElementById('viewer-title');
  const meta = document.getElementById('viewer-meta');
  const site = document.getElementById('viewer-site');
  const conn = document.getElementById('viewer-connections');
  const caption = document.getElementById('viewer-caption');
  const desc = document.getElementById('viewer-desc');
  const describe = document.getElementById('viewer-describe');
  const space = document.getElementById('viewer-space');
  const room = document.getElementById('viewer-room');
  const text = document.getElementById('viewer-text');
  const count = document.getElementById('viewer-count');
  const base = import.meta.env.BASE_URL;
  const works = data.works;
  // Previous and Next go through the 17 works. No. 3's small screen is an entry of its own
  // (a click on it in the 3D view opens it) but not a work: they pass it by, and while it
  // shows it counts as no. 3.
  const seq = works.filter((w) => !isPart(w));
  const seqAt = (w) => (seq.includes(w) ? seq.indexOf(w) : seq.findIndex((x) => x.no === w.no));
  let index = -1;
  let situ = 0; // 0 = the work, n = its nth installation photo
  let full = -1; // index of the full video shown (YouTube or Drive player), -1 = none

  // Read aloud (readAloud.js): the text column's words about the work, from the room line to
  // the artist's text, with the descriptions and the room's audio description where they are
  // filled ([data-read]; not the buttons, the link or the folded exhibition text). It stands
  // under the title; none where the browser cannot speak.
  const readParts = () => [room, title, meta, caption, ...el.querySelectorAll('[data-read]')];
  const reader = readAloudButton(() => readParts().filter((n) => !n.hidden).map((n) => n.innerText).join('\n'));
  if (reader) title.after(reader.button);

  const renderText = () => {
    text.innerHTML = data.text.map((p) => `<p>${esc(p)}</p>`).join('') + `<p class="note">${esc(data.textCredit)}</p>`;
  };
  renderText();

  // In-situ toggle (adds a small button under the caption)
  const situBtn = document.createElement('button');
  situBtn.className = 'link mono';
  situBtn.style.marginTop = '0';
  caption.after(situBtn);

  // The loop's own player controls show under the mouse, and always on touch screens.
  // While keyboard focus is inside them Chromium keeps every key press to itself, Esc and
  // Tab included, so they stay out of the tab order and a Pause / Play button stands in.
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mediaBox = el.querySelector('.viewer-media');
  video.controls = coarse;
  if (!coarse) {
    mediaBox.addEventListener('pointerenter', () => { video.controls = true; });
    mediaBox.addEventListener('pointerleave', () => { video.controls = false; });
  }
  const playBtn = document.createElement('button');
  playBtn.className = 'link mono';
  playBtn.style.marginTop = '0';
  videoBtns.before(playBtn);
  const syncPlay = () => {
    playBtn.hidden = video.hidden;
    playBtn.textContent = t(video.paused ? 'viewer.play' : 'viewer.pause');
  };
  video.addEventListener('play', syncPlay);
  video.addEventListener('pause', syncPlay);
  playBtn.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });

  const renderInfo = () => {
    const w = works[index];
    const photos = situPhotos(w).length;
    // An installation photo is a view of the room, not the work: its text says so.
    img.alt = !situ
      ? `${w.title}, ${w.medium}`
      : t(photos > 1 ? 'viewer.situAlt' : 'viewer.situAltOne', { n: situ, total: photos, title: w.title });
    room.textContent = `${data.rooms[w.room].name} · ${t('viewer.no', { no: w.no })}`;
    title.textContent = w.title;
    if (titleLang(w)) title.lang = titleLang(w);
    else title.removeAttribute('lang');
    meta.innerHTML = `${esc(data.meta.artist)}<br />${esc([w.medium, w.size, w.year].filter(Boolean).join(', '))}`;
    // the work (or its series) on the artist's own website, in the site's language
    const link = w.link && (w.link[lang()] || w.link.en);
    site.hidden = !link;
    if (link) {
      site.href = link;
      site.textContent = `${t('viewer.artistSite')} ↗`;
    }
    // Connections: the references that name the work (links, as in the texts) and the themes
    // that lead to it (each opens the Concept page at that theme). Only for the works that
    // have a section in the Concept page's Works view: those a reference names.
    const c = connections ? connections(seq.find((x) => x.no === w.no) || w) : { items: [], themes: [] };
    conn.hidden = !c.items.length;
    if (c.items.length) {
      const R = refHTML(refs, { t, lang: lang() });
      conn.innerHTML = `<h3 id="viewer-connections-h">${esc(t('concept.connections'))}</h3><ul aria-labelledby="viewer-connections-h">${[
        ...c.items.map((it) => `<li>${R.itemLink(it, esc(it.label[lang()] || it.label.en))}</li>`),
        ...c.themes.map((th) => `<li><button class="conn-theme" data-theme="${esc(th.id)}">${esc(th.label[lang()] || th.label.en)}<span class="sr-only"> (${esc(t('concept.openTheme'))})</span></button></li>`),
      ].join('')}</ul>`;
    } else conn.innerHTML = '';
    caption.textContent = w.caption || '';
    caption.hidden = !w.caption;
    // the artist's text, with the links to what it mentions laid over it (references.json)
    const d = w.desc && data.descriptions[w.desc];
    desc.innerHTML = d
      ? `<h3>${esc(d.heading)}</h3>${refHTML(refs, { t, lang: lang() }).paragraphs(`descriptions.${w.desc}`, d.text).map((p) => `<p>${p}</p>`).join('')}${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}`
      : '';
    // The descriptions still to come (accessDescriptions in src/i18n): each under its heading
    // once filled; while every field is empty there is nothing here, not even a heading.
    const section = (key, paras) => `<h3>${esc(t(`describe.${key}`))}</h3>${paras.map((p) => `<p>${esc(p)}</p>`).join('')}`;
    const own = workDescriptions(data, w);
    describe.innerHTML = own.map(([k, p]) => section(k, p)).join('');
    describe.hidden = !own.length;
    const roomText = roomDescription(data, w.room);
    space.innerHTML = roomText.length ? section('space', roomText) : '';
    space.hidden = !roomText.length;
    situBtn.textContent = t(situ === 0 ? 'viewer.situ' : situ < photos ? 'viewer.situNext' : 'viewer.work');
    const vids = (!situ && w.video && w.video.full) || [];
    // the button that goes back names what the viewer shows without the full video
    const back = w.video?.viewer ? 'viewer.backDoc' : w.video?.loop ? 'viewer.loop' : 'viewer.photo';
    videoBtns.innerHTML = vids
      .map((v, i) => `<button class="link mono" data-full="${i}">${esc(full === i ? t(back) : t(`viewer.${v.label}`, { title: v.title || w.title }))}</button>`)
      .join('');
    count.textContent = t('viewer.count', { no: w.no, total: seq.length });
    // the players' names: the clip that plays here (a loop, or video documentation for nos. 3
    // and 16), and the YouTube or Google Drive player, which loads only after "Full video" is
    // pressed (named after the full video's own title where it has one: Siluett, in no. 16)
    video.setAttribute('aria-label', t(w.video?.viewer ? 'viewer.videoDocName' : 'viewer.videoLoopName', { title: w.title }));
    const fv = vids[full >= 0 ? full : 0];
    frame.title = t(fv?.youtube ? 'viewer.frameTitleYoutube' : 'viewer.frameTitle', { title: fv?.title || w.title });
    syncPlay();
  };

  // Which medium fills the left side: the full video's player, the video loop, or the photograph.
  const showMedia = (w) => {
    const vids = w.video && !situ ? w.video : null;
    const player = vids && full >= 0 ? playerSrc(vids.full[full]) : null;
    frame.hidden = !player;
    if (player) {
      if (frame.getAttribute('src') !== player) frame.setAttribute('src', player);
    } else frame.removeAttribute('src');
    const clip = vids && (vids.viewer || vids.loop);
    const loop = clip && !player;
    video.hidden = !loop;
    if (loop) {
      if (video.getAttribute('src') !== `${base}${clip}`) {
        video.poster = `${base}${w.image}.webp`;
        video.src = `${base}${clip}`;
      }
      video.muted = !!(isMuted && isMuted());
      video.play().catch(() => {});
    } else {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    const moving = !!(loop || player);
    img.hidden = moving;
    loading.hidden = moving || img.classList.contains('ready');
    syncPlay();
    if (onMedia) onMedia(moving);
  };

  const show = () => {
    const w = works[index];
    const src = `${base}${situ ? situPhotos(w)[situ - 1] : w.image}.webp`;
    img.classList.remove('ready');
    loading.hidden = false;
    img.onload = () => { img.classList.add('ready'); loading.hidden = true; };
    img.src = src;
    showMedia(w);
    renderInfo();
    // Preload neighbours
    const at = seqAt(works[index]);
    for (const k of [at + 1, at - 1]) {
      const n = seq[(k + seq.length) % seq.length];
      const pre = new Image();
      pre.src = `${base}${n.image}.webp`;
    }
  };

  // The text column scrolls on its own (on a phone it is the lower half of the viewer).
  const info = el.querySelector('.viewer-info');
  // Keep a control in view inside the text column, without moving anything else.
  const keepInView = (n) => {
    const r = n.getBoundingClientRect();
    const box = info.getBoundingClientRect();
    if (r.bottom > box.bottom) info.scrollTop += r.bottom - box.bottom + 8;
    else if (r.top < box.top) info.scrollTop -= box.top - r.top + 8;
  };
  // back(work): set when the work was opened from the works list. Closing the viewer with
  // its Close button, Esc or a click beside the picture then calls it with the work last
  // shown (main.js reopens the list there) in place of handing focus back. "Walk to this
  // work", the navbar or the tour close it as before.
  let back = null;
  // opts.opener: where focus goes back to, if not the control that has focus now.
  const open = (work, opts = {}) => {
    index = works.indexOf(work);
    situ = 0;
    full = -1;
    back = opts.back || null;
    show();
    el.hidden = false;
    info.scrollTop = 0; // a work opens at its title, wherever the last one was left
    onOpen();
    dialog.opened('opener' in opts ? { opener: opts.opener } : {});
  };
  // toList: closed by the visitor (Close, Esc, a click beside the picture).
  const close = (toList = false) => {
    if (el.hidden) return;
    // a work stepped to just before closing and not yet said is no longer on screen
    unannounce('viewer');
    reader?.stop();
    const ret = toList ? back : null;
    back = null;
    el.hidden = true;
    img.removeAttribute('src');
    full = -1;
    showMedia({});
    onClose();
    dialog.closed({ refocus: !ret });
    if (ret) ret(works[index]);
  };
  // The new work is said on its own topic of the live region, so a room or a work in the
  // 3D view said at the same moment does not take its place.
  const step = (d) => {
    reader?.stop(); // the next work's text replaces the one being read
    index = works.indexOf(seq[(seqAt(works[index]) + d + seq.length) % seq.length]);
    situ = 0;
    full = -1;
    show();
    const w = works[index];
    announce(t('announce.viewerWork', { title: w.title, no: w.no, total: seq.length }), 'viewer');
  };

  situBtn.addEventListener('click', () => {
    situ = (situ + 1) % (situPhotos(works[index]).length + 1);
    full = -1;
    show();
  });
  videoBtns.addEventListener('click', (e) => {
    const b = e.target.closest('[data-full]');
    if (!b) return;
    const i = Number(b.dataset.full);
    full = full === i ? -1 : i;
    showMedia(works[index]);
    renderInfo();
    // the buttons were rebuilt: keep focus on the one just pressed
    videoBtns.querySelector(`[data-full="${i}"]`)?.focus({ preventScroll: true });
  });
  conn.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]');
    if (b && onTheme) onTheme(b.dataset.theme);
  });
  closeBtn.addEventListener('click', () => close(true));
  // Previous and Next by tap or click: the new work's text starts at its title. By keyboard
  // the column stays where it is, so the focused button is not scrolled away (only kept in
  // view if the new text is shorter).
  for (const [id, d] of [['viewer-prev', -1], ['viewer-next', 1]]) {
    document.getElementById(id).addEventListener('click', (e) => {
      step(d);
      if (e.detail > 0) info.scrollTop = 0;
      else keepInView(e.currentTarget);
    });
  }
  document.getElementById('viewer-goto').addEventListener('click', () => {
    const w = works[index];
    close();
    onGoto(w);
  });
  el.querySelector('.viewer-media').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(true); });
  // (The panels' own Esc listener is added before this one, so the Esc that reopens the
  // works list here does not also close it.)
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Escape') close(true);
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  // Swipe on touch: one finger, and only while the page is not pinch-zoomed (then a drag
  // moves round the enlarged page, and two fingers zoom it; neither changes the work).
  let sx = null;
  const pageZoomed = () => (window.visualViewport ? window.visualViewport.scale > 1.01 : false);
  img.addEventListener('touchstart', (e) => { sx = e.touches.length === 1 && !pageZoomed() ? e.touches[0].clientX : null; }, { passive: true });
  img.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) {
      step(dx < 0 ? 1 : -1);
      info.scrollTop = 0;
    }
    sx = null;
  });

  // After a language switch: re-render the texts without reloading the image.
  const refresh = () => {
    renderText();
    if (el.hidden) return;
    renderInfo();
    dialog.rebuilt(); // if focus was on a rebuilt button (the full videos), it goes to Close
  };

  return { open, close: () => close(), refresh, isOpen: () => !el.hidden };
}
