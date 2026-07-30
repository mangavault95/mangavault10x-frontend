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

const PREFISSO_CACHE = "mv_consigli";

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
  const posseduti = new Set(serie.map((s) => normalizzaTitolo(s.titolo)));
  const trovati = new Map();

  for (const seme of semi) {
    try {
      const risultati = await cercaFuori(seme.titolo, 3);
      const corrispondenza = scegliCorrispondenza(risultati, seme);
      if (!corrispondenza) continue;

      const raccomandati = await similiFuoriPerId(corrispondenza.manga.idEsterno);

      for (const r of raccomandati) {
        const chiaveTitolo = normalizzaTitolo(r.titolo);
        if (!r.titolo || posseduti.has(chiaveTitolo) || trovati.has(chiaveTitolo)) continue;

        trovati.set(chiaveTitolo, r);
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
