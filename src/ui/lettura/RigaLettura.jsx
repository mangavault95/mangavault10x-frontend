import { useState } from "react";
import { Link } from "react-router";
import Copertina from "../Copertina";
import Icon from "../../app/Icon";
import { Bottone } from "../Controlli";
import { VotoStelle } from "../AzioniSerie";
import NoteSerie from "../NoteSerie";
import Foglio from "../Foglio";
import { plurale } from "../../dati/serie";

/* ==================================================
   FINE LETTURA: IL VOTO
   ================================================== */

/**
 * L'ultimo volume che possiedi di una serie: la domanda giusta è «che
 * voto le dai?», con le stesse stelle usate ovunque. (Fino al 04/10/2026
 * c'erano anche i coriandoli: tolti, era scena e basta.)
 */
export function ModaleCompletamento({ lettura, serie, onVotoCambiato, onChiudi }) {
  // Un foglio dal basso e non più una finestra al centro (13/11/2026):
  // le stelle arrivano sotto il pollice, e chi non vuole votare adesso
  // lo trascina via.
  return (
    <Foglio
      titolo="Finita"
      sotto={`Hai finito ${lettura.titolo}.`}
      larghezza="sm:max-w-sm"
      onChiudere={onChiudi}
      azioni={
        <Bottone onClick={onChiudi} className="min-h-12 flex-1">
          Fatto
        </Bottone>
      }
    >
      {serie && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-wider text-ink-faint">Che voto le dai?</p>
          <VotoStelle serie={serie} onCambiato={onVotoCambiato} dimensione={30} />
        </div>
      )}
    </Foglio>
  );
}

/* ==================================================
   UNA LETTURA APERTA
   ================================================== */

/**
 * Una serie in lettura, ridotta a quello che serve guardandola:
 * a che volume sei, quanti ne hai letti, e il gesto che si fa davvero —
 * «Finito il 17». Il − e il + spostano il segnalibro senza segnare
 * niente (per quando lo si è spostato a mano, o per tornare indietro).
 *
 * Tutto il resto sta nel foglio dietro i tre puntini (`FoglioLettura`):
 * una riga che porta otto comandi non si legge più.
 */
export function RigaLettura({ lettura, principale, ultima, soloLettura, onAvanti, onIndietro, onLetto, onGestisci }) {
  const { volume, massimo, titolo } = lettura;

  // Il −/+ sposta il segnalibro senza segnare niente e si usa di rado:
  // sta chiuso, e si apre toccando il numero del volume. Chiuso, il
  // tasto «Finito» ha tutta la larghezza della riga.
  const [segnalibro, setSegnalibro] = useState(false);
  const letti = new Set(lettura.volumiLetti.map(Number)).size;
  const percento = massimo ? Math.min(100, Math.round((letti / massimo) * 100)) : null;
  const eUltimo = massimo ? volume >= massimo : false;
  const giaLetto = lettura.volumiLetti.map(Number).includes(volume);

  return (
    <div className="flex gap-3 rounded-card bg-alcove p-3">
      <Link to={`/serie/${lettura.mangaId}`} className="w-[3.25rem] shrink-0 self-start">
        <Copertina src={lettura.copertina} alt="" inclina={false} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* Il server le manda dalla più recente: dirlo spiega perché
                una sola ha il tasto pieno. */}
            {ultima && (
              <p className="text-micro font-medium uppercase tracking-[0.14em] text-brass-400">
                Ultima lettura
              </p>
            )}

            {/* Due righe: «Blood-Crawling Princess of…» perdeva la metà
                del nome, e il nome è quello che si cerca. */}
            <Link
              to={`/serie/${lettura.mangaId}`}
              className="line-clamp-2 font-semibold leading-snug text-ink-bright"
            >
              {titolo}
            </Link>
            <p className="mt-0.5 text-fine text-ink-muted">
              {!soloLettura ? (
                <button
                  type="button"
                  onClick={() => setSegnalibro((s) => !s)}
                  aria-expanded={segnalibro}
                  aria-label={`Volume ${volume}: tocca per spostare il segnalibro`}
                  className="underline decoration-ink-faint decoration-dotted underline-offset-4"
                >
                  Volume <span className="font-numeric font-semibold text-ink-bright">{volume}</span>
                </button>
              ) : (
                <>
                  Volume <span className="font-numeric font-semibold text-ink-bright">{volume}</span>
                </>
              )}
              {massimo ? ` di ${massimo}` : ""}
              {" · "}
              {plurale(letti, "letto", "letti")}
            </p>
          </div>

          {!soloLettura && (
            <button
              type="button"
              onClick={onGestisci}
              aria-label={`Gestisci ${titolo}: voto, note, droppa e altro`}
              className="-mr-1 -mt-1 bersaglio grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-quick hover:bg-glass-2 hover:text-ink-bright"
            >
              <Icon nome="puntini" dimensione={18} />
            </button>
          )}
        </div>

        {percento !== null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-bright/[0.08]">
            <div className="h-full rounded-full bg-brass-400" style={{ width: `${percento}%` }} />
          </div>
        )}

        {!soloLettura && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className={`${segnalibro ? "flex" : "hidden"} shrink-0 items-center rounded-card bg-glass-2`}>
              <button
                type="button"
                onClick={onIndietro}
                disabled={volume <= 1}
                aria-label="Segnalibro al volume prima"
                className="grid h-10 w-10 place-items-center text-lg text-ink transition-opacity duration-quick disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[2.2ch] text-center font-numeric font-semibold text-ink-bright">{volume}</span>
              <button
                type="button"
                onClick={onAvanti}
                disabled={eUltimo}
                aria-label="Segnalibro al volume dopo"
                className="grid h-10 w-10 place-items-center text-lg text-ink transition-opacity duration-quick disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={onLetto}
              disabled={giaLetto && eUltimo}
              className={`h-10 min-w-0 flex-1 truncate rounded-card px-3 text-sm font-semibold transition-transform duration-quick active:scale-[0.98] disabled:opacity-50 ${
                principale ? "insegna" : "border border-hairline bg-glass-2 text-ink-bright hover:border-brass-400/40"
              }`}
            >
              {giaLetto && eUltimo ? "Finita" : eUltimo ? `Finito il ${volume}, l'ultimo` : `Finito il ${volume}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================================================
   IL FOGLIO DI GESTIONE
   ================================================== */

/**
 * Tutto quello che si fa a una lettura oltre a «finito», in un posto
 * solo. Sale dal basso sul telefono, come i fogli delle app.
 *
 * I due comandi che fanno perdere qualcosa — droppa e ricomincia —
 * chiedono un secondo tocco, e ognuno dice cosa lascia indietro: era il
 * problema di «chiudi» e «droppa» quando stavano vicini senza spiegarsi.
 */
export function FoglioLettura({
  lettura,
  onChiudi,
  onVaiAVolume,
  onLettiFinoAQui,
  onAnnullaLetto,
  onAzzera,
  onTogli,
  onDroppa,
  onVotoCambiato
}) {
  const [confermando, setConfermando] = useState(null);
  const [noteAperte, setNoteAperte] = useState(false);
  const [salto, setSalto] = useState("");

  const { volume, massimo, serie } = lettura;
  const giaLetto = lettura.volumiLetti.map(Number).includes(volume);
  const note = serie?.note?.length ?? 0;

  function esegui(azione, { conferma = false, chiave = null } = {}) {
    if (conferma && confermando !== chiave) {
      setConfermando(chiave);
      return;
    }

    azione(lettura);
    onChiudi();
  }

  function vai(e) {
    e.preventDefault();

    const n = Number(salto);

    if (!Number.isInteger(n) || n < 1) return;

    onVaiAVolume(lettura, massimo ? Math.min(massimo, n) : n);
    onChiudi();
  }

  const voci = [
    volume > 1 && {
      chiave: "fino",
      etichetta: `Letti tutti fino al ${volume}`,
      descrizione: "Per le serie cominciate prima del sito: segna in un colpo i volumi indietro.",
      azione: onLettiFinoAQui
    },
    giaLetto && {
      chiave: "annulla",
      etichetta: `Il ${volume} non l'ho letto`,
      descrizione: "Toglie il volume dai letti; il segnalibro resta qui.",
      azione: onAnnullaLetto
    },
    {
      chiave: "togli",
      etichetta: "Togli da «Sto leggendo»",
      descrizione: "I volumi letti restano; la riapri quando vuoi.",
      azione: onTogli
    },
    {
      chiave: "droppa",
      etichetta: "Droppa",
      descrizione: "La molli: finisce fra le mollate in fondo alla pagina, da dove si riprende.",
      azione: onDroppa,
      conferma: true,
      pericolo: true
    },
    lettura.volumiLetti.length > 0 && {
      chiave: "azzera",
      etichetta: "Ricomincia da capo",
      descrizione: "Cancella i volumi letti di questa serie e torna al volume 1.",
      azione: onAzzera,
      conferma: true,
      pericolo: true
    }
  ].filter(Boolean);

  return (
    <Foglio titolo={`Gestisci ${lettura.titolo}`} titoloNascosto senzaMargini larghezza="sm:max-w-md" onChiudere={onChiudi}>
      <div className="px-5 pb-1">
          <div className="flex items-center gap-3.5">
            <div className="w-11 shrink-0">
              <Copertina src={lettura.copertina} alt="" inclina={false} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-ink-bright">{lettura.titolo}</p>
              <p className="text-sm text-ink-muted">
                Segnalibro al volume <span className="font-numeric text-ink-bright">{volume}</span>
                {massimo ? ` di ${massimo}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi"
              className="bersaglio grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-glass-2 hover:text-ink-bright"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </div>

          {/* Il voto: sta in cima perché è la cosa che si viene a fare
              più spesso dopo «finito». */}
          {serie && (
            <div className="mt-5 flex items-center justify-between rounded-card bg-shelf px-4 py-3">
              <span className="text-sm font-medium text-ink-bright">Il tuo voto</span>
              <VotoStelle serie={serie} dimensione={22} onCambiato={(nuovo) => onVotoCambiato(lettura, nuovo)} />
            </div>
          )}

          {/* Il salto: per spostare il segnalibro lontano senza premere
              «+» venti volte. Non segna niente come letto. */}
          <form onSubmit={vai} className="mt-3 flex items-center gap-2 rounded-card bg-shelf px-4 py-2.5">
            <label htmlFor="salto-volume" className="flex-1 text-sm font-medium text-ink-bright">
              Vai al volume
            </label>
            <input
              id="salto-volume"
              type="number"
              inputMode="numeric"
              min="1"
              max={massimo || undefined}
              value={salto}
              onChange={(e) => setSalto(e.target.value)}
              placeholder={String(volume)}
              className="w-16 rounded-lg bg-alcove px-2 py-1.5 text-center font-numeric text-ink-bright placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brass-400"
            />
            <button type="submit" className="rounded-lg bg-glass-2 px-3 py-1.5 text-sm font-semibold text-ink-bright">
              Vai
            </button>
          </form>

          <ul className="mt-3 divide-y divide-hairline rounded-card bg-shelf">
            {serie && (
              <li>
                <button
                  type="button"
                  onClick={() => setNoteAperte((a) => !a)}
                  aria-expanded={noteAperte}
                  className="w-full px-4 py-3 text-left"
                >
                  <span className="block text-sm font-semibold text-ink-bright">
                    {note ? `Note (${note})` : "Scrivi una nota"}
                  </span>
                  <span className="block text-xs text-ink-muted">Cosa vuoi ricordarti di questa serie.</span>
                </button>

                {noteAperte && (
                  <div className="px-4 pb-4">
                    <NoteSerie serie={serie} compatto />
                  </div>
                )}
              </li>
            )}

            {voci.map((v) => {
              const inConferma = confermando === v.chiave;

              return (
                <li key={v.chiave}>
                  <button
                    type="button"
                    onClick={() => esegui(v.azione, { conferma: v.conferma, chiave: v.chiave })}
                    className="w-full px-4 py-3 text-left"
                  >
                    <span className={`block text-sm font-semibold ${v.pericolo ? "text-ember" : "text-ink-bright"}`}>
                      {inConferma ? "Sicuro? Tocca di nuovo" : v.etichetta}
                    </span>
                    <span className="block text-xs text-ink-muted">{v.descrizione}</span>
                  </button>
                </li>
              );
            })}
          </ul>
      </div>
    </Foglio>
  );
}
