// Due controlli sul contrasto del testo, che fanno fallire la build se qualcuno li rompe.
//
//   node scripts/controlla-contrasto.mjs     (e gira da solo a ogni push, vedi `npm run controlla`)
//
// 1. I COLORI DEL TESTO bastano sugli sfondi: `ink` e `ink-muted` devono avere almeno 4,5:1 (la soglia
//    WCAG AA per il testo piccolo) su `void`, `shelf` e `alcove`, in tutti e due i temi. I valori si
//    leggono da src/index.css, non sono scritti qui.
//
// 2. `ink-faint` NON è un colore di testo. Misurato il 14/11/2026 sta a 2,8-3,2:1, sotto la soglia, e
//    non si può alzare senza farlo coincidere con `ink-muted` (che già sulle superfici più chiare è a
//    4,2:1). Resta per le decorazioni: kana nascosti agli screen reader, freccette, icone dentro righe
//    che hanno già la loro etichetta. Il testo vero usa `ink-muted`. Qui sotto c'è l'elenco, file per
//    file, di dove `ink-faint` è ammesso: un uso nuovo fa fallire il controllo, e per ammetterlo bisogna
//    aggiungerlo a mano, con la ragione, in una revisione.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(radice, "src");

// ---- 1. i contrasti dei token ----

const css = fs.readFileSync(path.join(src, "index.css"), "utf8");

function blocco(apertura) {
  const i = css.indexOf(apertura);

  if (i < 0) throw new Error(`Non trovo «${apertura}» in index.css`);

  return css.slice(i, css.indexOf("\n}", i));
}

function token(testo, nome) {
  const m = testo.match(new RegExp(`--c-${nome}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));

  if (!m) throw new Error(`Non trovo --c-${nome}`);

  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const lineare = (c) => {
  const x = c / 255;

  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const luce = ([r, g, b]) => 0.2126 * lineare(r) + 0.7152 * lineare(g) + 0.0722 * lineare(b);
const contrasto = (a, b) => {
  const [alta, bassa] = [luce(a), luce(b)].sort((x, y) => y - x);

  return (alta + 0.05) / (bassa + 0.05);
};

const SOGLIA = 4.5;
let errori = 0;

for (const [tema, apertura] of [["scuro", ":root {"], ["chiaro", '[data-tema="giorno"] {']]) {
  const t = blocco(apertura);

  for (const inchiostro of ["ink", "ink-muted"]) {
    const colore = token(t, inchiostro);

    for (const sfondo of ["void", "shelf", "alcove"]) {
      const r = contrasto(colore, token(t, sfondo));

      if (r < SOGLIA) {
        console.log(`✗ tema ${tema}: ${inchiostro} su ${sfondo} è a ${r.toFixed(2)}:1, serve almeno ${SOGLIA}:1`);
        errori += 1;
      }
    }
  }
}

if (!errori) console.log(`✓ ink e ink-muted hanno almeno ${SOGLIA}:1 su void, shelf e alcove, in tutti e due i temi`);

// ---- 2. dove è ammesso ink-faint ----

// file (relativo a src/) → quanti usi di `text-ink-faint` sono ammessi, tutti decorativi.
const AMMESSI = {
  "ui/Pagina.jsx": 1, // kana accanto al titolo di sezione, aria-hidden
  "pages/AdessoPage.jsx": 2, // kana nei titoli della home, aria-hidden
  "app/Shell.jsx": 1, // kana della barra di navigazione, aria-hidden
  "ui/Tabellone.jsx": 2, // un numero ripetuto aria-hidden e la freccia di apertura
  "ui/serie/Pezzi.jsx": 1, // la freccia di apertura di una sezione
  "pages/StatistichePage.jsx": 1, // la freccia in basso a destra, aria-hidden
  "ui/Controlli.jsx": 1, // la freccia di un menu a tendina
  "pages/KachinukiPage.jsx": 1 // l'icona del torneo in fondo a una riga
};

function file(cartella) {
  return fs.readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const p = path.join(cartella, voce.name);

    return voce.isDirectory() ? file(p) : /\.(jsx?|mjs)$/.test(voce.name) ? [p] : [];
  });
}

const trovati = {};

for (const p of file(src)) {
  const n = (fs.readFileSync(p, "utf8").match(/\btext-ink-faint\b/g) || []).length;

  if (n) trovati[path.relative(src, p).split(path.sep).join("/")] = n;
}

const fuori = Object.entries(trovati).filter(([f, n]) => n > (AMMESSI[f] || 0));

for (const [f, n] of fuori) {
  console.log(`✗ ${f}: ${n} usi di text-ink-faint, ammessi ${AMMESSI[f] || 0}.`);
  errori += 1;
}

if (fuori.length) {
  console.log("  `ink-faint` non è un colore di testo (sta sotto i 3:1): per il testo vero usa `text-ink-muted`.");
  console.log("  Se è davvero una decorazione (kana aria-hidden, freccetta, icona), aggiungila all'elenco in questo file.");
} else {
  console.log(`✓ text-ink-faint solo dove è ammesso (${Object.values(trovati).reduce((a, b) => a + b, 0)} usi decorativi)`);
}

process.exitCode = errori ? 1 : 0;
