(async function () {
  const { api, $, $$, esc, icon, pgCard, skeletons, emptyState, money, FAC_LABEL } = SN;
  const ROOMS = ['Single', 'Double', 'Triple'], GENDERS = ['Boys', 'Girls', 'Co-ed'];
  const MAX = 20000;
  const pill = (type, name, val, label, checked) => `<label class="pill"><input type="${type}" name="${name}" value="${esc(val)}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;

  const meta = await api('/pgs/meta').catch(() => ({ cities: [], facilities: [] }));
  const P = new URLSearchParams(location.search);
  $('#fCity').innerHTML += meta.cities.map((c) => `<option value="${esc(c.city)}">${esc(c.city)} (${c.n})</option>`).join('');
  $('#fRoom').innerHTML = pill('radio', 'room', '', 'Any', !P.get('room')) + ROOMS.map((r) => pill('radio', 'room', r, r, P.get('room') === r)).join('');
  $('#fGender').innerHTML = pill('radio', 'gender', '', 'Any', !P.get('gender')) + GENDERS.map((g) => pill('radio', 'gender', g, g, P.get('gender') === g)).join('');
  const facSel = (P.get('facilities') || '').split(',');
  $('#fFac').innerHTML = meta.facilities.map((f) => pill('checkbox', 'fac', f, `${icon(f)} ${FAC_LABEL[f]}`, facSel.includes(f))).join('');

  $('#fQ').value = P.get('q') || '';
  $('#fCity').value = P.get('city') || '';
  $('#fRent').value = P.get('maxRent') || MAX;
  $('#sortBy').value = P.get('sort') || 'popular';
  $('#fAvail').checked = P.get('available') === '1';
  $('#openFilters').innerHTML = icon('filter') + ' Filters';
  let page = Number(P.get('page')) || 1;

  const read = () => ({
    q: $('#fQ').value.trim(), city: $('#fCity').value, maxRent: Number($('#fRent').value) >= MAX ? '' : $('#fRent').value,
    room: ($('input[name=room]:checked') || {}).value || '', gender: ($('input[name=gender]:checked') || {}).value || '',
    facilities: $$('input[name=fac]:checked').map((c) => c.value).join(','), available: $('#fAvail').checked ? '1' : '',
    sort: $('#sortBy').value,
  });
  const qs = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v) p.set(k, v); }); return p; };

  let token = 0;
  async function load() {
    const f = read(); const my = ++token;
    $('#rentOut').textContent = Number($('#fRent').value) >= MAX ? 'Any' : money($('#fRent').value);
    const url = qs({ ...f, page: page > 1 ? page : '' });
    history.replaceState(null, '', url.toString() ? '?' + url : location.pathname);
    $('#resultsGrid').innerHTML = skeletons(6);
    try {
      const d = await api('/pgs?' + qs({ ...f, page, limit: 9 }));
      if (my !== token) return;
      $('#resultsCount').textContent = `${d.total} PG${d.total !== 1 ? 's' : ''} found`;
      $('#resultsGrid').innerHTML = d.items.length ? d.items.map(pgCard).join('')
        : `<div style="grid-column:1/-1">${emptyState('No PGs match those filters', 'Try widening your budget, picking another city or clearing a filter.', '<button class="btn btn-primary btn-sm" id="emptyClear">Clear filters</button>')}</div>`;
      const ec = $('#emptyClear'); if (ec) ec.onclick = clear;
      renderPager(d.page, d.pages);
      renderChips(f);
    } catch (e) { if (my === token) $('#resultsGrid').innerHTML = `<div style="grid-column:1/-1">${emptyState('Something went wrong', e.message)}</div>`; }
  }
  function renderPager(cur, pages) {
    const el = $('#pager');
    if (pages <= 1) { el.innerHTML = ''; return; }
    let h = `<button data-p="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;
    for (let i = 1; i <= pages; i++) h += `<button data-p="${i}" class="${i === cur ? 'active' : ''}" ${i === cur ? 'aria-current="page"' : ''}>${i}</button>`;
    el.innerHTML = h + `<button data-p="${cur + 1}" ${cur === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;
  }
  $('#pager').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; page = Number(b.dataset.p); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  function renderChips(f) {
    const chips = [];
    if (f.q) chips.push(['q', `“${f.q}”`]); if (f.city) chips.push(['city', f.city]); if (f.maxRent) chips.push(['maxRent', 'Under ' + money(f.maxRent)]);
    if (f.room) chips.push(['room', f.room + ' room']); if (f.gender) chips.push(['gender', f.gender]);
    if (f.facilities) f.facilities.split(',').forEach((x) => chips.push(['fac:' + x, FAC_LABEL[x]]));
    if (f.available) chips.push(['available', 'Has vacancy']);
    $('#activeFilters').innerHTML = chips.map(([k, l]) => `<button class="chip" data-rm="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)} ${icon('x')}</button>`).join('');
  }
  $('#activeFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return; const k = b.dataset.rm;
    if (k === 'q') $('#fQ').value = ''; else if (k === 'city') $('#fCity').value = ''; else if (k === 'maxRent') $('#fRent').value = MAX;
    else if (k === 'room') $('input[name=room][value=""]').checked = true; else if (k === 'gender') $('input[name=gender][value=""]').checked = true;
    else if (k === 'available') $('#fAvail').checked = false; else if (k.startsWith('fac:')) { const c = $(`input[name=fac][value="${k.slice(4)}"]`); if (c) c.checked = false; }
    page = 1; load();
  });
  function clear() {
    $('#fQ').value = ''; $('#fCity').value = ''; $('#fRent').value = MAX; $('#fAvail').checked = false;
    $('input[name=room][value=""]').checked = true; $('input[name=gender][value=""]').checked = true;
    $$('input[name=fac]').forEach((c) => (c.checked = false)); page = 1; load();
  }
  $('#clearFilters').addEventListener('click', clear);

  let t; const debounced = () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 250); };
  $('#fQ').addEventListener('input', debounced); $('#fRent').addEventListener('input', debounced);
  $('#filters').addEventListener('change', (e) => { if (e.target.id !== 'fRent') { page = 1; load(); } });
  $('#sortBy').addEventListener('change', () => { page = 1; load(); });
  $('#openFilters').addEventListener('click', () => $('#filters').classList.add('open'));
  $('#closeFilters').addEventListener('click', () => $('#filters').classList.remove('open'));

  await SN.ready;
  load();
})();
