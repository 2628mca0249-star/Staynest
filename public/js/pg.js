(async function () {
  const { api, $, $$, esc, icon, money, fmtDate, toast, modal, submit, state, ready, requireLogin, pgCard, stars, ratingHtml, FAC_LABEL } = SN;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const root = $('#root');
  await ready;

  let pg;
  try { pg = await api('/pgs/' + id); }
  catch (e) {
    root.innerHTML = SN.emptyState(e.status === 404 ? 'This PG is no longer listed' : 'Could not load this PG', e.message, '<a class="btn btn-primary btn-sm" href="/search">Browse other PGs</a>');
    return;
  }
  document.title = `${pg.name} — ${pg.city} | StayNest`;
  const isOwner = state.user && state.user.id === pg.owner_id;
  const isStudent = state.user && state.user.role === 'student';
  const myReview = state.user && pg.reviews.find((r) => r.user_id === state.user.id);
  const availClass = (n) => (n === 0 ? 'no' : n <= 2 ? 'low' : 'yes');
  const availLabel = (n) => (n === 0 ? 'Full' : n <= 2 ? `Only ${n} left` : `${n} available`);

  function render() {
    const imgs = pg.gallery.length ? pg.gallery : [pg.image];
    root.innerHTML = `
    <div class="crumbs"><a href="/">Home</a> ${icon('arrow')} <a href="/search?city=${encodeURIComponent(pg.city)}">${esc(pg.city)}</a> ${icon('arrow')} <span>${esc(pg.name)}</span></div>
    <div class="detail-head">
      <div>
        <span class="eyebrow">${esc(pg.gender)} PG · ${esc(pg.city)}</span>
        <h1>${esc(pg.name)} ${pg.active ? '' : '<span class="badge" style="background:var(--brick-l);color:var(--brick-d);vertical-align:middle">Hidden</span>'}</h1>
        <div class="pg-loc" style="font-size:.97rem">${icon('pin')} ${esc(pg.address)}</div>
      </div>
      <div style="text-align:right;display:grid;gap:10px;justify-items:end">
        <div style="font-size:1.05rem">${ratingHtml(pg)}</div>
        <button class="btn btn-outline btn-sm pg-save-inline ${pg.saved ? 'saved' : ''}" data-save="${pg.id}" id="saveBtn">${icon('heart')} <span>${pg.saved ? 'Saved' : 'Save PG'}</span></button>
      </div>
    </div>

    <div class="gallery">${imgs.slice(0, 5).map((g, i) => `<a href="${esc(g)}" target="_blank" rel="noopener"><img src="${esc(g)}" alt="${esc(pg.name)} photo ${i + 1}"></a>`).join('')}</div>

    <div class="detail-grid">
      <div>
        <nav class="subnav" aria-label="Sections"><a href="#about">About</a><a href="#facilities">Facilities</a><a href="#rooms">Rooms &amp; rent</a><a href="#rules">House rules</a><a href="#reviews">Reviews (${pg.reviews_count})</a></nav>

        <div class="sec" id="about"><h2>About this PG</h2><p style="color:var(--ink);font-size:1.02rem">${esc(pg.description)}</p>
          <p>Managed by <b style="color:var(--navy)">${esc(pg.owner.name)}</b> · on StayNest since ${esc(pg.owner.since)}.</p></div>

        <div class="sec" id="facilities"><h2>Facilities</h2><div class="facil-grid">
          ${pg.facilities.map((f) => `<div class="facil-item"><span class="fi">${icon(f)}</span>${FAC_LABEL[f] || f}</div>`).join('') || '<p>No facilities listed.</p>'}</div></div>

        <div class="sec" id="rooms"><h2>Rooms &amp; rent</h2>
          ${pg.rooms.map((r) => `<div class="room-opt"><div><b>${r.type} sharing</b><div class="muted" style="font-size:.84rem">${r.type === 'Single' ? 'Private room' : r.type === 'Double' ? '2 students per room' : '3 students per room'}</div></div><span class="price">${money(r.price)}<small class="muted" style="font-family:var(--font-b);font-weight:400">/mo</small></span><span class="avail ${availClass(r.available)}">${availLabel(r.available)}</span></div>`).join('')}
          <p style="font-size:.88rem">Security deposit: <b style="color:var(--navy)">${pg.deposit ? money(pg.deposit) + ' (refundable)' : 'Discuss with owner'}</b>. Mess and electricity charges, if any, are confirmed by the owner.</p></div>

        <div class="sec" id="rules"><h2>House rules</h2>
          ${pg.rules.length ? `<ul class="rules">${pg.rules.map((r) => `<li>${icon('info')}<span>${esc(r)}</span></li>`).join('')}</ul>` : '<p>No specific rules listed.</p>'}</div>

        <div class="sec" id="reviews"><h2>Reviews</h2>
          ${pg.reviews_count ? `<div class="rev-summary"><div><div class="rev-big">${pg.rating}</div><div class="stars">${stars(Math.round(pg.rating))}</div><div class="muted" style="font-size:.85rem">${pg.reviews_count} review${pg.reviews_count > 1 ? 's' : ''}</div></div>
            <div>${pg.distribution.map((d) => `<div class="bar-row"><span>${d.stars}★</span><div class="bar"><i style="width:${(d.count / pg.reviews_count) * 100}%"></i></div><span>${d.count}</span></div>`).join('')}</div></div>` : ''}
          <div id="reviewsList">${pg.reviews.map((r) => `<div class="review"><div class="review-top"><div class="review-author"><span class="avatar">${esc(r.name[0].toUpperCase())}</span>${esc(r.name)}</div><span class="review-date">${fmtDate(r.created_at)}</span></div>
            <div class="stars" aria-label="${r.rating} out of 5">${stars(r.rating)}</div><p>${esc(r.text)}</p>${state.user && r.user_id === state.user.id ? `<button class="btn btn-danger btn-sm" data-del-review="${r.id}" style="margin-top:8px">Delete my review</button>` : ''}</div>`).join('') || '<p>No reviews yet — be the first to share how your stay went.</p>'}</div>
          ${isOwner ? '' : `<button class="btn btn-outline" id="writeReview" style="margin-top:14px">${icon('edit')} ${myReview ? 'Edit your review' : 'Write a review'}</button>`}
        </div>
      </div>

      <aside class="panel booking-card">
        <span class="muted" style="font-size:.84rem">Starting from</span>
        <div class="price-big">${money(pg.rent)}<small class="muted" style="font-size:.9rem;font-family:var(--font-b);font-weight:400"> /month</small></div>
        <p style="font-size:.85rem;margin:4px 0 0">${pg.spots > 0 ? `${pg.spots} bed${pg.spots > 1 ? 's' : ''} currently available` : 'No vacancy right now — you can still message the owner.'}</p>
        <div class="divider"></div>
        ${isOwner ? `<div class="alert info">This is your listing.</div><a class="btn btn-primary btn-block" href="/dashboard#listings">Manage listing</a>`
          : `<button class="btn btn-primary btn-block" id="openBook" ${pg.spots === 0 ? 'disabled' : ''}>Request to book</button>
             <button class="btn btn-outline btn-block" style="margin-top:10px" id="contactOwner">${icon('msg')} Message owner</button>`}
        <div class="divider"></div>
        <div class="trust"><div>${icon('phone')} Owner responds within a day</div><div>${icon('shield')} Listing reviewed by StayNest</div><div>${icon('check')} No brokerage, no hidden fees</div></div>
      </aside>
    </div>

    ${pg.similar.length ? `<div style="margin-top:60px"><div class="section-head"><div><span class="eyebrow">Keep looking</span><h2>Similar PGs</h2></div></div><div class="pg-grid">${pg.similar.map(pgCard).join('')}</div></div>` : ''}`;

    const sb = $('#saveBtn');
    document.addEventListener('saved-changed', (e) => { if (e.detail.id === pg.id) { sb.classList.toggle('saved', e.detail.saved); $('span', sb).textContent = e.detail.saved ? 'Saved' : 'Save PG'; } });
    const ob = $('#openBook'); if (ob) ob.onclick = () => bookModal('booking');
    const co = $('#contactOwner'); if (co) co.onclick = () => bookModal('inquiry');
    const wr = $('#writeReview'); if (wr) wr.onclick = reviewModal;
    $$('[data-del-review]').forEach((b) => (b.onclick = async () => {
      if (!(await SN.confirmBox('Delete your review?', 'This cannot be undone.', 'Delete'))) return;
      try { await api('/reviews/' + b.dataset.delReview, { method: 'DELETE' }); toast('Review deleted'); await reload(); } catch (e) { toast(e.message, 'err'); }
    }));
  }

  async function reload() { pg = await api('/pgs/' + id); render(); }

  function bookModal(kind) {
    if (!requireLogin(kind === 'booking' ? 'Log in to send a booking request.' : 'Log in to message the owner.')) return;
    if (!isStudent) return toast('Please use a student account to contact PG owners.', 'err');
    const today = new Date().toISOString().slice(0, 10);
    const avail = pg.rooms.filter((r) => r.available > 0);
    if (kind === 'booking' && !avail.length) return toast('No rooms available right now.', 'err');
    modal({
      title: kind === 'booking' ? 'Request to book' : 'Message the owner',
      html: `<span class="eyebrow">${kind === 'booking' ? 'Booking request' : 'Enquiry'}</span><h3 style="margin-top:6px">${kind === 'booking' ? 'Request to book' : 'Message'} ${esc(pg.name)}</h3>
      <form id="bkForm" novalidate><div class="field-stack">
        <div class="row2"><div class="field"><label for="bkName">Full name</label><input id="bkName" name="name" required value="${esc(state.user.name)}"></div>
          <div class="field"><label for="bkPhone">Mobile number</label><input id="bkPhone" name="phone" type="tel" inputmode="numeric" maxlength="10" required value="${esc(state.user.phone || '')}" placeholder="10-digit number"></div></div>
        ${kind === 'booking' ? `<div class="row2"><div class="field"><label for="bkRoom">Room type</label><select id="bkRoom" name="room_type">${avail.map((r) => `<option value="${r.type}">${r.type} — ${money(r.price)}/mo</option>`).join('')}</select></div>
          <div class="field"><label for="bkDate">Move-in date</label><input id="bkDate" name="move_in" type="date" min="${today}" required></div></div>` : ''}
        <div class="field"><label for="bkMsg">${kind === 'booking' ? 'Message (optional)' : 'Your message'}</label><textarea id="bkMsg" name="message" rows="3" maxlength="600" placeholder="${kind === 'booking' ? 'Anything the owner should know' : 'Ask about food, rules, visiting hours…'}"></textarea></div>
      </div><button class="btn btn-primary btn-block" type="submit">${kind === 'booking' ? 'Send booking request' : 'Send message'}</button></form>`,
      onMount: (m, close) => {
        $('#bkPhone', m).addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '')));
        const form = $('#bkForm', m);
        form.addEventListener('submit', (e) => { e.preventDefault(); submit(form, async () => {
          await api('/me/bookings', { method: 'POST', body: { pg_id: pg.id, kind, name: form.name.value, phone: form.phone.value, message: form.message.value, room_type: form.room_type && form.room_type.value, move_in: form.move_in && form.move_in.value } });
          close(); toast(kind === 'booking' ? 'Request sent — track it in your dashboard ✓' : 'Message sent to the owner ✓'); if (kind === 'booking') await reload();
        }); });
      },
    });
  }

  function reviewModal() {
    if (!requireLogin('Log in to write a review.')) return;
    modal({
      title: 'Write a review',
      html: `<span class="eyebrow">Your experience</span><h3 style="margin-top:6px">Rate ${esc(pg.name)}</h3>
      <form id="rvForm" novalidate><div class="field-stack">
        <div class="field"><span class="label">Rating</span><div class="star-input" role="radiogroup" aria-label="Rating">
          ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="st${n}" value="${n}" ${myReview ? (myReview.rating === n ? 'checked' : '') : (n === 5 ? 'checked' : '')}><label for="st${n}" title="${n} star${n > 1 ? 's' : ''}">★</label>`).join('')}</div></div>
        <div class="field"><label for="rvText">Your review</label><textarea id="rvText" name="text" rows="4" maxlength="800" required placeholder="How were the food, safety, Wi-Fi, owner…">${esc(myReview ? myReview.text : '')}</textarea></div>
      </div><button class="btn btn-primary btn-block" type="submit">${myReview ? 'Update review' : 'Submit review'}</button></form>`,
      onMount: (m, close) => {
        const form = $('#rvForm', m);
        form.addEventListener('submit', (e) => { e.preventDefault(); submit(form, async () => {
          await api(`/pgs/${pg.id}/reviews`, { method: 'POST', body: { rating: form.rating.value, text: form.text.value } });
          close(); toast('Thanks — your review is live ✓'); await reload(); location.hash = '#reviews';
        }); });
      },
    });
  }

  render();
  if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => t.scrollIntoView(), 50); }
})();
