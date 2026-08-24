import { formattaVoto } from "../ui/videoteca/formati";

/**
 * Come si racconta una giornata.
 *
 * Il server manda quello che è successo — righe di database con
 * dentro numeri di puntata e identificativi — e qui diventa una cosa
 * da leggere. Sta in `dati/` e non dentro il componente per la
 * ragione di sempre: un file che esporta insieme componenti e
 * funzioni spegne il ricaricamento a caldo di Vite, e queste frasi si
 * riscrivono venti volte prima di suonare bene.
 *
 * ---------------------------------------------------------------
 * DUE COSE CHE I DATI VERI HANNO INSEGNATO
 *
 * 1. LE STAGIONI SI ACCORPANO ANCHE QUI. Noragami è due schede di
 *    AnimeClick, e senza accorparle una giornata dice «Noragami,
 *    Noragami» come se fossero due serie diverse. È lo stesso lavoro
 *    che fa `raggruppa` in `dati/videoteca.js` per la griglia, ma sul
 *    contenuto di un post.
 *
 * 2. CI SONO GIORNATE ENORMI. Il giorno in cui si è riempita la
 *    videoteca sono entrate 51 serie e 3264 spunte in una volta: un
 *    post che le elenca tutte non è un post, è un archivio. Da qui
 *    l'anteprima — poche righe e «altro» — e il sommario in cima, che
 *    è l'unica cosa che si legge davvero quando i numeri sono grossi.
 */

/* ==================================================
   RIDURRE ALLE SERIE
   ================================================== */

/** La chiave con cui due schede sono la stessa serie. */
const chiaveSerie = (riga) => (riga.gruppo_id ? `g${riga.gruppo_id}` : `a${riga.id}`);

/**
 * Da righe a serie.
 *
 * Il titolo del gruppo vince su quello della scheda: «Noragami» e non
 * «Noragami Aragoto», che è il nome di una stagione sola.
 */
function perSerie(righe) {
  const per = new Map();

  for (const riga of righe) {
    const chiave = chiaveSerie(riga);

    if (!per.has(chiave)) {
      per.set(chiave, {
        chiave,
        animeId: riga.id,
        titolo: riga.gruppo_titolo || riga.titolo,
        cover_url: riga.cover_url,
        tipo: riga.tipo,
        righe: []
      });
    }

    per.get(chiave).righe.push(riga);
  }

  return [...per.values()];
}

/* ==================================================
   I NUMERI DELLE PUNTATE
   ================================================== */

/**
 * «episodio 7», «episodi 3-8», «4 episodi».
 *
 * Consecutivi si scrivono come un intervallo, sparsi si contano.
 * Elencarli tutti («3, 5, 6, 9, 12, 13, 14…») è la scrittura che
 * sembra più precisa e che nessuno legge.
 *
 * Senza articolo davanti: questa frase non sta più in mezzo a una
 * proposizione («ha visto l'episodio 7 di…») ma dentro un elenco di
 * cose fatte a una serie, dove l'articolo sarebbe di troppo.
 */
export function frasEpisodi(numeri) {
  if (!numeri?.length) return "";

  if (numeri.length === 1) return `episodio ${numeri[0]}`;

  const primo = numeri[0];
  const ultimo = numeri[numeri.length - 1];
  const consecutivi = ultimo - primo + 1 === numeri.length;

  if (consecutivi) return `episodi ${primo}-${ultimo}`;

  return `${numeri.length} episodi`;
}

/* ==================================================
   LA GIORNATA
   ================================================== */

// L'ordine in cui si leggono le serie di un giorno. Non è cronologico:
// finire una serie è l'unica cosa che uno racconterebbe a voce, e
// nasconderla sotto quattordici spunte vorrebbe dire non farla vedere
// mai. Una serie vale per la cosa più grossa che le è successa.
const ORDINE = ["finite", "commenti", "voti", "episodi", "aggiunte"];

/**
 * Le righe di un post-giornata, già scritte.
 *
 * ---------------------------------------------------------------
 * UNA SERIE, UNA RIGA
 *
 * Prima ogni tipo di evento faceva riga per conto suo: chi in un
 * pomeriggio aggiungeva Frieren, ne guardava dodici puntate, la
 * finiva, la votava e la commentava occupava CINQUE righe che
 * dicevano cinque volte «Frieren». Su una giornata piena il post
 * diventava chilometrico e si leggeva solo il titolo, ripetuto.
 *
 * Adesso il raggruppamento è per SERIE: tutto quello che è successo
 * oggi a quella serie sta su una riga sola — il titolo una volta, e
 * accanto l'elenco di cosa le è stato fatto. Il voto resta in coda
 * perché è un numero e non un'azione, e i commenti restano leggibili
 * sotto: sono l'unica cosa che ha un dentro.
 *
 * Ogni riga porta con sé la serie di cui parla, così chi mostra può
 * mettere la copertina accanto e collegare alla scheda senza
 * rimettere insieme i pezzi.
 */
export function raccontaGiornata(eventi) {
  if (!eventi) return { voci: [], sommario: [] };

  // Una voce per serie, costruita man mano che i cinque elenchi la
  // nominano. La mappa tiene anche l'ORDINE di prima apparizione, che
  // è quello di `perSerie`, cioè quello degli eventi.
  const per = new Map();

  const voceDi = (serie) => {
    if (!per.has(serie.chiave)) {
      per.set(serie.chiave, {
        chiave: serie.chiave,
        serie,
        azioni: [],
        note: [],
        voto: null,
        peso: ORDINE.length
      });
    }

    return per.get(serie.chiave);
  };

  // `peso` è la cosa più grossa capitata alla serie: decide dove
  // finisce nel post. Una serie finita sta in cima anche se il primo
  // elenco a nominarla è quello delle spunte.
  const segna = (voce, tipo) => {
    voce.peso = Math.min(voce.peso, ORDINE.indexOf(tipo));
  };

  for (const serie of perSerie(eventi.finite || [])) {
    const voce = voceDi(serie);
    const voto = serie.righe.find((r) => r.voto != null)?.voto;

    voce.azioni.push("finita");
    if (voto != null) voce.voto = voto;

    segna(voce, "finite");
  }

  for (const serie of perSerie(eventi.voti || [])) {
    const voce = voceDi(serie);
    const voto = serie.righe[0]?.voto;

    // Nessuna azione da scrivere: il voto si vede in coda, e
    // «votata ★4,5» direbbe due volte la stessa cosa.
    if (voto != null) voce.voto = voto;

    segna(voce, "voti");
  }

  for (const serie of perSerie(eventi.episodi || [])) {
    const voce = voceDi(serie);
    const quanti = serie.righe.reduce((somma, r) => somma + (r.numeri?.length || 0), 0);

    // I numeri si scrivono solo quando la serie è una scheda sola.
    // Due stagioni ripartono da 1 (è il motivo per cui esistono i
    // gruppi, vedi la 014): unire «1-12» e «1-13» darebbe un
    // intervallo che non vuol dire niente.
    const numeri = serie.righe.length === 1 ? serie.righe[0].numeri : null;

    voce.azioni.push(numeri ? frasEpisodi(numeri) : `${quanti} episodi`);

    segna(voce, "episodi");
  }

  for (const nota of eventi.commenti || []) {
    const voce = voceDi(perSerie([nota])[0]);

    voce.note.push({
      chiave: `commento-${nota.nota_id}`,
      testo: nota.testo,
      spoiler: nota.spoiler,
      numeroEpisodio: nota.numero_episodio,
      titoloEpisodio: nota.titolo_episodio
    });

    segna(voce, "commenti");
  }

  for (const serie of perSerie(eventi.aggiunte || [])) {
    const voce = voceDi(serie);

    voce.azioni.push("aggiunta");

    segna(voce, "aggiunte");
  }

  const voci = [...per.values()];

  for (const voce of voci) {
    // I commenti si annunciano per ultimi fra le azioni: il loro testo
    // sta subito sotto, e nominarli in mezzo alla riga staccherebbe
    // l'annuncio da quello che annuncia.
    if (voce.note.length === 1) {
      const [nota] = voce.note;

      voce.azioni.push(
        nota.numeroEpisodio == null
          ? "commentata"
          : `commento all'episodio ${nota.numeroEpisodio}`
      );
    } else if (voce.note.length > 1) {
      voce.azioni.push(`${voce.note.length} commenti`);
    }

    voce.coda = voce.voto != null ? `★ ${formattaVoto(voce.voto)}` : null;

    // Quando in tutto il giorno a una serie è successo solo il voto,
    // il verbo va detto: la riga sarebbe il titolo con una stella
    // accanto, che sembra un elenco e non una cosa fatta. Accanto a
    // «finita» invece è di troppo — si finisce una serie e la si
    // giudica, è un gesto solo.
    if (voce.azioni.length === 0 && voce.voto != null) voce.azioni.push("votata");
  }

  // `sort` è stabile: a parità di peso resta l'ordine in cui gli
  // eventi le hanno nominate, che è quello del tempo.
  voci.sort((a, b) => a.peso - b.peso);

  return { voci, sommario: sommarioDi(eventi) };
}

/**
 * La riga in cima al post: i numeri grossi, senza titoli.
 *
 * È quello che si legge davvero quando una giornata contiene
 * cinquanta serie — e quello che basta quando ne contiene due.
 */
function sommarioDi(eventi) {
  const episodi = (eventi.episodi || []).reduce((s, r) => s + (r.numeri?.length || 0), 0);

  const pezzi = [
    conta(perSerie(eventi.aggiunte || []).length, "serie aggiunta", "serie aggiunte"),
    conta(episodi, "episodio", "episodi"),
    conta(perSerie(eventi.finite || []).length, "serie finita", "serie finite"),
    conta(perSerie(eventi.voti || []).length, "voto", "voti"),
    conta((eventi.commenti || []).length, "commento", "commenti")
  ];

  return pezzi.filter(Boolean);
}

function conta(quanti, singolare, plurale) {
  if (!quanti) return null;

  return `${quanti} ${quanti === 1 ? singolare : plurale}`;
}

/* ==================================================
   IL TEMPO
   ================================================== */

/**
 * «adesso», «2 h», «ieri», «22 ago».
 *
 * Corto apposta: sta in cima a ogni post, accanto al nome, e una data
 * per esteso ripetuta quindici volte è rumore. La data intera resta
 * nel `title` per chi la vuole.
 */
export function quandoBreveDa(quando) {
  const data = new Date(quando);
  const minuti = Math.round((Date.now() - data.getTime()) / 60000);

  if (minuti < 2) return "adesso";
  if (minuti < 60) return `${minuti} min`;

  const ore = Math.round(minuti / 60);

  if (ore < 24) return `${ore} h`;

  const oggi = new Date();
  const ieri = new Date(oggi.getTime() - 86400000);

  if (data.toDateString() === ieri.toDateString()) return "ieri";

  const stessoAnno = data.getFullYear() === oggi.getFullYear();

  return data.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: stessoAnno ? undefined : "numeric",
    timeZone: "Europe/Rome"
  });
}

/** La data intera, per il suggerimento del mouse e i lettori di schermo. */
export function quandoPerEsteso(quando) {
  return new Date(quando).toLocaleString("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Rome"
  });
}

/** Il giorno di un post: «oggi», «ieri», «giovedì 21 agosto». */
export function giornoPerEsteso(giorno) {
  // Si costruisce a mezzogiorno e non a mezzanotte: `new Date("2026-08-22")`
  // è mezzanotte UTC, che in Italia è ancora il 22 ma in altri fusi
  // sarebbe il 21. Mezzogiorno sta lontano da entrambi i bordi.
  const data = new Date(`${giorno}T12:00:00`);
  const oggi = new Date();
  const ieri = new Date(oggi.getTime() - 86400000);

  if (data.toDateString() === oggi.toDateString()) return "oggi";
  if (data.toDateString() === ieri.toDateString()) return "ieri";

  return data.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: data.getFullYear() === oggi.getFullYear() ? undefined : "numeric"
  });
}

/* ==================================================
   GLI INDIRIZZI DELLE PERSONE
   ================================================== */

/** La pagina di qualcuno. Il soprannome è il suo indirizzo pubblico. */
export const paginaDi = (nickname) => `/videoteca/chi/${encodeURIComponent(nickname)}`;

/**
 * Un confronto fra due persone.
 *
 * Due soprannomi nell'indirizzo e non «io contro lui»: un confronto è
 * la tipica cosa che si manda a qualcuno, e un indirizzo che dipende
 * da chi lo apre mostrerebbe a chi lo riceve un confronto diverso da
 * quello di chi l'ha mandato.
 */
export const vaiAlConfronto = (a, b) =>
  `/videoteca/confronto/${encodeURIComponent(a)}/${encodeURIComponent(b)}`;

/* ==================================================
   I NUMERI DELLA PAGINA PERSONALE
   ================================================== */

/**
 * I minuti visti, detti come li direbbe una persona.
 *
 * Sotto le venti giornate restano ore; sopra diventano giorni interi
 * passati a guardare, che è il numero che fa ridere e che uno manda
 * agli altri. «1470 ore» non dice niente, «61 giorni» sì.
 *
 * ⚠️ `riferimento` esiste per il confronto, e serve più di quanto
 * sembri. Mettendo due persone una accanto all'altra, la prima
 * diceva «474 ore» e la seconda «61 giorni»: numeri veri, unità
 * diverse, e a colpo d'occhio sembrava che la seconda avesse
 * guardato OTTO VOLTE MENO. Passando il valore più grande dei due
 * come riferimento, l'unità la scelgono insieme e i due numeri
 * tornano confrontabili.
 */
export function tempoVisto(minuti, riferimento = minuti) {
  const ore = Math.round(minuti / 60);
  const oreDiRiferimento = Math.round(riferimento / 60);

  if (oreDiRiferimento < 1) return { valore: minuti, unita: minuti === 1 ? "minuto" : "minuti" };

  if (oreDiRiferimento < 480) return { valore: ore, unita: ore === 1 ? "ora" : "ore" };

  const giorni = Math.round(ore / 24);

  return { valore: giorni, unita: giorni === 1 ? "giorno" : "giorni", extra: `${ore} ore` };
}

/**
 * Una MEDIA di voti, che non è un voto.
 *
 * `formattaVoto` esiste per le mezze stelle — 0,5 … 5 e niente altro
 * — e taglia alla prima cifra decimale, che su quei valori non perde
 * mai niente. Su una media perde: 3,96 diventava «4», e nel confronto
 * si leggeva «4 contro 3,6» come se uno avesse votato tondo. Qui le
 * cifre sono due, e gli zeri inutili spariscono lo stesso (4 resta 4).
 */
export function formattaMedia(voto) {
  if (voto == null) return "—";

  return Number(voto).toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

/**
 * Il tempo totale scritto per intero: «2 mesi 4 g 7 h».
 *
 * `tempoVisto` sceglie UNA unità e ci arrotonda dentro — comodo
 * accanto a un nome, dove ci sta una parola sola — ma nel riquadro
 * delle statistiche «61 giorni» è un numero che non si riesce a
 * immaginare: nessuno ha passato due mesi filati davanti allo
 * schermo, e infatti quei giorni sono spalmati su quattro anni. Detto
 * in mesi, giorni e ore si legge per quello che è.
 *
 * Il mese vale trenta giorni. Non è il calendario — non c'è nessun
 * mese vero da misurare, è una durata — e trenta è il numero che
 * chiunque usa a mente.
 *
 * Gli zeri in mezzo restano («2 mesi 0 g 7 h» no, «2 mesi 7 h» sì):
 * si scrivono solo i pezzi che ci sono, e le ore spariscono del tutto
 * quando ci sono i mesi e i giorni — a quel punto sono cifre che non
 * cambiano niente.
 */
export function tempoTotale(minuti) {
  const oreIntere = Math.floor(minuti / 60);

  if (oreIntere < 1) {
    const m = Math.round(minuti);

    return { testo: `${m} min`, extra: null };
  }

  const mesi = Math.floor(oreIntere / (30 * 24));
  const giorni = Math.floor((oreIntere % (30 * 24)) / 24);
  const ore = oreIntere % 24;

  const pezzi = [];

  if (mesi) pezzi.push(`${mesi} ${mesi === 1 ? "mese" : "mesi"}`);
  if (giorni) pezzi.push(`${giorni} g`);
  if (ore && !(mesi && giorni)) pezzi.push(`${ore} h`);

  return {
    testo: pezzi.join(" "),
    // Le ore tonde restano nel suggerimento: è il numero che si manda
    // agli altri, e sparirebbe del tutto.
    extra: `${oreIntere.toLocaleString("it-IT")} ore in tutto`
  };
}

/**
 * Le quattro caselle in cima alla pagina personale.
 *
 * Quattro e non sei: sono un'anteprima, e il riquadro che prova a
 * dire tutto smette di essere un riassunto. Quali quattro non è
 * arbitrario — sono le domande che uno si fa guardando la pagina di
 * un altro: per quanto tempo, quanta roba, di che genere.
 *
 * Ognuna porta la sua DICITURA per esteso. Prima l'etichetta era
 * l'unità di misura del numero («giorni», «episodi»), che sotto un
 * numero grosso si legge come parte del numero e non come il nome di
 * quello che si sta guardando: tre caselle affiancate dicevano tre
 * cifre e nessuna diceva di cosa.
 *
 * «Visti» tiene insieme episodi e film perché per il database sono la
 * stessa cosa — un film è una puntata sola, e si spunta come tutte le
 * altre. Serie e Film si dividono invece per quante puntate hanno:
 * il conto lo fa il server (`services/cineforum.js`), così la pagina
 * personale e il confronto dicono lo stesso numero.
 */
export function tesserine(statistiche) {
  if (!statistiche) return [];

  const tempo = tempoTotale(statistiche.minuti);

  return [
    { chiave: "tempo", etichetta: "Tempo Totale", valore: tempo.testo, extra: tempo.extra },
    {
      chiave: "visti",
      etichetta: "Visti",
      valore: statistiche.episodi.toLocaleString("it-IT"),
      extra: "Episodi e film insieme"
    },
    {
      chiave: "serie",
      etichetta: "Serie",
      valore: statistiche.serie.toLocaleString("it-IT"),
      extra: "Quelle con più di una puntata"
    },
    {
      chiave: "film",
      etichetta: "Film",
      valore: statistiche.film.toLocaleString("it-IT"),
      extra: "Quelli con una puntata sola"
    }
  ];
}
