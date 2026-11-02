import { useEffect } from "react";
import { useSessione } from "./sessione";

/**
 * L'aspetto del sito per chi guarda.
 *
 * Dal 02/11/2026 il sito è «Japan Low-Fi Neon» per tutti, e l'aspetto è
 * fatto di tre scelte, tutte nelle impostazioni (`ui/SceltaTema.jsx`) e
 * tutte ricordate per persona — o per dispositivo, per chi non è entrato:
 *
 *   LA MODALITÀ — «notte» (scura) o «giorno» (chiara).
 *
 *   LA PALETTE — «sakura» (rosa), «viola» (Glicine, il lilla di Sara
 *   acceso) o «lanterna» (ambra). Chi non ha mai scelto parte da quella
 *   della sua persona: sakura il padrone di casa, glicine gli altri.
 *
 *   I KANJI — le micro-etichette in pixel (今, 漫画…), accese o spente.
 *
 * I colori stanno in `index.css`: la notte sakura è `:root`, e
 * `[data-tema]` / `[data-accento]` ritoccano quello che cambia. Qui si
 * decide solo cosa scrivere sull'elemento `<html>`.
 *
 * Prima il tema era uno a persona («ardesia» per Nicer, «lilla» per
 * Sara): le scelte di allora si traducono da sole, e chi non ha mai
 * scelto parte dove stava.
 */

export const MODALITA = ["notte", "giorno"];
export const PALETTE = ["sakura", "lanterna", "viola"];

// Le scelte salvate col vecchio nome.
const VECCHI_NOMI = { ardesia: "notte", lilla: "giorno" };

// Il colore della barra di stato del telefono, che non legge il CSS:
// va detto a parte, con un <meta>. Sono i `--c-shelf` delle due modalità.
const BARRA = { notte: "#0b0d14", giorno: "#f6f5fb" };

// Le ultime scelte mostrate, lette da uno script in `index.html` PRIMA
// che parta React: senza, chi apre l'app di giorno vedrebbe un lampo di
// notte per tutto il tempo che serve a caricarla.
const ULTIMO = { tema: "mangavault:tema", accento: "mangavault:accento", kana: "mangavault:kana" };

// Chi non è entrato sceglie per il suo dispositivo.
const chiave = (cosa, utente) => `mangavault:${cosa}:${utente?.id ?? "ospite"}`;

function letto(cosa, utente) {
  try {
    return localStorage.getItem(chiave(cosa, utente));
  } catch {
    return null; // archiviazione non disponibile: vale la regola
  }
}

function scritto(cosa, utente, valore) {
  try {
    localStorage.setItem(chiave(cosa, utente), valore);
  } catch {
    /* pazienza: vale la regola */
  }
}

const padrone = (utente) => !utente?.id || utente.proprietario;

export function temaDi(utente) {
  const salvato = letto("tema", utente);
  const tema = VECCHI_NOMI[salvato] ?? salvato;

  if (MODALITA.includes(tema)) return tema;

  // Chi non ha mai scelto parte dove stava: il padrone di casa (e chi
  // non è entrato) di notte, gli altri di giorno, come col lilla.
  return padrone(utente) ? "notte" : "giorno";
}

export function accentoDi(utente) {
  const salvato = letto("accento", utente);

  if (PALETTE.includes(salvato)) return salvato;

  return padrone(utente) ? "sakura" : "viola";
}

export function kanaDi(utente) {
  return letto("kana", utente) !== "no";
}

/** Le tre scelte delle impostazioni. */
export function scegliTema(utente, tema) {
  if (MODALITA.includes(tema)) scritto("tema", utente, tema);
  applicaDi(utente);
}

export function scegliAccento(utente, accento) {
  if (PALETTE.includes(accento)) scritto("accento", utente, accento);
  applicaDi(utente);
}

export function scegliKana(utente, acceso) {
  scritto("kana", utente, acceso ? "si" : "no");
  applicaDi(utente);
}

function applicaDi(utente) {
  applicaTema(temaDi(utente), accentoDi(utente), kanaDi(utente));
}

export function applicaTema(tema, accento = "sakura", kana = true) {
  const radice = document.documentElement;

  if (tema === "giorno") radice.dataset.tema = "giorno";
  else delete radice.dataset.tema;

  if (accento !== "sakura") radice.dataset.accento = accento;
  else delete radice.dataset.accento;

  if (kana) delete radice.dataset.kana;
  else radice.dataset.kana = "no";

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BARRA[tema] || BARRA.notte);

  try {
    localStorage.setItem(ULTIMO.tema, tema);
    localStorage.setItem(ULTIMO.accento, accento);
    localStorage.setItem(ULTIMO.kana, kana ? "si" : "no");
  } catch {
    /* il lampo al prossimo avvio è il prezzo, nient'altro */
  }
}

/** Tiene l'aspetto allineato a chi è entrato: si monta una volta, in cima. */
export function useTema() {
  const { utente } = useSessione();
  const tema = temaDi(utente);
  const accento = accentoDi(utente);
  const kana = kanaDi(utente);

  useEffect(() => {
    applicaTema(tema, accento, kana);
  }, [tema, accento, kana]);

  return tema;
}
