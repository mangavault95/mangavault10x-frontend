/**
 * La bibliografia di un autore, incrociata con lo scaffale.
 *
 * Serve a una domanda che prima si poteva solo indovinare guardando la
 * collezione: di questo autore, cos'altro ha fatto — e di quello,
 * quanto ho già? Le opere arrivano da AniList (che le conosce tutte,
 * anche quelle mai uscite in Italia); quali sono in casa lo dice il
 * riconoscimento per nome di `identita.js`, lo stesso usato dai titoli
 * simili.
 */

import { opereDiAutore } from "../bibliotecario/esterni";
import { costruisciRiconoscitore, ossoDelTitolo } from "./identita";

const PREFISSO_CACHE = "mv_autore_v1";

/**
 * AniList tiene schede separate per le riedizioni (l'edizione normale,
 * la kanzenban, la raccolta in volume unico): sono la stessa opera
 * mostrata tre volte, e in una griglia di copertine si vedono come tre
 * carte quasi identiche di fila. Vince la prima, che essendo ordinata
 * per popolarità è quella con cui l'opera si conosce.
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
 * Le opere di una persona, chieste ad AniList e messe in cache per la
 * sessione: riaprire lo stesso autore due volte è normale (dalla scheda
 * di una serie si finisce su un'altra dello stesso autore), rifare la
 * domanda no.
 */
export async function caricaOpereAutore(nome) {
  if (!nome) return null;

  const chiave = `${PREFISSO_CACHE}:${nome.trim().toLowerCase()}`;

  try {
    const inCache = sessionStorage.getItem(chiave);
    if (inCache) return JSON.parse(inCache);
  } catch {
    /* sessionStorage non disponibile: si prosegue senza cache */
  }

  const persona = await opereDiAutore(nome);

  if (!persona) return null;

  const risultato = { ...persona, opere: senzaDoppioni(persona.opere) };

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
export function abbinaOpere(opere, collezione) {
  if (!opere?.length) return [];

  const riconosci = costruisciRiconoscitore(collezione || []);

  return opere.map((o) => ({ ...o, posseduta: riconosci(o) }));
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
