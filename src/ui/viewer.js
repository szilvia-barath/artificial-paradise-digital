import { t, lang } from '../i18n.js';
import { focusDialog } from './dialog.js';

// Artwork overlay: a link to the work on kristoflab.com where it has a page; large image (for the video works, the loop with its sound, and on
// request the full video or video documentation from Google Drive), caption, the artist's
// text on the work or its series, exhibition text, prev/next, "in situ" photos, and a
// "walk to this work" shortcut.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// A work's installation photos: its own list, or the one cut from its source photo.
const situPhotos = (w) => w.situ || [`${w.image}-situ`];

// onMedia(isVideo) tells the sound mix whether a video (with its own sound) is showing;
// isMuted() is the site's sound switch.
export function setupViewer(data, { onOpen, onClose, onGoto, onMedia, isMuted, focusFallback }) {
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
  const caption = document.getElementById('viewer-caption');
  const desc = document.getElementById('viewer-desc');
  const room = document.getElementById('viewer-room');
  const text = document.getElementById('viewer-text');
  const count = document.getElementById('viewer-count');
  const base = import.meta.env.BASE_URL;
  const works = data.works;
  let index = -1;
  let situ = 0; // 0 = the work, n = its nth installation photo
  let full = -1; // index of the full video shown from Drive, -1 = none

  const renderText = () => {
    text.innerHTML = data.text.map((p) => `<p>${esc(p)}</p>`).join('') + `<p class="mono" style="color:#8a8a88;font-size:11px">${esc(data.textCredit)}</p>`;
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
    img.alt = `${w.title}, ${w.medium}`;
    room.textContent = `${data.rooms[w.room].name} · ${t('viewer.no', { no: w.no })}`;
    title.textContent = w.title;
    meta.innerHTML = `${esc(data.meta.artist)}<br />${esc([w.medium, w.size, w.year].filter(Boolean).join(', '))}`;
    // the work (or its series) on the artist's own website, in the site's language
    const link = w.link && (w.link[lang()] || w.link.en);
    site.hidden = !link;
    if (link) {
      site.href = link;
      site.textContent = `${t('viewer.artistSite')} ↗`;
    }
    caption.textContent = w.caption || '';
    caption.hidden = !w.caption;
    const d = w.desc && data.descriptions[w.desc];
    desc.innerHTML = d
      ? `<h3>${esc(d.heading)}</h3>${d.text.map((p) => `<p>${esc(p)}</p>`).join('')}${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}`
      : '';
    const photos = situPhotos(w).length;
    situBtn.textContent = t(situ === 0 ? 'viewer.situ' : situ < photos ? 'viewer.situNext' : 'viewer.work');
    const vids = (!situ && w.video && w.video.full) || [];
    const back = w.video && w.video.loop ? 'viewer.loop' : 'viewer.photo';
    videoBtns.innerHTML = vids
      .map((v, i) => `<button class="link mono" data-full="${i}">${esc(t(full === i ? back : `viewer.${v.label}`))}</button>`)
      .join('');
    syncPlay();
  };

  // Which medium fills the left side: Drive player, video loop, or the photograph.
  const showMedia = (w) => {
    const vids = w.video && !situ ? w.video : null;
    const drive = vids && full >= 0 ? vids.full[full].drive : null;
    frame.hidden = !drive;
    if (drive) {
      const src = `https://drive.google.com/file/d/${drive}/preview`;
      if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
    } else frame.removeAttribute('src');
    const clip = vids && (vids.viewer || vids.loop);
    const loop = clip && !drive;
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
    const moving = !!(loop || drive);
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
    count.textContent = `${index + 1} / ${works.length}`;
    // Preload neighbours
    for (const k of [index + 1, index - 1]) {
      const n = works[(k + works.length) % works.length];
      const pre = new Image();
      pre.src = `${base}${n.image}.webp`;
    }
  };

  const open = (work) => {
    index = works.indexOf(work);
    situ = 0;
    full = -1;
    show();
    el.hidden = false;
    onOpen();
    dialog.opened();
  };
  const close = () => {
    if (el.hidden) return;
    el.hidden = true;
    img.removeAttribute('src');
    full = -1;
    showMedia({});
    onClose();
    dialog.closed();
  };
  const step = (d) => {
    index = (index + d + works.length) % works.length;
    situ = 0;
    full = -1;
    show();
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
  closeBtn.addEventListener('click', close);
  document.getElementById('viewer-prev').addEventListener('click', () => step(-1));
  document.getElementById('viewer-next').addEventListener('click', () => step(1));
  document.getElementById('viewer-goto').addEventListener('click', () => {
    const w = works[index];
    close();
    onGoto(w);
  });
  el.querySelector('.viewer-media').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });
  window.addEventListener('keydown', (e) => {
    if (el.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
  // Swipe on touch
  let sx = null;
  img.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  img.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    sx = null;
  });

  // After a language switch: re-render the texts without reloading the image.
  const refresh = () => {
    renderText();
    if (!el.hidden) renderInfo();
  };

  return { open, close, refresh, isOpen: () => !el.hidden };
}
