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
 * «l'episodio 7», «gli episodi 3-8», «4 episodi».
 *
 * Consecutivi si scrivono come un intervallo, sparsi si contano.
 * Elencarli tutti («3, 5, 6, 9, 12, 13, 14…») è la scrittura che
 * sembra più precisa e che nessuno legge.
 */
export function frasEpisodi(numeri) {
  if (!numeri?.length) return "";

  if (numeri.length === 1) return `l'episodio ${numeri[0]}`;

  const primo = numeri[0];
  const ultimo = numeri[numeri.length - 1];
  const consecutivi = ultimo - primo + 1 === numeri.length;

  if (consecutivi) return `gli episodi ${primo}-${ultimo}`;

  return `${numeri.length} episodi`;
}

/* ==================================================
   LA GIORNATA
   ================================================== */

// L'ordine in cui si legge un giorno. Non è cronologico: finire una
// serie è l'unica cosa che uno racconterebbe a voce, e nasconderla
// sotto quattordici spunte vorrebbe dire non farla vedere mai.
const ORDINE = ["finite", "commenti", "voti", "episodi", "aggiunte"];

/**
 * Le righe di un post-giornata, già scritte.
 *
 * Ognuna porta con sé la serie di cui parla, così chi mostra può
 * mettere la copertina accanto e collegare alla scheda senza
 * rimettere insieme i pezzi.
 */
export function raccontaGiornata(eventi) {
  if (!eventi) return { voci: [], sommario: [] };

  const voci = [];

  for (const serie of perSerie(eventi.finite || [])) {
    const voto = serie.righe.find((r) => r.voto != null)?.voto;

    voci.push({
      chiave: `finite-${serie.chiave}`,
      tipo: "finite",
      serie,
      frase: `Ha finito ${serie.titolo}`,
      // Il voto accanto al «finita» e non come riga a parte: sono lo
      // stesso gesto — si finisce una serie e la si giudica — e due
      // righe di fila sulla stessa serie sembrano un errore.
      coda: voto != null ? `★ ${formattaVoto(voto)}` : null
    });
  }

  for (const nota of eventi.commenti || []) {
    const serie = perSerie([nota])[0];

    voci.push({
      chiave: `commento-${nota.nota_id}`,
      tipo: "commenti",
      serie,
      frase:
        nota.numero_episodio == null
          ? `Ha commentato ${serie.titolo}`
          : `Ha commentato l'episodio ${nota.numero_episodio} di ${serie.titolo}`,
      // L'unico evento che ha qualcosa da leggere dentro. Lo spoiler
      // resta coperto finché non si tocca: chi è indietro di due
      // stagioni non deve scoprire il finale scorrendo il feed.
      testo: nota.testo,
      spoiler: nota.spoiler,
      titoloEpisodio: nota.titolo_episodio
    });
  }

  for (const serie of perSerie(eventi.voti || [])) {
    const voto = serie.righe[0]?.voto;

    voci.push({
      chiave: `voto-${serie.chiave}`,
      tipo: "voti",
      serie,
      frase: `Ha votato ${serie.titolo}`,
      coda: voto != null ? `★ ${formattaVoto(voto)}` : null
    });
  }

  for (const serie of perSerie(eventi.episodi || [])) {
    const quanti = serie.righe.reduce((somma, r) => somma + (r.numeri?.length || 0), 0);

    // I numeri si scrivono solo quando la serie è una scheda sola.
    // Due stagioni ripartono da 1 (è il motivo per cui esistono i
    // gruppi, vedi la 014): unire «1-12» e «1-13» darebbe un
    // intervallo che non vuol dire niente, e tenerli separati direbbe
    // due volte «Noragami».
    const numeri = serie.righe.length === 1 ? serie.righe[0].numeri : null;

    voci.push({
      chiave: `episodi-${serie.chiave}`,
      tipo: "episodi",
      serie,
      frase: numeri
        ? `Ha visto ${frasEpisodi(numeri)} di ${serie.titolo}`
        : `Ha visto ${quanti} episodi di ${serie.titolo}`,
      quanti
    });
  }

  for (const serie of perSerie(eventi.aggiunte || [])) {
    voci.push({
      chiave: `aggiunta-${serie.chiave}`,
      tipo: "aggiunte",
      serie,
      frase: `Ha aggiunto ${serie.titolo}`
    });
  }

  voci.sort((a, b) => ORDINE.indexOf(a.tipo) - ORDINE.indexOf(b.tipo));

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
 * Le tre caselle in cima alla pagina personale.
 *
 * Tre e non sei: sono un'anteprima con la freccia accanto, e il
 * riquadro che prova a dire tutto smette di essere un riassunto.
 * Quali tre non è arbitrario — sono le tre domande che uno si fa
 * guardando la pagina di un altro: quanto ha visto, per quanto tempo,
 * cosa gli piace.
 */
export function tesserine(statistiche) {
  if (!statistiche) return [];

  const tempo = tempoVisto(statistiche.minuti);

  return [
    { chiave: "serie", valore: statistiche.serie, etichetta: statistiche.serie === 1 ? "serie" : "serie" },
    { chiave: "episodi", valore: statistiche.episodi, etichetta: "episodi" },
    { chiave: "tempo", valore: tempo.valore, etichetta: tempo.unita, extra: tempo.extra }
  ];
}
