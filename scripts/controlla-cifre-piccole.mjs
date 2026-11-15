// Un controllo che fa fallire la build se le cifre piccole accanto al codice a barre non si
// leggono più.
//
//   node scripts/controlla-cifre-piccole.mjs    (gira dentro `npm run controlla`)
//
// ZXing 0.23.0 non le legge per due difetti suoi, e `src/dati/cifrePiccole.js` ci rimedia
// appoggiandosi a pezzi interni della libreria. Qui si disegna un codice da edicola (EAN-13 con
// l'aggiunta a 5 e a 2 cifre), lo si dà alla libreria vera e si guarda cosa ne esce: prima del
// rimedio niente (se un giorno la libreria si corregge da sola, lo dice), dopo il rimedio le
// cifre giuste. Un codice con l'aggiunta sbagliata non deve passare.
//
// Non prova la fotocamera: prova che, dato un codice ben inquadrato, le cifre escono.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Z = require("@zxing/library");
const pezzo = (nome) => require(`@zxing/library/cjs/core/oned/${nome}`).default;
const { rimedia, aggiuntaFidata } = await import("../src/dati/cifrePiccole.js");

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((x) => [...x].map((c) => (c === "0" ? "1" : "0")).join(""));
const G = R.map((x) => [...x].reverse().join(""));
const PARI = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
const PARI5 = ["GGLLL", "GLGLL", "GLLGL", "GLLLG", "LGGLL", "LLGGL", "LLLGG", "LGLGL", "LGLLG", "LLGLG"];
const PARI2 = ["LL", "LG", "GL", "GG"];

function ean13(c) {
  let s = "101";

  [...c.slice(1, 7)].forEach((d, i) => (s += (PARI[Number(c[0])][i] === "L" ? L : G)[Number(d)]));
  s += "01010";
  [...c.slice(7)].forEach((d) => (s += R[Number(d)]));

  return `${s}101`;
}

function aggiunta(cifre, schemaForzato = null) {
  const n = [...cifre].map(Number);
  const schema =
    schemaForzato ?? (cifre.length === 5 ? PARI5[(3 * (n[0] + n[2] + n[4]) + 9 * (n[1] + n[3])) % 10] : PARI2[Number(cifre) % 4]);

  return `1011${n.map((d, i) => (schema[i] === "L" ? L : G)[d]).join("01")}`;
}

/** Una riga di punti bianchi e neri, come la vede il lettore: 3 punti per ogni modulo, margini bianchi ai lati. */
function riga(codice, cifre, schemaForzato) {
  const moduli = `${"0".repeat(12)}${ean13(codice)}${cifre ? `${"0".repeat(9)}${aggiunta(cifre, schemaForzato)}` : ""}${"0".repeat(12)}`;
  const bit = new Z.BitArray(moduli.length * 3);

  [...moduli].forEach((m, i) => {
    if (m === "1") for (let k = 0; k < 3; k += 1) bit.set(i * 3 + k);
  });

  return bit;
}

function leggi(codice, cifre, schemaForzato) {
  try {
    const esito = new Z.EAN13Reader().decodeRow(0, riga(codice, cifre, schemaForzato), null);

    return { codice: esito.getText(), aggiunta: esito.getResultMetadata()?.get(Z.ResultMetadataType.UPC_EAN_EXTENSION) || null };
  } catch (e) {
    return { errore: e?.name || String(e) };
  }
}

const problemi = [];
const ok = (testo) => console.log(`✓ ${testo}`);
const uguale = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const CODICE = "9771234567003";

// ---- 0. senza rimedio: il difetto c'è ancora?
const prima = leggi(CODICE, "00042");

if (prima.aggiunta === "00042") {
  console.log("! ZXing ora legge le cifre piccole da solo: `src/dati/cifrePiccole.js` si può togliere.");
} else if (uguale(prima, { codice: CODICE, aggiunta: null })) {
  ok("senza rimedio ZXing legge il codice ma non le cifre piccole (il difetto noto)");
} else {
  problemi.push(`senza rimedio mi aspettavo il codice senza cifre piccole, ho ${JSON.stringify(prima)}`);
}

// ---- 1. il rimedio si applica
const applicato = rimedia({
  Astratto: pezzo("AbstractUPCEANReader"),
  Cinque: pezzo("UPCEANExtension5Support"),
  Due: pezzo("UPCEANExtension2Support"),
  Result: Z.Result,
  BarcodeFormat: Z.BarcodeFormat
});

if (applicato) ok("il rimedio trova i pezzi di ZXing su cui si appoggia");
else problemi.push("il rimedio non trova più i pezzi interni di ZXing: la libreria è cambiata");

// ---- 2. dopo il rimedio
for (const [nome, codice, cifre, atteso] of [
  ["cinque cifre piccole", CODICE, "00042", "00042"],
  ["altre cinque cifre", CODICE, "91357", "91357"],
  ["due cifre piccole", CODICE, "07", "07"],
  ["un ISBN col prezzo accanto", "9780306406157", "50795", "50795"],
  ["nessuna cifra piccola", CODICE, null, null]
]) {
  const letto = leggi(codice, cifre);

  if (uguale(letto, { codice, aggiunta: atteso })) ok(`${nome}: ${codice}${atteso ? ` + ${atteso}` : ""}`);
  else problemi.push(`${nome}: atteso ${codice} + ${atteso}, letto ${JSON.stringify(letto)}`);
}

// ---- 3. di quali cifre ci si fida
// Un'aggiunta a 5 con il controllo sbagliato: la libreria ripiega e ne legge le prime due come
// un'aggiunta a 2. È il motivo per cui delle aggiunte a 2 non ci si fida (`aggiuntaFidata`).
const storta = leggi(CODICE, "00042", "LLLLL");

if (storta.codice === CODICE && storta.aggiunta !== "00042") ok(`cifre piccole col controllo sbagliato: la libreria non le dà per buone (dà ${JSON.stringify(storta.aggiunta)})`);
else problemi.push(`cifre piccole col controllo sbagliato: non dovevano passare, letto ${JSON.stringify(storta)}`);

if (aggiuntaFidata(storta.aggiunta) === null) ok("…e quello che dà al loro posto non viene usato");
else problemi.push(`un'aggiunta letta male è stata presa per buona: ${JSON.stringify(storta.aggiunta)}`);

if (uguale(["00042", null, null, null], [aggiuntaFidata("00042"), aggiuntaFidata("07"), aggiuntaFidata(null), aggiuntaFidata("abcde")])) ok("ci si fida solo di cinque cifre");
else problemi.push("`aggiuntaFidata` deve accettare solo cinque cifre");

// ---- 4. due letture di fila non si mescolano
const a = leggi(CODICE, "00042");
const b = leggi(CODICE, "11111");

if (a.aggiunta === "00042" && b.aggiunta === "11111") ok("due letture di fila non si mescolano");
else problemi.push(`due letture di fila: ${JSON.stringify([a, b])}`);

if (problemi.length) {
  console.error(`\n${problemi.map((p) => `✗ ${p}`).join("\n")}`);
  process.exit(1);
}
