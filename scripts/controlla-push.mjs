// Il guardiano (`public/sw.js`) sa mostrare una notifica push e sa cosa farne al tocco.
//
//   node scripts/controlla-push.mjs     (gira da solo a ogni push, vedi `npm run controlla`)
//
// Il browser non è disponibile in CI e il permesso per le notifiche non si può dare da
// una prova automatica: quindi si esegue il file vero in un contesto che somiglia a quello
// di un service worker (`self`, `registration`, `clients`) e si guardano le chiamate. Quello
// che si controlla è quello che può rompersi in silenzio:
//
//   - un push SENZA corpo o con un corpo storto mostra comunque una notifica (iOS e Chrome
//     tolgono il permesso a chi riceve un messaggio senza mostrarlo);
//   - al tocco si apre solo un indirizzo di questo sito, mai uno che arriva dal messaggio
//     e punta altrove.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const codice = fs.readFileSync(path.join(radice, "public", "sw.js"), "utf8");

const ORIGINE = "https://mangavault.example";

let errori = 0;
const ok = (nome, vero) => {
  if (!vero) errori++;
  console.log(`${vero ? "✓" : "✗"} ${nome}`);
};

function nuovoContesto({ finestre = [] } = {}) {
  const gestori = {};
  const mostrate = [];
  const aperte = [];
  const navigate = [];

  const self = {
    location: { origin: ORIGINE, toString: () => `${ORIGINE}/sw.js?api=`, search: "?api=" },
    addEventListener: (tipo, fn) => (gestori[tipo] = fn),
    skipWaiting: () => {},
    registration: { showNotification: (titolo, opzioni) => (mostrate.push({ titolo, ...opzioni }), Promise.resolve()) },
    clients: {
      matchAll: async () =>
        finestre.map((url) => ({
          url,
          focus: async () => ({ focalizzata: url }),
          navigate: async (verso) => (navigate.push(verso), { url: verso, focus: async () => ({ focalizzata: verso }) })
        })),
      openWindow: async (url) => (aperte.push(url), null)
    }
  };

  const sandbox = { self, caches: { open: async () => ({}) }, URL, URLSearchParams, fetch: async () => ({}), Promise, JSON, console };

  vm.createContext(sandbox);
  vm.runInContext(codice, sandbox);

  return { gestori, mostrate, aperte, navigate };
}

async function push(contesto, dati) {
  let promessa = null;

  contesto.gestori.push({
    data: dati === undefined ? null : { json: () => (typeof dati === "string" ? JSON.parse(dati) : dati), text: () => String(dati) },
    waitUntil: (p) => (promessa = p)
  });

  await promessa;
}

async function tocco(contesto, url) {
  let promessa = null;
  let chiusa = false;

  contesto.gestori.notificationclick({
    notification: { close: () => (chiusa = true), data: url === undefined ? undefined : { url } },
    waitUntil: (p) => (promessa = p)
  });

  await promessa;

  return chiusa;
}

// ---- il push ----

{
  const c = nuovoContesto();

  ok("il guardiano ascolta push e tocco", typeof c.gestori.push === "function" && typeof c.gestori.notificationclick === "function");

  await push(c, { titolo: "Frieren", corpo: "St. 2 · ep. 2", url: "/videoteca/10", tag: "uscita-10-26", silenzioso: false });
  ok("un push normale mostra titolo e corpo", c.mostrate[0]?.titolo === "Frieren" && c.mostrate[0]?.body === "St. 2 · ep. 2");
  ok("porta il tag, perché la stessa puntata si sostituisca", c.mostrate[0]?.tag === "uscita-10-26");
  ok("porta l'indirizzo per il tocco", c.mostrate[0]?.data?.url === "/videoteca/10");
  ok("di giorno non è silenzioso", c.mostrate[0]?.silent === false);

  await push(c, { titolo: "Notte", corpo: "x", silenzioso: true });
  ok("di notte è silenzioso", c.mostrate[1]?.silent === true);

  await push(c, undefined);
  ok("un push senza corpo mostra comunque una notifica", c.mostrate[2]?.titolo === "MangaVault");

  await push(c, "questo non è json");
  ok("un corpo che non è JSON mostra comunque una notifica", c.mostrate.length === 4 && c.mostrate[3].titolo === "MangaVault");

  await push(c, {});
  ok("un oggetto vuoto mostra comunque una notifica", c.mostrate.length === 5);
}

// ---- il tocco ----

{
  const c = nuovoContesto();
  await tocco(c, "/videoteca/10");
  ok("il tocco chiude la notifica e apre la pagina", c.aperte[0] === `${ORIGINE}/videoteca/10`);
}

{
  const c = nuovoContesto({ finestre: [`${ORIGINE}/calendario`] });
  await tocco(c, "/videoteca/10");
  ok("con l'app già aperta, la porta avanti sulla pagina giusta", c.navigate[0] === `${ORIGINE}/videoteca/10` && c.aperte.length === 0);
}

for (const [nome, url] of [
  ["un altro sito", "https://evil.example/login"],
  ["un indirizzo senza protocollo che punta altrove", "//evil.example/x"],
  ["javascript:", "javascript:alert(1)"],
  ["nessun indirizzo", undefined],
  ["un indirizzo storto", "http://[::1"]
]) {
  const c = nuovoContesto();
  const chiusa = await tocco(c, url);
  ok(`mai un indirizzo altrui: ${nome} → la home`, chiusa && c.aperte[0] === `${ORIGINE}/`);
}

if (errori) {
  console.error(`\n✗ ${errori} controlli falliti`);
  process.exit(1);
}

console.log("\n✓ il guardiano gestisce i push come deve");
