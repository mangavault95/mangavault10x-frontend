import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ScaffaleVolumi from "./ScaffaleVolumi";
import NoteSerie from "./NoteSerie";
import Menu from "./Menu";
import { Bottone } from "./Controlli";
import { coloreLettore } from "../dati/lettori";
import { useSessione } from "../dati/sessione";
import { dataIt, plurale } from "../dati/serie";
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
function PiattoCieco({ titolo }) {
  const tinta =
    [...String(titolo || "?")].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex h-full w-full items-center justify-center p-1.5 text-center"
      style={{
        background: `linear-gradient(150deg, hsl(${tinta} 26% 22%), hsl(${tinta} 30% 12%))`
      }}
    >
      <span className="line-clamp-3 font-display text-[0.6rem] font-semibold leading-tight text-ink-bright/90">
        {titolo}
      </span>
    </div>
  );
}

/**
 * Una lettura in corso.
 *
 * ERA ALTA TRECENTO PIXEL, ADESSO CENTOCINQUANTA. Con otto libri sul
 * tavolo la pagina era lunga cinque schermate e non se ne vedevano mai
 * più di due per volta — mentre la domanda che porta qui («a che punto
 * sono con cosa?») ha bisogno di vederli TUTTI insieme, o non è una
 * risposta.
 *
 * Quello che è stato tolto non è sparito, è stato messo dove si cerca:
 *
 *   i comandi rari (segna gli arretrati, correggi un volume, azzera,
 *   chiudi, droppa) stanno sotto i tre puntini, che è dove si va a
 *   cercare quando si vuole fare qualcosa di diverso dal solito;
 *
 *   il segnalibro e il contatore erano due oggetti che dicevano lo
 *   stesso numero in due punti diversi della scheda: adesso sono uno,
 *   `− Vol 4/12 +`, che è anche il modo in cui si pensa;
 *
 *   le note si aprono da lì e si stendono sotto la scheda, larghe
 *   quanto lei — perché una nota è testo, e il testo in una colonna da
 *   centosessanta pixel non si legge.
 *
 * Resta in chiaro solo quello che si usa ogni volta che si passa di
 * qui: dove sei, e «finito, avanti».
 */
export default function LibroAperto({
  lettura,
  onAvanti,
  onIndietro,
  onLetto,
  onLettiFinoAQui,
  onAnnullaLetto,
  onDroppa,
  onChiudi,
  onAzzera,
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

  // Il volume sotto il segnalibro risulta già finito. Succede tornando
  // indietro su uno segnato per sbaglio — ed è l'unico momento in cui
  // "non l'ho letto" vuol dire qualcosa, quindi è l'unico in cui il
  // comando compare.
  const correnteLetto = (lettura.volumiLetti || []).some(
    (n) => Number(n) === volume
  );

  // Quanti volumi resterebbero da segnare arrivando fino a qui.
  //
  // Serve al caso di una serie letta prima di iscriversi al sito:
  // sposti il segnalibro sull'ultimo volume e li segni tutti in un
  // colpo, invece di premere "Finito, avanti" venticinque volte.
  const letti = new Set((lettura.volumiLetti || []).map(Number));
  let arretratiDaSegnare = 0;

  for (let n = 1; n <= volume; n++) {
    if (!letti.has(n)) arretratiDaSegnare += 1;
  }

  // Una serie in corso di cui possiedi meno volumi di quelli usciti:
  // il tetto è quello che hai, e conviene dirlo invece di lasciar
  // credere che i comandi siano rotti.
  const limitatoDaiPosseduti =
    Boolean(massimo) && posseduti > 0 && (!totali || posseduti < totali);

  const statoCopertina = useCopertina(copertina);

  // Le note stanno chiuse finché non si chiedono: sul tavolo di
  // lettura si viene per spostare il segnalibro, non per leggere. I
  // pallini accanto al titolo però si vedono sempre, o una nota
  // scritta ieri sarebbe una cosa che esiste solo se ti ricordi di
  // andarla a cercare.
  const [noteAperte, setNoteAperte] = useState(false);
  const note = lettura.serie?.note || [];

  // Il tavolo di chi in biblioteca sta solo guardando è quello del
  // proprietario: si vede dove è arrivato e cosa ha letto, e non si
  // sposta niente. Del menu resta quello che si LEGGE — le note — e i
  // comandi spariscono invece di spegnersi: un «+» grigio su ogni
  // scheda direbbe che il sito è rotto, non che la stanza è di un altro.
  const { bibliotecaSolaLettura } = useSessione();

  const voci = [
    !bibliotecaSolaLettura &&
      arretratiDaSegnare > 1 &&
      typeof onLettiFinoAQui === "function" && {
        chiave: "arretrati",
        etichetta: `Letti tutti fino al ${volume}`,
        descrizione: `Segna in un colpo i ${arretratiDaSegnare} volumi ancora indietro.`,
        onClick: onLettiFinoAQui
      },

    !bibliotecaSolaLettura &&
      correnteLetto &&
      typeof onAnnullaLetto === "function" && {
        chiave: "annulla",
        etichetta: `Il ${volume} non l'ho letto`,
        descrizione: "Toglie dallo storico solo questo volume.",
        onClick: onAnnullaLetto
      },

    lettura.serie && !(bibliotecaSolaLettura && note.length === 0) && {
      chiave: "note",
      etichetta: note.length ? `Note (${note.length})` : "Scrivi una nota",
      descrizione: bibliotecaSolaLettura
        ? "Quello che la casa si è segnata su questa serie."
        : note.length
          ? "Rileggile o aggiungine una."
          : "Cosa vuoi ricordarti di questa serie.",
      onClick: () => setNoteAperte(true)
    },

    !bibliotecaSolaLettura &&
      typeof onAzzera === "function" && {
        chiave: "azzera",
        etichetta: "Azzera i volumi letti",
        descrizione: letti.size
          ? `Cancella ${plurale(letti.size, "volume segnato", "volumi segnati")} e riporta il segnalibro al primo.`
          : "Non c'è ancora niente da azzerare.",
        conferma: "Confermi? Si perdono tutti",
        pericolo: true,
        spenta: letti.size === 0,
        onClick: onAzzera
      },

    !bibliotecaSolaLettura &&
      typeof onChiudi === "function" && {
        chiave: "chiudi",
        etichetta: "Togli dal tavolo",
        descrizione:
          "Chiude la lettura. I volumi letti restano, e la serie torna fra quelle da aprire.",
        onClick: onChiudi
      },

    !bibliotecaSolaLettura &&
      typeof onDroppa === "function" && {
        chiave: "droppa",
        etichetta: "Droppa la lettura",
        // La differenza con quella sopra è tutta qui, e per anni non era
        // scritta da nessuna parte: i due comandi si somigliavano al
        // punto che uno dei due era stato tolto invece che spiegato.
        descrizione:
          "Come sopra, ma resta segnata come mollata: non ricompare fra quelle da aprire.",
        pericolo: true,
        onClick: onDroppa
      }
  ];

  return (
    <article className="group relative overflow-hidden rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl transition-colors duration-base ease-settle hover:border-soft">
      {/* La luce della lampada da lettura, in alto a sinistra */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-brass-400/[0.07] blur-3xl" />

      <div className="relative flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* ---------- La copertina ---------- */}
        <div className="w-14 shrink-0 sm:w-16">
          <div className="relative aspect-cover overflow-hidden rounded-card shadow-raised">
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
              <PiattoCieco titolo={titolo} />
            )}
          </div>
        </div>

        {/* ---------- Tutto il resto, in colonna ---------- */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {inCollezione ? (
                <Link
                  to={`/serie/${mangaId}`}
                  className="block truncate font-display text-[0.95rem] font-semibold leading-tight text-ink-bright transition-colors duration-quick hover:text-brass-300"
                >
                  {titolo}
                </Link>
              ) : (
                <p className="truncate font-display text-[0.95rem] font-semibold leading-tight text-ink-bright">
                  {titolo}
                </p>
              )}

              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-muted">
                <span className="truncate">
                  {[autore, editore].filter(Boolean).join(" · ") || "—"}
                </span>

                {/* I pallini dicono CHI ha scritto prima ancora di
                    aprire: è metà del motivo per cui i lettori hanno
                    un colore. */}
                {note.length > 0 && (
                  <span
                    className="flex shrink-0 gap-1"
                    title={plurale(note.length, "nota", "note")}
                  >
                    {note.map((n) => (
                      <span
                        key={n.id}
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${coloreLettore(n.colore).pallino}`}
                      />
                    ))}
                  </span>
                )}
              </p>
            </div>

            <Menu etichetta={`Altro su ${titolo}`} voci={voci} larghezza="17rem" />
          </div>

          {/* Lo scaffale mostra solo i volumi che hai: cliccare su uno
              che non possiedi porterebbe il segnalibro dove il tetto
              lo respingerebbe subito. */}
          <ScaffaleVolumi
            totali={massimo || totali}
            letti={lettura.volumiLetti || []}
            corrente={volume}
            onSelezionaVolume={bibliotecaSolaLettura ? undefined : onVaiAVolume}
            compatto
            riepilogo={false}
          />

          {/* ---------- I due comandi di ogni giorno ----------
              Il contatore È il segnalibro: erano due oggetti che
              dicevano lo stesso numero, uno col nastrino e uno con i
              tasti, a mezza scheda di distanza. */}
          <div className="mt-auto flex items-center gap-2 pt-0.5">
            {bibliotecaSolaLettura ? (
              <p className="font-numeric text-sm text-ink-muted">
                Segnalibro al volume {volume}
                {massimo ? <span className="text-ink-faint">/{massimo}</span> : null}
              </p>
            ) : (
              <>
                <div
                  className="flex shrink-0 items-center rounded-card border border-brass-400/25 bg-brass-400/10 p-0.5"
                  title={
                    (limitatoDaiPosseduti
                      ? `Possiedi ${posseduti}${totali ? ` dei ${totali} usciti` : ""}. `
                      : "") + (aggiornata ? `Segnato il ${dataIt(aggiornata)}.` : "")
                  }
                >
                  <Passo etichetta="Volume precedente" onClick={onIndietro} disabled={volume <= 1}>
                    −
                  </Passo>

                  <span className="px-1 font-numeric text-sm font-semibold text-brass-300">
                    {volume}
                    {massimo ? <span className="text-brass-500/70">/{massimo}</span> : null}
                  </span>

                  <Passo etichetta="Volume successivo" onClick={onAvanti} disabled={alLimite}>
                    +
                  </Passo>
                </div>

                <Bottone onClick={onLetto} className="min-w-0 flex-1 !px-3 !py-1.5 !text-xs">
                  {alLimite ? "Finito" : "Finito, avanti"}
                </Bottone>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Le note ----------
          Larghe quanto la scheda e non incolonnate accanto ai comandi:
          una nota è testo. Solo per le serie ancora in collezione — una
          nota si attacca a un'opera, e se l'opera non c'è più non ha
          dove stare. */}
      {noteAperte && lettura.serie && (
        <div className="relative border-t border-hairline px-3 pb-3 pt-3 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink-muted">
              {note.length ? plurale(note.length, "nota", "note") : "Note"}
            </span>

            <button
              onClick={() => setNoteAperte(false)}
              className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors duration-quick hover:text-ink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
            >
              chiudi
            </button>
          </div>

          <NoteSerie serie={lettura.serie} compatto />
        </div>
      )}
    </article>
  );
}

function Passo({ etichetta, children, ...resto }) {
  return (
    <button
      aria-label={etichetta}
      title={etichetta}
      className="grid h-7 w-7 place-items-center rounded-lg text-base text-ink-muted transition-all duration-tap
                 hover:bg-glass-3 hover:text-ink-bright active:scale-90
                 disabled:pointer-events-none disabled:opacity-25
                 [@media(hover:none)]:h-9 [@media(hover:none)]:w-9
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      {...resto}
    >
      {children}
    </button>
  );
}
