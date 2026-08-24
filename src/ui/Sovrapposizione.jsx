import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Monta i figli direttamente su <body>, fuori dall'albero di <main>, e
 * tiene ferma la pagina sotto finché il velo è aperto.
 *
 * ---------------------------------------------------------------
 * 1. PERCHÉ UN PORTALE
 *
 * <main> (Shell.jsx) porta `animate-rise-in`, e un'animazione che
 * sposta l'elemento gli mette addosso un transform. Un ancestor
 * trasformato diventa il riferimento dei suoi discendenti
 * `position: fixed`, che smettono di ancorarsi alla finestra e si
 * centrano invece sull'intera altezza della pagina — se la pagina è
 * più lunga dello schermo, il centro cade fuori dalla parte visibile,
 * di solito molto più in basso di dove si è appena premuto.
 *
 * Il transform residuo dopo l'animazione è stato tolto
 * (`tailwind.config.js`, `backwards` invece di `both`), ma non basta e
 * non basterebbe mai: finché l'animazione scorre il transform c'è
 * davvero, ed è proprio il momento in cui una pagina appena aperta
 * viene toccata. Ogni velo/modulo `fixed inset-0` di una pagina va
 * quindi portato qui, fuori dall'albero di <main>.
 *
 * ---------------------------------------------------------------
 * 2. PERCHÉ LA PAGINA SOTTO SI FERMA
 *
 * Misurato: con la cartolina di un consiglio aperta, un dito che
 * scorre sul velo fa scorrere LA PAGINA DIETRO — da 0 a 900 pixel,
 * senza che il velo si muova di un millimetro. Nessun velo del sito lo
 * impediva, in nessuna schermata.
 *
 * Di suo è già sbagliato — quello che si sta guardando non deve
 * scivolare via da sotto — ma su iPhone costa di più: la barra bassa è
 * `position: fixed`, e Safari ancora i `fixed` al riquadro di
 * impaginazione. Quando quel riquadro cambia sotto un velo a schermo
 * intero e il velo poi sparisce, la barra può restare disegnata dove
 * stava, cioè a metà pagina, finché qualcosa non costringe a
 * ridisegnare. Tenendo ferma la pagina, quel riquadro non cambia mai.
 *
 * Il modo di fermarla è `position: fixed` sul <body> con lo scorrimento
 * salvato messo come `top` negativo, non `overflow: hidden`: su iOS
 * `overflow: hidden` sul body non ferma niente, ed è la ragione per cui
 * tutti i siti fanno questo giro che sembra strano.
 *
 * ⚠️ `position: fixed` sul body NON crea un riferimento per i
 * discendenti `fixed` — lo creano solo transform, filter, perspective
 * e contain. La barra bassa resta ancorata allo schermo.
 *
 * `blocca={false}` per i veli che non sono moduli: il sipario dei
 * passaggi di pagina (`Approdo`) è `pointer-events-none` e non chiede
 * niente a nessuno, fermarci sopra la pagina sarebbe solo uno scatto.
 */

// Il conto sta fuori dal componente perché i veli si sovrappongono: la
// campanella apre una scheda, da lì si apre una conferma. Chi chiude
// per primo non deve liberare la pagina che il secondo sta ancora
// tenendo — si sblocca solo quando l'ultimo se ne va.
let aperti = 0;
let scorrimentoSalvato = 0;

function fermaLaPagina() {
  if (aperti++ > 0) return;

  scorrimentoSalvato = window.scrollY;

  // Con la pagina ferma la barra di scorrimento sparisce, e su un
  // computer il contenuto sotto scivolerebbe a destra di quei pixel.
  const barra = window.innerWidth - document.documentElement.clientWidth;

  const corpo = document.body;

  corpo.style.position = "fixed";
  corpo.style.top = `-${scorrimentoSalvato}px`;
  corpo.style.left = "0";
  corpo.style.right = "0";
  corpo.style.width = "100%";

  if (barra > 0) corpo.style.paddingRight = `${barra}px`;
}

function liberaLaPagina() {
  aperti = Math.max(0, aperti - 1);

  if (aperti > 0) return;

  const corpo = document.body;

  for (const proprieta of ["position", "top", "left", "right", "width", "paddingRight"]) {
    corpo.style[proprieta] = "";
  }

  // Dopo aver tolto gli stili, non prima: finché il body è fisso la
  // pagina non ha dove scorrere. `instant` perché se un giorno
  // comparisse uno `scroll-behavior: smooth`, tornare al proprio posto
  // diventerebbe un viaggio animato di mezzo secondo.
  window.scrollTo({ top: scorrimentoSalvato, left: 0, behavior: "instant" });
}

export default function Sovrapposizione({ children, blocca = true }) {
  useLayoutEffect(() => {
    if (!blocca) return undefined;

    fermaLaPagina();

    return liberaLaPagina;
  }, [blocca]);

  return createPortal(children, document.body);
}
