import { useEffect } from "react";
import { useSessione } from "./sessione";

/**
 * Il tema di chi guarda.
 *
 * Dal 02/11/2026 il sito è «Japan Low-Fi Neon» per tutti, e il tema è
 * fatto di due cose separate:
 *
 *   LA MODALITÀ — «notte» (scura) o «giorno» (chiara). La sceglie ognuno
 *   dalle impostazioni, e si ricorda per persona.
 *
 *   L'ACCENTO — il neon di chi guarda: sakura per il padrone di casa,
 *   viola per gli altri (il lilla di Sara, portato al neon). Non si
 *   sceglie: è il colore della persona, come quello delle note.
 *
 * I colori stanno in `index.css`: la notte sakura è `:root`, poi
 * `[data-tema="giorno"]` e `[data-accento="viola"]` ritoccano quello che
 * cambia. Qui si decide solo cosa scrivere sull'elemento `<html>`.
 *
 * Prima la regola era un tema per persona («ardesia» per Nicer, «lilla»
 * per Sara): le scelte fatte allora si traducono da sole — l'ardesia
 * era scura, il lilla chiaro — e chi non ha mai scelto parte dove stava.
 */

export const MODALITA = ["notte", "giorno"];

// Le scelte salvate col vecchio nome.
const VECCHI_NOMI = { ardesia: "notte", lilla: "giorno" };

// Il colore della barra di stato del telefono, che non legge il CSS:
// va detto a parte, con un <meta>. Sono i `--c-shelf` delle due modalità.
const BARRA = { notte: "#0b0d14", giorno: "#f6f5fb" };

// L'ultima modalità e l'ultimo accento mostrati, letti da uno script in
// `index.html` PRIMA che parta React: senza, chi apre l'app di giorno
// vedrebbe un lampo di notte per tutto il tempo che serve a caricarla.
const CHIAVE_ULTIMO = "mangavault:tema";
const CHIAVE_ACCENTO = "mangavault:accento";

// Chi non è entrato sceglie per il suo dispositivo.
const chiavePersona = (utente) => `mangavault:tema:${utente?.id ?? "ospite"}`;

function normalizza(valore) {
  const tema = VECCHI_NOMI[valore] ?? valore;

  return MODALITA.includes(tema) ? tema : null;
}

export function temaDi(utente) {
  try {
    const scelto = normalizza(localStorage.getItem(chiavePersona(utente)));

    if (scelto) return scelto;
  } catch {
    /* archiviazione non disponibile: vale la regola */
  }

  // Chi non ha mai scelto parte dove stava: il padrone di casa (e chi
  // non è entrato) di notte, gli altri di giorno, come col lilla.
  return !utente?.id || utente.proprietario ? "notte" : "giorno";
}

/** Il neon della persona: sakura per il padrone di casa, viola per gli altri. */
export function accentoDi(utente) {
  return !utente?.id || utente.proprietario ? "sakura" : "viola";
}

/** La scelta fatta a mano dalle impostazioni. */
export function scegliTema(utente, tema) {
  try {
    if (MODALITA.includes(tema)) localStorage.setItem(chiavePersona(utente), tema);
  } catch {
    /* pazienza: vale la regola */
  }

  applicaTema(temaDi(utente), accentoDi(utente));
}

export function applicaTema(tema, accento = "sakura") {
  const radice = document.documentElement;

  if (tema === "giorno") radice.dataset.tema = "giorno";
  else delete radice.dataset.tema;

  if (accento === "viola") radice.dataset.accento = "viola";
  else delete radice.dataset.accento;

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BARRA[tema] || BARRA.notte);

  try {
    localStorage.setItem(CHIAVE_ULTIMO, tema);
    localStorage.setItem(CHIAVE_ACCENTO, accento);
  } catch {
    /* il lampo al prossimo avvio è il prezzo, nient'altro */
  }
}

/** Tiene il tema allineato a chi è entrato: si monta una volta, in cima. */
export function useTema() {
  const { utente } = useSessione();
  const tema = temaDi(utente);
  const accento = accentoDi(utente);

  useEffect(() => {
    applicaTema(tema, accento);
  }, [tema, accento]);

  return tema;
}
