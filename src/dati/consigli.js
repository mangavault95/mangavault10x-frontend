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
import { getSimiliAnimeClick } from "../services/api";
import { indiceAutori } from "./corrispondenzaAutore";
import { costruisciRiconoscitore } from "./identita";

// v4: cambia ogni volta che cambia la forma dei dati salvati o la
// regola di esclusione, altrimenti la cache del giorno prima
// continuerebbe a servire consigli con il vecchio filtro più permissivo.
const PREFISSO_CACHE = "mv_consigli_v4";

// Una chiave per giorno: le raccomandazioni non devono rifarsi a ogni
// apertura della pagina, ma nemmeno restare identiche per sempre.
function oggi() {
  return new Date().toISOString().slice(0, 10);
}

const normalizzaTitolo = (t) => (t || "").trim().toLowerCase();

/**
 * I semi da cui partire: preferiti prima, poi i voti alti (4-5 stelle,
 * "mi sono piaciuti"). Un 1-2 non ha senso come base di un consiglio —
 * suggerirebbe di leggere altro che assomiglia a ciò che non piace —
 * e un 3 è neutro, non un endorsement. La scelta di *quali* due usare
 * oggi è deterministica sul giorno — così il rail non salta a un altro
 * consiglio ogni volta che riapri la pagina, ma cambia da un giorno
 * all'altro.
 */
function scegliSemi(serie, quanti = 2) {
  const preferiti = serie.filter((s) => s.preferito);

  const votate = [...serie]
    .filter((s) => s.valutazione >= 4)
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
/**
 * La stessa identificazione di sopra, ma che restituisce la serie
 * posseduta invece di un booleano: serve a chi deve mostrare *quale*
 * corrispondenza ha trovato (`DesiderioPage`), non solo escluderla dai
 * consigli come fa `costruisciFiltroPosseduti` qui sotto.
 */
export function costruisciCercaPosseduto(serie) {
  const perTitolo = new Map();

  for (const s of serie) {
    const t = normalizzaTitolo(s.titolo);
    if (t && !perTitolo.has(t)) perTitolo.set(t, s);
  }

  const autori = indiceAutori(serie);

  return (candidato) => {
    const perTitoloOriginale = perTitolo.get(normalizzaTitolo(candidato.titolo));
    if (perTitoloOriginale) return perTitoloOriginale;

    if (candidato.titoloInglese) {
      const perTitoloInglese = perTitolo.get(normalizzaTitolo(candidato.titoloInglese));
      if (perTitoloInglese) return perTitoloInglese;
    }

    return (
      autori.trovaSerie(candidato.autore)[0] ||
      autori.trovaSerie(candidato.disegnatore)[0] ||
      null
    );
  };
}

function costruisciFiltroPosseduti(serie) {
  const cercaPosseduto = costruisciCercaPosseduto(serie);

  return (candidato) => Boolean(cercaPosseduto(candidato));
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

        trovati.set(chiaveTitolo, { ...r, fonte: "anilist", motivo });
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

/**
 * Gli stessi consigli, ma chiesti ai lettori italiani.
 *
 * Stessi semi — i preferiti e i voti alti di oggi — e stessa promessa
 * ("roba che non hai"), con una fonte che ragiona diversamente: su
 * AnimeClick chi consiglia ha letto l'edizione italiana, e quello che
 * indica è quasi sempre comprabile qui. Arriva dopo, perché passa dal
 * backend: la fila si disegna con AniList e si completa quando risponde.
 *
 * L'esclusione di quello che possiedi qui è quella stretta per titolo,
 * non quella larga per autore usata sopra: di questi candidati sappiamo
 * solo il nome, e nient'altro con cui allargare.
 */
export async function consigliaSerieAnimeClick(serie) {
  if (!serie?.length) return [];

  const chiave = `${PREFISSO_CACHE}:ac:${oggi()}:${serie.length}`;

  try {
    const inCache = sessionStorage.getItem(chiave);
    if (inCache) return JSON.parse(inCache);
  } catch {
    /* sessionStorage non disponibile: si prosegue senza cache */
  }

  const semi = scegliSemi(serie);
  const riconosci = costruisciRiconoscitore(serie);
  const trovati = new Map();

  for (const seme of semi) {
    try {
      const risposta = await getSimiliAnimeClick({
        titolo: seme.titolo,
        autore: seme.autore,
        id: seme.animeClickId
      });

      const motivo = motivoConsiglio(seme);

      for (const r of risposta?.simili || []) {
        const chiaveTitolo = normalizzaTitolo(r.titolo);

        if (!r.titolo || trovati.has(chiaveTitolo)) continue;
        if (riconosci({ titolo: r.titolo })) continue;

        trovati.set(chiaveTitolo, {
          fonte: "animeclick",
          idEsterno: `ac-${r.id}`,
          titolo: r.titolo,
          copertina: r.copertina,
          collegamento: r.url,
          segnalazioni: r.segnalazioni || 0,
          generi: [],
          voto: null,
          motivo
        });
      }
    } catch {
      continue;
    }
  }

  const risultato = [...trovati.values()]
    .sort((a, b) => b.segnalazioni - a.segnalazioni)
    .slice(0, 6);

  try {
    sessionStorage.setItem(chiave, JSON.stringify(risultato));
  } catch {
    /* pazienza */
  }

  return risultato;
}
