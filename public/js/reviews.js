(async function () {
  const { api, $, esc, icon, fmtDate, toast, submit, state, ready, stars } = SN;
  await ready;
  const u = state.user;
  const { items } = await api('/pgs?limit=24&sort=popular');
  const sel = $('#pgSelect');
  sel.innerHTML = items.map((p) => `<option value="${p.id}">${esc(p.name)} — ${esc(p.area)}, ${esc(p.city)}</option>`).join('');
  const qid = new URLSearchParams(location.search).get('id'); if (qid) sel.value = qid;

  const loginPrompt = (what) => `<p>Log in to ${what}.</p><a class="btn btn-primary btn-block" href="/login?next=${encodeURIComponent(location.pathname + location.hash)}">Log in</a><p style="text-align:center;margin:10px 0 0;font-size:.88rem">No account? <a href="/login?mode=signup" style="text-decoration:underline;color:var(--navy)">Sign up</a></p>`;
  let pg;
  async function render() {
    pg = await api('/pgs/' + sel.value);
    $('#rvPgName').textContent = pg.name;
    $('#rvSummary').innerHTML = pg.reviews_count ? `<div class="rev-summary" style="margin:0"><div><div class="rev-big">${pg.rating}</div><div class="stars">${stars(Math.round(pg.rating))}</div><div class="muted" style="font-size:.85rem">${pg.reviews_count} reviews</div></div>
      <div>${pg.distribution.map((d) => `<div class="bar-row"><span>${d.stars}★</span><div class="bar"><i style="width:${(d.count / pg.reviews_count) * 100}%"></i></div><span>${d.count}</span></div>`).join('')}</div></div>` : '<p style="margin:0">No reviews yet.</p>';
    $('#reviewsList').innerHTML = pg.reviews.length ? pg.reviews.map((r) => `<div class="review"><div class="review-top"><div class="review-author"><span class="avatar">${esc(r.name[0].toUpperCase())}</span>${esc(r.name)}</div><span class="review-date">${fmtDate(r.created_at)}</span></div><div class="stars">${stars(r.rating)}</div><p>${esc(r.text)}</p></div>`).join('')
      : SN.emptyState('No reviews yet', 'Be the first to share how your stay went.');
    const mine = u && pg.reviews.find((r) => r.user_id === u.id);
    if (!u) $('#reviewBox').innerHTML = loginPrompt('write a review');
    else if (pg.owner_id === u.id) $('#reviewBox').innerHTML = '<div class="alert info">You cannot review your own listing.</div>';
    else {
      $('#reviewBox').innerHTML = `<form id="reviewForm" novalidate><div class="field-stack">
        <div class="field"><span class="label">Rating</span><div class="star-input">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="rs${n}" value="${n}" ${(mine ? mine.rating : 5) === n ? 'checked' : ''}><label for="rs${n}" title="${n} stars">★</label>`).join('')}</div></div>
        <div class="field"><label for="rvText">Your review</label><textarea id="rvText" name="text" rows="4" maxlength="800" required placeholder="How was the food, safety, Wi-Fi, the owner…">${esc(mine ? mine.text : '')}</textarea></div></div>
        <button class="btn btn-primary btn-block" type="submit">${mine ? 'Update my review' : 'Submit review'}</button></form>`;
      const f = $('#reviewForm');
      f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { await api(`/pgs/${pg.id}/reviews`, { method: 'POST', body: { rating: f.rating.value, text: f.text.value } }); toast('Review submitted — thank you ✓'); render(); }); };
    }
  }
  sel.addEventListener('change', render);

  // complaint form
  const cb = $('#complaintBox');
  if (!u) cb.innerHTML = loginPrompt('raise a complaint');
  else if (u.role === 'owner') cb.innerHTML = '<div class="alert info">Complaints are raised by students. Owners can respond from the dashboard.</div><a class="btn btn-primary btn-sm" href="/dashboard#complaints">Go to complaints</a>';
  else {
    cb.innerHTML = `<form id="cxForm" novalidate><div class="field-stack">
      <div class="field"><label for="cxPg">Related PG</label><select id="cxPg" name="pg_id">${items.map((p) => `<option value="${p.id}">${esc(p.name)} — ${esc(p.city)}</option>`).join('')}</select></div>
      <div class="field"><label for="cxSubject">Subject</label><input id="cxSubject" name="subject" required maxlength="100" placeholder="e.g. Water heater not working"></div>
      <div class="field"><label for="cxCat">Category</label><select id="cxCat" name="category">${['Maintenance', 'Safety & security', 'Billing & deposit', 'Food & mess', 'Other'].map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label for="cxDetails">Details</label><textarea id="cxDetails" name="details" rows="4" required maxlength="1000" placeholder="Describe the issue in a few lines"></textarea></div></div>
      <button class="btn btn-primary btn-block" type="submit">Submit complaint</button></form>`;
    const f = $('#cxForm'); f.pg_id.value = sel.value;
    sel.addEventListener('change', () => (f.pg_id.value = sel.value));
    f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { await api('/me/complaints', { method: 'POST', body: { pg_id: f.pg_id.value, subject: f.subject.value, category: f.category.value, details: f.details.value } }); f.reset(); f.pg_id.value = sel.value; toast('Complaint submitted — track it from your dashboard ✓'); }); };
  }
  render();
})();
