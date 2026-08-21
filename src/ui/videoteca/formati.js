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

/** 4,5 con la virgola, e senza zeri inutili: 4 resta 4. */
export function formattaVoto(voto) {
  return Number(voto).toLocaleString("it-IT", { maximumFractionDigits: 1 });
}
