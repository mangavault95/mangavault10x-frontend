import { useEffect, useState } from "react";
import { coloreLettore } from "../../dati/lettori";
import { urlStriscione } from "../../services/api";

/**
 * LO STRISCIONE: la fascia in cima a una pagina personale.
 *
 * Prima qui c'era una banda bianca con dentro un esagono, ed era
 * soprattutto vuota: duecento pixel di carta per dire un nome. Adesso
 * è più bassa e ci sta dentro qualcosa — una o più immagini che si
 * alternano piano — e il nome ci sta SOPRA invece che sotto. Il conto
 * dell'altezza cambia parecchio: prima erano fascia più nome più
 * sommario uno sotto l'altro, adesso è solo la fascia.
 *
 * ---------------------------------------------------------------
 * PERCHÉ IL FONDO È SCURO ANCHE SENZA IMMAGINI
 *
 * Il nome e i numeri stanno sopra la fascia, quindi vanno scritti in
 * chiaro. Se il fondo fosse la carta della videoteca funzionerebbe
 * con una foto sopra e sparirebbe senza. Il fondo è quindi sempre
 * l'inchiostro, con addosso un alone del colore del lettore: chi non
 * ha ancora messo niente non vede un buco, vede la sua fascia.
 *
 * ---------------------------------------------------------------
 * L'ALTERNANZA
 *
 * Dissolvenza lenta, sei secondi per immagine, e un ingrandimento
 * quasi impercettibile mentre sta ferma — è quello che fa sembrare
 * viva una fotografia che non si muove. Con una sola immagine non
 * parte niente: un'animazione che ha una cosa sola da mostrare è solo
 * batteria consumata.
 *
 * ⚠️ Chi ha chiesto meno animazioni la vede ferma. `prefers-reduced-motion`
 * non è una preferenza estetica: per alcune persone il movimento
 * ripetuto in cima alla pagina dà nausea, e questa è l'unica cosa del
 * sito che si muove da sola per sempre.
 */

const PAUSA = 6000;

export default function Striscione({ immagini = [], colore, alto = false, children }) {
  const [indice, setIndice] = useState(0);

  // La preferenza si legge una volta sola, al primo render, e non
  // dentro un effetto: scriverla in un effetto vorrebbe dire disegnare
  // prima la fascia in movimento e poi fermarla, cioè far partire
  // proprio l'animazione che qualcuno ha chiesto di non vedere.
  const [ferma, setFerma] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );

  const quante = immagini.length;

  useEffect(() => {
    const domanda = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (!domanda) return undefined;

    const ascolta = (e) => setFerma(e.matches);

    domanda.addEventListener("change", ascolta);

    return () => domanda.removeEventListener("change", ascolta);
  }, []);

  useEffect(() => {
    if (quante < 2 || ferma) return undefined;

    const orologio = setInterval(() => setIndice((i) => i + 1), PAUSA);

    return () => clearInterval(orologio);
  }, [quante, ferma]);

  // Il contatore cresce all'infinito e il resto della divisione lo
  // riporta dentro. È il modo di non dover rimettere a posto l'indice
  // quando si toglie un'immagine: senza, chi ne aveva tre e ne toglie
  // due vedrebbe la fascia nera finché il giro non torna a zero.
  const corrente = quante ? indice % quante : 0;

  const tinta = coloreLettore(colore);

  return (
    <div
      className={`relative overflow-hidden bg-quaderno-inchiostro ${
        alto ? "h-44 sm:h-60" : "h-36 sm:h-52"
      }`}
    >
      {/* L'alone del colore: si vede solo quando non c'è una foto
          sopra, ed è quello che rende la fascia vuota «di qualcuno»
          invece che spenta. */}
      <div className={`absolute inset-0 opacity-40 ${tinta.pallino} blur-2xl`} aria-hidden="true" />

      {immagini.map((id, posto) => (
        <img
          key={id}
          src={urlStriscione(id)}
          alt=""
          // La prima si carica subito perché è quello che si vede
          // aprendo; le altre aspettano il loro turno.
          loading={posto === 0 ? "eager" : "lazy"}
          aria-hidden="true"
          // Le due durate sono diverse e devono restare diverse: la
          // dissolvenza dura un secondo — è un cambio, e un cambio
          // lungo sei secondi sembra un difetto di caricamento —
          // mentre l'ingrandimento dura quanto la posa, perché il suo
          // lavoro è non farsi accorgere. Scritte in stile e non in
          // classi perché Tailwind ha una durata sola per elemento, e
          // la seconda cancellerebbe la prima.
          style={{ transition: "opacity 1000ms ease, transform 6000ms ease-out" }}
          className={`absolute inset-0 h-full w-full object-cover ${
            posto === corrente ? "opacity-100" : "opacity-0"
          } ${!ferma && posto === corrente ? "scale-105" : "scale-100"}`}
        />
      ))}

      {/* La velatura che tiene leggibile quello che ci sta sopra.
          Dal basso e non uniforme: una foto coperta da un grigio
          uniforme smette di essere una foto. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
      />

      {children}

      {/* I pallini: dicono quante immagini ci sono e a che punto è il
          giro. Con una sola non compaiono — non c'è nessun giro. */}
      {quante > 1 && (
        <div className="absolute bottom-2 right-3 flex gap-1.5" aria-hidden="true">
          {immagini.map((id, posto) => (
            <span
              key={id}
              className={`h-1.5 rounded-full transition-all duration-base ${
                posto === corrente ? "w-4 bg-white" : "w-1.5 bg-white/45"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
