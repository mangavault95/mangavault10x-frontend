// Un controllo che fa fallire la build se il router torna ad avvolgere i cambi di pagina in
// `React.startTransition`.
//
//   node scripts/controlla-router.mjs    (e gira da solo a ogni push, vedi .github/workflows/controlli.yml)
//
// Il «volo» della copertina (`dati/volo.js`, `ui/CartaSerie.jsx`) naviga con
// `flushSync(() => navigate(...))` dentro `document.startViewTransition`. Dalla versione 7 di
// react-router il router avvolge i cambi di pagina in `startTransition` di suo, e a quel punto la
// pagina non è ancora cambiata quando la transizione fotografa il «dopo»: la copertina non vola, e
// niente lo segnala. `<BrowserRouter useTransitions={false}>` ripristina il comportamento di prima.
// Misurato il 14/11/2026 (vedi scripts/prova-router.cjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function file(cartella) {
  return fs.readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const p = path.join(cartella, voce.name);

    return voce.isDirectory() ? file(p) : /\.(jsx?|mjs)$/.test(voce.name) ? [p] : [];
  });
}

const sorgenti = file(radice).map((p) => ({ p, testo: fs.readFileSync(p, "utf8") }));
const usanoIlVolo = sorgenti.filter((s) => /flushSync\(\s*\(\)\s*=>\s*navigate\([^.)]/.test(s.testo)).map((s) => path.relative(radice, s.p));
const router = sorgenti.find((s) => /<BrowserRouter\b/.test(s.testo));

let errori = 0;

if (!router) {
  console.log("✗ nessun <BrowserRouter> trovato in src/: il controllo non sa più dove guardare.");
  errori += 1;
} else if (usanoIlVolo.length > 0 && !/<BrowserRouter\b[^>]*\buseTransitions=\{false\}/.test(router.testo)) {
  console.log(`✗ ${path.relative(radice, router.p)}: <BrowserRouter> senza useTransitions={false}.`);
  console.log(`  Questi file navigano con flushSync dentro una transizione di vista e ne dipendono: ${usanoIlVolo.join(", ")}`);
  console.log("  Senza il flag il «volo» della copertina si rompe in silenzio (vedi il commento in questo file).");
  errori += 1;
} else {
  console.log(`✓ <BrowserRouter useTransitions={false}> c'è (${usanoIlVolo.length} file navigano con flushSync).`);
}

process.exitCode = errori ? 1 : 0;
