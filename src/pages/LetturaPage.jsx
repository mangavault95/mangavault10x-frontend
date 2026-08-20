import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import LibroAperto from "../ui/LibroAperto";
import ScaffaleCoste from "../ui/ScaffaleCoste";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { Stella, VotoStelle } from "../ui/AzioniSerie";
import Sovrapposizione from "../ui/Sovrapposizione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { coloreLettore, nomeDi } from "../dati/lettori";
import {
  droppataDa,
  lettaDa,
  numeroIt,
  plurale,
  tettoLettura,
  volumiLettiDa,
  votoDi,
  votoIt
} from "../dati/serie";
import {
  addReadingHistory,
  deleteReadingHistorySerie,
  deleteReadingHistoryVolume,
  deleteReadingSession,
  droppaSerie,
  getReadingSessions,
  getStoricoPerSerie,
  saveReadingSession,
  segnaLettiFinoA,
  updateReadingSession
} from "../services/api";

// Quante serie mostrare nella finestra "Cosa apriamo?" prima di
// rimandare alla ricerca. Erano 24, cioè sei righe su schermo largo:
// abbastanza per scorrere un po', troppo poche perché l'elenco sembri
// la collezione.
const MASSIME_IN_SCELTA = 60;

/**
 * Le letture, in due tempi.
 *
 *   Adesso      — i libri aperti sul tavolo, con il segnalibro
 *   Classifica  — quello che hai letto, dal voto più alto al più basso
 *
 * Ce n'erano quattro: in mezzo stavano un elenco di schede per serie e
 * la cronologia volume per volume. Dicevano cose vere e nessuno le
 * guardava — la domanda che ci si fa tornando qui è "dove sono
 * arrivato" e "cosa mi è piaciuto", non "in che ordine ho finito i
 * volumi nel 2024". Correggere un volume segnato per sbaglio, che era
 * l'unica cosa per cui serviva la cronologia, si fa dal libro aperto.
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
  const { serie, aggiornaDroppato, aggiornaLettura, aggiornaVoto } = useCollezione();
  const { lettori, idVisto } = useSessione();

  // Segnare un volume come letto adesso richiede di sapere CHI l'ha
  // letto: da quando i lettori sono due, una lettura senza nome non si
  // può registrare. Il modulo d'accesso si apre qui dove si sta
  // lavorando e l'azione riparte da sola — vedi `dati/accesso.js`.
  const eseguiProtetto = useAccessoProtetto();

  const sessioni = useRisorsa(getReadingSessions);
  const perSerie = useRisorsa(getStoricoPerSerie);

  const [problema, setProblema] = useState(null);
  const [sceltaAperta, setSceltaAperta] = useState(false);
  const [completata, setCompletata] = useState(null);

  // Di chi è la classifica che si sta guardando. `null` vuol dire "la
  // mia": non si scrive `idVisto` qui dentro perché all'inizio non si
  // sa ancora chi guarda — l'elenco dei lettori arriva dopo il primo
  // disegno — e uno stato inizializzato con un valore che non c'è
  // ancora resterebbe sbagliato per sempre.
  const [sceltaLettore, setSceltaLettore] = useState(null);
  const lettoreScelto = sceltaLettore ?? idVisto;
  const mioTurno = lettoreScelto === idVisto;
  const nomeLettore = nomeDi(lettori, lettoreScelto) ?? "questo lettore";

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
        await eseguiProtetto(() => updateReadingSession(mangaId, volume));
      } catch (e) {
        if (!e?.annullato) setProblema("Non sono riuscito a salvare il segnalibro.");
        sessioni.ricarica();
      }
    }
  }, [sessioni, eseguiProtetto]);

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
        inCollezione: Boolean(collegata),
        // La scheda intera, non solo i campi copiati qui sopra: le note
        // si scrivono da qui e vivono sulla serie, non sulla sessione
        // di lettura. Una serie cancellata dalla collezione non ne ha,
        // ed è giusto — la nota parla di un'opera che non c'è più.
        serie: collegata ?? null
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

  /* -------------------- La classifica -------------------- */

  // Non passa dalla cronologia ma dalla collezione: ogni scheda si
  // porta dietro chi l'ha letta e quanti volumi (`lettori`) e i voti di
  // tutti (`voti`). È per questo che passare da un lettore all'altro è
  // istantaneo invece di essere un'altra richiesta a un server che
  // dorme.
  const lette = useMemo(
    () => serie.filter((s) => lettaDa(s, lettoreScelto)),
    [serie, lettoreScelto]
  );

  // Le votate in classifica, le altre sotto una riga. Non sparire non
  // è un dettaglio: quell'elenco è anche il posto dove ci si accorge
  // che a una serie il voto non gliel'hai mai dato.
  const { votate, senzaVoto } = useMemo(() => {
    const conVoto = [];
    const senza = [];

    for (const s of lette) {
      (votoDi(s, lettoreScelto) != null ? conVoto : senza).push(s);
    }

    // A parità di voto decide il titolo: senza, due serie da 5 stelle
    // si scambierebbero di posto a ogni ricaricamento, e una
    // classifica che balla non è una classifica.
    const perTitolo = (a, b) => a.titolo.localeCompare(b.titolo, "it");

    conVoto.sort(
      (a, b) => votoDi(b, lettoreScelto) - votoDi(a, lettoreScelto) || perTitolo(a, b)
    );
    senza.sort(perTitolo);

    return { votate: conVoto, senzaVoto: senza };
  }, [lette, lettoreScelto]);

  // Le coste, nello stesso ordine dell'elenco: lo scaffale non è una
  // decorazione accanto alla classifica, è la classifica.
  const coste = useMemo(
    () =>
      [...votate, ...senzaVoto].map((s) => {
        const letti = volumiLettiDa(s, lettoreScelto);
        const tetto = tettoLettura(s.posseduti, s.totali);

        return {
          manga_id: s.id,
          titolo: s.titolo,
          coverurl: s.copertina,
          editore: s.editore,
          volumi_letti: letti,
          mancanti: tetto ? Math.max(0, tetto - letti) : 0,
          // Droppata da CHI sta guardando la classifica, non da me:
          // la X sulla costa parla della sua lettura.
          droppato: droppataDa(s, lettoreScelto)
        };
      }),
    [votate, senzaVoto, lettoreScelto]
  );

  /* -------------------- Azioni -------------------- */

  function segnalaErrore(messaggio) {
    setProblema(messaggio);
  }

  async function iniziaLettura(m) {
    setProblema(null);
    setSceltaAperta(false);

    try {
      await eseguiProtetto(() =>
        saveReadingSession({
          manga_id: m.id,
          titolo: m.titolo,
          autore: m.autore || "",
          coverurl: m.copertina || "",
          volume: 1,
          volumitotali: m.totali ?? null
        })
      );

      sessioni.ricarica();
    } catch (e) {
      if (!e?.annullato) segnalaErrore(`Non sono riuscito ad aprire la lettura di ${m.titolo}.`);
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
      await eseguiProtetto(() =>
        addReadingHistory({
          manga_id: lettura.mangaId,
          titolo: lettura.titolo,
          autore: lettura.autore,
          coverurl: lettura.copertina,
          volume: lettura.volume
        })
      );

      if (!eUltimo) {
        impostaVolume(lettura, { delta: 1 });
      }

      perSerie.ricarica();

      // La classifica legge la collezione, non la cronologia: senza
      // questa riga una serie appena cominciata non comparirebbe fra
      // le lette finché non si ricarica la pagina.
      aggiornaLettura(
        lettura.mangaId,
        new Set([...lettura.volumiLetti.map(Number), lettura.volume]).size
      );

      if (eUltimo) {
        // La lettura è finita per davvero: coriandoli e voto, non
        // solo una riga di testo che si perde nello schermo.
        setCompletata(lettura);
      }
    } catch (e) {
      if (!e?.annullato) segnalaErrore("Il volume non è stato registrato nello storico.");
    }
  }

  /**
   * "Letti tutti fino al N": recupera in un colpo i volumi indietro.
   *
   * È il caso di una serie letta prima di iscriversi al sito: si
   * sposta il segnalibro sull'ultimo volume e si segna tutto, invece
   * di premere "Finito, avanti" venticinque volte — venticinque click
   * e venticinque richieste per registrare una cosa sola.
   *
   * Se così la serie arriva in fondo, vale come averla finita: stessa
   * festa e stessa chiusura del percorso normale.
   */
  async function segnaFinoA(lettura) {
    setProblema(null);

    const fino = lettura.volume;
    const eUltimo = lettura.massimo ? fino >= lettura.massimo : false;

    try {
      await eseguiProtetto(() => segnaLettiFinoA(lettura.mangaId, fino));

      perSerie.ricarica();
      aggiornaLettura(
        lettura.mangaId,
        new Set([
          ...lettura.volumiLetti.map(Number),
          ...Array.from({ length: fino }, (_, i) => i + 1)
        ]).size
      );

      if (eUltimo) setCompletata(lettura);
    } catch (e) {
      if (!e?.annullato) segnalaErrore("Non sono riuscito a segnare i volumi arretrati.");
      perSerie.ricarica();
    }
  }

  /**
   * La lettura finita si chiude da sola.
   *
   * Il tasto "Chiudi la lettura" non c'è più: chiudeva qualcosa di
   * indefinito accanto a un tasto che invece chiudeva per davvero
   * (droppa), e i due si somigliavano troppo. Adesso l'unica uscita
   * normale è arrivare in fondo — e quando ci si arriva la scheda si
   * toglie dal tavolo da sé, dopo i coriandoli e il voto.
   *
   * Se il voto non lo dai, si chiude lo stesso: la serie l'hai finita,
   * e resta in classifica sotto "lette, ma non ancora votate".
   */
  async function chiudiPerchéFinita(lettura) {
    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== lettura.idSessione)
    );

    try {
      await eseguiProtetto(() => deleteReadingSession(lettura.mangaId));
    } catch (e) {
      // Fallire qui non merita un avviso: la serie è finita comunque,
      // e la scheda ricompare da sola al prossimo caricamento.
      if (!e?.annullato) sessioni.ricarica();
    }
  }

  /**
   * Droppare non è chiudere e basta: resta il segno che questa serie
   * l'hai mollata, così non ricompare fra le scelte per aprirne una
   * nuova finché non clicchi tu stesso un volume per riprenderla.
   *
   * Il segno è tuo, non della serie. Finché è stato una colonna di
   * "Manga" bastava che uno dei due lettori mollasse una serie perché
   * sparisse dall'elenco di quelle da aprire anche all'altro — ed è
   * esattamente il motivo per cui Nisekoi non si trovava.
   */
  async function droppa(lettura) {
    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== lettura.idSessione)
    );
    aggiornaDroppato(lettura.mangaId, true);

    try {
      await eseguiProtetto(() =>
        Promise.all([
          deleteReadingSession(lettura.mangaId),
          droppaSerie(lettura.mangaId)
        ])
      );
      perSerie.ricarica();
    } catch (e) {
      if (!e?.annullato) segnalaErrore("Non sono riuscito a droppare la lettura.");
      sessioni.ricarica();
      aggiornaDroppato(lettura.mangaId, false);
    }
  }

  /**
   * "Questo non l'ho letto": toglie dallo storico il volume su cui sta
   * il segnalibro.
   *
   * Andare indietro col segnalibro non bastava — il quadratino restava
   * pieno e il volume contato — e l'unico rimedio era ritrovare la riga
   * in fondo alla cronologia. Qui il ripensamento si dice dove è nato,
   * sul libro aperto: torni sul volume e lo spegni.
   */
  async function annullaLetto(lettura) {
    setProblema(null);

    const numero = lettura.volume;

    // Il quadratino si spegne subito: aspettare Render per vedere
    // sparire un segno messo per sbaglio fa premere di nuovo.
    perSerie.setDati((precedenti) =>
      (precedenti || []).map((s) => {
        if (String(s.manga_id) !== String(lettura.mangaId)) return s;

        const volumi = (s.volumi || []).filter((v) => Number(v) !== numero);

        return { ...s, volumi, volumi_letti: volumi.length };
      })
    );

    try {
      await eseguiProtetto(() =>
        deleteReadingHistoryVolume(lettura.mangaId, numero)
      );

      perSerie.ricarica();

      // Anche qui la collezione va tenuta al passo: tolto l'unico
      // volume letto, la serie deve uscire dalla classifica.
      aggiornaLettura(
        lettura.mangaId,
        lettura.volumiLetti.map(Number).filter((v) => v !== numero).length
      );
    } catch (e) {
      if (!e?.annullato) {
        segnalaErrore(`Non sono riuscito a togliere il volume ${numero} dai letti.`);
      }
      perSerie.ricarica();
    }
  }

  /**
   * Togliere un'intera serie da quelle lette.
   *
   * Volume per volume, su una serie da trenta, sarebbe un lavoro — e
   * il ripensamento è sulla serie, non sui singoli numeri. Il tasto
   * chiede conferma da solo (vedi `RigaClassifica`): qui sparisce roba
   * che a rimetterla ci vorrebbe un pomeriggio.
   */
  async function togliDalleLette(s) {
    setProblema(null);

    const quantiErano = volumiLettiDa(s, idVisto);

    // Sparisce subito dalla classifica: è il senso del gesto.
    aggiornaLettura(s.id, 0);

    try {
      await eseguiProtetto(() => deleteReadingHistorySerie(s.id));
      perSerie.ricarica();
    } catch (e) {
      if (!e?.annullato) {
        segnalaErrore(`Non sono riuscito a togliere ${s.titolo} dalle lette.`);
      }
      aggiornaLettura(s.id, quantiErano);
    }
  }

  /* -------------------- Vista -------------------- */

  const inCaricamento = sessioni.inCorso && !sessioni.dati;

  return (
    <Pagina
      occhiello="Letture"
      titolo="Il tavolo di lettura"
      sommario="Dove sei arrivato, e cosa ti è piaciuto."
      // Il comando sta qui in alto, e solo qui. Prima era sotto le
      // letture aperte: con otto libri sul tavolo finiva a metà pagina,
      // cioè in un posto che si raggiunge scorrendo — mentre aprire una
      // lettura è la prima cosa che si viene a fare.
      azioni={
        <Bottone onClick={() => setSceltaAperta(true)}>
          Inizia una lettura
        </Bottone>
      }
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
            onVotoCambiato={(nuovo) => aggiornaVoto(completata.mangaId, nuovo)}
            onChiudi={() => {
              chiudiPerchéFinita(completata);
              setCompletata(null);
            }}
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
            <ul className="space-y-4">
              {attive.map((lettura) => (
                <li key={lettura.idSessione}>
                  <LibroAperto
                    lettura={lettura}
                    onAvanti={() => impostaVolume(lettura, { delta: 1 })}
                    onIndietro={() => impostaVolume(lettura, { delta: -1 })}
                    onVaiAVolume={(n) => impostaVolume(lettura, { assoluto: n })}
                    onLetto={() => segnaLetto(lettura)}
                    onLettiFinoAQui={() => segnaFinoA(lettura)}
                    onAnnullaLetto={() => annullaLetto(lettura)}
                    onDroppa={() => droppa(lettura)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Vuoto
              titolo="Nessun libro aperto"
              testo="Con «Inizia una lettura», qui in alto, apri una serie: il segnalibro ti aspetterà qui, al volume dove ti sei fermato."
            />
          )}
        </Sezione>

        {/* ═══════════ LA CLASSIFICA ═══════════ */}
        <Sezione
          titolo="La classifica"
          extra={
            <SceltaLettore
              lettori={lettori}
              scelto={lettoreScelto}
              onScegli={setSceltaLettore}
            />
          }
        >
          {lette.length ? (
            <div className="space-y-10">
              {/* Lo scaffale È la classifica: le coste in fila dal voto
                  più alto al più basso. Prima erano ordinate per data
                  di lettura e sotto c'era un elenco che diceva le
                  stesse cose in un altro modo — due letture della
                  stessa roba. Guardi lo scaffale e vedi la tua
                  classifica; leggi sotto e vedi i numeri. */}
              <ScaffaleCoste serie={coste} />

              {votate.length > 0 && (
                <ol className="space-y-0.5">
                  {votate.map((s, posizione) => (
                    <RigaClassifica
                      key={s.id}
                      serie={s}
                      posizione={posizione + 1}
                      lettore={lettoreScelto}
                      mio={mioTurno}
                      onTogli={() => togliDalleLette(s)}
                    />
                  ))}
                </ol>
              )}

              {senzaVoto.length > 0 && (
                <div className="space-y-3 border-t border-hairline pt-6">
                  <p className="text-sm text-ink-muted">
                    {mioTurno
                      ? `Lette, ma non ancora votate: ${numeroIt(senzaVoto.length)}.`
                      : `${nomeLettore} le ha lette senza votarle: ${numeroIt(senzaVoto.length)}.`}
                  </p>

                  <ul className="space-y-0.5">
                    {senzaVoto.map((s) => (
                      <RigaClassifica
                        key={s.id}
                        serie={s}
                        lettore={lettoreScelto}
                        mio={mioTurno}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Vuoto
              titolo={mioTurno ? "Non hai ancora finito niente" : `${nomeLettore} non ha ancora letto niente`}
              testo="Ogni volume segnato come finito porta la sua serie qui, al posto che le dà il voto."
            />
          )}
        </Sezione>
      </div>
    </Pagina>
  );
}

/* ==================================================
   DI CHI È LA CLASSIFICA
   ================================================== */

/**
 * Il tastino per guardare la classifica di un altro.
 *
 * Compare solo se i lettori sono almeno due: da solo, "la classifica
 * di Nicer" e "la classifica" sono la stessa cosa. I colori sono
 * quelli delle note — due modi diversi di dire "questo è di Nanaki"
 * sarebbero due cose da imparare invece di una.
 */
function SceltaLettore({ lettori, scelto, onScegli }) {
  if (lettori.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {lettori.map((l) => {
        const attivo = l.id === scelto;
        const colore = coloreLettore(l.colore);

        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={attivo}
            onClick={() => onScegli(l.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95
              focus-visible:outline-none focus-visible:ring-2 ${colore.anello}
              ${
                attivo
                  ? `${colore.bordo} ${colore.fondo} ${colore.testo}`
                  : "border-hairline bg-glass-1 text-ink-muted hover:border-soft hover:text-ink-bright"
              }`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${colore.pallino}`} />
            {l.nickname}
          </button>
        );
      })}
    </div>
  );
}

/* ==================================================
   UNA RIGA DI CLASSIFICA
   ================================================== */

function RigaClassifica({ serie, posizione, lettore, mio, onTogli }) {
  const { aggiornaVoto } = useCollezione();
  const voto = votoDi(serie, lettore);

  // Togliere una serie dalle lette cancella tutti i volumi segnati:
  // un click solo, e a rimetterli ci vorrebbe un pomeriggio. Quindi il
  // tasto si spiega prima di agire, invece di aprire una finestra —
  // che per una riga di elenco sarebbe una cerimonia.
  const [confermo, setConfermo] = useState(false);

  return (
    <li className="group flex items-center gap-3.5 rounded-card px-3 py-2 transition-colors duration-quick hover:bg-glass-1">
      {/* Il numero solo dove c'è una posizione: fra le non votate
          sarebbe una graduatoria inventata. */}
      <span className="w-6 shrink-0 text-right font-numeric text-sm text-ink-faint">
        {posizione ?? ""}
      </span>

      <div className="w-8 shrink-0">
        <Copertina src={serie.copertina} alt="" inclina={false} />
      </div>

      <Link
        to={`/serie/${serie.id}`}
        className="min-w-0 flex-1 truncate text-sm text-ink-bright transition-colors duration-quick hover:text-brass-300"
      >
        {serie.titolo}
      </Link>

      {/* Le stelle si toccano solo se la classifica è la tua: un voto è
          di chi lo dà, e guardando quella di un altro sarebbero un modo
          per scrivere al posto suo. */}
      {mio ? (
        <VotoStelle
          serie={serie}
          dimensione={16}
          onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)}
        />
      ) : (
        <span className="inline-flex items-center gap-0.5" aria-label={voto ? `Voto ${votoIt(voto)} su 5` : "Non votato"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Stella
              key={n}
              riempimento={Math.min(1, Math.max(0, (voto ?? 0) - n + 1))}
              dimensione={16}
            />
          ))}
        </span>
      )}

      <span className="w-8 shrink-0 text-right font-numeric text-sm text-ink-bright">
        {voto ? votoIt(voto) : "—"}
      </span>

      {/* Solo sulla propria classifica: le letture di un altro non si
          correggono. Come il cestino della cronologia di prima, appare
          al passaggio del mouse e col dito resta acceso a mezza voce. */}
      {mio && typeof onTogli === "function" && (
        <span className="w-28 shrink-0 text-right">
          {confermo ? (
            <span className="inline-flex items-center gap-1">
              <button
                onClick={() => {
                  setConfermo(false);
                  onTogli();
                }}
                className="rounded-lg bg-ember/15 px-2 py-1 text-xs font-medium text-ember transition-colors duration-quick
                           hover:bg-ember/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
              >
                Confermi?
              </button>

              <button
                onClick={() => setConfermo(false)}
                aria-label="Lascia la serie fra quelle lette"
                className="rounded-lg px-1.5 py-1 text-xs text-ink-faint transition-colors duration-quick hover:text-ink-bright"
              >
                no
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfermo(true)}
              aria-label={`Togli ${serie.titolo} dalle serie lette`}
              title="Togli dalle lette"
              className="rounded-lg px-2 py-1 text-xs text-ink-faint opacity-0 transition-all duration-quick
                         hover:text-ember group-hover:opacity-100
                         [@media(hover:none)]:px-3 [@media(hover:none)]:py-2 [@media(hover:none)]:opacity-70
                         focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
            >
              Togli
            </button>
          )}
        </span>
      )}
    </li>
  );
}

/* ==================================================
   SCELTA DELLA SERIE DA APRIRE
   ================================================== */

/**
 * È una finestra sopra la pagina, non un pannello in cima.
 *
 * Da inserto stava in testa alla pagina mentre il pulsante che lo apre
 * sta sotto le letture aperte: da telefono, con otto libri sul tavolo,
 * si apriva **duemila pixel più su** dello schermo. Toccavi "Inizia
 * un'altra lettura" e non succedeva niente — bisognava indovinare che
 * la risposta era risalire.
 *
 * Sopra la pagina il problema non esiste: compare dove sei, la ricerca
 * ha già il cursore, e si chiude con Escape o toccando fuori.
 */
function SceltaSerie({ serie, escludi, onScegli, onAnnulla }) {
  const [cerca, setCerca] = useState("");
  const velo = useChiusuraVelo(onAnnulla);

  const disponibili = useMemo(
    () => serie.filter((m) => !escludi.has(String(m.id))),
    [serie, escludi]
  );

  const trovate = useMemo(() => {
    const q = cerca.trim().toLowerCase();

    return q
      ? disponibili.filter((m) =>
          `${m.titolo} ${m.autore || ""}`.toLowerCase().includes(q)
        )
      : disponibili;
  }, [disponibili, cerca]);

  // Duecento copertine in una finestra sono un muro: se ne mostrano
  // quante bastano a farsi un'idea, e il resto si trova cercando. Il
  // numero però va detto — un elenco che finisce senza dire quanto ne
  // resta fuori sembra un elenco completo, e chi non ci trova la
  // propria serie conclude che non c'è.
  const risultati = trovate.slice(0, MASSIME_IN_SCELTA);
  const nascoste = trovate.length - risultati.length;

  return (
    <Sovrapposizione>
    <div
      className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-4 backdrop-blur-sm animate-rise-in sm:p-5"
      onKeyDown={(e) => {
        if (e.key === "Escape") onAnnulla();
      }}
      {...velo}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scegli la serie da aprire"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-panel border border-brass-400/20 bg-glass-3 p-5 shadow-float backdrop-blur-2xl"
      >
      <div className="mb-4 space-y-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-bright">
            Cosa apriamo?
          </h3>
          <p className="text-sm text-ink-muted">
            Scegli dalla collezione. Il segnalibro parte dal volume 1.
          </p>
        </div>

        <CampoRicerca
          valore={cerca}
          onCambia={setCerca}
          segnaposto="Cerca fra le tue serie…"
          risultati={trovate.length}
          fuocoSubito
          larghezzaPiena
        />
      </div>

      {risultati.length ? (
        <ul className="-mr-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="font-numeric text-xs text-ink-faint">
          {nascoste > 0
            ? `altre ${nascoste} non in elenco: cercale per nome`
            : " "}
        </p>

        <Bottone variante="fantasma" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
      </div>
    </div>
    </Sovrapposizione>
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
