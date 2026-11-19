(async function () {
  const { api, $, esc, icon, pgCard, skeletons, stars } = SN;
  $('#fc1i').innerHTML = icon('shield'); $('#fc2i').innerHTML = icon('check');
  $('#homeGrid').innerHTML = skeletons(6);

  const [meta, list, rv] = await Promise.all([
    api('/pgs/meta'), api('/pgs?sort=popular&limit=6'), api('/reviews/recent').catch(() => ({ items: [] })),
  ]).catch((e) => { $('#homeGrid').innerHTML = SN.emptyState('Could not load listings', e.message); throw e; });
  await SN.ready;

  const s = meta.stats;
  $('#heroTag').textContent = `${s.pgs} verified PGs across ${s.cities} cities`;
  $('#statBar').innerHTML = [[s.pgs, 'Verified listings'], [s.cities, 'Cities covered'], [(s.avg_rating || 4.4) + '★', 'Average PG rating'], ['₹' + Number(s.min_rent).toLocaleString('en-IN'), 'Rooms starting from']]
    .map(([b, l]) => `<div class="stat"><b>${b}</b><span>${l}</span></div>`).join('');
  $('#hsCity').innerHTML += meta.cities.map((c) => `<option>${esc(c.city)}</option>`).join('');
  $('#cityRow').innerHTML = meta.cities.slice(0, 8).map((c) => `<a class="city-tile" href="/search?city=${encodeURIComponent(c.city)}"><div><b>${esc(c.city)}</b><span>${c.n} PG${c.n > 1 ? 's' : ''}</span></div><span class="arrow">${icon('arrow')}</span></a>`).join('');
  $('#homeGrid').innerHTML = list.items.map(pgCard).join('');

  if (rv.items.length) {
    $('#reviewsSection').hidden = false;
    $('#quoteGrid').innerHTML = rv.items.slice(0, 3).map((r) => `<div class="quote"><div class="stars" aria-label="${r.rating} out of 5">${stars(r.rating)}</div><p>“${esc(r.text)}”</p>
      <footer><span class="avatar">${esc(r.name[0])}</span><div><b>${esc(r.name)}</b><a href="/pg-details?id=${r.pg_id}" class="muted">${esc(r.pg_name)}, ${esc(r.city)}</a></div></footer></div>`).join('');
  }

  $('#heroSearch').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    const q = $('#hsQ').value.trim(), c = $('#hsCity').value, r = $('#hsRent').value;
    if (q) p.set('q', q); if (c) p.set('city', c); if (r) p.set('maxRent', r);
    location.href = '/search' + (p.toString() ? '?' + p : '');
  });
})();
