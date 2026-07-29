/**
 * Da intento a risposta.
 *
 * Due regole, e la seconda è quella che cambia il carattere del
 * bibliotecario.
 *
 * **Non si inventa.** Se un dato non c'è, la risposta lo dice. Un
 * bibliotecario che tira a indovinare sui numeri è peggio di uno che
 * non risponde.
 *
 * **Si risponde alla domanda, poi si aggiunge UNA cosa.** Chi chiede
 * quanto costa un volume non vuole la scheda completa: vuole il
 * prezzo, e magari sapere quanto gli manca per finire la serie. Una
 * sola aggiunta, quella pertinente — non tutte quelle disponibili,
 * che è come non aggiungere niente.
 *
 * Ogni risposta porta con sé il `soggetto`: è così che il pannello
 * tiene il filo e la domanda dopo può essere "e quanto costa?".
 */

import { INTENTI } from "./intenti";
import { cercaFuori, scegliCorrispondenza, similiFuoriPerId } from "./esterni";
import { scartaQuelloCheHai, similiInCollezione } from "./somiglianza";
import {
  ETICHETTE_STATO,
  completamento,
  euro,
  numeroIt,
  plurale,
  valoreSerie,
  volumiMancanti
} from "../dati/serie";

const SUGGERIMENTI_BASE = [
  "Cosa mi manca?",
  "Quanto costa completare tutto?",
  "Consigliami qualcosa di horror",
  "Qualcosa di simile a Monster"
];

/* ==================================================
   L'ORCHESTRATORE
   ================================================== */

export async function rispondi(lettura, { serie, sessioni }) {
  const { intento, serie: soggetto } = lettura;

  switch (intento) {
    case INTENTI.SALUTO:
      return {
        testo:
          "Buongiorno. Sono al banco: conosco a memoria le tue " +
          `${plurale(serie.length, "serie", "serie")} e posso cercare fuori quello che non hai.`,
        suggerimenti: SUGGERIMENTI_BASE
      };

    case INTENTI.AIUTO:
      return aiuto();

    /* ---- Globali ---- */
    case INTENTI.CONTA_SERIE:
      return contaSerie(serie);
    case INTENTI.CONTA_VOLUMI:
      return contaVolumi(serie);
    case INTENTI.VALORE:
      return valore(serie);
    case INTENTI.COSTO_COMPLETAMENTO:
      return costoCompletamento(serie);
    case INTENTI.DA_COMPLETARE:
      return daCompletare(serie);
    case INTENTI.IN_LETTURA:
      return inLettura(serie, sessioni);
    case INTENTI.CONSIGLIO:
      return consiglio(serie, lettura.genere);
    case INTENTI.PRIMATO:
      return primato(serie, lettura.quale);
    case INTENTI.PER_GENERE:
      return perGenere(serie, lettura.genere);
    case INTENTI.PER_AUTORE:
      return perAutore(serie, lettura.testo);

    /* ---- Su una serie ---- */
    case INTENTI.SERIE_MANCANTI:
      return conSoggetto(serieMancanti(soggetto), soggetto, lettura);
    case INTENTI.SERIE_POSSIEDO:
      return conSoggetto(seriePossiedo(soggetto), soggetto, lettura);
    case INTENTI.SERIE_TRAMA:
      return conSoggetto(await serieTrama(soggetto), soggetto, lettura);
    case INTENTI.SERIE_COSTO:
      return conSoggetto(serieCosto(soggetto), soggetto, lettura);
    case INTENTI.SERIE_VOLUMI:
      return conSoggetto(serieVolumi(soggetto), soggetto, lettura);
    case INTENTI.SERIE_AUTORE:
      return conSoggetto(serieAutore(soggetto, serie), soggetto, lettura);
    case INTENTI.SERIE_EDITORE:
      return conSoggetto(serieEditore(soggetto, serie), soggetto, lettura);
    case INTENTI.SERIE_STATO:
      return conSoggetto(serieStato(soggetto), soggetto, lettura);
    case INTENTI.SERIE_VOTO:
      return conSoggetto(serieVoto(soggetto, serie), soggetto, lettura);
    case INTENTI.SERIE_INFO:
      return conSoggetto(serieInfo(soggetto), soggetto, lettura);
    case INTENTI.SIMILE_A:
      return conSoggetto(await simileA(soggetto, serie), soggetto, lettura);

    case INTENTI.SOGGETTO_MANCANTE:
      return soggettoMancante(lettura.quale);

    case INTENTI.FUORI_COLLEZIONE:
      return fuoriCollezione(lettura.testo, lettura.argomento, serie);

    default:
      return nonCapito();
  }
}

/**
 * Attacca il soggetto alla risposta, e — se è stato ripreso dal
 * discorso invece che nominato — lo dice.
 *
 * Dichiararlo serve a evitare il malinteso peggiore: chiedere "quanto
 * costa?" pensando a una serie e ricevere il prezzo di un'altra senza
 * accorgersene. Se il bibliotecario ha capito male, così te ne accorgi
 * subito.
 */
function conSoggetto(risposta, soggetto, lettura) {
  return {
    ...risposta,
    soggetto,
    ripreso: lettura.soggettoEreditato ? soggetto?.titolo : null
  };
}

/* ==================================================
   GLOBALI
   ================================================== */

function aiuto() {
  return {
    testo:
      "Su una serie so dirti la trama, il prezzo, quanti volumi ti mancano, chi " +
      "l'ha scritta, chi la pubblica, se è finita. E non serve ripetere il titolo " +
      "ogni volta: se dopo mi chiedi «quanto costa?» so ancora di cosa parliamo.\n\n" +
      "Sulla collezione intera: quante serie, quanti volumi, quanto vale, cosa ti " +
      "manca, dove sei arrivato.\n\n" +
      "Se ti serve qualcosa di simile a un titolo, ti dico cosa hai già che gli " +
      "somiglia e cosa potresti comprare.\n\n" +
      "Quello che non so fare: giudicare i tuoi gusti, confrontare edizioni, " +
      "dirti i prezzi dell'usato (quelli stanno nella scheda di ogni serie).",
    suggerimenti: SUGGERIMENTI_BASE
  };
}

function contaSerie(serie) {
  const complete = serie.filter((s) => completamento(s) === 100).length;
  const iniziate = serie.filter((s) => volumiMancanti(s) > 0).length;

  return {
    testo:
      `Hai ${plurale(serie.length, "serie", "serie")}. ` +
      `${numeroIt(complete)} sono complete, ${numeroIt(iniziate)} ti mancano dei volumi.`
  };
}

function contaVolumi(serie) {
  const volumi = serie.reduce((t, s) => t + s.posseduti, 0);
  const mancanti = serie.reduce((t, s) => t + (volumiMancanti(s) || 0), 0);

  return {
    testo:
      `${plurale(volumi, "volume in casa", "volumi in casa")}, ` +
      `distribuiti su ${plurale(serie.length, "serie", "serie")}. ` +
      `Per chiudere tutto te ne mancano ${numeroIt(mancanti)}.`
  };
}

function valore(serie) {
  const totale = serie.reduce((t, s) => t + valoreSerie(s), 0);
  const senzaPrezzo = serie.filter((s) => !s.costo).length;

  return {
    testo:
      `Al prezzo di copertina, quello che hai in casa vale ${euro(totale)}.` +
      (senzaPrezzo
        ? `\n\nAttenzione: ${plurale(senzaPrezzo, "serie non ha", "serie non hanno")} ` +
          "il prezzo registrato, quindi il totale è per difetto."
        : "")
  };
}

function costoCompletamento(serie) {
  let costo = 0;
  let volumi = 0;
  let senzaPrezzo = 0;

  for (const s of serie) {
    const mancanti = volumiMancanti(s);

    if (!mancanti) continue;

    volumi += mancanti;

    if (s.costo) costo += mancanti * s.costo;
    else senzaPrezzo += 1;
  }

  if (!volumi) {
    return { testo: "Niente: non ti manca nessun volume. Complimenti, è raro." };
  }

  return {
    testo:
      `Ti mancano ${plurale(volumi, "volume", "volumi")}, per circa ${euro(costo)} ` +
      "al prezzo di copertina." +
      (senzaPrezzo
        ? `\n\nIl conto esclude ${plurale(senzaPrezzo, "serie senza prezzo registrato", "serie senza prezzo registrato")}.`
        : "")
  };
}

function daCompletare(serie) {
  const elenco = serie
    .filter((s) => volumiMancanti(s) > 0 && s.posseduti > 0)
    .sort((a, b) => volumiMancanti(a) - volumiMancanti(b));

  if (!elenco.length) {
    return { testo: "Non ti manca niente di quello che hai iniziato." };
  }

  return {
    testo:
      `${plurale(elenco.length, "serie da completare", "serie da completare")}. ` +
      "Queste sono le più vicine alla fine:",
    serie: elenco.slice(0, 6),
    dettaglio: (s) => `−${volumiMancanti(s)}`
  };
}

function inLettura(serie, sessioni) {
  if (!sessioni?.length) {
    return {
      testo:
        "Non hai letture aperte. Quando ne cominci una compare qui con il volume a cui sei arrivato."
    };
  }

  const attive = sessioni
    .map((s) => {
      const collegata = serie.find((m) => String(m.id) === String(s.manga_id));

      return collegata ? { ...collegata, volumeCorrente: Number(s.volume) || 1 } : null;
    })
    .filter(Boolean);

  if (!attive.length) {
    return {
      testo: "Ci sono letture aperte, ma le serie a cui puntano non sono più in collezione."
    };
  }

  return {
    testo: `${plurale(attive.length, "lettura aperta", "letture aperte")}:`,
    serie: attive,
    dettaglio: (s) => `vol. ${s.volumeCorrente}`,
    soggetto: attive.length === 1 ? attive[0] : undefined
  };
}

function consiglio(serie, genere) {
  let candidate = serie.filter((s) => completamento(s) === 100);

  if (genere) candidate = candidate.filter((s) => s.generi.includes(genere));

  if (!candidate.length) {
    return {
      testo: genere
        ? `Non hai nessuna serie completa di genere ${genere}. Vuoi che cerchi fuori?`
        : "Non hai serie complete fra cui scegliere.",
      suggerimenti: genere ? [`Cerca manga ${genere.toLowerCase()}`] : undefined
    };
  }

  const migliori = [...candidate]
    .sort((a, b) => (b.valutazione ?? 0) - (a.valutazione ?? 0))
    .slice(0, 8);

  const scelte = migliori.sort(() => Math.random() - 0.5).slice(0, 3);

  return {
    testo:
      (genere ? `Fra le tue serie complete di genere ${genere}` : "Fra le tue serie complete") +
      ", queste le hai già tutte e sono pronte da leggere:",
    serie: scelte,
    dettaglio: (s) => (s.valutazione > 0 ? `${s.valutazione.toFixed(1)}/10` : `${s.posseduti} vol.`)
  };
}

function primato(serie, quale) {
  const criteri = {
    lunga: {
      estrai: (s) => s.posseduti || null,
      frase: (s, v) => `La serie di cui hai più volumi è ${s.titolo}: ${v} volumi.`
    },
    valore: {
      estrai: (s) => valoreSerie(s) || null,
      frase: (s, v) => `Quella che vale di più è ${s.titolo}: ${euro(v)} di copertine.`
    },
    voto: {
      estrai: (s) => (s.valutazione > 0 ? s.valutazione : null),
      frase: (s, v) => `Il voto più alto che hai dato è ${v.toFixed(1)}, a ${s.titolo}.`
    }
  };

  const criterio = criteri[quale];

  if (!criterio) return nonCapito();

  const candidate = serie.filter((s) => criterio.estrai(s) !== null);

  if (!candidate.length) {
    return { testo: "Non ho abbastanza dati registrati per rispondere." };
  }

  const vincitrice = candidate.reduce((a, b) =>
    criterio.estrai(b) > criterio.estrai(a) ? b : a
  );

  return {
    testo: criterio.frase(vincitrice, criterio.estrai(vincitrice)),
    serie: [vincitrice],
    soggetto: vincitrice
  };
}

function perGenere(serie, genere) {
  const elenco = serie.filter((s) => s.generi.includes(genere));

  if (!elenco.length) {
    return {
      testo: `In collezione non hai niente di genere ${genere}.`,
      suggerimenti: [`Cerca manga ${genere.toLowerCase()}`]
    };
  }

  return {
    testo: `${plurale(elenco.length, "serie", "serie")} di genere ${genere}:`,
    serie: elenco.slice(0, 6),
    dettaglio: (s) => `${s.posseduti}${s.totali ? `/${s.totali}` : ""} vol.`
  };
}

function perAutore(serie, testo) {
  if (!testo) return nonCapito();

  const cercato = testo.toLowerCase();

  const elenco = serie.filter((s) =>
    [s.autore, s.disegnatore]
      .filter(Boolean)
      .some((n) => n.toLowerCase().includes(cercato) || cercato.includes(n.toLowerCase()))
  );

  if (!elenco.length) {
    return { testo: `Non trovo nessuna serie di «${testo}» in collezione.` };
  }

  const volumi = elenco.reduce((t, s) => t + s.posseduti, 0);

  return {
    testo:
      `${plurale(elenco.length, "serie", "serie")} di ${elenco[0].autore || testo}, ` +
      `${plurale(volumi, "volume in tutto", "volumi in tutto")}:`,
    serie: elenco.slice(0, 6),
    dettaglio: (s) => `${s.posseduti} vol.`
  };
}

/* ==================================================
   UNA SERIE — UNA DOMANDA, UNA RISPOSTA
   ================================================== */

function serieMancanti(s) {
  const mancanti = volumiMancanti(s);

  if (mancanti === null) {
    return {
      testo:
        `Di ${s.titolo} hai ${plurale(s.posseduti, "volume", "volumi")}, ma non ho ` +
        "registrato quanti siano in tutto: non posso dirti cosa manca.",
      serie: [s]
    };
  }

  if (mancanti === 0) {
    return {
      testo: `${s.titolo} ce l'hai completa: ${plurale(s.posseduti, "volume", "volumi")}.`,
      serie: [s]
    };
  }

  const spesa = s.costo ? ` Per finirla servono circa ${euro(mancanti * s.costo)}.` : "";

  return {
    testo:
      `Di ${s.titolo} hai ${s.posseduti} volumi su ${s.totali}: ` +
      `te ne mancano ${numeroIt(mancanti)}.${spesa}`,
    serie: [s]
  };
}

function seriePossiedo(s) {
  return {
    testo:
      `Sì, ${s.titolo} è in collezione: ` +
      `${plurale(s.posseduti, "volume", "volumi")}${s.totali ? ` su ${s.totali}` : ""}.`,
    serie: [s]
  };
}

/**
 * La trama, e solo la trama.
 *
 * Se in collezione manca, la si va a prendere fuori invece di
 * rispondere "non ce l'ho": la domanda è legittima e la risposta
 * esiste, sta solo altrove. Da dove viene è scritto.
 */
async function serieTrama(s) {
  if (s.trama) {
    return { testo: `${s.titolo}, in breve:`, trama: s.trama, serie: [s] };
  }

  try {
    const fuori = await cercaFuori(s.titolo, 1);

    if (fuori[0]?.trama) {
      return {
        testo:
          `Nella scheda di ${s.titolo} non ho la trama. Questa arriva da AniList, ` +
          "in inglese:",
        trama: fuori[0].trama,
        serie: [s],
        fonte: "AniList"
      };
    }
  } catch {
    // Rete assente o AniList giù: si dice quel che si sa, cioè niente.
  }

  return {
    testo: `Della trama di ${s.titolo} non ho niente, né in scheda né su AniList.`,
    serie: [s]
  };
}

function serieCosto(s) {
  if (!s.costo) {
    return {
      testo: `Di ${s.titolo} non ho registrato il prezzo di copertina.`,
      serie: [s]
    };
  }

  const speso = valoreSerie(s);
  const mancanti = volumiMancanti(s);

  // L'aggiunta pertinente: quanto hai già messo, e quanto ti resta.
  const coda =
    mancanti > 0
      ? ` Hai speso ${euro(speso)} per i ${s.posseduti} che hai; per gli altri ${mancanti} servono circa ${euro(mancanti * s.costo)}.`
      : ` In tutto ti è costata ${euro(speso)}.`;

  return {
    testo: `${s.titolo} costa ${euro(s.costo)} a volume.${coda}`,
    serie: [s]
  };
}

function serieVolumi(s) {
  if (!s.totali) {
    return {
      testo:
        `Di ${s.titolo} hai ${plurale(s.posseduti, "volume", "volumi")}. ` +
        "Quanti siano in tutto non è registrato.",
      serie: [s]
    };
  }

  const stato = s.stato === "in_corso" ? " — ma la serie è ancora in corso" : "";

  return {
    testo:
      `${s.titolo} è in ${plurale(s.totali, "volume", "volumi")}${stato}. ` +
      `Tu ne hai ${s.posseduti}.`,
    serie: [s]
  };
}

/**
 * Chi l'ha fatta.
 *
 * Il campo `Disegnatore` di parecchie schede è sporco: a volte ripete
 * l'autore, a volte contiene una lista intera ("Naoki Urasawa, Les
 * Travaux d'Hercule"). Leggerlo alla lettera produce frasi come
 * "Urasawa ai testi, Urasawa e Les Travaux d'Hercule ai disegni", che
 * fa sembrare rotto il bibliotecario invece del dato. Quindi si separa
 * la firma solo quando è davvero un'altra persona.
 */
function firmaDi(s) {
  if (!s.disegnatore) return s.autore;
  if (!s.autore) return s.disegnatore;

  const autore = s.autore.toLowerCase();
  const disegnatore = s.disegnatore.toLowerCase();

  // Stessa persona, o il campo disegnatore che si porta dentro
  // l'autore: si cita una firma sola.
  if (disegnatore === autore || disegnatore.includes(autore)) return s.autore;

  return `${s.autore} ai testi, ${s.disegnatore} ai disegni`;
}

function serieAutore(s, tutte) {
  if (!s.autore && !s.disegnatore) {
    return { testo: `Di ${s.titolo} non ho registrato l'autore.`, serie: [s] };
  }

  const firma = firmaDi(s);

  // L'aggiunta pertinente: cos'altro hai della stessa persona.
  const altre = tutte.filter(
    (a) =>
      a.id !== s.id &&
      [a.autore, a.disegnatore].some((n) => n && (n === s.autore || n === s.disegnatore))
  );

  return {
    testo:
      `${s.titolo} è di ${firma}.` +
      (altre.length
        ? ` In collezione hai altre ${plurale(altre.length, "sua serie", "sue serie")}:`
        : " Non hai altro suo in collezione."),
    serie: altre.length ? altre.slice(0, 5) : [s],
    dettaglio: altre.length ? (a) => `${a.posseduti} vol.` : undefined
  };
}

function serieEditore(s, tutte) {
  if (!s.editore) {
    return { testo: `Di ${s.titolo} non ho registrato l'editore.`, serie: [s] };
  }

  const quante = tutte.filter((a) => a.editore === s.editore).length;

  return {
    testo:
      `${s.titolo} la pubblica ${s.editore}. ` +
      `In collezione hai ${plurale(quante, "serie", "serie")} di questo editore.`,
    serie: [s]
  };
}

function serieStato(s) {
  if (!s.stato) {
    return {
      testo: `Di ${s.titolo} non ho registrato se sia conclusa o ancora in corso.`,
      serie: [s]
    };
  }

  const mancanti = volumiMancanti(s);

  const coda =
    s.stato === "conclusa"
      ? mancanti > 0
        ? ` L'edizione è chiusa, quindi i ${mancanti} che ti mancano non usciranno più: vanno cercati.`
        : " E tu ce l'hai tutta."
      : " Quindi usciranno altri volumi.";

  return {
    testo: `${s.titolo} è ${ETICHETTE_STATO[s.stato]?.toLowerCase() || s.stato}.${coda}`,
    serie: [s]
  };
}

function serieVoto(s, tutte) {
  if (!s.valutazione || s.valutazione <= 0) {
    return { testo: `A ${s.titolo} non hai ancora dato un voto.`, serie: [s] };
  }

  const votate = tutte.filter((a) => a.valutazione > 0);
  const migliori = votate.filter((a) => a.valutazione > s.valutazione).length;

  return {
    testo:
      `Hai dato ${s.valutazione.toFixed(1)} a ${s.titolo}. ` +
      (migliori === 0
        ? "È il voto più alto che hai messo."
        : `${plurale(migliori, "serie ha", "serie hanno")} un voto più alto.`),
    serie: [s]
  };
}

function serieInfo(s) {
  const pezzi = [];

  if (s.autore) pezzi.push(s.autore);
  if (s.editore) pezzi.push(s.editore);
  if (s.generi.length) pezzi.push(s.generi.slice(0, 3).join(", "));

  const mancanti = volumiMancanti(s);

  const stato =
    mancanti === 0
      ? "completa"
      : mancanti > 0
        ? `${s.posseduti} su ${s.totali}, ne mancano ${mancanti}`
        : `${plurale(s.posseduti, "volume", "volumi")}`;

  return {
    testo: `${s.titolo} — ${pezzi.join(" · ") || "nessun dato registrato"}. In collezione: ${stato}.`,
    serie: [s],
    trama: s.trama,
    suggerimenti: ["Quanto costa?", "Di cosa parla?", "Qualcosa di simile?"]
  };
}

/* ==================================================
   SOMIGLIANZA
   ================================================== */

/**
 * "Qualcosa di simile a questo."
 *
 * Risponde a due domande insieme, perché sono le due che si hanno in
 * testa: cosa ho già che gli somiglia (da leggere stasera) e cosa
 * potrei comprare (da segnare sulla lista). La prima è istantanea, la
 * seconda passa da AniList.
 */
async function simileA(s, tutte) {
  const dentro = similiInCollezione(s, tutte, 4);

  let fuori = [];

  try {
    // Prima si individua la voce giusta su AniList — i titoli omonimi
    // sono la norma — e solo dopo si chiedono le raccomandazioni.
    const candidati = await cercaFuori(s.titolo, 5);
    const scelta = scegliCorrispondenza(candidati, s);

    if (scelta) {
      const raccomandati = await similiFuoriPerId(scelta.manga.idEsterno);

      fuori = scartaQuelloCheHai(raccomandati, tutte).slice(0, 4);
    }
  } catch {
    // Senza AniList si risponde comunque con quello che c'è in casa.
  }

  if (!dentro.length && !fuori.length) {
    return {
      testo: `Non trovo niente che somigli davvero a ${s.titolo}, né sullo scaffale né fuori.`,
      serie: [s]
    };
  }

  const parti = [];

  if (dentro.length) {
    parti.push(
      `Di simile a ${s.titolo} hai già ${plurale(dentro.length, "serie", "serie")}:`
    );
  } else {
    parti.push(`In collezione non hai niente che somigli a ${s.titolo}.`);
  }

  return {
    testo: parti.join(" "),
    serie: dentro.map((v) => v.serie),
    dettaglio: (serieCandidata) =>
      dentro.find((v) => v.serie.id === serieCandidata.id)?.perche || null,
    daComprare: fuori,
    fonte: fuori.length ? "AniList" : undefined
  };
}

/* ==================================================
   FUORI COLLEZIONE
   ================================================== */

async function fuoriCollezione(testo, argomento, collezione) {
  try {
    const risultati = await cercaFuori(testo, 4);

    if (!risultati.length) {
      return {
        testo: `Non trovo niente che si chiami «${testo}», né sullo scaffale né su AniList.`
      };
    }

    const primo = risultati[0];

    // AniList tiene voci separate per le riedizioni, spesso con titolo
    // identico: proposte così sembrano un errore del sito.
    const visti = new Set([primo.titolo.toLowerCase()]);

    const alternative = risultati.slice(1).filter((m) => {
      const chiave = m.titolo.toLowerCase();

      if (visti.has(chiave)) return false;

      visti.add(chiave);

      return true;
    });

    // Se la domanda chiedeva cose simili, si porta avanti il discorso
    // invece di fermarsi alla scheda.
    if (argomento === "simile") {
      const raccomandati = await similiFuoriPerId(primo.idEsterno).catch(() => []);

      return {
        testo: `${primo.titolo} non ce l'hai. Chi l'ha letto legge anche questi:`,
        esterna: primo,
        daComprare: scartaQuelloCheHai(raccomandati, collezione).slice(0, 5),
        soggetto: primo,
        fonte: "AniList"
      };
    }

    return {
      testo: `«${primo.titolo}» non ce l'hai. Quello che sa AniList:`,
      esterna: primo,
      altreEsterne: alternative,
      soggetto: primo,
      fonte: "AniList"
    };
  } catch (e) {
    return {
      testo:
        `Non ho «${testo}» in collezione, e la ricerca esterna non è riuscita. ` +
        (e.message || ""),
      errore: true
    };
  }
}

/* ==================================================
   QUANDO MANCA UN PEZZO
   ================================================== */

const NOMI_ARGOMENTO = {
  trama: "la trama",
  costo: "il prezzo",
  autore: "l'autore",
  editore: "l'editore",
  stato: "se è conclusa",
  voto: "il voto",
  simile: "qualcosa di simile",
  possiedo: "se ce l'hai"
};

function soggettoMancante(quale) {
  return {
    testo: `Di quale serie? Dimmi il titolo e ti dico ${NOMI_ARGOMENTO[quale] || "quello che so"}.`
  };
}

function nonCapito() {
  return {
    testo:
      "Questa non l'ho capita. Riformulala, oppure nominami una serie e ti dico cosa ne so.",
    suggerimenti: SUGGERIMENTI_BASE
  };
}
