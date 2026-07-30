/**
 * Cosa prendere dopo.
 *
 * Non un algoritmo nuovo: riusa `bibliotecario/esterni.js`, già scritto
 * e testato per le domande del bibliotecario su manga che non possiedi.
 * Qui la stessa catena — cerca su AniList, scegli la corrispondenza
 * giusta con l'autore, chiedi le raccomandazioni — parte da sola invece
 * che da una domanda, scegliendo i semi dai preferiti e dai voti alti.
 */

import { cercaFuori, scegliCorrispondenza, similiFuoriPerId } from "../bibliotecario/esterni";
import { indiceAutori } from "./corrispondenzaAutore";

// v3: cambia ogni volta che cambia la forma dei dati salvati o la
// regola di esclusione, altrimenti la cache del giorno prima
// continuerebbe a servire consigli con il vecchio filtro più permissivo.
const PREFISSO_CACHE = "mv_consigli_v3";

// Una chiave per giorno: le raccomandazioni non devono rifarsi a ogni
// apertura della pagina, ma nemmeno restare identiche per sempre.
function oggi() {
  return new Date().toISOString().slice(0, 10);
}

const normalizzaTitolo = (t) => (t || "").trim().toLowerCase();

/**
 * I semi da cui partire: preferiti prima, poi i voti più alti. La
 * scelta di *quali* due usare oggi è deterministica sul giorno — così
 * il rail non salta a un altro consiglio ogni volta che riapri la
 * pagina, ma cambia da un giorno all'altro.
 */
function scegliSemi(serie, quanti = 2) {
  const preferiti = serie.filter((s) => s.preferito);

  const votate = [...serie]
    .filter((s) => s.valutazione > 0)
    .sort((a, b) => b.valutazione - a.valutazione);

  const visti = new Set();
  const candidate = [...preferiti, ...votate].filter((s) => {
    if (visti.has(s.id)) return false;
    visti.add(s.id);
    return true;
  });

  if (!candidate.length) return [];

  const seme = Number(oggi().replace(/-/g, ""));
  const partenza = seme % candidate.length;

  return Array.from({ length: Math.min(quanti, candidate.length) }, (_, i) =>
    candidate[(partenza + i) % candidate.length]
  );
}

/**
 * Chi possiedi già, per riconoscerlo anche quando AniList lo chiama
 * diversamente.
 *
 * Il titolo da solo non basta: la collezione ha diverse schede in
 * italiano ("Buonanotte Punpun") mentre AniList risponde in romaji
 * ("Oyasumi Punpun") — stesso fumetto, zero lettere in comune, nessun
 * confronto testuale li avvicinerebbe mai. L'autore è più stabile
 * perché è un nome proprio, non si traduce — ma nemmeno lì il confronto
 * esatto basta: lo stesso Shuzo Oshimi del nostro database compare su
 * AniList come "Shuuzou Oshimi", la stessa persona romanizzata in un
 * altro modo. Per questo l'autore si confronta con Fuse, non con `===`:
 * tollera le poche lettere di differenza che la romanizzazione porta
 * con sé, cosa che un confronto esatto perderebbe sempre.
 */
function costruisciFiltroPosseduti(serie) {
  const titoli = new Set();

  for (const s of serie) {
    const t = normalizzaTitolo(s.titolo);
    if (t) titoli.add(t);
  }

  const autori = indiceAutori(serie);

  return (candidato) => {
    if (titoli.has(normalizzaTitolo(candidato.titolo))) return true;
    if (candidato.titoloInglese && titoli.has(normalizzaTitolo(candidato.titoloInglese))) return true;

    return autori.corrisponde(candidato.autore) || autori.corrisponde(candidato.disegnatore);
  };
}

function motivoConsiglio(seme) {
  if (seme.preferito) return `perché ${seme.titolo} è fra i tuoi preferiti`;
  if (seme.valutazione > 0) return `perché hai dato ${seme.valutazione}/5 a ${seme.titolo}`;

  return `perché somiglia a ${seme.titolo}`;
}

/**
 * Le serie consigliate a partire dalla collezione, senza ripetere
 * quello che possiedi già.
 *
 * Una fonte esterna che non risponde per un seme non deve buttare via
 * gli altri: si prosegue con quello che si riesce a trovare, e si
 * torna a mani vuote solo se AniList non risponde mai.
 */
export async function consigliaSerie(serie) {
  if (!serie?.length) return [];

  const chiave = `${PREFISSO_CACHE}:${oggi()}:${serie.length}`;

  try {
    const inCache = sessionStorage.getItem(chiave);
    if (inCache) return JSON.parse(inCache);
  } catch {
    /* sessionStorage non disponibile: si prosegue senza cache */
  }

  const semi = scegliSemi(serie);
  const giaPosseduto = costruisciFiltroPosseduti(serie);
  const trovati = new Map();

  for (const seme of semi) {
    try {
      const risultati = await cercaFuori(seme.titolo, 3);
      const corrispondenza = scegliCorrispondenza(risultati, seme);
      if (!corrispondenza) continue;

      const raccomandati = await similiFuoriPerId(corrispondenza.manga.idEsterno);
      const motivo = motivoConsiglio(seme);

      for (const r of raccomandati) {
        const chiaveTitolo = normalizzaTitolo(r.titolo);
        if (!r.titolo || trovati.has(chiaveTitolo) || giaPosseduto(r)) continue;

        trovati.set(chiaveTitolo, { ...r, motivo });
      }
    } catch {
      continue;
    }
  }

  const risultato = [...trovati.values()]
    .sort((a, b) => (b.voto ?? 0) - (a.voto ?? 0))
    .slice(0, 6);

  try {
    sessionStorage.setItem(chiave, JSON.stringify(risultato));
  } catch {
    /* niente di grave: la prossima apertura richiama semplicemente AniList */
  }

  return risultato;
}
