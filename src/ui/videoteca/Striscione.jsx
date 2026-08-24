import { useEffect, useRef, useState } from "react";
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
 *
 * ---------------------------------------------------------------
 * IL PUNTO DI FUOCO
 *
 * Un'immagine larga il doppio della fascia ci entra per metà, e
 * QUALE metà non lo decideva nessuno: era sempre il centro. Su una
 * copertina il centro è la pancia del personaggio. Ogni immagine si
 * porta quindi dietro due percentuali — le stesse di `object-position`
 * — e in modalità spostamento si trascinano col dito.
 *
 * Il conto del trascinamento passa dalla misura VERA dell'immagine
 * (`naturalWidth`/`naturalHeight`): quanto si può spostare dipende da
 * quanta immagine avanza fuori dalla fascia, e quello cambia da una
 * foto all'altra. Senza, lo stesso gesto sposterebbe una foto di
 * pochissimo e un'altra da un bordo all'altro.
 */

const PAUSA = 6000;

const CENTRO = { x: 50, y: 50 };

export default function Striscione({
  immagini = [],
  fuochi = {},
  colore,
  alto = false,
  // In spostamento la giostra si ferma, resta la prima immagine e il
  // dito la trascina. Chi mostra la fascia decide quando: qui dentro
  // non c'è nessun bottone.
  spostando = false,
  alSpostato,
  children
}) {
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
    if (quante < 2 || ferma || spostando) return undefined;

    const orologio = setInterval(() => setIndice((i) => i + 1), PAUSA);

    return () => clearInterval(orologio);
  }, [quante, ferma, spostando]);

  // Il contatore cresce all'infinito e il resto della divisione lo
  // riporta dentro. È il modo di non dover rimettere a posto l'indice
  // quando si toglie un'immagine: senza, chi ne aveva tre e ne toglie
  // due vedrebbe la fascia nera finché il giro non torna a zero.
  const corrente = quante ? indice % quante : 0;

  const tinta = coloreLettore(colore);

  /* ---------- Il trascinamento ---------- */

  const cornice = useRef(null);
  const immagineCorrente = useRef(null);

  // Mentre il dito è giù il fuoco vive qui e non nel server: si vede
  // la foto seguire il dito, e solo al rilascio si salva.
  const [trascinato, setTrascinato] = useState(null);
  const presa = useRef(null);

  const fuocoDi = (id) => {
    if (trascinato && trascinato.id === id) return trascinato;

    return fuochi[id] ?? CENTRO;
  };

  function prendi(e) {
    if (!spostando || !quante) return;

    // I tasti che stanno SOPRA la fascia — «Fatto», i pallini per
    // cambiare immagine — non sono presa. Senza questo controllo il
    // contenitore cattura il puntatore e il click non arriva mai al
    // bottone: si preme «Fatto» e non succede niente.
    if (e.target.closest("button")) return;

    const foto = immagineCorrente.current;
    const riquadro = cornice.current?.getBoundingClientRect();

    if (!foto?.naturalWidth || !riquadro) return;

    // Quanta immagine avanza fuori dalla fascia, nei due sensi. Con
    // `object-cover` la foto viene ingrandita fino a coprire, quindi
    // la scala è la più grande delle due.
    const scala = Math.max(
      riquadro.width / foto.naturalWidth,
      riquadro.height / foto.naturalHeight
    );

    presa.current = {
      id: immagini[corrente],
      partenza: fuocoDi(immagini[corrente]),
      x: e.clientX,
      y: e.clientY,
      avanzoX: foto.naturalWidth * scala - riquadro.width,
      avanzoY: foto.naturalHeight * scala - riquadro.height
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function muovi(e) {
    const p = presa.current;

    if (!p) return;

    // Il dito e l'immagine vanno nello stesso verso: trascinando in
    // basso si scopre la cima della foto, cioè la percentuale CALA.
    // Col segno invertito la foto scappa dalla parte opposta e
    // sembra rotta.
    const dentro = (v) => Math.min(100, Math.max(0, v));

    setTrascinato({
      id: p.id,
      x: p.avanzoX > 0 ? dentro(p.partenza.x - ((e.clientX - p.x) / p.avanzoX) * 100) : 50,
      y: p.avanzoY > 0 ? dentro(p.partenza.y - ((e.clientY - p.y) / p.avanzoY) * 100) : 50
    });
  }

  function lascia() {
    const p = presa.current;

    presa.current = null;

    if (!p || !trascinato) return;

    alSpostato?.(p.id, Math.round(trascinato.x), Math.round(trascinato.y));
  }

  return (
    <div
      ref={cornice}
      onPointerDown={prendi}
      onPointerMove={muovi}
      onPointerUp={lascia}
      onPointerCancel={lascia}
      className={`relative overflow-hidden bg-quaderno-inchiostro ${
        alto ? "h-44 sm:h-60" : "h-36 sm:h-52"
      } ${spostando ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
    >
      {/* L'alone del colore: si vede solo quando non c'è una foto
          sopra, ed è quello che rende la fascia vuota «di qualcuno»
          invece che spenta. */}
      <div className={`absolute inset-0 opacity-40 ${tinta.pallino} blur-2xl`} aria-hidden="true" />

      {immagini.map((id, posto) => {
        const fuoco = fuocoDi(id);

        return (
          <img
            key={id}
            ref={posto === corrente ? immagineCorrente : null}
            src={urlStriscione(id)}
            alt=""
            // La prima si carica subito perché è quello che si vede
            // aprendo; le altre aspettano il loro turno.
            loading={posto === 0 ? "eager" : "lazy"}
            aria-hidden="true"
            draggable={false}
            // Le due durate sono diverse e devono restare diverse: la
            // dissolvenza dura un secondo — è un cambio, e un cambio
            // lungo sei secondi sembra un difetto di caricamento —
            // mentre l'ingrandimento dura quanto la posa, perché il suo
            // lavoro è non farsi accorgere. Scritte in stile e non in
            // classi perché Tailwind ha una durata sola per elemento, e
            // la seconda cancellerebbe la prima.
            style={{
              transition: "opacity 1000ms ease, transform 6000ms ease-out",
              objectPosition: `${fuoco.x}% ${fuoco.y}%`
            }}
            className={`absolute inset-0 h-full w-full select-none object-cover ${
              posto === corrente ? "opacity-100" : "opacity-0"
            } ${!ferma && !spostando && posto === corrente ? "scale-105" : "scale-100"}`}
          />
        );
      })}

      {/* La velatura che tiene leggibile quello che ci sta sopra.
          Dal basso e non uniforme: una foto coperta da un grigio
          uniforme smette di essere una foto.

          Mentre si sposta sparisce: si sta scegliendo quale pezzo di
          fotografia far vedere, e sceglierlo attraverso un velo nero
          vuol dire sceglierlo male. */}
      {!spostando && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
        />
      )}

      {children}

      {/* I pallini: dicono quante immagini ci sono e a che punto è il
          giro. Con una sola non compaiono — non c'è nessun giro.

          Mentre si sposta diventano tasti: la giostra è ferma, e senza
          un modo di cambiare immagine si potrebbe sistemare solo
          quella che capita sotto. Più grandi, perché lì vanno colpiti
          col dito e non solo guardati. */}
      {quante > 1 && (
        <div
          className="absolute bottom-2 right-3 flex gap-1.5"
          aria-hidden={spostando ? undefined : "true"}
        >
          {immagini.map((id, posto) =>
            spostando ? (
              <button
                key={id}
                type="button"
                onClick={() => setIndice(posto)}
                aria-label={`Sposta l'immagine ${posto + 1}`}
                aria-pressed={posto === corrente}
                className={`h-3 rounded-full transition-all duration-base ${
                  posto === corrente ? "w-6 bg-white" : "w-3 bg-white/50 hover:bg-white/80"
                }`}
              />
            ) : (
              <span
                key={id}
                className={`h-1.5 rounded-full transition-all duration-base ${
                  posto === corrente ? "w-4 bg-white" : "w-1.5 bg-white/45"
                }`}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
