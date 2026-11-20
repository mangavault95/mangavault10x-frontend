// Il ripiego di una copertina di volume: la copertina della serie vale solo se della serie
// non si conosce ancora nessuna copertina di volume.
//
//   node scripts/controlla-copertine-volumi.mjs    (gira dentro `npm run controlla`)
//
// Il caso che l'ha fatto nascere: Rent a Girlfriend 35 in «Da comprare» con la copertina
// del volume 1, perché AnimeClick non ha ancora la miniatura del 35 e il sito ripiegava
// sulla copertina della serie (che è il volume 1).

import path from "node:path";
import { fileURLToPath } from "node:url";

const radice = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { serieConCopertine, ripiegoDelVolume } = await import(path.join(radice, "src", "dati", "copertineRipiego.js"));

const fonte = { base: "https://www.animeclick.it", copertine: { 7: { 1: "/images/a1.jpg", 34: "/images/a34.jpg" }, 9: {} } };
const SERIE = "https://s4.anilist.co/serie.jpg";
const problemi = [];

function atteso(nome, ottenuto, voluto) {
  if (ottenuto === voluto) console.log(`✓ ${nome}`);
  else {
    problemi.push(nome);
    console.log(`✗ ${nome}: atteso ${JSON.stringify(voluto)}, ottenuto ${JSON.stringify(ottenuto)}`);
  }
}

atteso("serie già letta: si conoscono copertine di volume", serieConCopertine(fonte, 7), true);
atteso("serie già letta, volume senza copertina: niente ripiego (non il volume 1)", ripiegoDelVolume(fonte, 7, SERIE), null);
atteso("serie mai letta: ripiego, la copertina della serie", ripiegoDelVolume(fonte, 8, SERIE), SERIE);
atteso("serie con un elenco vuoto: vale come mai letta", ripiegoDelVolume(fonte, 9, SERIE), SERIE);
atteso("copertine non ancora arrivate: ripiego", ripiegoDelVolume({ base: "", copertine: {} }, 7, SERIE), SERIE);
atteso("senza fonte: ripiego", ripiegoDelVolume(undefined, 7, SERIE), SERIE);
atteso("senza ripiego e senza copertine: null", ripiegoDelVolume(fonte, 8), null);

if (problemi.length) {
  console.error(`\n${problemi.length} controlli falliti.`);
  process.exit(1);
}

console.log("\nTutto a posto.");
process.exit(0);
