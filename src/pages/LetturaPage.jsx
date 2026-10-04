import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { Stella, VotoStelle } from "../ui/AzioniSerie";
import Menu from "../ui/Menu";
import NoteSerie from "../ui/NoteSerie";
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
  riprendiSerie,
  saveReadingSession,
  segnaLettiFinoA,
  updateRating,
  updateReadingSession
} from "../services/api";

// Quante serie mostrare nella finestra "Cosa apriamo?" prima di
// rimandare alla ricerca. Erano 24, cioè sei righe su schermo largo:
// abbastanza per scorrere un po', troppo poche perché l'elenco sembri
// la collezione.
const MASSIME_IN_SCELTA = 60;

/**
 * IN LETTURA — rifatta il 04/10/2026 per essere uno strumento.
 *
 * Prima ogni serie aperta era un libro disegnato: una fila di barrette o
 * di quadretti per volume (42 per Berserk), una lampada che faceva luce,
 * coriandoli a fine serie, e sopra la classifica uno scaffale di coste.
 * Bello, e pesante da usare: per sapere a che volume eri dovevi
 * contare, e i comandi utili stavano sparsi fra la scheda e un menu.
 *
 * Adesso la pagina risponde a tre domande, in quest'ordine:
 *
 *   Sto leggendo  — a che volume sono? Una riga per serie, il numero
 *                   scritto grande, −/+ e un tasto solo: «Finito il 17».
 *                   Tutto il resto (voto, note, «letti fino a qui», «non
 *                   l'ho letto», togli, droppa, ricomincia) sta in UN
 *                   foglio, dietro i tre puntini.
 *   Da votare     — le serie finite che non hanno ancora un voto, con le
 *                   stelle sulla riga.
 *   Le tue lette  — la classifica, dal voto più alto.
 *
 * E in fondo le mollate, chiuse, con «Riprendi»: prima una serie
 * droppata spariva, e per ritrovarla bisognava passare dalla sua scheda.
 *
 * Quello che segue è la storia di prima, ancora vera per la logica:
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
  const { lettoriBiblioteca: lettori, idVisto, bibliotecaSolaLettura } = useSessione();

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

  // Il riquadro aperto dal menu di una riga di classifica:
  // `{ id, cosa: "voto" | "note" }`, oppure niente.
  //
  // Lo stato sta qui e non nella riga perché il riquadro esce dalla
  // riga: è una finestra sopra la pagina, e una riga alta trenta pixel
  // non è il posto da cui aprire una cosa che ne occupa quattrocento.
  // Si tiene l'IDENTIFICATIVO e non la scheda: la scheda dentro il
  // riquadro cambia mentre lo si guarda — è lì che si vota e si
  // scrivono le note — e una copia catturata all'apertura resterebbe
  // ferma a com'era prima.
  const [inPrimoPiano, setInPrimoPiano] = useState(null);

  // La lettura di cui è aperto il foglio di gestione (per sessione).
  const [inGestione, setInGestione] = useState(null);

  // La classifica intera sono cento righe: se ne mostrano le prime dieci,
  // il resto a richiesta.
  const [tutteLeLette, setTutteLeLette] = useState(false);

  // Di chi è la classifica che si sta guardando. `null` vuol dire "la
  // mia": non si scrive `idVisto` qui dentro perché all'inizio non si
  // sa ancora chi guarda — l'elenco dei lettori arriva dopo il primo
  // disegno — e uno stato inizializzato con un valore che non c'è
  // ancora resterebbe sbagliato per sempre.
  const [sceltaLettore, setSceltaLettore] = useState(null);
  const lettoreScelto = sceltaLettore ?? idVisto;
  // «Mio» vuol dire due cose insieme: che si sta guardando la propria
  // classifica E che questa biblioteca è la propria. Chi di qua sta
  // solo guardando non è mai al proprio turno — le letture che vede
  // sono del proprietario, e chiamarle sue sarebbe la bugia da cui
  // nascono i bottoni che non funzionano.
  const mioTurno = lettoreScelto === idVisto && !bibliotecaSolaLettura;
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

  /* -------------------- Azioni -------------------- */

  function segnalaErrore(messaggio) {
    setProblema(messaggio);
  }

  /**
   * Il primo volume non letto di una serie: è da lì che si riparte, sia
   * aprendo una serie nuova sia rimettendone in mano una lasciata. Su
   * una serie finita non c'è un volume dopo, e si riparte dall'ultimo.
   */
  function primoNonLetto(m) {
    const riga = (perSerie.dati || []).find((r) => String(r.manga_id) === String(m.id));
    const letti = new Set((riga?.volumi || []).map(Number));
    const tetto = tettoLettura(m.posseduti, m.totali);

    let da = 1;
    while (letti.has(da) && (!tetto || da < tetto)) da += 1;

    return da;
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
          volume: primoNonLetto(m),
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
   * Togliere dal tavolo una lettura che non è finita.
   *
   * Il tasto "Chiudi la lettura" era stato tolto perché stava accanto
   * a "Droppa" e i due si somigliavano troppo: nessuno dei due diceva
   * cosa lasciava indietro. Il risultato però era che una lettura
   * aperta per sbaglio — o una serie ripresa e poi lasciata lì — non
   * si poteva più togliere dal tavolo se non mollandola per finta.
   *
   * Adesso i due comandi stanno nel menu, uno sotto l'altro, e ognuno
   * ha scritta la propria conseguenza: qui i volumi letti restano e la
   * serie torna fra quelle da aprire, di là resta segnata come
   * mollata. Detta la differenza, i due comandi possono convivere.
   */
  async function togliDalTavolo(lettura) {
    setProblema(null);

    sessioni.setDati((precedenti) =>
      (precedenti || []).filter((s) => s.id !== lettura.idSessione)
    );

    try {
      await eseguiProtetto(() => deleteReadingSession(lettura.mangaId));
    } catch (e) {
      if (!e?.annullato) {
        segnalaErrore(`Non sono riuscito a chiudere la lettura di ${lettura.titolo}.`);
      }
      sessioni.ricarica();
    }
  }

  /**
   * Azzerare i volumi letti di una serie ancora aperta.
   *
   * È il caso della serie segnata sbagliata: volumi spuntati a
   * memoria, o su un'edizione diversa da quella che si sta leggendo.
   * Correggerli uno per uno da "il N non l'ho letto" vuol dire tornare
   * indietro con il segnalibro venti volte; qui si ricomincia da capo
   * in un gesto, e il segnalibro torna al volume 1 con loro — lasciarlo
   * al 20 con zero volumi letti sarebbe uno stato che non vuol dire
   * niente.
   *
   * La lettura resta aperta: azzerare è ricominciare, non smettere.
   */
  async function azzeraLetti(lettura) {
    setProblema(null);

    const quantiErano = lettura.volumiLetti.map(Number);

    // Si spegne tutto subito: è un gesto che si fa guardando i
    // quadretti, e il riscontro deve stare lì.
    perSerie.setDati((precedenti) =>
      (precedenti || []).map((s) =>
        String(s.manga_id) === String(lettura.mangaId)
          ? { ...s, volumi: [], volumi_letti: 0 }
          : s
      )
    );

    aggiornaLettura(lettura.mangaId, 0);
    impostaVolume(lettura, { assoluto: 1 });

    try {
      await eseguiProtetto(() => deleteReadingHistorySerie(lettura.mangaId));
      perSerie.ricarica();
    } catch (e) {
      if (!e?.annullato) {
        segnalaErrore(`Non sono riuscito ad azzerare i volumi di ${lettura.titolo}.`);
      }
      perSerie.ricarica();
      aggiornaLettura(lettura.mangaId, quantiErano.length);
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

  /**
   * Rimettere sul tavolo una serie che sta in classifica.
   *
   * Il segnalibro non riparte da 1 e nemmeno da dove l'avevi lasciato
   * l'ultima volta: riparte dal PRIMO VOLUME NON LETTO, che è la
   * risposta alla domanda vera — "e adesso dove riprendo?". Su una
   * serie finita non c'è un volume dopo, e allora riparte dall'ultimo:
   * è il caso della rilettura.
   *
   * Toglie anche la serie dalle droppate: rimetterla in mano e
   * lasciarla segnata come mollata sarebbero due cose che si
   * contraddicono, e la seconda la terrebbe fuori dalle proposte.
   */
  async function rimettiInLettura(s) {
    setProblema(null);

    const da = primoNonLetto(s);

    try {
      await eseguiProtetto(() =>
        Promise.all([
          riprendiSerie(s.id),
          saveReadingSession({
            manga_id: s.id,
            titolo: s.titolo,
            autore: s.autore || "",
            coverurl: s.copertina || "",
            volume: da,
            volumitotali: s.totali ?? null
          })
        ])
      );

      aggiornaDroppato(s.id, false);
      sessioni.ricarica();
    } catch (e) {
      if (!e?.annullato) {
        segnalaErrore(`Non sono riuscito a rimettere ${s.titolo} in lettura.`);
      }
    }
  }

  /* -------------------- Vista -------------------- */

  const inCaricamento = sessioni.inCorso && !sessioni.dati;

  // Finite e senza voto: chiedono un voto, e il voto si dà da qui.
  const daVotare = mioTurno
    ? senzaVoto.filter((s) => {
        const tetto = tettoLettura(s.posseduti, s.totali);

        return tetto && volumiLettiDa(s, idVisto) >= tetto;
      })
    : [];

  // Le mollate da chi guarda: in fondo, chiuse, con «Riprendi».
  const mollate = mioTurno ? serie.filter((s) => droppataDa(s, idVisto)) : [];

  return (
    <Pagina
      titolo="In lettura"
      // Il comando sta qui in alto, e solo qui. Prima era sotto le
      // letture aperte: con otto libri sul tavolo finiva a metà pagina,
      // cioè in un posto che si raggiunge scorrendo — mentre aprire una
      // lettura è la prima cosa che si viene a fare.
      azioni={
        bibliotecaSolaLettura ? null : (
          <Bottone onClick={() => setSceltaAperta(true)}>
            <Icon nome="plus" dimensione={16} />
            Apri una serie
          </Bottone>
        )
      }
    >
      <div className="space-y-10">
        {bibliotecaSolaLettura && (
          <p className="rounded-card border border-hairline bg-glass-1 px-4 py-3 text-sm text-ink-muted">
            Questo è il tavolo di{" "}
            <span className="font-semibold text-ink-bright">{nomeLettore}</span>: di
            qua puoi guardare dove è arrivato e cosa ha letto. Le tue letture
            stanno in <Link to="/videoteca/io" className="font-medium text-brass-400 underline decoration-brass-400/30 underline-offset-2">videoteca</Link>.
          </p>
        )}

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

        {inGestione && attive.some((a) => a.idSessione === inGestione) && (
          <FoglioLettura
            lettura={attive.find((a) => a.idSessione === inGestione)}
            onChiudi={() => setInGestione(null)}
            onVaiAVolume={(lettura, n) => impostaVolume(lettura, { assoluto: n })}
            onLettiFinoAQui={segnaFinoA}
            onAnnullaLetto={annullaLetto}
            onAzzera={azzeraLetti}
            onTogli={togliDalTavolo}
            onDroppa={droppa}
            onVotoCambiato={(lettura, nuovo) => aggiornaVoto(lettura.mangaId, nuovo)}
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

        {inPrimoPiano && (
          <RiquadroSerie
            serie={serie.find((m) => m.id === inPrimoPiano.id)}
            cosa={inPrimoPiano.cosa}
            onChiudi={() => setInPrimoPiano(null)}
          />
        )}

        {/* ═══════════ STO LEGGENDO ═══════════ */}
        <Sezione
          titolo={mioTurno ? "Sto leggendo" : `Legge ${nomeLettore}`}
          extra={
            attive.length ? (
              <span className="font-numeric text-sm text-ink-muted">{attive.length}</span>
            ) : null
          }
        >
          {sessioni.errore ? (
            <Errore errore={sessioni.errore} riprova={sessioni.ricarica} />
          ) : inCaricamento ? (
            <CaricamentoElenco quante={2} />
          ) : attive.length ? (
            <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
              {attive.map((lettura, i) => (
                <li key={lettura.idSessione}>
                  <RigaLettura
                    lettura={lettura}
                    // Il server le manda dalla più recente: la prima è
                    // quella che stai leggendo adesso, e solo lei ha il
                    // tasto pieno.
                    principale={i === 0}
                    soloLettura={!mioTurno}
                    onAvanti={() => impostaVolume(lettura, { delta: 1 })}
                    onIndietro={() => impostaVolume(lettura, { delta: -1 })}
                    onLetto={() => segnaLetto(lettura)}
                    onGestisci={() => setInGestione(lettura.idSessione)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Vuoto
              titolo="Niente in lettura"
              testo="Con «Apri una serie», qui in alto, scegli cosa leggere: il segnalibro parte dal primo volume che non hai letto."
            />
          )}
        </Sezione>

        {/* ═══════════ DA VOTARE ═══════════ */}
        {daVotare.length > 0 && (
          <Sezione titolo="Da votare">
            <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">
              {daVotare.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/serie/${s.id}`} className="w-9 shrink-0">
                    <Copertina src={s.copertina} alt="" inclina={false} />
                  </Link>
                  <Link to={`/serie/${s.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-bright">
                    {s.titolo}
                  </Link>
                  <VotoStelle serie={s} dimensione={20} onCambiato={(nuovo) => aggiornaVoto(s.id, nuovo)} />
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        {/* ═══════════ LE TUE LETTE ═══════════ */}
        <Sezione
          titolo={mioTurno ? "Le tue lette" : `Le lette di ${nomeLettore}`}
          extra={<SceltaLettore lettori={lettori} scelto={lettoreScelto} onScegli={setSceltaLettore} />}
        >
          {lette.length ? (
            <div className="space-y-6">
              {votate.length > 0 && (
                <ol className="space-y-0.5">
                  {(tutteLeLette ? votate : votate.slice(0, 10)).map((s, posizione) => (
                    <RigaClassifica
                      key={s.id}
                      serie={s}
                      posizione={posizione + 1}
                      lettore={lettoreScelto}
                      mio={mioTurno}
                      giaSulTavolo={idInLettura.has(String(s.id))}
                      onTogli={() => togliDalleLette(s)}
                      onRimetti={() => rimettiInLettura(s)}
                      onApri={(cosa) => setInPrimoPiano({ id: s.id, cosa })}
                    />
                  ))}
                </ol>
              )}

              {!tutteLeLette && (votate.length > 10 || senzaVoto.length > daVotare.length) && (
                <button
                  type="button"
                  onClick={() => setTutteLeLette(true)}
                  className="w-full rounded-2xl bg-alcove py-3 text-sm font-semibold text-ink-bright"
                >
                  Mostra tutte ({votate.length + senzaVoto.length - daVotare.length})
                </button>
              )}

              {tutteLeLette && senzaVoto.length > daVotare.length && (
                <div className="space-y-2 border-t border-hairline pt-5">
                  <p className="px-2 text-sm text-ink-muted">
                    {mioTurno ? "Cominciate, senza voto" : `${nomeLettore} le ha lette senza votarle`}
                  </p>

                  <ul className="space-y-0.5">
                    {senzaVoto
                      .filter((s) => !daVotare.includes(s))
                      .map((s) => (
                        <RigaClassifica
                          key={s.id}
                          serie={s}
                          lettore={lettoreScelto}
                          mio={mioTurno}
                          giaSulTavolo={idInLettura.has(String(s.id))}
                          onTogli={() => togliDalleLette(s)}
                          onRimetti={() => rimettiInLettura(s)}
                          onApri={(cosa) => setInPrimoPiano({ id: s.id, cosa })}
                        />
                      ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <Vuoto
              titolo={mioTurno ? "Non hai ancora finito niente" : `${nomeLettore} non ha ancora letto niente`}
              testo="Ogni volume segnato come finito porta la sua serie qui."
            />
          )}
        </Sezione>

        {/* ═══════════ MOLLATE ═══════════ */}
        {mollate.length > 0 && (
          <details className="group rounded-2xl bg-alcove">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-ink-bright">
              <span>
                Mollate <span className="font-numeric text-ink-muted">· {mollate.length}</span>
              </span>
              <span aria-hidden="true" className="text-ink-muted transition-transform duration-quick group-open:rotate-180">
                ▾
              </span>
            </summary>

            <ul className="divide-y divide-hairline border-t border-hairline px-3.5">
              {mollate.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/serie/${s.id}`} className="w-8 shrink-0">
                    <Copertina src={s.copertina} alt="" inclina={false} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/serie/${s.id}`} className="block truncate text-sm font-semibold text-ink-bright">
                      {s.titolo}
                    </Link>
                    <p className="font-numeric text-xs text-ink-muted">
                      {plurale(volumiLettiDa(s, idVisto), "volume letto", "volumi letti")}
                    </p>
                  </div>
                  <Bottone variante="secondario" onClick={() => rimettiInLettura(s)} className="shrink-0 !px-3 !py-2 !text-xs">
                    Riprendi
                  </Bottone>
                </li>
              ))}
            </ul>
          </details>
        )}
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

/**
 * Una riga della classifica.
 *
 * PRIMA C'ERA UN TASTO SOLO, «Togli», scritto per esteso in fondo a
 * ogni riga. Occupava una colonna fissa su tutte per un gesto che si
 * fa due volte l'anno, ed era l'unica cosa che da qui si potesse fare
 * a una serie: per rimetterla in lettura, per rileggerne le note o per
 * correggerne il voto senza centrare una stella da sedici pixel,
 * bisognava andarsene da questa pagina.
 *
 * Adesso i comandi stanno sotto i tre puntini e la riga resta una
 * riga. Sono quattro, e ognuno vale una frase di spiegazione — cosa
 * che su una fila di tastini non ci sarebbe mai stata.
 *
 * LE STELLE QUI NON SI TOCCANO PIÙ, nemmeno sulla propria classifica.
 * Erano bersagli da otto pixel per mezza stella, incolonnati in un
 * elenco che sul telefono si scorre col pollice: bastava un tocco di
 * troppo mentre si scorreva per cambiare un voto senza accorgersene, e
 * per accorgersene bisognava ricordarsi cosa c'era prima. Il voto si
 * dà dal riquadro che apre il menu, dove le stelle sono grandi il
 * doppio e c'è scritto il numero. Qui restano quello che erano: un
 * dato, come il titolo.
 */
function RigaClassifica({
  serie,
  posizione,
  lettore,
  mio,
  giaSulTavolo,
  onTogli,
  onRimetti,
  onApri
}) {
  const voto = votoDi(serie, lettore);
  const note = serie.note?.length ?? 0;

  const voci = [
    mio && {
      chiave: "voto",
      etichetta: voto ? "Modifica il voto" : "Dai un voto",
      descrizione: voto ? `Adesso è ${votoIt(voto)} su 5.` : "Cinque stelle, anche a metà.",
      onClick: () => onApri("voto")
    },

    {
      chiave: "note",
      etichetta: note ? `Note (${note})` : "Scrivi una nota",
      // Le note si leggono in due: quelle di un'altra persona si
      // aprono anche stando sulla sua classifica, ed è il motivo per
      // cui questa voce non sta dietro `mio`.
      descrizione: note ? "Rileggile o aggiungine una." : "Cosa vuoi ricordarti di questa serie.",
      onClick: () => onApri("note")
    },

    mio &&
      typeof onRimetti === "function" && {
        chiave: "rimetti",
        etichetta: "Rimetti in lettura",
        descrizione: giaSulTavolo
          ? "È già aperta sul tavolo."
          : "Torna sul tavolo, dal primo volume che non hai letto.",
        spenta: giaSulTavolo,
        onClick: onRimetti
      },

    mio &&
      typeof onTogli === "function" && {
        chiave: "togli",
        etichetta: "Togli dalle lette",
        descrizione: "Cancella tutti i volumi segnati: esce dalla classifica.",
        conferma: "Confermi? Si perde tutto",
        pericolo: true,
        onClick: onTogli
      }
  ];

  return (
    <li className="group flex items-center gap-3 rounded-card px-2 py-1.5 transition-colors duration-quick hover:bg-glass-1 sm:gap-3.5 sm:px-3 sm:py-2">
      {/* Il numero solo dove c'è una posizione: fra le non votate
          sarebbe una graduatoria inventata. */}
      <span className="w-6 shrink-0 text-right font-numeric text-sm text-ink-faint">
        {posizione ?? ""}
      </span>

      {/* La copertina porta alla scheda come il titolo. È l'oggetto più
          grosso e riconoscibile della riga: chi vuole aprire una serie
          ci va sopra per istinto, e trovarci un'immagine morta era una
          piccola smentita a ogni tentativo. Resta fuori dal percorso
          della tastiera perché il titolo accanto porta esattamente
          allo stesso posto: due fermate per la stessa destinazione
          raddoppiano la lunghezza dell'elenco senza aggiungere niente. */}
      <Link
        to={`/serie/${serie.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="w-8 shrink-0 rounded-card transition-transform duration-quick ease-settle hover:scale-105"
      >
        <Copertina src={serie.copertina} alt="" inclina={false} />
      </Link>

      <Link
        to={`/serie/${serie.id}`}
        className="min-w-0 flex-1 truncate text-sm text-ink-bright transition-colors duration-quick hover:text-brass-300"
      >
        {serie.titolo}
      </Link>

      {/* Un pallino per nota: la classifica è anche il posto da cui ci
          si accorge che di una serie si era scritto qualcosa. */}
      {note > 0 && (
        <span
          aria-hidden="true"
          title={plurale(note, "nota", "note")}
          className="hidden shrink-0 gap-1 sm:flex"
        >
          {serie.note.map((n) => (
            <span
              key={n.id}
              className={`h-1.5 w-1.5 rounded-full ${coloreLettore(n.colore).pallino}`}
            />
          ))}
        </span>
      )}

      <span
        className="hidden shrink-0 items-center gap-0.5 sm:inline-flex"
        aria-label={voto ? `Voto ${votoIt(voto)} su 5` : "Non votato"}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Stella
            key={n}
            riempimento={Math.min(1, Math.max(0, (voto ?? 0) - n + 1))}
            dimensione={16}
          />
        ))}
      </span>

      <span className="w-8 shrink-0 text-right font-numeric text-sm text-ink-bright">
        {voto ? votoIt(voto) : "—"}
      </span>

      <Menu etichetta={`Altro su ${serie.titolo}`} voci={voci} larghezza="17rem" />
    </li>
  );
}

/* ==================================================
   IL RIQUADRO DI UNA SERIE: VOTO O NOTE
   ================================================== */

/**
 * Quello che dalla riga di classifica non ci stava.
 *
 * Due contenuti in una cornice sola, e non due finestre: la cornice
 * dice la stessa cosa — «questa serie, da vicino» — e cambia solo
 * quello che ci si viene a fare. Con due componenti separati le due
 * intestazioni avrebbero cominciato a divergere alla prima modifica.
 */
function RiquadroSerie({ serie, cosa, onChiudi }) {
  const velo = useChiusuraVelo(onChiudi);

  // La serie può sparire sotto i piedi: succede togliendola dalle
  // lette mentre il riquadro è aperto.
  useEffect(() => {
    if (!serie) onChiudi();
  }, [serie, onChiudi]);

  if (!serie) return null;

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center overflow-y-auto bg-void/70 p-4 py-10 backdrop-blur-sm animate-rise-in"
        onKeyDown={(e) => {
          if (e.key === "Escape") onChiudi();
        }}
        {...velo}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${cosa === "voto" ? "Voto" : "Note"}: ${serie.titolo}`}
          className="w-full max-w-md space-y-5 rounded-panel border border-hairline bg-glass-3 p-5 shadow-float backdrop-blur-2xl sm:p-6"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-12 shrink-0 sm:w-14">
              <Copertina src={serie.copertina} alt="" inclina={false} />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                to={`/serie/${serie.id}`}
                className="block font-display text-lg font-semibold leading-tight text-ink-bright transition-colors duration-quick hover:text-brass-300"
              >
                {serie.titolo}
              </Link>

              {serie.autore && (
                <p className="mt-0.5 truncate text-sm text-ink-muted">{serie.autore}</p>
              )}
            </div>

            <button
              onClick={onChiudi}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
            >
              ✕
            </button>
          </div>

          {cosa === "voto" ? (
            <ModuloVoto serie={serie} />
          ) : (
            <div className="border-t border-hairline pt-5">
              <NoteSerie serie={serie} compatto />
            </div>
          )}
        </div>
      </div>
    </Sovrapposizione>
  );
}

/** Le parole accanto al numero: un «3» secco non dice se è poco o tanto. */
const PAROLE_VOTO = {
  0.5: "da dimenticare",
  1: "no",
  1.5: "quasi no",
  2: "si legge",
  2.5: "nella media",
  3: "buona",
  3.5: "molto buona",
  4: "notevole",
  4.5: "quasi perfetta",
  5: "capolavoro"
};

/**
 * Il voto, con lo spazio che sulla riga non aveva.
 *
 * Stelle a trentadue pixel invece che a sedici: la mezza stella
 * diventa un bersaglio da mezzo centimetro invece che da un quarto, e
 * col dito `VotoStelle` le ingrandisce ancora di suo. Sotto, il numero
 * scritto — contare le stelle di un voto già dato è un lavoro che
 * nessuno dovrebbe fare — e il modo di ritirarlo.
 */
function ModuloVoto({ serie }) {
  const { aggiornaVoto } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();
  const [problema, setProblema] = useState(null);

  const voto = serie.valutazione ?? null;

  async function togliIlVoto() {
    const precedente = voto;

    setProblema(null);
    aggiornaVoto(serie.id, null);

    try {
      await eseguiProtetto(() => updateRating(serie.id, null));
    } catch (e) {
      if (!e?.annullato) {
        aggiornaVoto(serie.id, precedente);
        setProblema("Il voto non è stato tolto.");
      }
    }
  }

  return (
    <div className="space-y-4 border-t border-hairline pt-5">
      <div className="flex flex-col items-center gap-3">
        <VotoStelle
          serie={serie}
          dimensione={32}
          onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)}
        />

        <p className="text-center">
          <span className="font-numeric text-2xl font-semibold text-ink-bright">
            {voto ? votoIt(voto) : "—"}
          </span>
          <span className="ml-1 text-sm text-ink-faint">/ 5</span>

          <span className="mt-0.5 block text-sm text-ink-muted">
            {voto ? PAROLE_VOTO[voto] : "non l'hai ancora votata"}
          </span>
        </p>
      </div>

      {problema && (
        <p role="alert" className="text-center text-sm text-ember">
          {problema}
        </p>
      )}

      <p className="text-center text-xs text-ink-faint">
        Mezzo voto: la metà sinistra di ogni stella.
      </p>

      {voto && (
        <div className="flex justify-center">
          <Bottone variante="fantasma" onClick={togliIlVoto} className="!text-xs">
            Togli il voto
          </Bottone>
        </div>
      )}
    </div>
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
            Scegli dalla collezione. Il segnalibro parte dal primo volume che non hai letto.
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
   FINE LETTURA: IL VOTO
   ================================================== */

/**
 * L'ultimo volume che possiedi di una serie: la domanda giusta è «che
 * voto le dai?», con le stesse stelle usate ovunque. (Fino al 04/10/2026
 * c'erano anche i coriandoli: tolti, era scena e basta.)
 */
function ModaleCompletamento({ lettura, serie, onVotoCambiato, onChiudi }) {
  const velo = useChiusuraVelo(onChiudi);

  return (
    <Sovrapposizione>
    <div
      className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-5 backdrop-blur-sm animate-rise-in"
      {...velo}
    >
      <div className="w-full max-w-sm space-y-5 rounded-panel border border-hairline bg-glass-3 p-6 text-center shadow-float backdrop-blur-2xl">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-bright">
            Finita
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
function RigaLettura({ lettura, principale, soloLettura, onAvanti, onIndietro, onLetto, onGestisci }) {
  const { volume, massimo, titolo } = lettura;
  const letti = new Set(lettura.volumiLetti.map(Number)).size;
  const percento = massimo ? Math.min(100, Math.round((letti / massimo) * 100)) : null;
  const eUltimo = massimo ? volume >= massimo : false;
  const giaLetto = lettura.volumiLetti.map(Number).includes(volume);

  return (
    <div className="flex gap-3.5 rounded-2xl bg-alcove p-3.5">
      <Link to={`/serie/${lettura.mangaId}`} className="w-[3.25rem] shrink-0 self-start">
        <Copertina src={lettura.copertina} alt="" inclina={false} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link to={`/serie/${lettura.mangaId}`} className="block truncate font-semibold text-ink-bright">
              {titolo}
            </Link>
            <p className="mt-0.5 text-[0.8rem] text-ink-muted">
              Volume <span className="font-numeric font-semibold text-ink-bright">{volume}</span>
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
              className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors duration-quick hover:bg-glass-2 hover:text-ink-bright"
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
          <div className="mt-3 flex items-center gap-2">
            <div className="flex shrink-0 items-center rounded-xl bg-glass-2">
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
              className={`h-10 min-w-0 flex-1 truncate rounded-xl px-3 text-sm font-semibold transition-transform duration-quick active:scale-[0.98] disabled:opacity-50 ${
                principale ? "bg-brass-400 text-void" : "bg-glass-2 text-ink-bright"
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
function FoglioLettura({
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
  const velo = useChiusuraVelo(onChiudi);
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
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal flex items-end justify-center bg-void/60 backdrop-blur-sm sm:items-center sm:p-4"
        onKeyDown={(e) => {
          if (e.key === "Escape") onChiudi();
        }}
        {...velo}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Gestisci ${lettura.titolo}`}
          className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-sheet bg-alcove p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-float animate-rise-in sm:rounded-sheet"
        >
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-glass-2 hover:text-ink-bright"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </div>

          {/* Il voto: sta in cima perché è la cosa che si viene a fare
              più spesso dopo «finito». */}
          {serie && (
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-shelf px-4 py-3">
              <span className="text-sm font-medium text-ink-bright">Il tuo voto</span>
              <VotoStelle serie={serie} dimensione={22} onCambiato={(nuovo) => onVotoCambiato(lettura, nuovo)} />
            </div>
          )}

          {/* Il salto: per spostare il segnalibro lontano senza premere
              «+» venti volte. Non segna niente come letto. */}
          <form onSubmit={vai} className="mt-3 flex items-center gap-2 rounded-2xl bg-shelf px-4 py-2.5">
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

          <ul className="mt-3 divide-y divide-hairline rounded-2xl bg-shelf">
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
      </div>
    </Sovrapposizione>
  );
}
