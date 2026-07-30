import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { urlCopertina } from "../services/api";

/**
 * Una copertina che reagisce al mouse.
 *
 * Tre micro-interazioni, tutte con lo stesso scopo: far sembrare la
 * copertina un oggetto fisico invece che un'immagine incollata.
 *
 *  1. Inclinazione — il volume ruota di pochi gradi seguendo il
 *     puntatore, come se lo stessi girando in mano. Massimo 8°: oltre
 *     si legge come un effetto, non come un oggetto.
 *  2. Luce — un riflesso che scorre sulla plastica, e un alone che
 *     segue il puntatore invece di stare fermo al centro.
 *  3. Arrivo — l'immagine sfuma dentro quando ha finito di scaricare,
 *     sopra un fondo che occupa già lo spazio giusto: la griglia non
 *     salta mai.
 *
 * Su touch l'inclinazione è disattivata (non c'è un puntatore da
 * seguire e su mobile costa solo batteria), e chi ha chiesto al
 * sistema meno animazioni ottiene una copertina ferma.
 */

const GRADI_MAX = 8;

function preferisceMenoMovimento() {
  if (typeof window === "undefined" || !window.matchMedia) return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Copertina({
  src,
  alt,
  className = "",
  inclina = true,
  priorita = false
}) {
  const contenitore = useRef(null);
  const fotogramma = useRef(0);

  const [caricata, setCaricata] = useState(false);
  const [rotta, setRotta] = useState(false);

  // La decisione si prende una volta sola al primo render, non dentro
  // un effetto: leggerla dopo il montaggio costringerebbe ogni
  // copertina della griglia a disegnarsi due volte per una risposta
  // che non cambia mai.
  const [interattiva] = useState(
    () => inclina && window.matchMedia("(pointer: fine)").matches && !preferisceMenoMovimento()
  );

  // Le coordinate vanno in variabili CSS invece che nello stato React:
  // muovere il mouse non deve far ri-renderizzare l'intera griglia.
  const alMovimento = useCallback(
    (e) => {
      if (!interattiva) return;

      const nodo = contenitore.current;
      if (!nodo) return;

      cancelAnimationFrame(fotogramma.current);

      const { clientX, clientY } = e;

      fotogramma.current = requestAnimationFrame(() => {
        const r = nodo.getBoundingClientRect();

        // Da -0.5 a 0.5 rispetto al centro della copertina
        const x = (clientX - r.left) / r.width - 0.5;
        const y = (clientY - r.top) / r.height - 0.5;

        // L'asse Y del mouse comanda la rotazione X, e viceversa:
        // è quello che rende il movimento "giusto" all'occhio.
        nodo.style.setProperty("--rot-x", `${(-y * GRADI_MAX).toFixed(2)}deg`);
        nodo.style.setProperty("--rot-y", `${(x * GRADI_MAX).toFixed(2)}deg`);
        nodo.style.setProperty("--luce-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        nodo.style.setProperty("--luce-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    },
    [interattiva]
  );

  const allUscita = useCallback(() => {
    cancelAnimationFrame(fotogramma.current);

    const nodo = contenitore.current;
    if (!nodo) return;

    nodo.style.setProperty("--rot-x", "0deg");
    nodo.style.setProperty("--rot-y", "0deg");
  }, []);

  useEffect(() => () => cancelAnimationFrame(fotogramma.current), []);

  // Le immagini passano dal ponte del backend: AnimeClick da sola
  // impiega secondi a rispondere, e in cache la stessa copertina
  // torna in millisecondi. Serve anche a leggerne i colori altrove,
  // cosa impossibile in diretta perché le fonti non mandano CORS.
  const indirizzo = useMemo(() => urlCopertina(src), [src]);

  const senzaImmagine = !src || rotta;

  return (
    <div
      className={`group/cop relative aspect-cover w-full [perspective:1000px] ${className}`}
      onPointerMove={alMovimento}
      onPointerLeave={allUscita}
      ref={contenitore}
      style={{ "--rot-x": "0deg", "--rot-y": "0deg", "--luce-x": "50%", "--luce-y": "50%" }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-card border border-hairline bg-void shadow-raised
                   transition-[transform,box-shadow] duration-base ease-settle will-change-transform
                   [transform:rotateX(var(--rot-x))_rotateY(var(--rot-y))]
                   group-hover/cop:shadow-float"
      >
        {senzaImmagine ? (
          <SegnapostoCopertina titolo={alt} />
        ) : (
          <>
            {/* Il fondo sfocato riempie i bordi quando la copertina non
                ha esattamente il rapporto 2:3 — senza, restano due bande
                nere ai lati che fanno sembrare l'immagine sbagliata. */}
            <img
              src={indirizzo}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-slow ${
                caricata ? "opacity-40" : "opacity-0"
              }`}
            />

            <img
              src={indirizzo}
              alt={alt}
              loading={priorita ? "eager" : "lazy"}
              decoding="async"
              // Minuscolo di proposito: React 18 non conosce la forma
              // camelCase e la scarterebbe con un avviso in console.
              fetchpriority={priorita ? "high" : "auto"}
              onLoad={() => setCaricata(true)}
              onError={() => setRotta(true)}
              className={`relative h-full w-full object-contain transition-[opacity,transform] duration-slow ease-settle
                ${caricata ? "opacity-100" : "opacity-0 scale-[0.97]"}`}
            />
          </>
        )}

        {/* Alone che segue il puntatore: la luce viene da dove guardi. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-base group-hover/cop:opacity-100"
          style={{
            background:
              "radial-gradient(220px circle at var(--luce-x) var(--luce-y), rgba(250,204,21,0.16), transparent 62%)"
          }}
        />

        {/* Riflesso che attraversa la copertina all'ingresso del mouse */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-1/2 -top-1/3 h-[180%] w-2/5 rotate-[20deg] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 blur-md
                     transition-[transform,opacity] duration-[900ms] ease-settle
                     group-hover/cop:translate-x-[260%] group-hover/cop:opacity-100"
        />

        {/* Bordo interno chiaro: senza, su fondo scuro la copertina
            sembra ritagliata male invece che stampata. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-inset ring-white/10"
        />
      </div>
    </div>
  );
}

/**
 * Quando la copertina manca o l'URL è morto.
 *
 * Non un riquadro vuoto: le iniziali del titolo su carta scura. Una
 * scheda senza immagine resta comunque riconoscibile nella griglia.
 */
function SegnapostoCopertina({ titolo }) {
  const iniziali = (titolo || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-alcove to-shelf">
      <span className="font-display text-3xl font-semibold text-brass-400/30">
        {iniziali}
      </span>
    </div>
  );
}
