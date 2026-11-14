// Un controllo che fa fallire la build se gli indirizzi `/copertine/…` tornano ad accettare
// qualsiasi pagina dei siti che inoltrano.
//
//   node scripts/controlla-copertine.mjs    (gira da solo a ogni push, dentro `npm run controlla`)
//
// Fino al 14/11/2026 `vercel.json` inoltrava `/copertine/animeclick/<qualunque cosa>` a tutto
// animeclick.it (e lo stesso per MyAnimeList e AniList): una pagina di un altro sito serviva
// SOTTO IL NOSTRO DOMINIO, dove uno script può leggere il gettone d'accesso. La tabella di
// cosa si inoltra sta in `src/dati/copertine.js` (host e cartelle di immagini); qui si controlla
// che `vercel.json` dica esattamente quello, né più né meno, e che le pagine NON passino.
//
// ⚠️ Questo controllo legge il file di configurazione: non prova Vercel. Come Vercel tratta un
// percorso con `..` o `%2e%2e` non è verificato qui; per questo le risposte portano anche
// `X-Content-Type-Options: nosniff` e `Content-Security-Policy: sandbox`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

globalThis.window = { location: { origin: "https://sito.esempio" } };

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { HOST_INOLTRATI, PERCORSI_AMMESSI, copertinaLocale } = await import(path.join(radice, "src", "dati", "copertine.js"));
const config = JSON.parse(fs.readFileSync(path.join(radice, "vercel.json"), "utf8"));

const problemi = [];
const ok = (testo) => console.log(`✓ ${testo}`);

// ---- 1. gli inoltri esterni sono esattamente quelli attesi
const attesi = Object.entries(HOST_INOLTRATI).flatMap(([host, prefisso]) =>
  PERCORSI_AMMESSI[host].map((cartella) => ({
    source: `${prefisso}${cartella}:percorso*`,
    destination: `https://${host}${cartella}:percorso*`
  }))
);
const esterni = (config.rewrites || []).filter((r) => /^https?:\/\//.test(r.destination));
const chiave = (r) => `${r.source} -> ${r.destination}`;
const mancano = attesi.filter((a) => !esterni.some((r) => chiave(r) === chiave(a)));
const inPiu = esterni.filter((r) => !attesi.some((a) => chiave(a) === chiave(r)));

if (mancano.length) problemi.push(`mancano in vercel.json: ${mancano.map(chiave).join("; ")}`);
if (inPiu.length) problemi.push(`vercel.json inoltra più di quanto dice src/dati/copertine.js: ${inPiu.map(chiave).join("; ")}`);
if (!mancano.length && !inPiu.length) ok(`vercel.json inoltra solo le ${attesi.length} cartelle di immagini di src/dati/copertine.js`);

// ---- 2. ogni inoltro ha una cartella FISSA prima del carattere jolly
const larghi = esterni.filter((r) => !/^\/copertine\/[a-z-]+\/[a-z]+\/(?:[a-zA-Z]+\/)*:percorso\*$/.test(r.source));

if (larghi.length) problemi.push(`inoltri senza una cartella fissa (proxy aperto): ${larghi.map((r) => r.source).join(", ")}`);
else ok("ogni inoltro ha una cartella fissa prima del jolly");

// ---- 3. il «tutto il resto» sta in fondo
const ultimo = config.rewrites?.at(-1);

if (ultimo?.source === "/:qualsiasi*" && ultimo.destination === "/index.html") ok("il ripiego verso index.html è l'ultima regola");
else problemi.push("l'ultima regola non è il ripiego verso index.html");

// ---- 4. intestazioni sulle risposte
const intestazioni = (config.headers || []).find((h) => h.source === "/copertine/:percorso*")?.headers || [];
const ha = (k, v) => intestazioni.some((i) => i.key.toLowerCase() === k.toLowerCase() && i.value.toLowerCase().includes(v));

if (ha("X-Content-Type-Options", "nosniff") && ha("Content-Security-Policy", "sandbox")) ok("le risposte di /copertine hanno nosniff e CSP sandbox");
else problemi.push("/copertine deve mandare X-Content-Type-Options: nosniff e Content-Security-Policy: sandbox");

// ---- 5. comportamento: le immagini passano, le pagine no
const comeRegola = (r) => new RegExp(`^${r.source.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(":percorso*", ".*")}$`);
const passa = (percorso) => esterni.some((r) => comeRegola(r).test(percorso));

const immagini = [
  "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30002.jpg",
  "https://myanimelist.net/images/anime/4/19644.jpg",
  "https://cdn.myanimelist.net/images/anime/4/19644.jpg",
  "https://www.animeclick.it/immagini/manga/9607-thumb.jpg",
  "https://www.animeclick.it/images/Manga_Cover/HunterxHunter1.jpg"
];
const pagine = [
  "https://www.animeclick.it/manga/9607/berserk",
  "https://www.animeclick.it/calendario-manga",
  "https://myanimelist.net/anime/1/Cowboy_Bebop",
  "https://myanimelist.net/profile/qualcuno",
  "https://s4.anilist.co/index.html",
  "https://www.animeclick.it/"
];

for (const u of immagini) {
  const locale = copertinaLocale(u);

  if (!locale || !passa(locale)) problemi.push(`un'immagine vera non passerebbe: ${u} → ${locale}`);
}

if (!problemi.some((p) => p.startsWith("un'immagine vera"))) ok(`le ${immagini.length} immagini d'esempio passano`);

for (const u of pagine) {
  const locale = copertinaLocale(u);

  if (locale !== null) problemi.push(`una pagina verrebbe inoltrata dal client: ${u} → ${locale}`);
}

// Quello che scrive a mano chi attacca: l'indirizzo giusto, ma di una pagina.
const attacchi = [
  "/copertine/animeclick/manga/9607/berserk",
  "/copertine/animeclick/",
  "/copertine/mal/anime/1/Cowboy_Bebop",
  "/copertine/mal-cdn/anime/1",
  "/copertine/anilist/index.html",
  "/copertine/anilist/file/qualcosa",
  "/copertine/animeclick/immaginiXYZ/a.jpg"
];

for (const a of attacchi) if (passa(a)) problemi.push(`una pagina passerebbe da Vercel: ${a}`);

if (!problemi.some((p) => /pagina/.test(p))) ok(`${pagine.length} pagine e ${attacchi.length} indirizzi d'attacco NON passano`);

if (problemi.length) {
  console.error(`\n✗ ${problemi.length} problemi:\n  - ${problemi.join("\n  - ")}`);
  process.exit(1);
}
