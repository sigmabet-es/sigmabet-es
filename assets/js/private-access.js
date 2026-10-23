(() => {
  const login = document.querySelector('[data-login]');
  const logout = document.querySelector('[data-logout]');
  const status = document.querySelector('[data-access-status]');
  const tools = document.querySelector('[data-tools]');
  const widget = window.netlifyIdentity;
  if (!widget) { login.disabled = true; status.textContent = 'No se pudo cargar el acceso. Comprueba tu conexión y recarga la página.'; return; }
  const params = new URLSearchParams(location.search);
  const destination = params.get('next');
  let busy = false;
  const clear = () => { tools.hidden = true; login.hidden = false; logout.hidden = true; };
  const enter = async user => {
    if (!user || busy) return;
    busy = true; status.textContent = 'Comprobando acceso…';
    try {
      const token = await user.jwt();
      const response = await fetch('/privado/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token})});
      if (!response.ok) throw new Error(response.status === 403 ? 'Tu cuenta necesita el rol admin. Solicita que lo activen en Netlify Identity.' : 'No se ha podido iniciar la sesión.');
      widget.close(); tools.hidden = false; login.hidden = true; logout.hidden = false;
      status.textContent = `Sesión iniciada · ${user.email}`;
      if (destination && /^\/privado\/(apuestas|analizador)\/$/.test(destination)) location.assign(destination);
    } catch (error) { clear(); status.textContent = error.message; logout.hidden = false; }
    finally { busy = false; }
  };
  login.addEventListener('click', () => widget.open('login'));
  logout.addEventListener('click', () => widget.logout());
  widget.on('login', enter);
  widget.on('logout', async () => {
    clear();
    try { await fetch('/privado/', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'logout'})}); status.textContent = 'Sesión cerrada.'; }
    catch { status.textContent = 'No se pudo cerrar la sesión del servidor. Reintenta antes de salir.'; logout.hidden = false; }
  });
  widget.on('error', () => { status.textContent = 'No se pudo conectar con Netlify Identity. Comprueba que esté activado en este sitio.'; });
  widget.on('init', user => { if (params.get('logout') === '1') widget.logout(); else if (user) enter(user); });
})();
