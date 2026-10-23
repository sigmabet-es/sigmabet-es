const COOKIE = 'sigmabet_admin_session';
const noStore = {'cache-control': 'private, no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow, noarchive'};
const sessionCookie = (token, age = 3600) => `${COOKIE}=${token}; Path=/admin/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;

// Identity valida el JWT en el servidor; los roles nunca proceden de user_metadata.
async function authorizedUser(origin, token) {
  if (!token || !/^[A-Za-z0-9_.-]+$/.test(token) || token.length > 8192) return false;
  try {
    const response = await fetch(`${origin}/.netlify/identity/user`, {
      headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) return false;
    const user = await response.json();
    return Array.isArray(user.app_metadata?.roles) && user.app_metadata.roles.includes('admin');
  } catch { return false; }
}

export default async (request, context) => {
  const url = new URL(request.url);
  const home = url.pathname === '/admin/' || url.pathname === '/admin/index.html';
  const sameOrigin = request.headers.get('origin') === url.origin;
  if (home && request.method === 'POST') {
    if (!sameOrigin) return new Response('Origen no permitido.', {status: 403, headers: noStore});
    let body;
    try { body = await request.json(); } catch { return new Response('Solicitud inválida.', {status: 400, headers: noStore}); }
    if (body.action === 'logout') return new Response(null, {status: 204, headers: {...noStore, 'set-cookie': sessionCookie('', 0)}});
    if (!await authorizedUser(url.origin, body.token)) return new Response('Necesitas una cuenta con rol admin.', {status: 403, headers: noStore});
    return new Response(null, {status: 204, headers: {...noStore, 'set-cookie': sessionCookie(body.token)}});
  }
  if (home && ['GET', 'HEAD'].includes(request.method)) return context.next();
  const token = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!await authorizedUser(url.origin, token)) {
    return new Response(null, {status: 303, headers: {...noStore, location: `/admin/?next=${encodeURIComponent(url.pathname)}`, 'set-cookie': sessionCookie('', 0)}});
  }
  if (url.searchParams.get('logout') === '1') return new Response(null, {status: 303, headers: {...noStore, location: '/admin/?logout=1', 'set-cookie': sessionCookie('', 0)}});
  return context.next();
};
