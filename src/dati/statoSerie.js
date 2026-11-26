import { volumiMancanti } from "./serie";

/**
 * I tre stati di una serie della collezione (P2-02), ognuno con un
 * colore E un glifo: il glifo è quello che resta quando il colore non
 * si distingue (daltonismo, scala di grigi). I componenti stanno in
 * `ui/StatoSerie.jsx`.
 */
export const STATI_SERIE = {
  completa: { nome: "Completa", glifo: "✓", testo: "text-jade", bordo: "border-jade" },
  "in-pari": { nome: "In pari con le uscite", glifo: "=", testo: "text-lapis", bordo: "border-lapis" },
  mancano: { nome: "Mancano volumi", glifo: "!", testo: "text-ember", bordo: "border-ember" }
};

/** Quale dei tre stati è questa serie. */
export function statoDi(serie) {
  if (volumiMancanti(serie) > 0) return "mancano";

  return serie.stato === "conclusa" ? "completa" : "in-pari";
}
