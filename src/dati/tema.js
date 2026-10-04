import { useEffect } from "react";
import { useSessione } from "./sessione";

/**
 * Il tema di chi guarda.
 *
 * Dal 04/10/2026 il sito ha un tema per persona: «ardesia e ottone» per
 * Nicer, «carta e lilla» per Sara. I colori stanno in `index.css`, sotto
 * `:root` (ardesia) e `[data-tema="lilla"]`; qui si decide solo quale
 * dei due va scritto sull'elemento `<html>`.
 *
 * La regola: il proprietario vede l'ardesia, gli altri il lilla — che
 * per com'è fatto oggi il sito vuol dire Nicer e Sara. Sopra la regola
 * vince la scelta fatta a mano, ricordata per persona: è la porta per un
 * interruttore in «Tu» senza toccare niente di qui.
 *
 * Chi non è entrato vede l'ardesia, che è il sito com'è sempre stato.
 */

export const TEMI = ["ardesia", "lilla"];

// Il colore della barra di stato del telefono, che non legge il CSS:
// va detto a parte, con un <meta>. Sono i `--c-shelf` dei due temi.
const BARRA = { ardesia: "#1e1c19", lilla: "#ffffff" };

// L'ultimo tema mostrato, letto da uno script in `index.html` PRIMA che
// parta React: senza, chi apre l'app con il tema chiaro vedrebbe un
// lampo di ardesia per tutto il tempo che serve a caricare il codice.
const CHIAVE_ULTIMO = "mangavault:tema";

const chiavePersona = (id) => `mangavault:tema:${id}`;

export function temaDi(utente) {
  if (!utente?.id) return "ardesia";

  try {
    const scelto = localStorage.getItem(chiavePersona(utente.id));

    if (TEMI.includes(scelto)) return scelto;
  } catch {
    /* archiviazione non disponibile: vale la regola */
  }

  return utente.proprietario ? "ardesia" : "lilla";
}

/** La scelta fatta a mano. `null` torna alla regola. */
export function scegliTema(utente, tema) {
  if (!utente?.id) return;

  try {
    if (TEMI.includes(tema)) {
      localStorage.setItem(chiavePersona(utente.id), tema);
    } else {
      localStorage.removeItem(chiavePersona(utente.id));
    }
  } catch {
    /* pazienza: vale la regola */
  }

  applicaTema(temaDi(utente));
}

export function applicaTema(tema) {
  const radice = document.documentElement;

  if (tema === "ardesia") {
    delete radice.dataset.tema;
  } else {
    radice.dataset.tema = tema;
  }

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BARRA[tema] || BARRA.ardesia);

  try {
    localStorage.setItem(CHIAVE_ULTIMO, tema);
  } catch {
    /* il lampo al prossimo avvio è il prezzo, nient'altro */
  }
}

/** Tiene il tema allineato a chi è entrato: si monta una volta, in cima. */
export function useTema() {
  const { utente } = useSessione();
  const tema = temaDi(utente);

  useEffect(() => {
    applicaTema(tema);
  }, [tema]);

  return tema;
}
