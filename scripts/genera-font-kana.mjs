/**
 * Il carattere a pixel delle micro-etichette, ridotto ai soli segni usati.
 *
 * Uso:
 *   node scripts/genera-font-kana.mjs
 * (parte da sé prima di ogni `npm run build`)
 *
 * PERCHÉ ESISTE
 *
 * DotGothic16 serve a una cinquantina di segni — 漫画, アニメ, 金曜日… — ma
 * il file di @fontsource contiene tutto il giapponese: 396 kB, più
 * dell'intero JavaScript del sito, scaricati alla prima visita per delle
 * decorazioni. (Il commento in `main.jsx` diceva «solo i glifi che usano
 * le micro-etichette»: era l'intenzione, non quello che succedeva.)
 *
 * Qui si leggono i sorgenti, si raccolgono i segni giapponesi che ci
 * compaiono davvero e si ritaglia il carattere su quelli. In più entrano
 * sempre l'ASCII (le lettere dell'indice della Collezione usano lo stesso
 * carattere) e tutti gli hiragana e i katakana, che pesano poco e
 * evitano di restare senza un segno per una parola nuova.
 *
 * Gira prima di ogni build proprio per questo: chi aggiunge un kanji in
 * un componente non deve ricordarsi di niente, il carattere lo segue.
 * Il file prodotto sta comunque nel repository, così `npm run dev`
 * funziona senza passare di qui.
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINE = join(radice, "node_modules/@fontsource/dotgothic16/files/dotgothic16-japanese-400-normal.woff2");
const ARRIVO = join(radice, "src/assets/font/dotgothic16-mangavault.woff2");

// Punteggiatura giapponese, kana, kanji, forme a tutta larghezza.
const GIAPPONESE = /[　-ヿ一-鿿＀-￯]/;

function sorgenti(cartella, trovati = []) {
  for (const nome of readdirSync(cartella)) {
    const percorso = join(cartella, nome);

    if (statSync(percorso).isDirectory()) sorgenti(percorso, trovati);
    else if (/\.(jsx?|html)$/.test(nome)) trovati.push(percorso);
  }

  return trovati;
}

const segni = new Set();

// L'ASCII stampabile.
for (let c = 0x20; c < 0x7f; c++) segni.add(String.fromCharCode(c));
// Hiragana e katakana, tutti.
for (let c = 0x3041; c <= 0x30ff; c++) segni.add(String.fromCharCode(c));

for (const file of [...sorgenti(join(radice, "src")), join(radice, "index.html")]) {
  // Senza i commenti: lì il giapponese si cita, non si mostra.
  const testo = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  for (const segno of testo) if (GIAPPONESE.test(segno)) segni.add(segno);
}

const ritagliato = await subsetFont(readFileSync(ORIGINE), [...segni].join(""), { targetFormat: "woff2" });

mkdirSync(dirname(ARRIVO), { recursive: true });

// Non riscrivere un file identico: in sviluppo farebbe ripartire Vite, e
// in git sembrerebbe una modifica a ogni build.
let uguale = false;

try {
  uguale = Buffer.compare(readFileSync(ARRIVO), ritagliato) === 0;
} catch {
  // Non c'è ancora: si scrive.
}

if (!uguale) writeFileSync(ARRIVO, ritagliato);

console.log(
  `Carattere dei kana: ${segni.size} segni, ${(ritagliato.length / 1024).toFixed(1)} kB${uguale ? " (invariato)" : ""}`
);
