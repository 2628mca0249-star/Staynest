/* StayNest — shared client: API, auth state, layout, UI helpers */
(function () {
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    heart: '<path d="M20.8 5.6a5 5 0 00-7.1 0L12 7.3l-1.7-1.7a5 5 0 00-7.1 7.1L12 21.5l8.8-8.8a5 5 0 000-7.1z"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.7 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    wifi: '<path d="M5 12.5a10 10 0 0114 0"/><path d="M8.5 16a5 5 0 017 0"/><path d="M2 9a15 15 0 0120 0"/><circle cx="12" cy="19.5" r=".8"/>',
    food: '<path d="M7 2v8a3 3 0 003 3v9"/><path d="M4 2v6a3 3 0 003 3"/><path d="M10 2v8"/><path d="M18 2c-2 2-3 4.5-3 8h3v12"/>',
    ac: '<path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5L4.9 17.5"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
    laundry: '<rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="14" r="4.5"/><path d="M8 6h.01M11 6h.01"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9.5 17V7H13a3 3 0 010 6H9.5"/>',
    security: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    gym: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
    'power backup': '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M11 9l-2 3h4l-2 3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    bed: '<path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 006 6L16 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    tool: '<path d="M14.7 6.3a4 4 0 005 5L21 13l-8 8a2.8 2.8 0 01-4-4l8-8z"/><path d="M14 6l4-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    inbox: '<path d="M3 13l3-9h12l3 9v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    msg: '<path d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-6.4A8 8 0 1121 12z"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const FAC_LABEL = { wifi: 'Wi-Fi', food: 'Meals', ac: 'AC', laundry: 'Laundry', parking: 'Parking', security: 'Security', gym: 'Gym', 'power backup': 'Power backup' };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(String(d).replace(' ', 'T') + (String(d).length <= 10 ? 'T00:00:00' : 'Z'));
    return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- API ---------- */
  async function api(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch('/api' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    } catch (_) { const e = new Error('Cannot reach the server. Check your connection.'); e.network = true; throw e; }
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) { const e = new Error((data && data.error) || 'Something went wrong.'); e.status = res.status; e.fields = data && data.fields; throw e; }
    return data;
  }

  /* ---------- toast & modal ---------- */
  function toast(msg, type = 'ok') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = icon(type === 'err' ? 'info' : 'check') + `<span>${esc(msg)}</span>`;
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3200);
  }

  function modal({ title, html, wide = false, onMount }) {
    const prev = document.activeElement;
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="x" aria-label="Close">${icon('x')}</button>${html}</div>`;
    document.body.appendChild(bg);
    document.body.style.overflow = 'hidden';
    const close = () => { bg.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    $('.x', bg).addEventListener('click', close);
    const first = $('input:not([type=hidden]),select,textarea,button:not(.x)', bg);
    if (first) first.focus();
    if (onMount) onMount($('.modal', bg), close);
    return close;
  }
  const confirmBox = (title, text, okLabel = 'Confirm') => new Promise((resolve) => {
    let done = false;
    const close = modal({ title, html: `<h3>${esc(title)}</h3><p>${esc(text)}</p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-outline" data-no>Cancel</button><button class="btn btn-primary" data-ok>${esc(okLabel)}</button></div>`,
      onMount: (m, c) => { $('[data-no]', m).onclick = () => { done = true; c(); resolve(false); }; $('[data-ok]', m).onclick = () => { done = true; c(); resolve(true); }; } });
    setTimeout(() => { const bg = $('.modal-bg'); if (bg) new MutationObserver((_, o) => { if (!document.body.contains(bg) && !done) { done = true; resolve(false); o.disconnect(); } }).observe(document.body, { childList: true }); }, 0);
  });

  /* ---------- forms ---------- */
  function showErrors(form, err) {
    $$('.field.err', form).forEach((f) => f.classList.remove('err'));
    $$('.msg', form).forEach((m) => m.remove());
    let box = $('.alert', form);
    if (box) box.remove();
    if (!err) return;
    if (err.fields) Object.keys(err.fields).forEach((k) => {
      const inp = form.elements[k]; const f = inp && inp.closest && inp.closest('.field');
      if (f) f.classList.add('err');
    });
    box = document.createElement('div');
    box.className = 'alert'; box.setAttribute('role', 'alert'); box.textContent = err.message;
    form.insertBefore(box, form.firstChild);
  }
  async function submit(form, fn, btn) {
    btn = btn || $('[type=submit]', form);
    const label = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Please wait…';
    showErrors(form, null);
    try { return await fn(); }
    catch (e) { showErrors(form, e); if (e.status === 401) { /* session expired */ state.user = null; } return undefined; }
    finally { btn.disabled = false; btn.innerHTML = label; }
  }

  /* ---------- auth state ---------- */
  const state = { user: null };
  const ready = api('/auth/me').then((d) => { state.user = d.user; }).catch(() => {});
  const requireLogin = (msg) => {
    if (state.user) return true;
    toast(msg || 'Please log in first.', 'err');
    setTimeout(() => { location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash); }, 700);
    return false;
  };
  async function logout() { await api('/auth/logout', { method: 'POST' }).catch(() => {}); location.href = '/'; }

  /* ---------- layout ---------- */
  const NAV = [['/', 'Home', 'home'], ['/search', 'Find a PG', 'search'], ['/reviews', 'Reviews & Support', 'reviews'], ['/help', 'Help', 'help']];
  function renderLayout() {
    const path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const cur = path === '/pg-details' || path === '/pg' ? '/search' : path;
    const logo = '<span class="brand-mark"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg></span>StayNest';
    const nav = document.getElementById('site-nav');
    if (nav) {
      nav.outerHTML = `<nav class="navbar" id="site-nav" aria-label="Main"><div class="wrap">
        <a href="/" class="brand" aria-label="StayNest home">${logo}</a>
        <ul class="nav-links">${NAV.map(([h, l]) => `<li><a href="${h}" class="${cur === h ? 'active' : ''}">${l}</a></li>`).join('')}</ul>
        <div class="nav-actions" id="nav-actions"></div>
        <button class="nav-toggle" aria-label="Menu" aria-expanded="false">${icon('menu')}</button></div></nav>`;
      $('.nav-toggle').addEventListener('click', (e) => { const n = $('#site-nav'); n.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', n.classList.contains('open')); });
    }
    const foot = document.getElementById('site-footer');
    if (foot) foot.outerHTML = `<footer class="footer"><div class="wrap">
      <div><a href="/" class="brand">${logo}</a><p>A student-first way to find PGs and hostels — clear pricing, real reviews, no brokerage games.</p></div>
      <div><h4>Explore</h4><a href="/search">Search PGs</a><a href="/search?city=Bengaluru">Bengaluru</a><a href="/search?city=Pune">Pune</a><a href="/search?city=Mumbai">Mumbai</a></div>
      <div><h4>Account</h4><a href="/login">Log in</a><a href="/login?mode=signup">Sign up</a><a href="/login?mode=signup&role=owner">List your PG</a><a href="/dashboard">Dashboard</a></div>
      <div><h4>Support</h4><a href="/reviews#complaint">Raise a complaint</a><a href="/help">Help centre</a><a href="/help#contact">Contact us</a></div></div>
      <div class="footer-bottom">© ${new Date().getFullYear()} StayNest · Made for students who deserve better rooms.</div></footer>`;
  }
  function renderAuthSlot() {
    const slot = $('#nav-actions'); if (!slot) return;
    const u = state.user;
    slot.innerHTML = u
      ? `<a href="/dashboard" class="nav-user"><span class="avatar">${esc(u.name[0].toUpperCase())}</span>${esc(u.name.split(' ')[0])}</a><button class="btn btn-ghost btn-sm" id="navLogout" title="Log out" aria-label="Log out">${icon('logout')}</button>`
      : `<a href="/login" class="btn btn-ghost btn-sm">Log in</a><a href="/login?mode=signup" class="btn btn-primary btn-sm">Sign up</a>`;
    const lo = $('#navLogout'); if (lo) lo.addEventListener('click', logout);
  }

  /* ---------- shared components ---------- */
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const ratingHtml = (p) => p.rating ? `<span class="rating"><svg class="star ico" viewBox="0 0 24 24"><path d="${ICONS.star.match(/d="([^"]+)"/)[1]}"/></svg>${p.rating} <small>(${p.reviews_count})</small></span>` : '<span class="rating none">New</span>';
  function pgCard(p) {
    const href = `/pg-details?id=${p.id}`;
    return `<article class="pg-card">
      <div class="pg-media">
        <span class="badge pg-gender ${esc(p.gender)}">${esc(p.gender)}</span>
        <button class="pg-save ${p.saved ? 'saved' : ''}" data-save="${p.id}" aria-pressed="${!!p.saved}" aria-label="${p.saved ? 'Remove from' : 'Save to'} favourites">${icon('heart')}</button>
        <a href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(p.image)}" alt="" loading="lazy"></a>
        ${p.spots > 0 && p.spots <= 3 ? `<span class="badge pg-low">Only ${p.spots} left</span>` : ''}${p.spots === 0 ? '<span class="badge pg-low">Full</span>' : ''}
      </div>
      <a href="${href}" class="pg-body">
        <span class="eyebrow">${p.rooms.map((r) => r.type).reverse().join(' · ')}</span>
        <h3>${esc(p.name)}</h3>
        <div class="pg-loc">${icon('pin')} ${esc(p.area)}, ${esc(p.city)}</div>
        <div class="pg-facils">${p.facilities.slice(0, 4).map((f) => `<span class="chip">${icon(f)} ${FAC_LABEL[f] || f}</span>`).join('')}${p.facilities.length > 4 ? `<span class="chip">+${p.facilities.length - 4}</span>` : ''}</div>
      </a>
      <div class="pg-stub"><div class="pg-price"><b>${money(p.rent)}</b><span>/month</span></div>${ratingHtml(p)}</div>
    </article>`;
  }
  const skeletons = (n = 6) => Array.from({ length: n }, () => '<div class="skel skel-card"></div>').join('');
  const emptyState = (title, text, action = '') => `<div class="empty"><div class="em-ico">${icon('search')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;

  // one delegated handler for every heart button on the page
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-save]');
    if (!btn) return;
    e.preventDefault();
    await ready;
    if (!requireLogin('Log in to save PGs to your favourites.')) return;
    const id = btn.dataset.save; const was = btn.classList.contains('saved');
    try {
      await api('/me/saved/' + id, { method: was ? 'DELETE' : 'PUT' });
      btn.classList.toggle('saved', !was); btn.setAttribute('aria-pressed', String(!was));
      document.dispatchEvent(new CustomEvent('saved-changed', { detail: { id: Number(id), saved: !was } }));
      toast(was ? 'Removed from favourites' : 'Saved to your favourites');
    } catch (err) { toast(err.message, 'err'); }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    renderLayout();
    await ready;
    renderAuthSlot();
  });
  // image fallback: never show a broken image
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t.tagName === 'IMG' && !t.dataset.fb && /^\/img\//.test(new URL(t.src, location).pathname) === false) { t.dataset.fb = 1; t.src = '/img/room/fallback-0.svg'; }
  }, true);

  window.SN = { api, esc, money, fmtDate, $, $$, icon, toast, modal, confirmBox, submit, showErrors, state, ready, requireLogin, logout, pgCard, skeletons, emptyState, stars, ratingHtml, FAC_LABEL, ICONS };
})();
