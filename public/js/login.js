(async function () {
  const { api, $, icon, toast, submit, ready, state } = SN;
  $('#perks').innerHTML = ['Save PGs and compare them later', 'Book rooms with a single request', 'Track complaints until they are resolved', 'Owners: list properties for free'].map((t) => `<li>${icon('check')} ${t}</li>`).join('');
  await ready;
  const P = new URLSearchParams(location.search);
  const next = P.get('next') && P.get('next').startsWith('/') && !P.get('next').startsWith('//') ? P.get('next') : '/dashboard';
  if (state.user) { location.replace(next); return; }

  const show = (m) => {
    const s = m === 'signup';
    $('#tabLogin').classList.toggle('active', !s); $('#tabSignup').classList.toggle('active', s);
    $('#loginForm').hidden = s; $('#signupForm').hidden = !s;
  };
  $('#tabLogin').onclick = () => show('login'); $('#tabSignup').onclick = () => show('signup');
  if (P.get('mode') === 'signup') show('signup');
  if (P.get('role') === 'owner') $('input[name=role][value=owner]').checked = true;
  $('#suPhone').addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '')));

  document.querySelectorAll('[data-demo]').forEach((b) => (b.onclick = () => { const [e, p] = b.dataset.demo.split('|'); $('#liEmail').value = e; $('#liPass').value = p; show('login'); $('#loginForm').requestSubmit(); }));

  const f1 = $('#loginForm');
  f1.addEventListener('submit', (e) => { e.preventDefault(); submit(f1, async () => {
    await api('/auth/login', { method: 'POST', body: { email: f1.email.value, password: f1.password.value } });
    toast('Logged in ✓'); location.href = next;
  }); });
  const f2 = $('#signupForm');
  f2.addEventListener('submit', (e) => { e.preventDefault(); submit(f2, async () => {
    if (f2.password.value.length < 8) throw Object.assign(new Error('Password must be at least 8 characters.'), { fields: { password: 1 } });
    await api('/auth/signup', { method: 'POST', body: { name: f2.name.value, email: f2.email.value, phone: f2.phone.value, password: f2.password.value, role: f2.role.value } });
    toast('Account created — welcome to StayNest ✓'); location.href = next;
  }); });
})();
