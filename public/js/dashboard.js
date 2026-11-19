(async function () {
  const { api, $, $$, esc, icon, money, fmtDate, toast, modal, confirmBox, submit, state, ready, pgCard, skeletons, emptyState, FAC_LABEL } = SN;
  await ready;
  if (!state.user) { location.replace('/login?next=' + encodeURIComponent('/dashboard' + location.hash)); return; }
  const u = state.user; const isOwner = u.role === 'owner';
  $('#welcome').textContent = 'Welcome back, ' + u.name.split(' ')[0];
  $('#dashEyebrow').textContent = isOwner ? 'Owner dashboard' : 'Student dashboard';

  const TABS = isOwner
    ? [['overview', 'Overview', 'chart'], ['listings', 'My listings', 'building'], ['requests', 'Booking requests', 'inbox'], ['complaints', 'Complaints', 'tool'], ['profile', 'Profile', 'user']]
    : [['overview', 'Overview', 'home'], ['bookings', 'My bookings', 'calendar'], ['saved', 'Saved PGs', 'heart'], ['complaints', 'Complaints', 'tool'], ['reviews', 'My reviews', 'star'], ['profile', 'Profile', 'user']];
  let counts = {};
  function renderNav(active) {
    $('#dashNav').innerHTML = `<div class="profile-mini"><span class="avatar lg">${esc(u.name[0].toUpperCase())}</span><div><b>${esc(u.name)}</b><small>${esc(u.email)}</small><br><span class="role-tag">${isOwner ? 'PG owner' : 'Student'}</span></div></div>`
      + TABS.map(([k, l, i]) => `<a href="#${k}" class="dtab ${k === active ? 'active' : ''}" data-tab="${k}">${icon(i)} ${l}${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('')
      + `<button class="dtab" id="dLogout" style="color:var(--brick)">${icon('logout')} Log out</button>`;
    $('#dLogout').onclick = SN.logout;
  }

  const statusBadge = (s) => `<span class="status ${s}">${s === 'progress' ? 'In progress' : s}</span>`;
  const loading = () => { $('#panel').innerHTML = '<div class="list">' + '<div class="skel" style="height:110px"></div>'.repeat(3) + '</div>'; };
  const errorBox = (e) => { $('#panel').innerHTML = emptyState('Could not load this section', e.message); };

  /* ================= STUDENT ================= */
  const student = {
    async overview() {
      const [s, b] = await Promise.all([api('/me/summary'), api('/me/bookings')]);
      const recent = b.items.slice(0, 3);
      $('#panel').innerHTML = `<div class="stat-cards">
        <div class="stat-card"><div class="sc-ico">${icon('heart')}</div><b>${s.saved}</b><span>Saved PGs</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('calendar')}</div><b>${s.bookings}</b><span>Active booking requests</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('tool')}</div><b>${s.open_complaints}</b><span>Open complaints</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('star')}</div><b>${s.reviews}</b><span>Reviews written</span></div></div>
        <div class="panel" style="margin-bottom:20px"><h3>Quick actions</h3><p>Jump back into your search or manage something in progress.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><a href="/search" class="btn btn-primary btn-sm">${icon('search')} Search PGs</a><a href="/reviews" class="btn btn-outline btn-sm">Write a review</a><a href="/reviews#complaint" class="btn btn-outline btn-sm">Raise a complaint</a></div></div>
        <h3>Recent booking activity</h3>
        ${recent.length ? `<div class="list">${recent.map(bookingItem).join('')}</div>` : emptyState('No bookings yet', 'Found a PG you like? Send a booking request from its page.', '<a href="/search" class="btn btn-primary btn-sm">Browse PGs</a>')}`;
    },
    async bookings() {
      const { items } = await api('/me/bookings');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">My bookings &amp; enquiries</h3></div>`
        + (items.length ? `<div class="list">${items.map(bookingItem).join('')}</div>` : emptyState('Nothing here yet', 'Your booking requests and messages to owners will show up here.', '<a href="/search" class="btn btn-primary btn-sm">Browse PGs</a>'));
      $$('[data-cancel]').forEach((b) => (b.onclick = async () => {
        if (!(await confirmBox('Cancel this request?', 'The owner will no longer see it as active.', 'Yes, cancel'))) return;
        try { await api(`/me/bookings/${b.dataset.cancel}/cancel`, { method: 'PATCH' }); toast('Request cancelled'); go('bookings'); } catch (e) { toast(e.message, 'err'); }
      }));
    },
    async saved() {
      const { items } = await api('/me/saved');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">Saved / favourite PGs</h3></div>` + (items.length ? `<div class="pg-grid" id="savedGrid">${items.map(pgCard).join('')}</div>`
        : emptyState('No PGs saved yet', 'Tap the heart on any listing to save it here for later.', '<a href="/search" class="btn btn-primary btn-sm">Browse PGs</a>'));
    },
    async complaints() {
      const { items } = await api('/me/complaints');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">Your complaints</h3><a href="/reviews#complaint" class="btn btn-primary btn-sm">${icon('plus')} New complaint</a></div>`
        + (items.length ? `<div class="list">${items.map((c) => `<div class="item"><div class="item-top"><div><h4>${esc(c.subject)}</h4><div class="meta"><span>${icon('building')} ${esc(c.pg_name)}</span><span>${esc(c.category)}</span><span>${icon('calendar')} ${fmtDate(c.created_at)}</span></div></div>${statusBadge(c.status)}</div>
          <p style="margin:0;color:var(--ink)">${esc(c.details)}</p>${c.response ? `<div class="note"><b>Owner response:</b> ${esc(c.response)}</div>` : ''}</div>`).join('')}</div>`
          : emptyState('No complaints', 'Nothing to report — that is great news.'));
    },
    async reviews() {
      const { items } = await api('/me/my-reviews');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">My reviews</h3></div>` + (items.length ? `<div class="list">${items.map((r) => `<div class="item"><div class="item-top"><div><h4><a href="/pg-details?id=${r.pg_id}#reviews">${esc(r.pg_name)}</a></h4><div class="stars">${SN.stars(r.rating)}</div></div><span class="muted" style="font-size:.82rem">${fmtDate(r.created_at)}</span></div><p style="margin:0;color:var(--ink)">${esc(r.text)}</p></div>`).join('')}</div>`
        : emptyState('No reviews yet', 'Share how your stay went to help the next student.', '<a href="/reviews" class="btn btn-primary btn-sm">Write a review</a>'));
    },
  };
  function bookingItem(b) {
    return `<div class="item"><div class="item-top"><div><h4><a href="/pg-details?id=${b.pg_id}">${esc(b.pg_name)}</a></h4><div class="meta"><span>${icon('pin')} ${esc(b.pg_area)}, ${esc(b.pg_city)}</span>
      <span>${b.kind === 'booking' ? `${icon('bed')} ${esc(b.room_type)} · ${b.price ? money(b.price) + '/mo' : ''}` : `${icon('msg')} Enquiry`}</span>${b.move_in ? `<span>${icon('calendar')} Move-in ${fmtDate(b.move_in)}</span>` : ''}<span>Sent ${fmtDate(b.created_at)}</span></div></div>${statusBadge(b.status)}</div>
      ${b.message ? `<p style="margin:0;color:var(--ink);font-size:.92rem">“${esc(b.message)}”</p>` : ''}${b.owner_note ? `<div class="note"><b>Owner note:</b> ${esc(b.owner_note)}</div>` : ''}
      ${['pending', 'approved'].includes(b.status) ? `<div class="actions"><button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel request</button></div>` : ''}</div>`;
  }

  /* ================= OWNER ================= */
  const ROOM_TYPES = ['Single', 'Double', 'Triple'];
  const FACS = Object.keys(FAC_LABEL);
  const owner = {
    async overview() {
      const [s, pgs, bk] = await Promise.all([api('/owner/stats'), api('/owner/pgs'), api('/owner/bookings')]);
      const pend = bk.items.filter((b) => b.status === 'pending').slice(0, 3);
      $('#panel').innerHTML = `<div class="stat-cards">
        <div class="stat-card"><div class="sc-ico">${icon('building')}</div><b>${s.listings}</b><span>Listings</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('inbox')}</div><b>${s.pending_requests}</b><span>Pending requests</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('bed')}</div><b>${s.beds_free}</b><span>Beds available</span></div>
        <div class="stat-card"><div class="sc-ico">${icon('star')}</div><b>${s.avg_rating || '—'}</b><span>Average rating</span></div></div>
        ${s.open_complaints ? `<div class="alert info">You have <b>${s.open_complaints}</b> unresolved complaint${s.open_complaints > 1 ? 's' : ''}. <a href="#complaints" style="text-decoration:underline">Review them</a></div>` : ''}
        <div class="panel" style="margin-bottom:20px"><h3>Quick actions</h3><p>Keep availability fresh — listings with accurate vacancies get more requests.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="qaAdd">${icon('plus')} Add a PG</button><a href="#requests" class="btn btn-outline btn-sm">View requests</a><a href="#listings" class="btn btn-outline btn-sm">Edit availability</a></div></div>
        <h3>Waiting for your reply</h3>
        ${pend.length ? `<div class="list">${pend.map(requestItem).join('')}</div>` : emptyState('All caught up', 'No pending booking requests right now.')}`;
      $('#qaAdd').onclick = () => pgForm(); bindRequests();
    },
    async listings() {
      const { items } = await api('/owner/pgs');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">My listings</h3><button class="btn btn-primary btn-sm" id="addPg">${icon('plus')} Add a PG</button></div>`
        + (items.length ? `<div class="list">${items.map((p) => `<div class="pg-row ${p.active ? '' : 'off'}"><img src="${esc(p.image)}" alt=""><div><h4><a href="/pg-details?id=${p.id}">${esc(p.name)}</a> ${p.active ? '' : '<span class="badge" style="background:var(--brick-l);color:var(--brick-d)">Hidden</span>'}</h4>
          <div class="meta muted" style="font-size:.84rem;display:flex;gap:14px;flex-wrap:wrap"><span>${icon('pin')} ${esc(p.area)}, ${esc(p.city)}</span><span>${esc(p.gender)}</span><span>${p.spots} bed${p.spots !== 1 ? 's' : ''} free</span><span>from ${money(p.rent)}</span><span>${p.rating ? '★ ' + p.rating + ' (' + p.reviews_count + ')' : 'No reviews'}</span></div></div>
          <div class="actions" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-edit="${p.id}">${icon('edit')} Edit</button><button class="btn btn-ghost btn-sm" data-toggle="${p.id}" data-active="${p.active ? 1 : 0}">${p.active ? 'Hide' : 'Publish'}</button><button class="btn btn-danger btn-sm" data-del="${p.id}" aria-label="Delete ${esc(p.name)}">${icon('trash')}</button></div></div>`).join('')}</div>`
          : emptyState('No listings yet', 'Add your first PG to start receiving booking requests.', '<button class="btn btn-primary btn-sm" id="addPg2">Add a PG</button>'));
      const a1 = $('#addPg'), a2 = $('#addPg2'); if (a1) a1.onclick = () => pgForm(); if (a2) a2.onclick = () => pgForm();
      $$('[data-edit]').forEach((b) => (b.onclick = () => pgForm(items.find((p) => p.id == b.dataset.edit))));
      $$('[data-toggle]').forEach((b) => (b.onclick = async () => { try { await api(`/pgs/${b.dataset.toggle}/active`, { method: 'PATCH', body: { active: b.dataset.active !== '1' } }); toast(b.dataset.active === '1' ? 'Listing hidden' : 'Listing published'); go('listings'); } catch (e) { toast(e.message, 'err'); } }));
      $$('[data-del]').forEach((b) => (b.onclick = async () => { if (!(await confirmBox('Delete this listing?', 'All its reviews, bookings and complaints will be removed permanently.', 'Delete'))) return; try { await api('/pgs/' + b.dataset.del, { method: 'DELETE' }); toast('Listing deleted'); go('listings'); } catch (e) { toast(e.message, 'err'); } }));
    },
    async requests() {
      const { items } = await api('/owner/bookings');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">Booking requests &amp; enquiries</h3></div>` + (items.length ? `<div class="list">${items.map(requestItem).join('')}</div>` : emptyState('No requests yet', 'When students request a room or message you, it will appear here.'));
      bindRequests();
    },
    async complaints() {
      const { items } = await api('/owner/complaints');
      $('#panel').innerHTML = `<div class="section-head"><h3 style="margin:0">Resident complaints</h3></div>` + (items.length ? `<div class="list">${items.map((c) => `<div class="item"><div class="item-top"><div><h4>${esc(c.subject)}</h4><div class="meta"><span>${icon('building')} ${esc(c.pg_name)}</span><span>${icon('user')} ${esc(c.user_name)}</span><span>${esc(c.category)}</span><span>${fmtDate(c.created_at)}</span></div></div>${statusBadge(c.status)}</div>
        <p style="margin:0;color:var(--ink)">${esc(c.details)}</p>${c.response ? `<div class="note"><b>Your response:</b> ${esc(c.response)}</div>` : ''}
        <div class="actions"><button class="btn btn-outline btn-sm" data-cx="${c.id}" data-status="${c.status}" data-resp="${esc(c.response)}">Update status</button></div></div>`).join('')}</div>` : emptyState('No complaints', 'Residents have not raised any issues.'));
      $$('[data-cx]').forEach((b) => (b.onclick = () => modal({ title: 'Update complaint', html: `<h3>Update complaint</h3><form id="cxForm"><div class="field-stack"><div class="field"><label for="cxs">Status</label><select id="cxs" name="status">${[['open', 'Open'], ['progress', 'In progress'], ['resolved', 'Resolved']].map(([v, l]) => `<option value="${v}" ${b.dataset.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="cxr">Response to resident</label><textarea id="cxr" name="response" rows="3" maxlength="500" placeholder="e.g. Technician visiting tomorrow at 10 AM">${esc(b.dataset.resp)}</textarea></div></div><button class="btn btn-primary btn-block" type="submit">Save</button></form>`,
        onMount: (m, close) => { const f = $('#cxForm', m); f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { await api('/owner/complaints/' + b.dataset.cx, { method: 'PATCH', body: { status: f.status.value, response: f.response.value } }); close(); toast('Complaint updated'); go('complaints'); }); }; } })));
    },
  };
  function requestItem(b) {
    return `<div class="item"><div class="item-top"><div><h4>${esc(b.name)} <span class="muted" style="font-weight:400;font-size:.88rem">→ ${esc(b.pg_name)}</span></h4><div class="meta"><span>${icon('phone')} <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></span><span>${icon('mail')} ${esc(b.user_email)}</span>
      <span>${b.kind === 'booking' ? `${icon('bed')} ${esc(b.room_type)} room` : `${icon('msg')} Enquiry`}</span>${b.move_in ? `<span>${icon('calendar')} Move-in ${fmtDate(b.move_in)}</span>` : ''}<span>${fmtDate(b.created_at)}</span></div></div>${statusBadge(b.status)}</div>
      ${b.message ? `<p style="margin:0;color:var(--ink);font-size:.92rem">“${esc(b.message)}”</p>` : ''}${b.owner_note ? `<div class="note"><b>Your note:</b> ${esc(b.owner_note)}</div>` : ''}
      ${b.status === 'pending' ? `<div class="actions"><button class="btn btn-primary btn-sm" data-act="approved" data-id="${b.id}">${icon('check')} ${b.kind === 'booking' ? 'Approve' : 'Mark as replied'}</button><button class="btn btn-danger btn-sm" data-act="rejected" data-id="${b.id}">${b.kind === 'booking' ? 'Decline' : 'Dismiss'}</button></div>` : ''}</div>`;
  }
  function bindRequests() {
    $$('[data-act]').forEach((b) => (b.onclick = () => {
      const approve = b.dataset.act === 'approved';
      modal({ title: 'Respond', html: `<h3>${approve ? 'Approve request' : 'Decline request'}</h3><p>Add an optional note — the student will see it in their dashboard.</p><form id="rqForm"><div class="field-stack"><div class="field"><label for="rqn">Note (optional)</label><textarea id="rqn" name="note" rows="3" maxlength="300" placeholder="${approve ? 'Please bring ID proof and deposit on move-in day.' : 'Sorry, this room is no longer available.'}"></textarea></div></div><button class="btn ${approve ? 'btn-primary' : 'btn-danger'} btn-block" type="submit">${approve ? 'Approve' : 'Decline'}</button></form>`,
        onMount: (m, close) => { const f = $('#rqForm', m); f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { await api('/owner/bookings/' + b.dataset.id, { method: 'PATCH', body: { status: b.dataset.act, owner_note: f.note.value } }); close(); toast(approve ? 'Request approved ✓' : 'Request declined'); go(current); }); }; } });
    }));
  }

  function pgForm(pg) {
    const edit = !!pg;
    const roomOf = (t) => (pg && pg.rooms.find((r) => r.type === t)) || null;
    modal({ wide: true, title: edit ? 'Edit PG' : 'Add a PG',
      html: `<span class="eyebrow">${edit ? 'Edit listing' : 'New listing'}</span><h3 style="margin-top:6px">${edit ? 'Edit ' + esc(pg.name) : 'Add a new PG'}</h3>
      <form id="pgForm" novalidate><div class="field-stack">
        <div class="field"><label for="pfName">PG name</label><input id="pfName" name="name" required maxlength="80" value="${edit ? esc(pg.name) : ''}" placeholder="e.g. Sunrise Girls PG"></div>
        <div class="row2"><div class="field"><label for="pfCity">City</label><input id="pfCity" name="city" required value="${edit ? esc(pg.city) : ''}" placeholder="Bengaluru"></div>
          <div class="field"><label for="pfArea">Area / locality</label><input id="pfArea" name="area" required value="${edit ? esc(pg.area) : ''}" placeholder="Koramangala"></div></div>
        <div class="field"><label for="pfAddr">Full address</label><input id="pfAddr" name="address" required value="${edit ? esc(pg.address) : ''}" placeholder="Street, landmark, area, city"></div>
        <div class="row2"><div class="field"><label for="pfGender">Suitable for</label><select id="pfGender" name="gender">${['Boys', 'Girls', 'Co-ed'].map((g) => `<option ${edit && pg.gender === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
          <div class="field"><label for="pfDep">Security deposit (₹)</label><input id="pfDep" name="deposit" type="number" min="0" step="500" value="${edit ? pg.deposit : ''}" placeholder="10000"></div></div>
        <div class="field"><label for="pfDesc">Description</label><textarea id="pfDesc" name="description" rows="3" required maxlength="1500" placeholder="What makes your PG a good place to live?">${edit ? esc(pg.description) : ''}</textarea></div>
        <div class="field"><span class="label">Rooms &amp; monthly rent</span>
          ${ROOM_TYPES.map((t) => { const r = roomOf(t); return `<div class="room-edit"><label class="t"><input type="checkbox" name="rm_${t}" ${r ? 'checked' : ''}> ${t}</label><input type="number" min="500" step="100" name="rp_${t}" placeholder="Rent ₹/month" aria-label="${t} rent" value="${r ? r.price : ''}"><input type="number" min="0" name="ra_${t}" placeholder="Beds available" aria-label="${t} beds available" value="${r ? r.available : ''}"></div>`; }).join('')}
          <span class="hint">Tick the room types you offer, then set the rent and how many beds are free.</span></div>
        <div class="field"><span class="label">Facilities</span><div class="filter-opts">${FACS.map((f) => `<label class="pill"><input type="checkbox" name="fac" value="${f}" ${edit && pg.facilities.includes(f) ? 'checked' : ''}><span>${icon(f)} ${FAC_LABEL[f]}</span></label>`).join('')}</div></div>
        <div class="field"><label for="pfRules">House rules (one per line)</label><textarea id="pfRules" name="rules" rows="3" placeholder="Gate closes at 10:30 PM">${edit ? esc(pg.rules.join('\n')) : ''}</textarea></div>
        <div class="field"><label for="pfImg">Photo URL (optional)</label><input id="pfImg" name="image" type="url" value="${edit && /^https?:/.test(pg.image) ? esc(pg.image) : ''}" placeholder="https://…"><span class="hint">Leave blank to use a generated room illustration.</span></div>
        <label class="pill" style="width:fit-content"><input type="checkbox" name="active" ${!edit || pg.active ? 'checked' : ''}><span>Visible to students</span></label>
      </div><button class="btn btn-primary btn-block" type="submit">${edit ? 'Save changes' : 'Publish listing'}</button></form>`,
      onMount: (m, close) => {
        const f = $('#pgForm', m);
        f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => {
          const rooms = ROOM_TYPES.filter((t) => f['rm_' + t].checked).map((t) => ({ type: t, price: f['rp_' + t].value, available: f['ra_' + t].value || 0 }));
          const body = { name: f.name.value, city: f.city.value, area: f.area.value, address: f.address.value, gender: f.gender.value, deposit: f.deposit.value, description: f.description.value, rooms,
            facilities: $$('input[name=fac]:checked', f).map((c) => c.value), rules: f.rules.value, image: f.image.value, active: f.active.checked };
          await api(edit ? '/pgs/' + pg.id : '/pgs', { method: edit ? 'PUT' : 'POST', body });
          close(); toast(edit ? 'Listing updated ✓' : 'Listing published ✓'); go('listings');
        }); };
      } });
  }

  /* ================= PROFILE (both) ================= */
  async function profile() {
    $('#panel').innerHTML = `<div class="row2" style="align-items:start">
      <div class="panel"><h3>Profile details</h3><form id="pfForm" novalidate><div class="field-stack">
        <div class="field"><label for="pName">Full name</label><input id="pName" name="name" value="${esc(u.name)}" required></div>
        <div class="field"><label for="pEmail">Email</label><input id="pEmail" value="${esc(u.email)}" disabled></div>
        <div class="field"><label for="pPhone">Mobile number</label><input id="pPhone" name="phone" inputmode="numeric" maxlength="10" value="${esc(u.phone || '')}"></div>
        <div class="field"><label for="pCity">${isOwner ? 'City' : 'Preferred city'}</label><input id="pCity" name="city" value="${esc(u.city || '')}" placeholder="e.g. Pune"></div></div>
        <button class="btn btn-primary" type="submit">Save changes</button></form></div>
      <div class="panel"><h3>Change password</h3><form id="pwForm" novalidate><div class="field-stack">
        <div class="field"><label for="pwc">Current password</label><input id="pwc" name="current" type="password" autocomplete="current-password"></div>
        <div class="field"><label for="pwn">New password</label><input id="pwn" name="next" type="password" autocomplete="new-password" minlength="8"><span class="hint">At least 8 characters.</span></div></div>
        <button class="btn btn-outline" type="submit">Update password</button></form></div></div>`;
    const f = $('#pfForm');
    f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { const d = await api('/auth/me', { method: 'PATCH', body: { name: f.name.value, phone: f.phone.value, city: f.city.value } }); Object.assign(u, d.user); toast('Profile updated ✓'); $('#welcome').textContent = 'Welcome back, ' + u.name.split(' ')[0]; renderNav('profile'); }); };
    const p = $('#pwForm');
    p.onsubmit = (e) => { e.preventDefault(); submit(p, async () => { await api('/auth/password', { method: 'POST', body: { current: p.current.value, next: p.next.value } }); p.reset(); toast('Password updated ✓'); }); };
  }

  /* ================= router ================= */
  const views = { ...(isOwner ? owner : student), profile };
  let current = 'overview';
  async function go(tab) {
    if (!views[tab]) tab = 'overview';
    current = tab; loading();
    try {
      if (isOwner) { const s = await api('/owner/stats'); counts = { requests: s.pending_requests, complaints: s.open_complaints }; }
      else { const s = await api('/me/summary'); counts = { bookings: s.bookings, complaints: s.open_complaints }; }
    } catch (_) {}
    renderNav(tab);
    try { await views[tab](); } catch (e) { errorBox(e); }
  }
  window.addEventListener('hashchange', () => go(location.hash.slice(1)));
  document.addEventListener('saved-changed', () => { if (current === 'saved') go('saved'); });
  go(location.hash.slice(1) || 'overview');
})();
