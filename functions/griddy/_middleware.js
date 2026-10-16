/* Password gate for the Griddy sales page (shop.artzenmedia.com/griddy/) while testers are on the beta.
** The password is the Pages secret GRIDDY_GATE_PASSWORD (never in this public repo):
**   CLOUDFLARE_ACCOUNT_ID=9f8295586552d56e798cdc458690292f npx wrangler pages secret put GRIDDY_GATE_PASSWORD --project-name artzen-shop
** Open without the password: /griddy/sign/ (tester sign-up), /griddy/early/ (early access list) and /griddy/assets/ (logo and fonts used by other pages).
** To unlock the page for launch, delete this file and push. */
const COOKIE = "griddy_gate";
const OPEN = ["/griddy/sign", "/griddy/early", "/griddy/assets/"];

async function cookieValue(password) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("griddy-gate-v2:" + password));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gate(wrong) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Griddy</title>
<link rel="icon" href="/griddy/assets/griddy-mark-black.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" rel="stylesheet">
<style>
:root{--paper:#C2C1C3;--ink:#1E1E1E;--ink-2:#444346}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font:17px/1.5 "Archivo",system-ui,sans-serif;padding:16px}
.card{background:#EDECEE;border-radius:12px;padding:28px;width:100%;max-width:380px;box-shadow:0 1px 0 rgba(0,0,0,.06)}
img{width:44px;height:44px}h1{font-size:32px;line-height:1;font-weight:800;font-stretch:120%;margin:16px 0 6px}
p{margin:0 0 18px;color:var(--ink-2)}input{width:100%;font:400 18px "Archivo",sans-serif;padding:11px 12px;border:1.5px solid #B9B8BB;border-radius:8px;background:#fff}
input:focus{outline:none;border-color:var(--ink)}button{margin-top:12px;width:100%;height:50px;border:0;border-radius:8px;background:var(--ink);color:#F1F0F2;font:600 17px "Archivo",sans-serif;cursor:pointer}
.err{color:#B3261E;font-weight:600;font-size:15px;margin:10px 0 0}
</style></head><body><form class="card" method="post">
<img src="/griddy/assets/griddy-mark-black.svg" alt="Griddy"><h1>Coming soon</h1><p>This page isn't public yet.</p>
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus aria-label="Password">
<button type="submit">Enter</button>${wrong ? '<p class="err">That password is wrong.</p>' : ""}
</form></body></html>`;
  return new Response(html, { status: wrong ? 401 : 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (OPEN.some((p) => url.pathname.startsWith(p))) return next();
  const password = env.GRIDDY_GATE_PASSWORD;
  if (!password) return gate(false);                                 /* fail closed */
  const want = await cookieValue(password);
  const cookies = (request.headers.get("cookie") || "").split(/;\s*/);
  if (cookies.includes(COOKIE + "=" + want)) {
    const res = await next();
    const out = new Response(res.body, res); out.headers.set("cache-control", "no-store"); return out;
  }
  if (request.method === "POST") {
    let given = "";
    try { given = String((await request.formData()).get("password") || ""); } catch {}
    if (given !== password) return gate(true);
    return new Response(null, { status: 303, headers: {
      location: url.pathname + url.search,
      "set-cookie": `${COOKIE}=${want}; Path=/griddy; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
      "cache-control": "no-store" } });
  }
  return gate(false);
}
