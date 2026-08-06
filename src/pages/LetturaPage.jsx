import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import LibroAperto from "../ui/LibroAperto";
import ScaffaleVolumi from "../ui/ScaffaleVolumi";
import ScaffaleCoste from "../ui/ScaffaleCoste";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { VotoStelle } from "../ui/AzioniSerie";
import Sovrapposizione from "../ui/Sovrapposizione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { dataIt, plurale, tettoLettura } from "../dati/serie";
import {
  addReadingHistory,
  deleteReadingHistory,
  deleteReadingSession,
  getReadingHistory,
  getReadingSessions,
  getStoricoPerSerie,
  saveReadingSession,
  updateManga,
  updateReadingSession
} from "../services/api";

const CRONOLOGIA_VISIBILE = 20;

/**
 * Le letture, in tre tempi.
 *
 *   Adesso    — i libri aperti sul tavolo, con il segnalibro
 *   Scaffali  — le serie già lette, volume per volume
 *   Cronologia— l'ordine in cui li hai finiti
 *
 * I comandi aggiornano il numero sullo schermo prima di scrivere sul
 * server: aspettare Render per veder salire un contatore da 3 a 4
 * rende ogni click un'attesa. Se il salvataggio fallisce il numero
 * torna indietro e compare l'avviso — meglio un passo indietro
 * visibile che un numero sbagliato salvato in silenzio.
 */
// `tettoLettura` stava qui, e da quando il tavolino della stanza scrive
// «sei al 4 di 7» sta in `dati/serie.js`: era il denominatore di due
// pagine, e in duplice copia una delle due avrebbe finito per dire
// «13 di 12».

export default function LetturaPage() {
  const { serie, aggiornaLocale } = useCollezione();

  const sessioni = useRisorsa(getReadingSessions);
  const perSerie = useRisorsa(getStoricoPerSerie);
  const storico = useRisorsa(() => getReadingHistory(200));

  const [problema, setProblema] = useState(null);
  const [sceltaAperta, setSceltaAperta] = useState(false);
  const [completata, setCompletata] = useState(null);
  const [cercaStorico, setCercaStorico] = useState("");

  // Il salvataggio del segnalibro va rimandato di poco.
  //
  // Premendo "+" cinque volte di fila partivano cinque richieste
  // parallele: ognuna calcolata sul volume catturato al proprio
  // render, e le risposte rientravano in ordine sparso. Bastava che
  // l'ultima a tornare fosse quella con il numero più basso perché
  // il server restasse indietro rispetto a quello che vedevi.
  //
  // Qui lo schermo si aggiorna subito e il server riceve una sola
  // richiesta, con il valore finale, quando i click si fermano.
  const daSalvare = useRef(new Map());
  const timer = useRef(null);

  const svuotaCoda = useCallback(async () => {
    const coda = [...daSalvare.current.entries()];
    daSalvare.current.clear();

    for (const [mangaId, volume] of coda) {
      try {
        await updateReadingSession(mangaId, volume);
      } catch {
        setProblema("Non sono riuscito a salvare il segnalibro.");
        sessioni.ricarica();
      }
    }
  }, [sessioni]);

  // Se la pagina viene lasciata con un salvataggio in sospeso, lo
  // mando comunque: un segnalibro perso perché hai cambiato pagina
  // troppo in fretta sarebbe difficile da capire.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        svuotaCoda();
      }
    },
    [svuotaCoda]
  );

  /* -------------------- Letture in corso -------------------- */

  // Le sessioni conservano una copia di titolo e copertina che col
  // tempo invecchia. Se la serie è ancora in collezione vincono i
  // dati veri; la copia resta come ripiego per le serie cancellate.
  const attive = useMemo(() => {
    const elenco = sessioni.dati || [];
    const storicoIndicizzato = new Map(
      (perSerie.dati || []).map((s) => [String(s.manga_id), s])
    );

    return elenco.map((s) => {
      const collegata = serie.find((m) => String(m.id) === String(s.manga_id));
      const letti = storicoIndicizzato.get(String(s.manga_id));

      const totali = collegata?.totali ?? (Number(s.volumitotali) || null);
      const posseduti = Number(collegata?.posseduti) || 0;

      return {
        idSessione: s.id,
        mangaId: s.manga_id,
        titolo: collegata?.titolo || s.titolo,
        autore: collegata?.autore || s.autore,
        editore: collegata?.editore || null,
        copertina: collegata?.copertina || s.coverurl,
        totali,
        posseduti,
        massimo: tettoLettura(posseduti, totali),
        volume: Number(s.volume) || 1,
        volumiLetti: letti?.volumi || [],
        aggiornata: s.updated_at,
        inCollezione: Boolean(collegata)
      };
    });
  }, [sessioni.dati, perSerie.dati, serie]);

  const idInLettura = useMemo(
    () => new Set(attive.map((a) => String(a.mangaId))),
    [attive]
  );

  // Una serie di cui hai letto tutti i volumi che possiedi non ha
  // senso fra quelle da aprire: proporla sarebbe rumore. Restano
  // invece proponibili quelle lasciate a metà, che si vogliono
  // riprendere.
  const idFinite = useMemo(() => {
    const finite = new Set();

    for (const s of perSerie.dati || []) {
      const collegata = serie.find((m) => String(m.id) === String(s.manga_id));
      const tetto = tettoLettura(
        Number(collegata?.posseduti) || 0,
        collegata?.totali ?? (Number(s.volumitotali) || null)
      );

      if (tetto && Number(s.volumi_letti) >= tetto) {
        finite.add(String(s.manga_id));
      }
    }

    return finite;
  }, [perSerie.dati, serie]);

  // Anche le serie droppate restano fuori dalla scelta: proporle di
  // nuovo vorrebbe dire ignorare la scelta appena fatta di mollarle.
  const idDroppate = useMemo(
    () => new Set(serie.filter((m) => m.droppato).map((m) => String(m.id))),
    [serie]
  );

  const idDaNascondere = useMemo(
    () => new Set([...idInLettura, ...idFinite, ...idDroppate]),
    [idInLettura, idFinite, idDroppate]
  );

  /* -------------------- Scaffali -------------------- */

  // Sullo scaffale vanno le serie di cui hai letto qualcosa ma che
  // non stai leggendo adesso: quelle aperte hanno già il loro posto
  // in cima e mostrarle due volte confonderebbe.
  const scaffali = useMemo(
    () =>
      (perSerie.dati || [])
        .filter((s) => !idInLettura.has(String(s.manga_id)))
        .map((s) => {
          const collegata = serie.find((m) => String(m.id) === String(s.manga_id));
          const posseduti = Number(collegata?.posseduti) || 0;
          const totali = collegata?.totali ?? (Number(s.volumitotali) || null);
          const tetto = tettoLettura(posseduti, totali);
          const letti = Number(s.volumi_letti) || 0;

          return {
            ...s,
            volumi: (s.volumi || []).map(Number),
            totali,
            posseduti,
            // "Completa" rispetto a quello che hai in mano, non
            // rispetto ai volumi usciti: una serie in corso di cui
            // hai letto tutti i tuoi 7 volumi è a posto, non a metà.
            completa: Boolean(tetto) && letti >= tetto,
            mancanti: tetto ? Math.max(0, tetto - letti) : 0,
            droppato: Boolean(collegata?.droppato)
          };
        }),
    [perSerie.dati, idInLettura, serie]
  );

  /* -------------------- Azioni -------------------- */

  function segnalaErrore(messaggio) {
    setProblema(messaggio);
  }

  async function iniziaLettura(m) {
    setProblema(null);
    setSceltaAperta(false);

    try {
      await saveReadingSession({
        manga_id: m.id,
        titolo: m.titolo,
        autore: m.autore || "",
        coverurl: m.copertina || "",
        volume: 1,
        volumitotali: m.totali ?? null
      });

      sessioni.ricarica();
    } catch {
      segnalaErrore(`Non sono riuscito ad aprire la lettura di ${m.titolo}.`);
    }
  }

  /**
   * Sposta il segnalibro.
   *
   * `delta` fa un passo relativo al volume attuale, `assoluto` va
   * direttamente a un numero. La differenza conta: con il passo
   * relativo il valore va calcolato sullo stato del momento, non su
   * quello catturato quando il pulsante è stato disegnato — è
   * esattamente lì che nasceva lo sfasamento fra schermo e server.
   */
  function impostaVolume(lettura, { delta = 0, assoluto = null } = {}) {
    // Il tetto non è solo un vincolo di interfaccia: senza, un click
    // ripetuto porterebbe il segnalibro al volume 40 di una serie che
    // ne ha 12, e il dato resterebbe salvato così.
    const tetto = lettura.massimo;
    let finale = null;

    sessioni.setDati((precedenti) =>
      (precedenti || []).map((s) => {
        if (s.id !== lettura.idSessione) return s;

        const attuale = Number(s.volume) || 1;
        const richiesto = assoluto !== null ? assoluto : attuale + delta;
        const volume = Math.max(1, tetto ? Math.min(tetto, richiesto) : richiesto);

        finale = volume;

        return volume === attuale ? s : { ...s, volume };
      })
    );

    // Il calcolo avviene dentro l'aggiornamento di stato, quindi
    // l'avviso va deciso dopo, quando `finale` è noto.
    queueMicrotask(() => {
      if (finale === null) return;

      if (tetto && finale >= tetto && (assoluto ?? lettura.volume + delta) > tetto) {
        setProblema(
          lettura.posseduti > 0 && lettura.posseduti < (lettura.totali ?? Infinity)
            ? `Di ${lettura.titolo} possiedi ${lettura.posseduti} volumi: non puoi segnarne oltre.`
            : `${lettura.titolo} ha ${tetto} volumi in tutto.`
        );
        return;
      }

      setProblema(null);

      daSalvare.current.set(lettura.mangaId, finale);

      clearTimeout(timer.current);
      timer.current = setTimeout(svuotaCoda, 450);
    });
  }

  /**
   * "Finito, avanti": registra il volume nello storico e sposta il
   * segnalibro al successivo. Nella realtà è un gesto solo, quindi
   * qui è un bottone solo.
   */
  async function segnaLetto(lettura) {
    setProblema(null);

    // All'ultimo volume "Finito" registra la lettura ma non ha dove
    // avanzare: segnalarlo è meglio che far finta di proseguire.
    const eUltimo = lettura.massimo ? lettura.volume >= lettura.massimo : false;

    try {
      await addReadingHistory({
        manga_id: lettura.mangaId,
        titolo: lettura.titolo,
        autore: lettura.autore,
        coverurl: lettura.copertina,
        volume: lettura.volume
      });

      if (!eUltimo) {
        impostaVolume(lettura, { delta: 1 });
      }

      storico.ricarica();
      perSerie.ricarica();

      if (eUltimo) {
        // La lettura è finita per davvero: coriandoli e voto, non
        // solo una riga di testo che si perde nello schermo.
        setCompletata(lettura);
      }
    } catch {
      segnalaErrore("Il volume non è stato registrato nello storico.");
    }
  }

  async function chiudi(lettura) {
    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== lettura.idSessione)
    );

    try {
      await deleteReadingSession(lettura.mangaId);
      perSerie.ricarica();
    } catch {
      segnalaErrore("Non sono riuscito a chiudere la lettura.");
      sessioni.ricarica();
    }
  }

  /**
   * Droppare non è chiudere e basta: resta il segno che questa serie
   * l'hai mollata, così non ricompare fra le scelte per aprirne una
   * nuova finché non clicchi tu stesso un volume per riprenderla.
   */
  async function droppa(lettura) {
    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== lettura.idSessione)
    );
    aggiornaLocale(lettura.mangaId, { droppato: true });

    try {
      await Promise.all([
        deleteReadingSession(lettura.mangaId),
        updateManga(lettura.mangaId, { droppato: true })
      ]);
      perSerie.ricarica();
    } catch {
      segnalaErrore("Non sono riuscito a droppare la lettura.");
      sessioni.ricarica();
      aggiornaLocale(lettura.mangaId, { droppato: false });
    }
  }

  async function rimuoviDaStorico(voce) {
    setProblema(null);

    storico.setDati((precedenti) =>
      (precedenti || []).filter((v) => v.id !== voce.id)
    );

    try {
      await deleteReadingHistory(voce.id);
      perSerie.ricarica();
    } catch {
      segnalaErrore("Non sono riuscito a togliere il volume dallo storico.");
      storico.ricarica();
    }
  }

  /* -------------------- Cronologia -------------------- */

  // Di default solo le ultime 20: è la parte che si guarda davvero
  // ogni giorno. Chi cerca un titolo più vecchio ha la barra sotto,
  // che scorre l'intero lotto già scaricato invece di interrogare
  // di nuovo il server per ogni lettera digitata.
  const storicoFiltrato = useMemo(() => {
    const q = cercaStorico.trim().toLowerCase();
    const tutti = storico.dati || [];

    return q
      ? tutti.filter((v) => v.titolo.toLowerCase().includes(q))
      : tutti.slice(0, CRONOLOGIA_VISIBILE);
  }, [storico.dati, cercaStorico]);

  /* -------------------- Vista -------------------- */

  const inCaricamento = sessioni.inCorso && !sessioni.dati;

  return (
    <Pagina
      occhiello="Letture"
      titolo="Il tavolo di lettura"
      sommario="Dove sei arrivato, cosa hai già letto, e in che ordine."
      // Nessun pulsante qui in alto: ce n'era anche uno al centro
      // della sezione "Adesso", e due comandi identici a mezzo schermo
      // di distanza fanno solo esitare. Resta quello centrale, che ora
      // compare sempre — prima appariva solo a elenco vuoto.
    >
      <div className="space-y-16">
        {problema && (
          <p
            role="alert"
            className="rounded-card border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember"
          >
            {problema}
          </p>
        )}

        {sceltaAperta && (
          <SceltaSerie
            serie={serie}
            escludi={idDaNascondere}
            onScegli={iniziaLettura}
            onAnnulla={() => setSceltaAperta(false)}
          />
        )}

        {completata && (
          <ModaleCompletamento
            lettura={completata}
            serie={serie.find((m) => String(m.id) === String(completata.mangaId))}
            onVotoCambiato={(nuovo) => aggiornaLocale(completata.mangaId, { valutazione: nuovo })}
            onChiudi={() => setCompletata(null)}
          />
        )}

        {/* ═══════════ ADESSO ═══════════ */}
        <Sezione
          titolo="Adesso"
          extra={
            attive.length ? (
              <span className="font-numeric text-sm text-ink-muted">
                {plurale(attive.length, "lettura aperta", "letture aperte")}
              </span>
            ) : null
          }
        >
          {sessioni.errore ? (
            <Errore errore={sessioni.errore} riprova={sessioni.ricarica} />
          ) : inCaricamento ? (
            <CaricamentoElenco quante={2} />
          ) : attive.length ? (
            <>
            <ul className="space-y-4">
              {attive.map((lettura) => (
                <li key={lettura.idSessione}>
                  <LibroAperto
                    lettura={lettura}
                    onAvanti={() => impostaVolume(lettura, { delta: 1 })}
                    onIndietro={() => impostaVolume(lettura, { delta: -1 })}
                    onVaiAVolume={(n) => impostaVolume(lettura, { assoluto: n })}
                    onLetto={() => segnaLetto(lettura)}
                    onChiudi={() => chiudi(lettura)}
                    onDroppa={() => droppa(lettura)}
                  />
                </li>
              ))}
            </ul>

            {/* Lo stesso comando che compare a elenco vuoto, così è
                sempre nello stesso posto: sotto le letture aperte. */}
            <div className="flex justify-center pt-2">
              <Bottone variante="secondario" onClick={() => setSceltaAperta(true)}>
                Inizia un'altra lettura
              </Bottone>
            </div>
            </>
          ) : (
            <Vuoto
              titolo="Nessun libro aperto"
              testo="Apri una serie e il segnalibro ti aspetterà qui, al volume dove ti sei fermato."
              azione={
                <Bottone onClick={() => setSceltaAperta(true)}>
                  Inizia una lettura
                </Bottone>
              }
            />
          )}
        </Sezione>

        {/* ═══════════ SCAFFALI ═══════════ */}
        <Sezione
          titolo="Gli scaffali"
          extra={
            scaffali.length ? (
              <span className="font-numeric text-sm text-ink-muted">
                {plurale(scaffali.length, "serie", "serie")}
              </span>
            ) : null
          }
        >
          {perSerie.errore ? (
            <Errore errore={perSerie.errore} riprova={perSerie.ricarica} />
          ) : perSerie.inCorso && !perSerie.dati ? (
            <CaricamentoElenco quante={3} />
          ) : scaffali.length ? (
            <div className="space-y-10">
              {/* Le coste in fila: la vista d'insieme */}
              <ScaffaleCoste serie={scaffali} />

              {/* Sotto, il dettaglio volume per volume di ogni serie.
                  La colonna singola va dichiarata: senza, la griglia si
                  costruisce una colonna implicita larga quanto il
                  contenuto — cioè quanto il titolo più lungo — e la
                  pagina esce dallo schermo di un telefono. */}
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {scaffali.map((s) => (
                  <li key={s.manga_id}>
                    <RipianoSerie serie={s} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Vuoto
              titolo="Gli scaffali sono vuoti"
              testo="Ogni volume che segni come finito prende posto qui, accanto agli altri della sua serie."
            />
          )}
        </Sezione>

        {/* ═══════════ CRONOLOGIA ═══════════ */}
        <Sezione
          titolo="Ultimi letti"
          extra={
            storico.dati?.length ? (
              <div className="w-full sm:w-64">
                <CampoRicerca
                  valore={cercaStorico}
                  onCambia={setCercaStorico}
                  segnaposto="Cerca nella cronologia…"
                  risultati={storicoFiltrato.length}
                />
              </div>
            ) : null
          }
        >
          {storico.errore ? (
            <Errore errore={storico.errore} riprova={storico.ricarica} />
          ) : storico.inCorso && !storico.dati ? (
            <CaricamentoElenco quante={4} />
          ) : storico.dati?.length ? (
            storicoFiltrato.length ? (
              <ol className="space-y-0.5">
                {storicoFiltrato.map((v) => (
                  <VoceStorico
                    key={v.id}
                    voce={v}
                    onRimuovi={() => rimuoviDaStorico(v)}
                  />
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-ink-muted">
                Nessun volume con questo titolo.
              </p>
            )
          ) : (
            <Vuoto
              titolo="Nessun volume registrato"
              testo="Qui compare l'ordine in cui hai finito i volumi, con la data."
            />
          )}
        </Sezione>
      </div>
    </Pagina>
  );
}

/* ==================================================
   SCELTA DELLA SERIE DA APRIRE
   ================================================== */

function SceltaSerie({ serie, escludi, onScegli, onAnnulla }) {
  const [cerca, setCerca] = useState("");

  const risultati = useMemo(() => {
    const q = cerca.trim().toLowerCase();

    return serie
      .filter((m) => !escludi.has(String(m.id)))
      .filter((m) =>
        q
          ? `${m.titolo} ${m.autore || ""}`.toLowerCase().includes(q)
          : true
      )
      .slice(0, 24);
  }, [serie, escludi, cerca]);

  return (
    <div className="animate-rise-in rounded-panel border border-brass-400/20 bg-glass-2 p-5 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-bright">
            Cosa apriamo?
          </h3>
          <p className="text-sm text-ink-muted">
            Scegli dalla collezione. Il segnalibro parte dal volume 1.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <CampoRicerca
            valore={cerca}
            onCambia={setCerca}
            segnaposto="Cerca fra le tue serie…"
            risultati={risultati.length}
          />
        </div>
      </div>

      {risultati.length ? (
        <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {risultati.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onScegli(m)}
                // Il titolo è già dentro il pulsante, ma la copertina
                // accanto lo spezza in più nodi: l'etichetta esplicita
                // garantisce che un lettore di schermo annunci la serie
                // invece di un generico "pulsante".
                aria-label={`Inizia a leggere ${m.titolo}`}
                className="group flex w-full items-center gap-3 rounded-card border border-hairline bg-glass-1 p-2 text-left transition-all duration-quick ease-settle
                           hover:border-brass-400/40 hover:bg-glass-2 active:scale-[0.98]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
              >
                <span className="w-9 shrink-0">
                  <Copertina src={m.copertina} alt="" inclina={false} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-bright">
                    {m.titolo}
                  </span>
                  {m.totali ? (
                    <span className="font-numeric text-xs text-ink-faint">
                      {m.totali} volumi
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-ink-muted">
          {cerca
            ? "Nessuna serie con questo nome."
            : "Hai già aperto tutte le serie della collezione."}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Bottone variante="fantasma" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
    </div>
  );
}

/* ==================================================
   UN RIPIANO: UNA SERIE GIÀ LETTA
   ================================================== */

function RipianoSerie({ serie: s }) {
  return (
    <div className="group h-full rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl transition-all duration-base ease-settle hover:border-soft hover:bg-glass-2">
      <div className="flex items-start gap-3.5">
        <div className="w-12 shrink-0">
          <Copertina src={s.coverurl} alt="" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/serie/${s.manga_id}`}
              className="min-w-0 flex-1 truncate font-medium text-ink-bright transition-colors duration-quick hover:text-brass-300"
            >
              {s.titolo}
            </Link>

            {s.droppato ? (
              <span className="shrink-0 rounded-full border border-ember/25 bg-ember/10 px-2 py-0.5 text-[0.65rem] font-medium text-ember">
                droppato
              </span>
            ) : (
              s.completa && (
                <span className="shrink-0 rounded-full border border-jade/25 bg-jade/10 px-2 py-0.5 text-[0.65rem] font-medium text-jade">
                  completata
                </span>
              )
            )}
          </div>

          {s.autore && (
            <p className="truncate text-xs text-ink-faint">{s.autore}</p>
          )}

          <p className="mt-1 text-xs text-ink-muted">
            ultimo il <time dateTime={s.ultimo}>{dataIt(s.ultimo)}</time>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ScaffaleVolumi totali={s.totali} letti={s.volumi} />
      </div>
    </div>
  );
}

/* ==================================================
   UNA RIGA DI CRONOLOGIA
   ================================================== */

function VoceStorico({ voce, onRimuovi }) {
  return (
    <li className="group flex items-center gap-4 rounded-card px-3 py-2.5 transition-colors duration-quick hover:bg-glass-1">
      <div className="w-8 shrink-0">
        <Copertina src={voce.coverurl} alt="" inclina={false} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-bright">{voce.titolo}</p>
        <p className="font-numeric text-xs text-ink-faint">Volume {voce.volume}</p>
      </div>

      <time dateTime={voce.read_at} className="shrink-0 text-xs text-ink-muted">
        {dataIt(voce.read_at)}
      </time>

      {/* Compare solo al passaggio del mouse: correggere è raro,
          e un cestino sempre visibile su ogni riga fa rumore.
          Resta però raggiungibile da tastiera — e col dito, dove il
          passaggio del mouse non esiste, sta acceso a mezza voce: fa
          meno rumore di un elenco che non si può correggere. */}
      <button
        onClick={onRimuovi}
        aria-label={`Togli il volume ${voce.volume} di ${voce.titolo} dallo storico`}
        title="Togli dallo storico"
        className="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-faint opacity-0 transition-all duration-quick
                   hover:text-ember group-hover:opacity-100
                   [@media(hover:none)]:px-3 [@media(hover:none)]:py-2 [@media(hover:none)]:opacity-70
                   focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
      >
        Togli
      </button>
    </li>
  );
}

/* ==================================================
   FINE LETTURA: CORIANDOLI + VOTO
   ================================================== */

/**
 * L'ultimo volume che possiedi di una serie è un momento, non una
 * riga di log: coriandoli, un titolo di congratulazioni, e — se la
 * serie è ancora in collezione — la stessa fila di stelle usata
 * ovunque per votarla, così il voto resta unico per serie invece di
 * moltiplicarsi per ogni lettura.
 */
function ModaleCompletamento({ lettura, serie, onVotoCambiato, onChiudi }) {
  const velo = useChiusuraVelo(onChiudi);

  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 75,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <Sovrapposizione>
    <div
      className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-5 backdrop-blur-sm animate-rise-in"
      {...velo}
    >
      <div className="w-full max-w-sm space-y-5 rounded-panel border border-hairline bg-glass-3 p-6 text-center shadow-float backdrop-blur-2xl">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-bright">
            Complimenti!
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Hai finito {lettura.titolo}.
          </p>
        </div>

        {serie && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-ink-faint">
              Che voto le dai?
            </p>
            <VotoStelle serie={serie} onCambiato={onVotoCambiato} dimensione={26} />
          </div>
        )}

        <Bottone onClick={onChiudi} className="w-full">
          Chiudi
        </Bottone>
      </div>
    </div>
    </Sovrapposizione>
  );
}
