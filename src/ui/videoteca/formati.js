/**
 * Come si scrivono le cose in videoteca: nomi, date, numeri.
 *
 * Stanno in un file senza componenti perché è l'unico modo di
 * condividerli senza rompere il ricaricamento a caldo di Vite — un
 * file che esporta insieme componenti e costanti costringe a
 * ricaricare l'intera pagina a ogni modifica.
 */

/** Gli stati di una visione, in italiano e non nel gergo del database. */
export const NOMI_STATO = {
  da_vedere: "Da vedere",
  in_visione: "In visione",
  in_pausa: "In pausa",
  droppata: "Mollata",
  completa: "Finita"
};

/** Lo stato della serie: quello dell'opera, non quello di chi guarda. */
export const NOMI_STATO_SERIE = {
  conclusa: "Conclusa",
  in_corso: "In corso",
  in_pausa: "In pausa",
  inedita: "Non ancora uscita",
  interrotta: "Interrotta"
};

export const NOMI_TIPO = {
  serie_tv: "Serie TV",
  film: "Film",
  ova: "OAV",
  ona: "ONA",
  special: "Special"
};

/**
 * "oggi", "domani", "dom", "12 set": il minimo che basta a sapere se
 * una cosa è vicina. Il giorno della settimana solo entro la settimana,
 * perché "giovedì" fra tre settimane non dice niente.
 */
export function quandoBreve(quando) {
  const data = new Date(quando);
  const adesso = new Date();

  const giorni = Math.round((data - adesso) / 86400000);

  if (data.toDateString() === adesso.toDateString()) return "oggi";
  if (giorni <= 1) return "domani";

  if (giorni < 7) {
    return data.toLocaleDateString("it-IT", { weekday: "short", timeZone: "Europe/Rome" });
  }

  return data.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome"
  });
}

/**
 * La data di una puntata: "17 set 1984", e "22 ago" se è di quest'anno.
 *
 * L'anno si scrive solo quando serve, ma serve spesso: in una lista di
 * puntate ci sono sia quella di sabato scorso sia quella del 1984, e
 * senza l'anno «17 set» le fa sembrare la stessa cosa. Toglierlo
 * sull'anno in corso è quello che si fa parlando — nessuno dice «esce
 * il 30 agosto 2026».
 */
export function dataPuntata(quando) {
  if (!quando) return null;

  const data = new Date(quando);

  if (Number.isNaN(data.getTime())) return null;

  const suoAnno = Number(
    data.toLocaleDateString("it-IT", { year: "numeric", timeZone: "Europe/Rome" })
  );

  return data.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: suoAnno === new Date().getFullYear() ? undefined : "numeric",
    timeZone: "Europe/Rome"
  });
}

/** 4,5 con la virgola, e senza zeri inutili: 4 resta 4. */
export function formattaVoto(voto) {
  return Number(voto).toLocaleString("it-IT", { maximumFractionDigits: 1 });
}

/**
 * «al 4», «all'8»: la preposizione articolata davanti a un numero.
 *
 * Nasce da un errore che si leggeva in calendario — «sei all'4» —
 * perché l'apostrofo era scritto a mano nella frase. L'elisione non
 * dipende dalla cifra ma dalla PAROLA: si apostrofa solo davanti a
 * vocale, cioè otto, undici, ottanta… e non davanti a diciotto o
 * ventotto, che pure finiscono per otto.
 *
 * Il conto pratico: si elide quando il numero comincia per 8 (otto,
 * ottanta, ottocento) e quando è undici. Da mille in su ricomincia
 * per consonante — «milleottocento» — e infatti il limite è a tre
 * cifre. Più in là non si va: sono numeri di episodio.
 */
export function alNumero(numero) {
  const n = Number(numero);

  if (!Number.isFinite(n)) return "";

  const elide = n === 11 || (n > 0 && n < 1000 && String(n).startsWith("8"));

  return elide ? `all'${n}` : `al ${n}`;
}
