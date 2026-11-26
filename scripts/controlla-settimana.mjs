// La riga «La tua settimana» compare solo quando deve: la domenica dalle 17 e il
// lunedì fino a mezzogiorno, ORA ITALIANA (d'inverno +01, d'estate +02).
//
//   node scripts/controlla-settimana.mjs     (gira da solo, vedi `npm run controlla`)
import { eOraDellaSettimana } from "../src/dati/settimana.js";

let errori = 0;

// [istante UTC, atteso, descrizione]
const CASI = [
  // Inverno (Roma = UTC+1): domenica 29 novembre 2026
  ["2026-11-29T15:59:00Z", false, "inverno, domenica 16:59 a Roma"],
  ["2026-11-29T16:00:00Z", true, "inverno, domenica 17:00 a Roma"],
  ["2026-11-29T22:59:00Z", true, "inverno, domenica 23:59 a Roma"],
  ["2026-11-29T23:00:00Z", true, "inverno, lunedì 00:00 a Roma (la notte fra i due giorni)"],
  ["2026-11-30T10:59:00Z", true, "inverno, lunedì 11:59 a Roma"],
  ["2026-11-30T11:00:00Z", false, "inverno, lunedì 12:00 a Roma"],
  ["2026-11-26T20:00:00Z", false, "giovedì sera"],
  ["2026-11-28T20:00:00Z", false, "sabato sera"],
  ["2026-12-02T20:00:00Z", false, "mercoledì sera"],
  // Estate (Roma = UTC+2): domenica 5 luglio 2026
  ["2026-07-05T14:59:00Z", false, "estate, domenica 16:59 a Roma"],
  ["2026-07-05T15:00:00Z", true, "estate, domenica 17:00 a Roma"],
  ["2026-07-06T09:59:00Z", true, "estate, lunedì 11:59 a Roma"],
  ["2026-07-06T10:00:00Z", false, "estate, lunedì 12:00 a Roma"],
  // Il giorno di Roma e non quello UTC: domenica 23:30 UTC è già lunedì 00:30 (inverno) a Roma
  ["2026-11-29T23:30:00Z", true, "domenica 23:30 UTC = lunedì 00:30 a Roma"]
];

for (const [istante, atteso, nome] of CASI) {
  const ok = eOraDellaSettimana(new Date(istante).getTime()) === atteso;

  if (!ok) errori++;

  console.log(`${ok ? "✓" : "✗"} ${nome}`);
}

if (errori) {
  console.error(`\n✗ ${errori} controlli falliti`);
  process.exit(1);
}

console.log("\n✓ la settimana compare quando deve");
