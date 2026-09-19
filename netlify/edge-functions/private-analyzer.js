const COOKIE_NAME = "sigmabet_analyzer_session";
const SESSION_VALUE = "sigmabet-private-analyzer-v1";
const encoder = new TextEncoder();

function secret() {
  return Netlify.env.get("PROTECTED_ANALYZER_PASSWORD") || "";
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionToken(password) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_VALUE)));
}

function safeEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function readCookie(request) {
  const cookie = request.headers.get("cookie") || "";
  const item = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? item.slice(COOKIE_NAME.length + 1) : "";
}

function loginPage(error = "") {
  return new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Acceso privado | SigmaBet</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#070a0f;color:#f7f8fa;font:16px/1.5 Inter,system-ui,sans-serif}main{width:min(100%,420px);padding:32px;border:1px solid #242a34;border-radius:24px;background:linear-gradient(145deg,#121720,#0c1017);box-shadow:0 30px 80px #0008}.mark{display:flex;align-items:center;gap:10px;margin-bottom:38px;font-weight:800}.dot{width:12px;height:12px;border-radius:50%;background:#b6f13b;box-shadow:0 0 24px #b6f13b88}small{color:#8f98a8;text-transform:uppercase;letter-spacing:.14em}h1{margin:8px 0 8px;font-size:30px;letter-spacing:-.04em}p{margin:0 0 24px;color:#9ca5b4}label{display:block;margin-bottom:8px;font-size:13px;color:#c7ced8}input{width:100%;padding:15px 16px;border:1px solid #2b3340;border-radius:13px;background:#080b10;color:white;font:inherit;outline:none}input:focus{border-color:#b6f13b;box-shadow:0 0 0 3px #b6f13b18}button{width:100%;margin-top:14px;padding:15px;border:0;border-radius:13px;background:#b6f13b;color:#101408;font-weight:850;font-size:15px;cursor:pointer}.error{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:#e94c4c18;color:#ff8585;font-size:14px}.secure{margin-top:20px;color:#6f7887;font-size:12px;text-align:center}
</style></head><body><main><div class="mark"><span class="dot"></span>SigmaBet</div><small>Área reservada</small><h1>Analizador privado</h1><p>Introduce tu clave para acceder a las herramientas y estadísticas internas.</p>${error ? `<div class="error" role="alert">${error}</div>` : ""}<form method="post"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Entrar al analizador</button></form><div class="secure">Sesión cifrada · Acceso no indexado</div></main></body></html>`, {
    status: error ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" },
  });
}

export default async (request, context) => {
  const password = secret();
  if (!password) return new Response("El acceso privado todavía no está configurado.", { status: 503, headers: { "cache-control": "no-store" } });

  const url = new URL(request.url);
  if (url.searchParams.get("logout") === "1") {
    return new Response(null, { status: 303, headers: { location: url.pathname, "set-cookie": `${COOKIE_NAME}=; Path=/privado/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });
  }

  const expected = await sessionToken(password);
  if (safeEqual(readCookie(request), expected)) return context.next();

  if (request.method === "POST") {
    const form = await request.formData();
    if (safeEqual(String(form.get("password") || ""), password)) {
      return new Response(null, { status: 303, headers: { location: url.pathname, "set-cookie": `${COOKIE_NAME}=${expected}; Path=/privado/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200` } });
    }
    return loginPage("La contraseña no es correcta.");
  }

  return loginPage();
};
