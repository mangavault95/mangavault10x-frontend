import { useLayoutEffect, useRef, useState } from "react";
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
 * passaggi di pagina (la vecchia `Approdo`) è `pointer-events-none` e non chiede
 * niente a nessuno, fermarci sopra la pagina sarebbe solo uno scatto.
 */

// Il conto sta fuori dal componente perché i veli si sovrappongono: la
// campanella apre una scheda, da lì si apre una conferma. Chi chiude
// per primo non deve liberare la pagina che il secondo sta ancora
// tenendo — si sblocca solo quando l'ultimo se ne va.
let aperti = 0;
let scorrimentoSalvato = 0;
let fuocoSalvato = null;

function fermaLaPagina(origine) {
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

  // La pagina sotto smette anche di RISPONDERE, non solo di scorrere.
  // I fogli dichiarano `aria-modal`, cioè promettono che dietro non
  // c'è niente di raggiungibile; ma finché la pagina resta viva il Tab
  // esce dal foglio e va a spasso fra i bottoni coperti dal velo, e chi
  // usa un lettore di schermo li sente tutti. `inert` mantiene la
  // promessa in un colpo, per ogni finestra che passa di qui.
  //
  // Vale per `#root`, e i veli stanno fuori (sono portali su <body>):
  // restano vivi loro e spenta la pagina. Per lo stesso motivo gli
  // avvisi (`ui/Avvisi.jsx`) sono un portale anche loro — un «Annulla»
  // comparso mentre una finestra è aperta deve potersi toccare.
  //
  // Chi aveva il fuoco prima di aprire — e `origine` è letta al primo
  // render, non qui: un campo con `autoFocus` dentro la finestra prende
  // il fuoco durante il montaggio, e a quel punto `activeElement` è già
  // lui, non il bottone da cui si è partiti. Rendendo la pagina `inert`
  // il browser toglie comunque il fuoco, quindi lo si rimette alla
  // chiusura, in `liberaLaPagina`.
  fuocoSalvato = origine;

  document.getElementById("root")?.setAttribute("inert", "");
}

function liberaLaPagina() {
  aperti = Math.max(0, aperti - 1);

  if (aperti > 0) return;

  // Prima di tutto: chi chiude il foglio rimette il fuoco sul bottone
  // da cui era partito, e su un elemento ancora `inert` il fuoco non
  // attecchisce.
  document.getElementById("root")?.removeAttribute("inert");

  if (fuocoSalvato instanceof HTMLElement && fuocoSalvato.isConnected) {
    fuocoSalvato.focus({ preventScroll: true });
  }

  fuocoSalvato = null;

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

/**
 * ---------------------------------------------------------------
 * 3. L'USCITA
 *
 * Chiudere una finestra vuol dire smontarla, e un componente smontato
 * sparisce di colpo. Per non toccare le quindici finestre del sito, qui
 * si fa un trucco: mentre React toglie il velo, ne resta una copia
 * inerte (`data-uscita`, `pointer-events: none`) che sfuma e scende in
 * 220 millisecondi — le regole sono in index.css — e poi si toglie da
 * sola. È solo un'immagine: non risponde a niente e non porta focus.
 */
// Lo stesso tempo di `--d-uscita` in index.css, che è la durata delle
// regole `[data-uscita]`: se cambia là, cambia qua.
const USCITA_MS = 240;

function lasciaUnaCopia(contenitore) {
  if (!contenitore || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  for (const velo of contenitore.children) {
    if (!velo.matches?.(".fixed.inset-0")) continue;

    const copia = velo.cloneNode(true);

    copia.setAttribute("data-uscita", "");
    copia.setAttribute("aria-hidden", "true");
    copia.removeAttribute("role");
    copia.inert = true;
    copia.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));

    document.body.appendChild(copia);
    setTimeout(() => copia.remove(), USCITA_MS + 60);
  }
}

export default function Sovrapposizione({ children, blocca = true }) {
  const contenitore = useRef(null);

  // Lazy: gira una volta, nel render, prima che qualunque figlio monti
  // e prenda il fuoco.
  const [origine] = useState(() => (typeof document === "undefined" ? null : document.activeElement));

  useLayoutEffect(() => {
    const nodo = contenitore.current;

    return () => lasciaUnaCopia(nodo);
  }, []);

  useLayoutEffect(() => {
    if (!blocca) return undefined;

    fermaLaPagina(origine);

    return liberaLaPagina;
  }, [blocca, origine]);

  // `display: contents`: il contenitore serve solo a ritrovare il velo
  // quando si smonta, e non deve cambiare nessuna misura.
  return createPortal(
    <div ref={contenitore} style={{ display: "contents" }}>
      {children}
    </div>,
    document.body
  );
}
