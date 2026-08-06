/**
 * La bibliografia di un autore, incrociata con lo scaffale.
 *
 * Serve a una domanda che prima si poteva solo indovinare guardando la
 * collezione: di questo autore, cos'altro ha fatto — e di quello,
 * quanto ho già?
 *
 * La fonte è AnimeClick, non AniList, e solo per le opere **uscite in
 * Italia**. AniList conosce la bibliografia completa, ma metà di quei
 * titoli qui non è mai arrivato: un elenco dove la maggioranza delle
 * copertine è roba che non puoi comprare risponde a un'altra domanda,
 * più da enciclopedia che da collezionista. In più i titoli tornano già
 * in italiano, gli stessi con cui le serie stanno in collezione, e il
 * riconoscimento di `identita.js` ci azzecca molto più spesso.
 */

import { getOpereAutore } from "../services/api";
import { indiceAutori } from "./corrispondenzaAutore";
import { costruisciRiconoscitore, ossoDelTitolo } from "./identita";

const PREFISSO_CACHE = "mv_autore_v1";

/**
 * Le riedizioni sono schede separate (l'edizione normale, la
 * deluxe, la raccolta in volume unico): la stessa opera mostrata due o
 * tre volte, che in una griglia di copertine si vede come una fila di
 * carte quasi identiche. Vince la prima.
 */
function senzaDoppioni(opere) {
  const visti = new Set();

  return opere.filter((o) => {
    const osso = ossoDelTitolo(o.titolo);

    if (!osso || visti.has(osso)) return false;

    visti.add(osso);

    return true;
  });
}

/**
 * Le opere italiane di una persona, messe in cache per la sessione:
 * riaprire lo stesso autore due volte è normale (dalla sua scheda si
 * finisce su un'altra serie sua), rifare la domanda no.
 */
export async function caricaOpereAutore(nome, riferimento) {
  if (!nome) return null;

  const chiave = `${PREFISSO_CACHE}:${nome.trim().toLowerCase()}`;

  try {
    const inCache = sessionStorage.getItem(chiave);
    if (inCache) return JSON.parse(inCache);
  } catch {
    /* sessionStorage non disponibile: si prosegue senza cache */
  }

  const persona = await getOpereAutore(nome, riferimento).catch(() => null);

  if (!persona?.opere?.length) return { nome, opere: [] };

  const risultato = {
    nome,
    opere: senzaDoppioni(persona.opere).map((o) => ({
      idEsterno: `ac-${o.id}`,
      // L'identificativo nudo, non solo dentro la chiave: è quello che
      // permette di riconoscere la serie in collezione anche quando i
      // due titoli non si somigliano affatto (vedi `identita.js`).
      animeClickId: o.id,
      titolo: o.titolo,
      anno: o.anno,
      copertina: o.copertina,
      collegamento: o.url,
      editoInItalia: Boolean(o.editoInItalia)
    }))
  };

  try {
    sessionStorage.setItem(chiave, JSON.stringify(risultato));
  } catch {
    /* pazienza */
  }

  return risultato;
}

/**
 * Quali di quelle opere sono sullo scaffale.
 *
 * Come per i titoli simili, l'abbinamento si rifà al momento di
 * mostrarle e non dentro il caricamento: la lista in cache resta buona
 * anche quando la collezione cambia sotto.
 */
export function abbinaOpere(opere, collezione, nome) {
  const riconosci = costruisciRiconoscitore(collezione || []);

  const abbinate = (opere || [])
    .map((o) => ({ ...o, posseduta: riconosci(o) }))
    // Fuori quello che in Italia non è uscito — è il senso del pannello
    // — ma quello che hai in casa resta comunque, qualunque cosa dica
    // la casella "Disponibilità" di AnimeClick: su Kaiju No. 8 è vuota
    // benché la serie sia in edicola da anni, e vedersi sparire dal
    // proprio autore una serie che si possiede sarebbe assurdo.
    .filter((o) => o.editoInItalia || o.posseduta);

  // E le tue che AnimeClick non elenca affatto sotto quel nome: la
  // ricerca per autore è testuale, quindi "Toru Fujisawa" non trova le
  // opere che loro firmano "Tōru Fujisawa" — e GTO spariva dal pannello
  // del suo autore. Qui la collezione ha ragione per definizione: se
  // una serie è tua e porta quel nome, in elenco ci va.
  const gia = new Set(abbinate.map((o) => o.posseduta?.id).filter(Boolean));

  const tue = (nome ? indiceAutori(collezione || []).trovaSerie(nome) : [])
    .filter((s) => !gia.has(s.id))
    .map((s) => ({
      idEsterno: `mia-${s.id}`,
      titolo: s.titolo,
      copertina: s.copertina,
      anno: null,
      collegamento: null,
      editoInItalia: true,
      posseduta: s
    }));

  const etichetta = (o) => o.posseduta?.titolo || o.titolo;

  return [...abbinate, ...tue].sort((a, b) => etichetta(a).localeCompare(etichetta(b), "it"));
}

/**
 * I nomi scritti in un campo autore.
 *
 * In tabella una scheda a quattro mani sta tutta in una casella
 * ("Tsugumi Ohba, Takeshi Obata"): separarli è ciò che permette di
 * cliccare *un* autore invece della coppia, che come persona non esiste
 * e su AniList non si trova.
 */
export function nomiAutori(...campi) {
  const visti = new Set();
  const nomi = [];

  for (const campo of campi) {
    for (const pezzo of String(campo || "").split(/[,;/&]| e /)) {
      const nome = pezzo.trim();
      const chiave = nome.toLowerCase();

      if (!nome || visti.has(chiave)) continue;

      visti.add(chiave);
      nomi.push(nome);
    }
  }

  return nomi;
}
