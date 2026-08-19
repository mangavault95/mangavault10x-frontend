import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScaffaleVolumi from "./ScaffaleVolumi";
import { Bottone } from "./Controlli";
import { dataIt } from "../dati/serie";
import { urlCopertina } from "../services/api";

/**
 * Alcune fonti di copertine (AnimeClick in particolare) non
 * rispondono al browser: la richiesta resta appesa senza errore, e
 * l'evento `error` non scatta mai. Senza un tempo massimo il libro
 * resterebbe un rettangolo vuoto per sempre.
 */
function useCopertina(src, attesaMax = 4000) {
  const [stato, setStato] = useState(src ? "attesa" : "assente");

  useEffect(() => {
    if (!src) {
      setStato("assente");
      return;
    }

    setStato("attesa");

    const img = new Image();
    let vivo = true;

    const scadenza = setTimeout(() => {
      if (vivo) setStato("fallita");
    }, attesaMax);

    img.onload = () => {
      if (!vivo) return;
      clearTimeout(scadenza);
      setStato(img.naturalWidth > 0 ? "pronta" : "fallita");
    };

    img.onerror = () => {
      if (!vivo) return;
      clearTimeout(scadenza);
      setStato("fallita");
    };

    // Deve controllare lo stesso indirizzo che verrà poi disegnato,
    // altrimenti misura il caricamento di un'immagine diversa.
    img.src = urlCopertina(src);

    return () => {
      vivo = false;
      clearTimeout(scadenza);
      img.onload = null;
      img.onerror = null;
    };
  }, [src, attesaMax]);

  return stato;
}

/**
 * Il piatto di copertina quando l'immagine non c'è.
 *
 * Non un riquadro grigio: una copertina rilegata con il titolo
 * impresso, così il libro resta un libro anche senza illustrazione.
 * Il colore deriva dal titolo, quindi ogni serie ne ha uno suo
 * stabile invece di cambiare a ogni ricaricamento.
 */
function PiattoCieco({ titolo, autore }) {
  const tinta =
    [...String(titolo || "?")].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex h-full w-full flex-col justify-between p-3 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${tinta} 26% 22%), hsl(${tinta} 30% 12%))`
      }}
    >
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-brass-400/50">
        MangaVault
      </span>

      <span className="font-display text-sm font-semibold leading-tight text-ink-bright/90">
        {titolo}
      </span>

      <span className="truncate text-[0.6rem] text-ink-faint">{autore || " "}</span>
    </div>
  );
}

/**
 * Una lettura in corso, resa come un libro aperto sul tavolo.
 *
 * Le serie chiuse sullo scaffale sono coste; queste sono aperte, e
 * si distinguono al primo sguardo senza bisogno di un'etichetta.
 * La copertina è ruotata come un piatto sollevato, accanto c'è il
 * blocco pagine con il numero del volume dove ti sei fermato.
 *
 * È CSS 3D, non WebGL: nessuna libreria da scaricare e gira anche
 * sui telefoni lenti.
 */
export default function LibroAperto({
  lettura,
  onAvanti,
  onIndietro,
  onLetto,
  onChiudi,
  onDroppa,
  onVaiAVolume
}) {
  const {
    titolo,
    autore,
    editore,
    copertina,
    volume,
    totali,
    posseduti,
    massimo,
    aggiornata,
    mangaId,
    inCollezione
  } = lettura;

  const alLimite = Boolean(massimo) && volume >= massimo;

  // Una serie in corso di cui possiedi meno volumi di quelli usciti:
  // il tetto è quello che hai, e conviene dirlo invece di lasciar
  // credere che i comandi siano rotti.
  const limitatoDaiPosseduti =
    Boolean(massimo) && posseduti > 0 && (!totali || posseduti < totali);

  const statoCopertina = useCopertina(copertina);

  return (
    <article
      className="group relative overflow-hidden rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl transition-all duration-base ease-settle hover:border-soft hover:shadow-float"
      style={{ perspective: "1400px" }}
    >
      {/* La luce della lampada da lettura, in alto a sinistra */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-brass-400/[0.07] blur-3xl transition-opacity duration-slow group-hover:opacity-160" />

      {/*
        Sul telefono non è una colonna. Impilate — copertina sopra, dati
        in mezzo, comandi sotto — queste schede erano alte 590 pixel
        l'una: più di mezzo schermo per una serie sola, e otto letture
        aperte facevano cinque schermate di scorrimento. Andando a capo
        da sole, copertina e dati stanno affiancati e i comandi passano
        sotto in riga invece che in colonna. Da sm in su non cambia
        niente: lì lo spazio per tenere tutt'e tre su una riga c'è.
      */}
      <div className="relative flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap sm:items-center sm:gap-7 sm:p-5">
        {/* ---------- La copertina, dritta ---------- */}
        <div className="relative w-20 shrink-0 sm:w-[7rem]">
          <div className="relative aspect-cover overflow-hidden rounded-card shadow-raised transition-transform duration-base ease-settle group-hover:scale-[1.03]">
            {statoCopertina === "pronta" ? (
              <img
                src={urlCopertina(copertina)}
                alt={titolo}
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : statoCopertina === "attesa" ? (
              <div className="h-full w-full animate-shimmer bg-glass-3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] bg-[length:200%_100%]" />
            ) : (
              <PiattoCieco titolo={titolo} autore={autore} />
            )}
          </div>
        </div>

        {/* ---------- I dati ---------- */}
        <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
          <div className="space-y-1">
            {inCollezione ? (
              <Link
                to={`/serie/${mangaId}`}
                className="block truncate font-display text-lg font-semibold text-ink-bright transition-colors duration-quick hover:text-brass-300"
              >
                {titolo}
              </Link>
            ) : (
              <p className="truncate font-display text-lg font-semibold text-ink-bright">
                {titolo}
              </p>
            )}

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
              {autore && <span className="truncate">{autore}</span>}

              {autore && editore && (
                <span aria-hidden="true" className="text-ink-faint">
                  ·
                </span>
              )}

              {editore && (
                <span className="rounded-full border border-hairline bg-glass-2 px-2 py-0.5 text-xs text-ink">
                  {editore}
                </span>
              )}
            </p>
          </div>

          {/* Il segnalibro: dove sei arrivato */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-brass-400/25 bg-brass-400/10 px-3 py-1">
              {/* Nastrino del segnalibro */}
              <svg width="9" height="14" viewBox="0 0 9 14" aria-hidden="true">
                <path d="M0 0h9v14l-4.5-3.5L0 14z" className="fill-brass-400" />
              </svg>
              <span className="font-numeric text-sm font-semibold text-brass-300">
                Volume {volume}
                {massimo ? <span className="text-brass-500/70"> / {massimo}</span> : null}
              </span>
            </span>

            {limitatoDaiPosseduti && (
              <span className="text-xs text-ink-faint">
                possiedi {posseduti}
                {totali ? ` dei ${totali} usciti` : " volumi"}
              </span>
            )}

            {aggiornata && (
              <time dateTime={aggiornata} className="text-xs text-ink-faint">
                segnato il {dataIt(aggiornata)}
              </time>
            )}
          </div>

          {/* Lo scaffale della serie, cliccabile per spostare il segnalibro */}
          {/* Lo scaffale mostra solo i volumi che hai: cliccare su uno
              che non possiedi porterebbe il segnalibro dove il tetto
              lo respingerebbe subito. */}
          <ScaffaleVolumi
            totali={massimo || totali}
            letti={lettura.volumiLetti || []}
            corrente={volume}
            onSelezionaVolume={onVaiAVolume}
            compatto
          />
        </div>

        {/* ---------- Comandi ---------- */}
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-40 sm:gap-2.5">
          <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:gap-2.5">
            <div className="flex flex-1 items-center justify-between rounded-card border border-hairline bg-glass-2 p-1 sm:w-full sm:flex-none">
            <Passo
              etichetta="Volume precedente"
              onClick={onIndietro}
              disabled={volume <= 1}
            >
              −
            </Passo>

            <span className="font-numeric text-sm font-semibold text-ink-bright">
              {volume}
            </span>

            <Passo
              etichetta="Volume successivo"
              onClick={onAvanti}
              disabled={alLimite}
            >
              +
            </Passo>
          </div>

            <Bottone onClick={onLetto} className="flex-1 sm:w-full sm:flex-none">
              {alLimite ? "Finito" : "Finito, avanti"}
            </Bottone>
          </div>

          <div className="flex items-center gap-2 sm:flex-col sm:gap-2.5">
          <button
            onClick={onChiudi}
            className="rounded-card px-3 py-1.5 text-xs text-ink-faint transition-colors duration-quick hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            Chiudi la lettura
          </button>

          <button
            onClick={onDroppa}
            className="rounded-card px-3 py-1.5 text-xs text-ink-faint transition-colors duration-quick hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
          >
            Droppa la lettura
          </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Passo({ etichetta, children, ...resto }) {
  return (
    <button
      aria-label={etichetta}
      title={etichetta}
      className="grid h-9 w-9 place-items-center rounded-lg text-lg text-ink-muted transition-all duration-tap
                 hover:bg-glass-3 hover:text-ink-bright active:scale-90
                 disabled:pointer-events-none disabled:opacity-25
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      {...resto}
    >
      {children}
    </button>
  );
}
