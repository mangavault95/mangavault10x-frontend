import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import { Bottone } from "../ui/Controlli";
import { VotoStelle } from "../ui/AzioniSerie";
import Menu from "../ui/Menu";
import { vibra } from "../dati/tatto";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { nomeDi } from "../dati/lettori";
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
  updateReadingSession
} from "../services/api";
import { SceltaLettore, RigaClassifica, RiquadroSerie } from "../ui/lettura/Classifica";
import { SceltaSerie } from "../ui/lettura/SceltaSerie";
import { ModaleCompletamento, RigaLettura, FoglioLettura } from "../ui/lettura/RigaLettura";

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
 *   Le tue letture — la classifica, dal voto più alto.
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

  const sessioni = useRisorsa(getReadingSessions, { chiave: "sessioni" });
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
    vibra("conferma");
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
          // Un contorno e non l'insegna: la luce della pagina spetta a
          // «Finito il N», il gesto che si fa ogni sera.
          <Bottone variante="secondario" onClick={() => setSceltaAperta(true)} className="!border-brass-400/50">
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
            attive.length || mollate.length ? (
              <span className="font-numeric text-sm text-ink-muted">
                {attive.length} in corso
                {mollate.length > 0 && (
                  <>
                    {" · "}
                    {/* Le mollate stanno chiuse in fondo: il conto qui
                        le rende visibili e porta a loro con un tocco. */}
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("mollate");

                        if (el) {
                          el.open = true;
                          el.scrollIntoView({ block: "center" });
                        }
                      }}
                      className="underline decoration-ink-faint decoration-dotted underline-offset-4 hover:text-ink-bright"
                    >
                      {mollate.length} mollate
                    </button>
                  </>
                )}
              </span>
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
                    ultima={i === 0 && attive.length > 1}
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
            <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">
              {daVotare.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Link to={`/serie/${s.id}`} className="w-9 shrink-0">
                    <Copertina src={s.copertina} alt="" inclina={false} />
                  </Link>
                  <Link to={`/serie/${s.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-bright">
                    {s.titolo}
                  </Link>
                  <VotoStelle serie={s} dimensione={20} onCambiato={(nuovo) => aggiornaVoto(s.id, nuovo)} />
                  {/* Una serie finisce qui anche per sbaglio: segnata a nome
                      tuo mentre la leggeva l'altra persona (Clover in Love,
                      04/10/2026). Toglierla cancella solo i TUOI volumi. */}
                  <Menu
                    etichetta={`Altro su ${s.titolo}`}
                    voci={[
                      {
                        chiave: "non-mia",
                        etichetta: "Non l'ho letta io",
                        descrizione: "Toglie i volumi segnati a tuo nome. Le letture degli altri restano.",
                        conferma: "Sicuro? Tocca di nuovo",
                        pericolo: true,
                        onClick: () => togliDalleLette(s)
                      }
                    ]}
                  />
                </li>
              ))}
            </ul>
          </Sezione>
        )}

        {/* ═══════════ LE TUE LETTURE ═══════════ */}
        <div id="letture" className="scroll-mt-4">
        <Sezione
          titolo={mioTurno ? "Le tue letture" : `Le letture di ${nomeLettore}`}
          extra={<SceltaLettore lettori={lettori} scelto={lettoreScelto} onScegli={setSceltaLettore} />}
        >
          {lette.length ? (
            <div className="space-y-6">
              {/* Con l'elenco aperto il modo di richiuderlo resta in vista
                  mentre si scorre: prima il tasto stava in fondo a cento
                  righe, e riaccorciare la pagina voleva dire scorrerle
                  tutte. */}
              {tutteLeLette && (
                <div className="sticky top-0 z-sticky -mx-4 bg-shelf/90 px-4 py-2 backdrop-blur-md sm:-mx-0 sm:px-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTutteLeLette(false);
                      document.getElementById("letture")?.scrollIntoView({ block: "start" });
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-card bg-alcove py-2.5 text-sm font-semibold text-ink-bright shadow-float"
                  >
                    <Icon nome="back" dimensione={16} className="rotate-90" />
                    Riduci l'elenco
                  </button>
                </div>
              )}

              {/* Di default una striscia di copertine, con il voto
                  sopra: dieci righe «titolo + 5» non dicevano cosa fosse
                  quel 5 e non avevano un'immagine da riconoscere. La
                  lista con i comandi (voto, note, rimetti, togli) si
                  apre da «Mostra tutte». */}
              {!tutteLeLette && votate.length > 0 && (
                <ol className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                  {votate.slice(0, 20).map((s) => (
                    <li key={s.id} className="w-[5.25rem] shrink-0 snap-start">
                      <Link
                        to={`/serie/${s.id}`}
                        title={s.titolo}
                        aria-label={`${s.titolo}, voto ${votoIt(votoDi(s, lettoreScelto))} su 5`}
                        className="relative block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
                      >
                        <Copertina src={s.copertina} alt="" inclina={false} />

                        <span className="absolute left-1 top-1 rounded-full bg-void/70 px-1.5 py-0.5 font-numeric text-micro font-medium text-brass-300 backdrop-blur-sm">
                          {votoIt(votoDi(s, lettoreScelto))}★
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}

              {tutteLeLette && votate.length > 0 && (
                <ol className="space-y-0.5">
                  {votate.map((s, posizione) => (
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

              {!tutteLeLette && (
                <button
                  type="button"
                  onClick={() => setTutteLeLette(true)}
                  className="w-full rounded-card bg-alcove py-3 text-sm font-semibold text-ink-bright"
                >
                  Mostra tutte in elenco ({votate.length + senzaVoto.length - daVotare.length})
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
        </div>

        {/* ═══════════ MOLLATE ═══════════ */}
        {mollate.length > 0 && (
          <details id="mollate" className="group scroll-mt-24 rounded-card bg-alcove">
            {/* L'intestazione resta attaccata in alto finché la sezione è
                aperta: per chiuderla non serve tornare su a cercarla. */}
            <summary className="sticky top-0 z-sticky flex cursor-pointer list-none items-center justify-between rounded-card bg-alcove px-4 py-3.5 text-sm font-semibold text-ink-bright group-open:shadow-float">
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
