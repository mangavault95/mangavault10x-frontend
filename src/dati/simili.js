/**
 * "Titoli simili": quali fumetti assomigliano davvero a questo.
 *
 * Non i generi in comune, che è come nacque questa sezione: due serie
 * possono essere entrambe "Drama, Psychological" e non avere niente da
 * spartire, e infatti accostava un thriller di Urasawa a uno shonen
 * d'azione. Qui la somiglianza esce da due segnali che parlano della
 * storia, non dello scaffale:
 *
 *  1. Le raccomandazioni di AniList — chi ha letto *questa* serie ha
 *     scritto "se ti è piaciuta, leggi quest'altra", e altri lettori
 *     hanno votato l'accostamento. È un giudizio umano su trama e
 *     atmosfera, la cosa più vicina a "stesse vibes" che esista in un
 *     database.
 *  2. I temi (i tag di AniList): "Revenge", "Coming of Age",
 *     "Dystopian", con il rango che dice quanto pesano sull'opera.
 *     Servono a due cose — spiegare *perché* un titolo è lì, e coprire
 *     i casi in cui nessuno ha ancora scritto raccomandazioni, che sul
 *     catalogo italiano di nicchia sono tanti.
 *
 * Quello che esce non è filtrato su cosa possiedi: i titoli in
 * collezione si riconoscono da un'etichetta e portano alla loro scheda,
 * gli altri alla fonte. Tenere solo i posseduti — com'era prima —
 * rispondeva a una domanda diversa ("cos'altro ho di simile") e nella
 * pratica lasciava la sezione quasi sempre vuota.
 *
 * Le fonti sono due e si alternano una a una (vedi `intreccia`):
 * accanto ad AniList ci sono i consigli scritti dai lettori italiani su
 * AnimeClick, che parlano dei titoli usciti qui e con i nomi con cui li
 * conosciamo qui. Quelli passano dal backend — AnimeClick non manda gli
 * header CORS — e arrivano con comodo: la sezione si disegna con i
 * primi che rispondono e si ricompone quando arrivano gli altri.
 */

import {
  cercaFuori,
  scegliCorrispondenza,
  similiFuoriPerId,
  similiPerTemi
} from "../bibliotecario/esterni";
import { getSimiliAnimeClick } from "../services/api";
import { costruisciRiconoscitore, ossoDelTitolo } from "./identita";

// v2: da qui i candidati portano con sé i sinonimi. Una lista salvata
// prima non li ha, e senza sinonimi metà delle serie che possiedi
// tornerebbe etichettata come "solo su AniList".
const PREFISSO_CACHE = "mv_simili_v2";

const QUANTI = 8;

// Sotto due temi coincidenti la parentela è troppo debole per essere
// chiamata somiglianza: "Male Protagonist" e "School" li condividono
// centinaia di serie che non c'entrano niente l'una con l'altra.
const TEMI_MINIMI = 2;

// Quanti temi si danno in pasto alla ricerca di riserva. AniList li
// pretende tutti insieme, quindi il numero è una soglia di severità
// travestita: a tre torna una decina di titoli ben centrati, a quattro
// quasi nessuno, a due entra dentro mezzo catalogo.
const TEMI_PER_RICERCA = 3;

const chiave = (testo) => (testo || "").trim().toLowerCase();

function leggiCache(id) {
  try {
    const grezzo = sessionStorage.getItem(`${PREFISSO_CACHE}:${id}`);
    return grezzo ? JSON.parse(grezzo) : null;
  } catch {
    return null;
  }
}

function scriviCache(id, valore) {
  try {
    sessionStorage.setItem(`${PREFISSO_CACHE}:${id}`, JSON.stringify(valore));
  } catch {
    /* niente di grave: la prossima apertura richiama AniList */
  }
}

/** I temi dell'opera di partenza che ricompaiono nel candidato. */
function temiCondivisi(temiBase, candidato) {
  const suoi = new Set((candidato.temi || []).map(chiave));

  return temiBase.filter((t) => suoi.has(chiave(t)));
}

/**
 * L'ordine in cui mostrarli.
 *
 * L'affinità va normalizzata sul massimo del gruppo, non usata grezza:
 * una serie famosa raccoglie centinaia di voti e una di nicchia cinque,
 * ma dentro la stessa lista contano le proporzioni, non i numeri
 * assoluti. Ai temi in comune si dà un peso vero perché sono il motivo
 * per cui questa sezione esiste: senza, tornerebbe in cima il titolo
 * più popolare accostato a questo, che è un'altra classifica.
 */
function ordinaPerSomiglianza(candidati) {
  const massimo = Math.max(1, ...candidati.map((c) => c.affinita || 0));

  return [...candidati]
    .map((c) => ({
      ...c,
      punteggio:
        (c.affinita || 0) / massimo + 0.25 * Math.min(c.temiInComune.length, 4)
    }))
    .sort((a, b) => b.punteggio - a.punteggio || (b.voto ?? 0) - (a.voto ?? 0));
}

/**
 * I titoli simili a una serie, chiesti fuori.
 *
 * Torna un elenco vuoto — non un errore — quando AniList non conosce la
 * serie o non ha niente da dire: la sezione che lo usa sparisce, e non
 * c'è niente da spiegare a chi legge.
 */
export async function titoliSimili(serie) {
  if (!serie?.titolo) return [];

  const inCache = leggiCache(serie.id);
  if (inCache) return inCache;

  // Cinque risultati e non tre: la ricerca è per titolo italiano, e
  // l'opera giusta non è quasi mai la prima ("I fiori del male" pesca
  // per primo un manhwa coreano omonimo). Serve margine perché la
  // conferma sull'autore abbia qualcosa da confermare.
  const risultati = await cercaFuori(serie.titolo, 5);
  const corrispondenza = scegliCorrispondenza(risultati, serie);

  if (!corrispondenza) return [];

  // Nessun risultato porta la firma giusta: AniList ha in mano un altro
  // fumetto, e i consigli che darebbe sarebbero i consigli di
  // quell'altro. Meglio nessuna sezione che una sezione di titoli presi
  // dal fumetto sbagliato — che è esattamente com'è finita finché la
  // conferma non veniva pretesa.
  if (serie.autore && !corrispondenza.sicuro) return [];

  const base = corrispondenza.manga;
  const temiBase = base.temi || [];

  const raccomandati = await similiFuoriPerId(base.idEsterno).catch(() => []);

  // Chiave doppia: l'identificativo esclude lo stesso record, il titolo
  // esclude i doppioni che AniList tiene separati (una serie e la sua
  // riedizione sono due schede con lo stesso nome).
  const visti = new Set([base.idEsterno]);
  const perTitolo = new Set([chiave(base.titolo), chiave(serie.titolo)]);
  const candidati = [];

  const aggiungi = (m, affinita) => {
    if (!m?.titolo || visti.has(m.idEsterno) || perTitolo.has(chiave(m.titolo))) return;

    visti.add(m.idEsterno);
    perTitolo.add(chiave(m.titolo));

    candidati.push({
      ...m,
      fonte: "anilist",
      affinita,
      temiInComune: temiCondivisi(temiBase, m)
    });
  };

  for (const r of raccomandati) aggiungi(r, r.affinita || 0);

  // La riserva parte solo se le raccomandazioni non bastano a riempire
  // la fila: dove ci sono, sono un segnale migliore di qualunque
  // incrocio di tag, e mescolarci dentro titoli più deboli peggiorerebbe
  // una sezione che funziona.
  if (candidati.length < QUANTI && temiBase.length >= TEMI_MINIMI) {
    const perTemi = await similiPerTemi(temiBase.slice(0, TEMI_PER_RICERCA), {
      escludi: base.idEsterno
    }).catch(() => []);

    for (const m of perTemi) {
      // Qui nessuno ha confermato l'accostamento a mano: l'unica
      // garanzia è la sovrapposizione dei temi. AniList l'ha già
      // imposta, ma il conto lo rifacciamo noi — se un giorno cambiasse
      // il significato di quel filtro, questa sezione non comincerebbe
      // a consigliare titoli a caso, si limiterebbe a svuotarsi.
      if (temiCondivisi(temiBase, m).length < TEMI_MINIMI) continue;

      aggiungi(m, 0);
    }
  }

  const risultato = ordinaPerSomiglianza(candidati).slice(0, QUANTI);

  scriviCache(serie.id, risultato);

  return risultato;
}

/**
 * Gli stessi consigli, ma scritti dai lettori italiani.
 *
 * Sotto ogni scheda di AnimeClick c'è "Consiglia Simile", e quello che
 * ne esce non si sovrappone ad AniList: sono i titoli usciti in Italia,
 * ordinati da quante persone li hanno segnalati, e portano i nomi con
 * cui li vendono qui. Passa dal backend perché AnimeClick non manda gli
 * header CORS, e perché una risposta costa tre richieste al loro sito —
 * meglio farle una volta sola e tenerle in cache là.
 *
 * Chi chiama non aspetta questa prima di disegnare: è la fonte lenta
 * (Render può dormire), e arriva quando arriva.
 */
export async function similiDaAnimeClick(serie) {
  if (!serie?.titolo) return [];

  const chiaveCache = `${PREFISSO_CACHE}:ac:${serie.id}`;

  try {
    const inCache = sessionStorage.getItem(chiaveCache);
    if (inCache) return JSON.parse(inCache);
  } catch {
    /* sessionStorage non disponibile: si prosegue senza */
  }

  const risposta = await getSimiliAnimeClick({
    titolo: serie.titolo,
    autore: serie.autore,
    // Se la serie ha già il suo identificativo in tabella (verificato a
    // mano per il controllo dei volumi italiani), il server salta la
    // ricerca: due richieste in meno e nessun rischio di omonimi.
    id: serie.animeClickId
  }).catch(() => null);

  const mioOsso = ossoDelTitolo(serie.titolo);

  const simili = (risposta?.simili || [])
    // AnimeClick a volte consiglia un'altra edizione della stessa opera.
    .filter((s) => ossoDelTitolo(s.titolo) !== mioOsso)
    .map((s) => ({
      fonte: "animeclick",
      idEsterno: `ac-${s.id}`,
      // Serve al riconoscimento di quello che hai già: due schede con lo
      // stesso identificativo AnimeClick sono lo stesso fumetto, anche
      // quando i titoli non si somigliano.
      animeClickId: s.id,
      titolo: s.titolo,
      copertina: s.copertina,
      collegamento: s.url,
      segnalazioni: s.segnalazioni || 0,
      // Le cose che qui non esistono, dette esplicitamente: AnimeClick
      // non pubblica né voto né tag, e la carta deve saperlo invece di
      // leggere `undefined`.
      voto: null,
      temiInComune: [],
      sinonimi: []
    }));

  try {
    sessionStorage.setItem(chiaveCache, JSON.stringify(simili));
  } catch {
    /* pazienza */
  }

  return simili;
}

/**
 * Due nomi che sono lo stesso fumetto.
 *
 * Il confronto esatto non basta fra fonti diverse: AnimeClick allunga
 * spesso il titolo italiano con quello originale ("I fiori del male -
 * Aku no Hana"), e senza accorgersene la stessa opera compare due volte
 * di fila con due targhette diverse.
 *
 * Il prefisso però va preso con le pinze, perché è anche la forma dei
 * seguiti e degli spin-off: si accetta solo se la parte in comune è già
 * un titolo per conto suo — almeno due parole e otto lettere. Così "I
 * fiori del male" si fonde con la sua versione lunga, ma "Naruto" e
 * "Naruto Gaiden" restano due opere.
 */
function stessaOpera(uno, altro) {
  if (uno === altro) return true;

  const [corto, lungo] = uno.length <= altro.length ? [uno, altro] : [altro, uno];

  if (!lungo.startsWith(`${corto} `)) return false;

  return corto.length >= 8 && corto.includes(" ");
}

/**
 * Le due fonti a fila indiana: uno di là, uno di qua.
 *
 * Alternare invece di concatenare è una scelta di merito, non estetica:
 * ordinati per punteggio, i dodici consigli di AniList si mangerebbero
 * tutta la fila e quelli italiani non si vedrebbero mai. Così ogni
 * fonte porta metà dei posti, e chi guarda vede subito che sono due
 * teste diverse a parlare.
 *
 * Quando una fonte finisce prima, l'altra riempie il resto: una serie
 * che AnimeClick non conosce non deve mostrare mezza sezione vuota.
 */
export function intreccia(primaFonte, secondaFonte) {
  const intrecciati = [];
  const visti = [];

  const aggiungi = (opera) => {
    if (!opera) return;

    // Lo stesso fumetto può arrivare da tutte e due (AnimeClick lo
    // chiama in italiano, AniList in romaji): vale la prima carta
    // pescata, e la fonte che l'ha portata è quella che si mostra.
    //
    // `filter(Boolean)` dopo la normalizzazione non è una precauzione
    // di stile: i sinonimi di AniList comprendono il titolo giapponese,
    // coreano, russo, e quelli senza una lettera latina si riducono a
    // stringa vuota. Tenuti dentro, la prima opera con un titolo in
    // kanji marcava "" come già visto e faceva sparire tutte quelle
    // dopo — otto consigli su dodici, senza un errore in console.
    const nomi = [opera.titolo, opera.titoloInglese, ...(opera.sinonimi || [])]
      .filter(Boolean)
      .map(ossoDelTitolo)
      .filter(Boolean);

    if (nomi.some((n) => visti.some((v) => stessaOpera(n, v)))) return;

    visti.push(...nomi);
    intrecciati.push(opera);
  };

  const quanti = Math.max(primaFonte?.length || 0, secondaFonte?.length || 0);

  for (let i = 0; i < quanti; i++) {
    aggiungi(primaFonte?.[i]);
    aggiungi(secondaFonte?.[i]);
  }

  return intrecciati;
}

/**
 * Quali di questi titoli sono già in casa.
 *
 * Si risolve al momento di mostrarli e non dentro `titoliSimili`, così
 * la lista messa in cache resta valida anche se nel frattempo la
 * collezione cambia — e comprare un volume aggiorna subito l'etichetta
 * senza svuotare niente.
 */
export function abbinaCollezione(candidati, collezione, idSerieCorrente) {
  if (!candidati?.length) return [];

  const riconosci = costruisciRiconoscitore(collezione || []);
  const gia = new Set();

  return candidati
    .map((c) => ({ ...c, posseduta: riconosci(c) }))
    .filter((c) => {
      if (!c.posseduta) return true;

      // La serie stessa torna fra i suoi simili ogni volta che AniList
      // elenca un'altra edizione della stessa opera: mandare alla
      // scheda su cui si è già è un vicolo cieco. E due candidati
      // diversi non possono essere lo stesso volume sullo scaffale.
      if (String(c.posseduta.id) === String(idSerieCorrente)) return false;
      if (gia.has(c.posseduta.id)) return false;

      gia.add(c.posseduta.id);

      return true;
    });
}
