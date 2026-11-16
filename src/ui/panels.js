import { t, lang, titleLang } from '../i18n.js';
import { focusDialog, shown } from './dialog.js';
import refs from '../data/references.json';
import { refHTML } from '../refhtml.js';

// About / Works / Behind-the-scenes panels and the "jump to room" menu.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// A work's title, marked lang="en" on the Hungarian page (titleLang in i18n.js).
const langAttr = (w) => (titleLang(w) ? ` lang="${titleLang(w)}"` : '');

// isTouch: the controls for a touch screen come first in Help. inside(): the visitor is in the
// exhibition, so Help can bring the first-use card back (onGuide).
export function setupPanels(data, { onOpenPanel, onClosePanel, onJumpRoom, onOpenWork, onGuide, inside, isTouch, focusFallback }) {
  const panel = document.getElementById('panel');
  const body = document.getElementById('panel-body');
  const roomsMenu = document.getElementById('rooms-menu');
  const navButtons = document.querySelectorAll('#site-nav [data-nav]');
  const roomsBtn = document.querySelector('[data-action="rooms"]');
  const closeBtn = panel.querySelector('[data-close]');
  // Focus goes to the Close button on opening and back to the opener on closing.
  const dialog = focusDialog(panel, { initial: () => closeBtn, fallback: focusFallback });
  let current = null;
  // The links laid over the texts (references.json), in the page's language.
  const links = () => refHTML(refs, { t, lang: lang() });

  const aboutHTML = () => {
    const m = data.meta;
    const R = links();
    return `
    <p class="eyebrow">${esc(m.artist)} · ${esc(m.venue)} · <span class="date">${esc(m.dates)}</span></p>
    <h2 id="panel-title">${esc(m.title)}</h2>
    ${data.text.map((p) => `<p>${esc(p)}</p>`).join('')}
    <p class="note">${esc(data.textCredit)}</p>
    <h3>${esc(t('panels.credits'))}</h3>
    <dl class="credits">
      ${data.credits.map(([k, v], i) => `<dt>${esc(k)}</dt><dd>${R.credit(v, i)}</dd>`).join('')}
    </dl>
    <h3>${esc(t('panels.real'))}</h3>
    <p>${esc(t('panels.address', { venue: m.venue, address: m.address }))} ·
      <a href="${esc(m.links.map)}" target="_blank" rel="noopener">${esc(t('panels.map'))}</a><br />
      ${esc(m.opening)}<br />${esc(m.hours)}</p>
    <p>
      <a href="${esc(m.links.exhibition)}" target="_blank" rel="noopener">${esc(t('panels.linkExhibition'))}</a><br />
      <a href="${esc(m.links.mamuPage)}" target="_blank" rel="noopener">${esc(t('panels.linkMamuPage'))}</a><br />
      <a href="${esc(m.links.gallery)}" target="_blank" rel="noopener">${esc(t('panels.linkGallery'))}</a><br />
      <a href="${esc(m.links.facebook)}" target="_blank" rel="noopener">${esc(t('panels.linkFacebook'))}</a> ·
      <a href="${esc(m.links.mamuInstagram)}" target="_blank" rel="noopener">${esc(t('panels.linkMamuInstagram'))}</a><br />
      <a href="${esc(m.links.instagram)}" target="_blank" rel="noopener">${esc(t('panels.linkInstagram'))}</a>
    </p>
    ${speechHTML()}
    <p class="note">${esc(t('panels.rights'))}</p>
  `;
  };

  // The opening speech, folded away under its title (it is long). Its words are as in
  // src/i18n; the links to what it mentions are laid over them here.
  const speechHTML = () => {
    const s = data.openingSpeech;
    if (!s) return '';
    return `
    <h3>${esc(t('panels.speech'))}</h3>
    <details class="speech">
      <summary>${esc(s.author)}: <em>${esc(s.title)}</em> · ${esc(t('panels.speechRead'))}</summary>
      ${links().paragraphs('openingSpeech', s.text).map((p) => `<p>${p}</p>`).join('')}
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
    </details>`;
  };

  const worksHTML = () => `
    <p class="eyebrow">${esc(data.meta.artist)} · ${esc(data.meta.venue)}</p>
    <h2 id="panel-title">${esc(t('panels.worksTitle'))}</h2>
    <ol class="works-list">
      ${data.works.filter((w) => !w.id.endsWith('-screen')).map((w) => `
        <li><button data-work="${esc(w.id)}"><span class="no">${w.no}</span>
          <span><em${langAttr(w)}>${esc(w.title)}</em><small>${esc([w.medium.split(':')[0], w.size, w.year].filter(Boolean).join(', '))} · ${esc(data.rooms[w.room].name)}</small></span>
        </button></li>`).join('')}
    </ol>
    <p class="note">${esc(data.source || '')}</p>
  `;

  const btsHTML = () => `
    <p class="eyebrow">${esc(t('panels.btsEyebrow'))}</p>
    <h2 id="panel-title">${esc(t('panels.btsTitle'))}</h2>
    <p>${esc(data.behindTheScenes)}</p>
    <div class="stack">
      <span>Three.js</span><span>postprocessing</span><span>Web Audio API</span><span>NumPy photo textures</span>
      <span>Vite</span><span>sharp → WebP</span><span>Netlify</span>
    </div>
    <h3>${esc(t('panels.controls'))}</h3>
    <p class="note">${esc(t('panels.controlsDesk'))}<br />${esc(t('panels.controlsTouch'))}</p>
  `;

  // Help: the controls (the same text as under "Behind the scenes", which keeps it), the
  // ones for this device first, and inside the exhibition a button that shows the first-use
  // card again.
  const helpHTML = () => {
    const both = [t('panels.controlsDesk'), t('panels.controlsTouch')];
    if (isTouch) both.reverse();
    return `
    <p class="eyebrow">${esc(data.meta.title)}</p>
    <h2 id="panel-title">${esc(t('nav.help'))}</h2>
    ${both.map((p) => `<p>${esc(p)}</p>`).join('')}
    ${inside && inside() ? `<p><button class="link mono" data-guide>${esc(t('panels.helpGuide'))}</button></p>` : ''}
  `;
  };

  // Contact details from exhibition.json; an entry stays hidden until it has an href, and a
  // group with none left says they are on the way.
  const contactHTML = () => `
    <p class="eyebrow">${esc(data.meta.title)}</p>
    <h2 id="panel-title">${esc(t('panels.contactTitle'))}</h2>
    ${data.contacts.map((g) => {
      const items = g.items.filter((c) => c.href);
      return `
      <h3>${esc(t(`panels.contact${g.id}`))}</h3>
      ${items.length ? `<dl class="credits">${items.map((c) => `
        <dt>${esc(t(`panels.contactLabel.${c.type}`))}</dt>
        <dd><a href="${esc(c.href)}"${c.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(c.type === 'address' ? data.meta.address : c.text)}</a></dd>`).join('')}
      </dl>` : `<p class="note">${esc(t('panels.contactSoon'))}</p>`}`;
    }).join('')}
    <p class="notice-links"><button class="link mono" data-nav="legal">${esc(t('nav.legal'))}</button> · <button class="link mono" data-nav="privacy">${esc(t('nav.privacy'))}</button></p>
  `;

  // Legal notice, privacy and the accessibility statement (texts in src/i18n/*.json
  // "legal" / "privacy" / "accessibility"): headed
  // sections with optional links, external or to another panel (`nav`).
  const noticeHTML = (key) => () => {
    const n = t(key);
    // A section's `link` is put where its paragraph says {link}: words that open an e-mail
    // to the address of a group in exhibition.json's contacts (no address is written here).
    const mailOf = (l) => data.contacts.find((g) => g.id === l.contact)?.items.find((c) => c.type === 'email' && c.href);
    const inline = (l) => {
      const mail = mailOf(l);
      return mail ? `<a href="${esc(mail.href)}">${esc(l.text)}</a>` : esc(l.text);
    };
    // The address is also written out as a plain line under the paragraph with the link, so
    // it can be read and copied without an e-mail program (the same contacts entry).
    const addressLine = (l) => {
      const mail = l && mailOf(l);
      return mail ? `<p>${esc(mail.text)}</p>` : '';
    };
    const link = (l) => {
      return l.nav
        ? `<button class="link mono" data-nav="${esc(l.nav)}">${esc(l.text)}</button>`
        : `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.text)} ↗</a>`;
    };
    return `
    <p class="eyebrow">${esc(data.meta.title)}</p>
    <h2 id="panel-title">${esc(n.title)}</h2>
    ${n.sections.map((s) => `
      <h3>${esc(s.h)}</h3>
      ${s.p.map((p) => `<p>${esc(p).replace('{link}', s.link ? inline(s.link) : '')}</p>`).join('')}${addressLine(s.link)}
      ${s.links ? `<p class="notice-links">${s.links.map(link).join(' · ')}</p>` : ''}`).join('')}
    ${n.updated ? `<p class="note">${esc(n.updated)}</p>` : ''}
  `;
  };

  const PAGES = { about: aboutHTML, works: worksHTML, bts: btsHTML, help: helpHTML, contact: contactHTML, legal: noticeHTML('legal'), privacy: noticeHTML('privacy'), accessibility: noticeHTML('accessibility') };

  const markNav = () => {
    for (const b of navButtons) b.setAttribute('aria-current', String(b.dataset.nav === current));
  };
  // The works list's button for a work. No. 3's screen is a work of its own in the viewer
  // (Next and Previous reach it) but not in the list: it falls to the row with its number.
  const workButton = (w) => {
    const rows = [...body.querySelectorAll('[data-work]')];
    return rows.find((b) => b.dataset.work === w.id) || rows.find((b) => data.works.find((x) => x.id === b.dataset.work)?.no === w.no);
  };
  // opts.opener: where focus goes back to on closing, if not the control that has focus now.
  // opts.work: the works list opens with focus on that work's row, scrolled into view.
  const show = (name, opts = {}) => {
    const wasOpen = !panel.hidden;
    current = name;
    body.innerHTML = PAGES[name]();
    panel.hidden = false;
    setRooms(false);
    markNav();
    panel.scrollTop = 0;
    if (!wasOpen) {
      onOpenPanel();
      const row = opts.work && workButton(opts.work);
      dialog.opened({ ...('opener' in opts ? { opener: opts.opener } : {}), ...(row ? { initial: () => row } : {}) });
      row?.scrollIntoView({ block: 'nearest' });
    } else dialog.rebuilt(); // moved from one panel to another through a link inside it
  };
  // refocus false: focus is not handed back (a work opened from the list takes it).
  const close = ({ refocus = true } = {}) => {
    if (panel.hidden) return;
    panel.hidden = true;
    current = null;
    markNav();
    onClosePanel();
    dialog.closed({ refocus });
  };
  closeBtn.addEventListener('click', () => close());
  body.addEventListener('click', (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) {
      show(n.dataset.nav);
      return;
    }
    // Help's "show the short guide again": the panel closes (focus goes back as on any close)
    // and the first-use card shows
    if (e.target.closest('[data-guide]')) {
      close();
      onGuide?.();
      return;
    }
    const b = e.target.closest('[data-work]');
    if (!b || !onOpenWork) return;
    onOpenWork(data.works.find((w) => w.id === b.dataset.work));
  });
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Each room with the works in it. The button's name is the room alone; the titles stand
  // beside it as its description (aria-describedby), and the row as a whole is the button's
  // target (CSS). The room the visitor is in carries aria-current="location".
  let hereRoom = null;
  const markRoom = () => {
    for (const b of roomsMenu.querySelectorAll('[data-room]')) {
      const here = b.dataset.room === hereRoom;
      if (here) b.setAttribute('aria-current', 'location');
      else b.removeAttribute('aria-current');
      b.parentElement.classList.toggle('here', here);
    }
  };
  const buildRoomsMenu = () => {
    roomsMenu.innerHTML = Object.entries(data.rooms)
      .map(([id, r]) => {
        const titles = data.works.filter((w) => w.room === id && !w.id.endsWith('-screen')).map((w) => `<span${langAttr(w)}>${esc(w.title)}</span>`);
        return `<div class="room-row"><button data-room="${id}" aria-describedby="rooms-menu-${id}">${esc(r.name)}</button><small id="rooms-menu-${id}">${titles.join(', ')}</small></div>`;
      })
      .join('');
    markRoom();
  };
  buildRoomsMenu();
  // The rooms menu: the button says whether it is open; Esc or a choice closes it and
  // hands focus back to the button if it was inside the menu.
  const setRooms = (open) => {
    const inside = roomsMenu.contains(document.activeElement);
    roomsMenu.hidden = !open;
    roomsBtn.setAttribute('aria-expanded', String(open));
    if (!open && inside && shown(roomsBtn)) roomsBtn.focus({ preventScroll: true });
  };
  setRooms(false);
  roomsMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-room]');
    if (!b) return;
    setRooms(false);
    onJumpRoom(b.dataset.room);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || roomsMenu.hidden) return;
    const within = roomsMenu.contains(document.activeElement) || document.activeElement === roomsBtn;
    setRooms(false);
    if (within) roomsBtn.focus({ preventScroll: true });
  });

  return {
    show,
    about: () => show('about'),
    works: (opts) => show('works', opts),
    bts: () => show('bts'),
    toggleRooms: () => setRooms(roomsMenu.hidden),
    // Called as the visitor walks or jumps: which room the menu marks as the current one.
    setRoom: (id) => {
      if (id === hereRoom) return;
      hereRoom = id;
      markRoom();
    },
    // After a language switch: rebuild what is on screen.
    refresh: () => {
      buildRoomsMenu();
      if (!current) return;
      body.innerHTML = PAGES[current]();
      dialog.rebuilt(); // if focus was on a control in the old text, it goes to Close
    },
    close,
    // the control focus goes back to when the open panel closes
    opener: () => dialog.opener(),
    isOpen: () => !panel.hidden,
  };
}
