// Un controllo che fa fallire la build se le intestazioni di sicurezza di `vercel.json`
// non tengono più.
//
//   node scripts/controlla-intestazioni.mjs    (gira dentro `npm run controlla`)
//
// Il punto delicato è l'hash dello script che sta dentro `index.html` (il tema, prima che
// parta React): la CSP lo ammette per hash, quindi se qualcuno ritocca quello script e
// non l'hash, il browser lo blocca e chi ha il tema chiaro rivede il lampo scuro. Qui si
// ricalcola e si confronta. Si controlla il FILE: come Vercel serva davvero le intestazioni
// non è verificato qui.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(radice, "vercel.json"), "utf8"));
const html = fs.readFileSync(path.join(radice, "index.html"), "utf8");

const problemi = [];
const ok = (testo) => console.log(`✓ ${testo}`);

const globali = (config.headers || []).find((h) => h.source?.startsWith("/(("))?.headers || [];
const valore = (nome) => globali.find((h) => h.key.toLowerCase() === nome.toLowerCase())?.value || "";
const csp = valore("Content-Security-Policy");

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const hash = (testo) => `'sha256-${crypto.createHash("sha256").update(testo).digest("base64")}'`;

if (inline.length && inline.every((s) => csp.includes(hash(s)))) ok(`la CSP ammette per hash i ${inline.length} script dentro index.html`);
else problemi.push("l'hash dello script in index.html non è nella CSP di vercel.json (ricalcolalo)");

if (/script-src[^;]*'unsafe-inline'|script-src[^;]*'unsafe-eval'/.test(csp)) problemi.push("script-src non deve avere unsafe-inline né unsafe-eval");
else ok("script-src senza unsafe-inline né unsafe-eval");

for (const direttiva of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) {
  if (csp.includes(direttiva)) ok(`CSP: ${direttiva}`);
  else problemi.push(`la CSP deve contenere ${direttiva}`);
}

for (const nome of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"]) {
  if (valore(nome)) ok(`intestazione ${nome}`);
  else problemi.push(`manca l'intestazione ${nome}`);
}

if (problemi.length) {
  console.error("\n" + problemi.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
