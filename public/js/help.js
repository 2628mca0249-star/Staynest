(async function () {
  const { api, $, toast, submit, state, ready } = SN;
  await ready;
  const f = $('#contactForm');
  if (state.user) { f.name.value = state.user.name; f.email.value = state.user.email; }
  f.onsubmit = (e) => { e.preventDefault(); submit(f, async () => { await api('/contact', { method: 'POST', body: { name: f.name.value, email: f.email.value, message: f.message.value } }); f.message.value = ''; toast('Message sent — we will reply within a day ✓'); }); };
})();
