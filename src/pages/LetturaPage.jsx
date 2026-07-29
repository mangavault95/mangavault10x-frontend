import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import Progresso from "../ui/Progresso";
import { Bottone } from "../ui/Controlli";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import {
  addReadingHistory,
  deleteReadingSession,
  getReadingHistory,
  getReadingSessions,
  updateReadingSession
} from "../services/api";
import { dataIt } from "../dati/serie";

/**
 * A che punto sono le letture.
 *
 * Due elenchi con ruoli diversi: sopra quello che stai leggendo
 * adesso — poche voci, ognuna con i comandi per avanzare — sotto lo
 * storico, che è solo memoria e non si tocca.
 *
 * I comandi cambiano il numero subito sullo schermo e poi lo mandano
 * al server. Aspettare la risposta di Render per veder salire un
 * numero da 3 a 4 rende ogni click una piccola attesa; se il salvataggio
 * fallisce il numero torna indietro e compare l'avviso.
 */
export default function LetturaPage() {
  const { serie } = useCollezione();

  const sessioni = useRisorsa(getReadingSessions);
  const storico = useRisorsa(getReadingHistory);

  const [problema, setProblema] = useState(null);

  // Le sessioni salvano una copia di titolo e copertina, che col tempo
  // invecchia. Se la serie esiste ancora in collezione vincono i dati
  // veri; la copia resta come ripiego per le serie cancellate.
  const attive = useMemo(() => {
    const elenco = sessioni.dati || [];

    return elenco.map((s) => {
      const collegata = serie.find((m) => String(m.id) === String(s.manga_id));

      return {
        idSessione: s.id,
        mangaId: s.manga_id,
        titolo: collegata?.titolo || s.titolo,
        autore: collegata?.autore || s.autore,
        copertina: collegata?.copertina || s.coverurl,
        totali: collegata?.totali ?? (Number(s.volumitotali) || null),
        volume: Number(s.volume) || 1,
        aggiornata: s.updated_at,
        inCollezione: Boolean(collegata)
      };
    });
  }, [sessioni.dati, serie]);

  /* -------------------- Azioni -------------------- */

  async function cambiaVolume(sessione, delta) {
    const nuovo = Math.max(1, sessione.volume + delta);

    if (nuovo === sessione.volume) return;

    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).map((s) =>
        s.id === sessione.idSessione ? { ...s, volume: nuovo } : s
      )
    );

    try {
      await updateReadingSession(sessione.mangaId, nuovo);
    } catch {
      setProblema("Non sono riuscito a salvare il volume. Ricarico i dati.");
      sessioni.ricarica();
    }
  }

  /**
   * "Finito questo volume": segna il volume nello storico e fa
   * avanzare la sessione. Sono due gesti che nella realtà sono uno
   * solo, quindi qui è un bottone solo.
   */
  async function segnaLetto(sessione) {
    setProblema(null);

    try {
      await addReadingHistory({
        manga_id: sessione.mangaId,
        titolo: sessione.titolo,
        autore: sessione.autore,
        coverurl: sessione.copertina,
        volume: sessione.volume
      });

      await cambiaVolume(sessione, 1);

      storico.ricarica();
    } catch {
      setProblema("Il volume non è stato registrato nello storico.");
    }
  }

  async function chiudi(sessione) {
    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== sessione.idSessione)
    );

    try {
      await deleteReadingSession(sessione.mangaId);
    } catch {
      setProblema("Non sono riuscito a chiudere la lettura.");
      sessioni.ricarica();
    }
  }

  return (
    <Pagina
      occhiello="Letture"
      titolo="In lettura"
      sommario="Dove sei arrivato, e cosa hai già letto."
    >
      <div className="space-y-14">
        {problema && (
          <p
            role="alert"
            className="rounded-card border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember"
          >
            {problema}
          </p>
        )}

        {/* ---------- Attive ---------- */}
        <Sezione titolo="Adesso">
          {sessioni.errore ? (
            <Errore errore={sessioni.errore} riprova={sessioni.ricarica} />
          ) : sessioni.inCorso && !sessioni.dati ? (
            <CaricamentoElenco quante={3} />
          ) : attive.length ? (
            <ul className="space-y-3">
              {attive.map((s) => (
                <li key={s.idSessione}>
                  <RigaLettura
                    sessione={s}
                    onAvanti={() => cambiaVolume(s, 1)}
                    onIndietro={() => cambiaVolume(s, -1)}
                    onLetto={() => segnaLetto(s)}
                    onChiudi={() => chiudi(s)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Vuoto
              titolo="Nessuna lettura aperta"
              testo="Quando cominci una serie compare qui, con il volume a cui sei arrivato."
              azione={
                <Link to="/collezione">
                  <Bottone variante="secondario">Scegli cosa leggere</Bottone>
                </Link>
              }
            />
          )}
        </Sezione>

        {/* ---------- Storico ---------- */}
        <Sezione
          titolo="Già letti"
          extra={
            storico.dati?.length ? (
              <span className="font-numeric text-sm text-ink-muted">
                ultimi {storico.dati.length}
              </span>
            ) : null
          }
        >
          {storico.errore ? (
            <Errore errore={storico.errore} riprova={storico.ricarica} />
          ) : storico.inCorso && !storico.dati ? (
            <CaricamentoElenco quante={4} />
          ) : storico.dati?.length ? (
            <ol className="space-y-1">
              {storico.dati.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-4 rounded-card px-3 py-2.5 transition-colors duration-quick hover:bg-glass-1"
                >
                  <div className="w-8 shrink-0">
                    <Copertina src={v.coverurl} alt="" inclina={false} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-bright">{v.titolo}</p>
                    <p className="font-numeric text-xs text-ink-faint">
                      Volume {v.volume}
                    </p>
                  </div>

                  <time
                    dateTime={v.read_at}
                    className="shrink-0 text-xs text-ink-muted"
                  >
                    {dataIt(v.read_at)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <Vuoto
              titolo="Lo storico è vuoto"
              testo="Ogni volume che segni come finito finisce qui, con la data."
            />
          )}
        </Sezione>
      </div>
    </Pagina>
  );
}

/* ==================================================
   RIGA DI UNA LETTURA ATTIVA
   ================================================== */

function RigaLettura({ sessione, onAvanti, onIndietro, onLetto, onChiudi }) {
  const pct = sessione.totali
    ? Math.min(100, Math.round((sessione.volume / sessione.totali) * 100))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl transition-colors duration-base hover:border-soft">
      <div className="w-16 shrink-0">
        <Copertina src={sessione.copertina} alt={sessione.titolo} />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {sessione.inCollezione ? (
          <Link
            to={`/serie/${sessione.mangaId}`}
            className="block truncate font-medium text-ink-bright transition-colors duration-quick hover:text-brass-300"
          >
            {sessione.titolo}
          </Link>
        ) : (
          <p className="truncate font-medium text-ink-bright">{sessione.titolo}</p>
        )}

        <p className="font-numeric text-xs text-ink-muted">
          Volume {sessione.volume}
          {sessione.totali ? ` di ${sessione.totali}` : ""}
          {sessione.aggiornata && ` · aggiornato il ${dataIt(sessione.aggiornata)}`}
        </p>

        <Progresso valore={pct} sottile />
      </div>

      {/* Il contatore: due passi da un volume, non un campo da riempire */}
      <div className="flex items-center gap-1 rounded-card border border-hairline bg-glass-2 p-1">
        <BottoneTondo
          etichetta="Volume precedente"
          onClick={onIndietro}
          disabled={sessione.volume <= 1}
        >
          −
        </BottoneTondo>

        <span className="min-w-[2.5rem] text-center font-numeric text-sm font-semibold text-ink-bright">
          {sessione.volume}
        </span>

        <BottoneTondo etichetta="Volume successivo" onClick={onAvanti}>
          +
        </BottoneTondo>
      </div>

      <div className="flex items-center gap-2">
        <Bottone onClick={onLetto}>Finito</Bottone>

        <Bottone variante="fantasma" onClick={onChiudi} title="Chiudi questa lettura">
          Chiudi
        </Bottone>
      </div>
    </div>
  );
}

function BottoneTondo({ etichetta, children, ...resto }) {
  return (
    <button
      aria-label={etichetta}
      title={etichetta}
      className="grid h-8 w-8 place-items-center rounded-lg text-lg text-ink-muted transition-all duration-quick
                 hover:bg-glass-3 hover:text-ink-bright active:scale-90
                 disabled:pointer-events-none disabled:opacity-30
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      {...resto}
    >
      {children}
    </button>
  );
}
