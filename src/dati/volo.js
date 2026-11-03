/**
 * Il volo di ritorno (03/11/2026): dalla scheda di una serie, la copertina
 * torna al suo posto nella griglia da cui era partita.
 *
 * È il contrario di `apriConVolo` in `ui/CartaSerie.jsx`: lì la carta
 * cliccata riceve il nome della transizione, qui lo riceve la carta di
 * ritorno, che si trova solo DOPO che la Collezione è tornata visibile.
 *
 * ⚠️ `navigate(-1)` NON cambia pagina subito: chiede al browser di tornare
 * indietro (`history.go`), e la nuova pagina arriva più tardi, con un evento
 * `popstate`. Chiamarlo dentro la funzione della transizione, come
 * all'inizio, voleva dire cercare la carta quando la scheda era ancora lì:
 * non trovata, nessun nome, e la copertina sfumava sul posto. Adesso la
 * funzione della transizione ASPETTA che la carta sia davvero visibile.
 *
 * Il volo parte da due strade:
 *  - il pulsante «Indietro» della scheda (`tornaIndietroConVolo`);
 *  - il tasto indietro del browser o il gesto di Android/desktop
 *    (`installaVoloIndietro`, che ascolta `popstate`).
 * `inVolo` evita che il pulsante, che provoca a sua volta un `popstate`,
 * ne avvii due.
 *
 * Se la carta non c'è — si era arrivati da Home, da un indirizzo salvato —
 * il nome resta solo sulla copertina della scheda, che sfuma come ogni
 * altro cambio di pagina. Mai un tocco morto.
 */

import { flushSync } from "react-dom";

const TEMPO_MAX_MS = 700;

let percorsoPrima = null;
let inVolo = false;

/** La rotta che sta alle spalle: lo dice `Contenuto` a ogni cambio di indirizzo. */
export function ricordaPercorso(percorso) {
  percorsoPrima = percorso;
}

const ridotto = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const idDaPercorso = (percorso) => /^\/serie\/([^/?#]+)/.exec(percorso || "")?.[1] ?? null;

/** Aspetta che la copertina della carta sia visibile (la Collezione è tornata). */
async function attendiCarta(idSerie) {
  const cerca = `a[href="/serie/${idSerie}"], a[href^="/serie/${idSerie}?"]`;
  const inizio = performance.now();

  while (performance.now() - inizio < TEMPO_MAX_MS) {
    const copertina = document.querySelector(cerca)?.querySelector("[data-copertina]");

    // `offsetParent === null`: la Collezione è ancora nascosta sotto la scheda.
    if (copertina && copertina.offsetParent !== null) return copertina;

    await new Promise((r) => setTimeout(r, 16));
  }

  return null;
}

function avviaVolo(idSerie, parti, alTermine) {
  inVolo = true;

  let carta = null;
  let contenitore = null;
  const pulisci = () => {
    if (carta) carta.style.viewTransitionName = "";
    if (contenitore) contenitore.style.contentVisibility = "";
    inVolo = false;
    alTermine?.();
  };

  const callback = async () => {
    await parti();

    carta = await attendiCarta(idSerie);
    if (!carta) return;

    // Una pagina riportata in vista dal ripristino dello scorrimento ha di
    // solito la carta dov'era; se invece è fuori schermo, la si porta al centro
    // o la copertina volerebbe verso un punto che nessuno vede.
    // Le carte fuori schermo non sono disegnate (`content-visibility`, in
    // index.css) e una carta non disegnata non può volare: questa la si
    // forza visibile per la durata del volo.
    contenitore = carta.closest(".sequenza > *");
    if (contenitore) contenitore.style.contentVisibility = "visible";

    const r = carta.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      carta.scrollIntoView({ block: "center", behavior: "instant" });
    }

    carta.style.viewTransitionName = "copertina-serie";
  };

  try {
    const volo = document.startViewTransition(callback);

    volo.finished.then(pulisci, pulisci);
  } catch {
    pulisci();
  }
}

/**
 * La Collezione tenuta in vita sotto la scheda (`app/routes.jsx`): il suo
 * indirizzo e la posizione che occupa nella cronologia del browser.
 * Serve al ritorno "sincrono" qui sotto.
 */
let collezione = null;

export function ricordaCollezione(dati) {
  collezione = dati;
}

/**
 * Il pulsante «Indietro» della scheda.
 *
 * Il modo ovvio, `navigate(-1)`, è asincrono: il browser torna indietro
 * quando vuole, con un `popstate` che può arrivare dopo parecchio — su
 * iPhone, mentre una transizione di vista tiene ferma la pagina, anche
 * oltre il tempo che la transizione aspetta. Risultato: la carta di
 * arrivo non c'è ancora quando serve, e la copertina sfuma sul posto.
 *
 * Quando la voce precedente della cronologia è proprio la Collezione tenuta
 * in vita (il caso normale: si è appena aperta una scheda da lì), il ritorno
 * si fa a mano e in modo SINCRONO: dentro la transizione si sostituisce la
 * voce della scheda con quella della Collezione, e a transizione finita si
 * fa un passo indietro nella cronologia per ripulirla — alla fine la
 * cronologia è quella di prima, con in più una voce in avanti identica.
 * Se la voce precedente è un'altra (si è passati da una scheda all'altra, o
 * si è arrivati da Home), vale il vecchio modo.
 */
export function tornaIndietroConVolo(navigate, idSerie) {
  if (typeof document.startViewTransition !== "function" || ridotto()) {
    navigate(-1);
    return;
  }

  const c = collezione;
  const sincrono = Boolean(c) && c.idx != null && window.history.state?.idx === c.idx + 1;

  if (!sincrono) {
    avviaVolo(idSerie, async () => {
      navigate(-1);
    });

    // Se la transizione non parte (scheda in secondo piano) il tocco non deve
    // restare morto: tornare indietro si fa comunque, una volta sola.
    setTimeout(() => {
      if (inVolo && idDaPercorso(window.location.pathname)) navigate(-1);
    }, 900);

    return;
  }

  let fatto = false;
  let ripulita = false;

  const torna = () => {
    if (fatto) return;
    fatto = true;
    flushSync(() => navigate(c.url, { replace: true }));
  };

  const ripulisci = () => {
    if (ripulita) return;
    ripulita = true;
    window.history.go(-1);
  };

  avviaVolo(
    idSerie,
    async () => torna(),
    () => ripulisci()
  );

  setTimeout(() => {
    if (fatto) return;
    torna();
    ripulisci();
  }, 900);
}

/**
 * Il gesto indietro del browser fa lo stesso volo.
 *
 * ⚠️ L'ascoltatore si registra QUI, quando il modulo viene caricato, e non
 * in un effetto di React: il router ascolta `popstate` a sua volta e, se
 * arriva prima lui, la pagina è già cambiata quando tocca a noi e non c'è
 * più un "prima" da fotografare. Il codice dell'app si carica prima di
 * montare il router, quindi questo ascoltatore ha la precedenza.
 */
function installaVoloIndietro() {
  if (typeof window === "undefined" || typeof document.startViewTransition !== "function") return;

  function alPopstate() {
    const idSerie = idDaPercorso(percorsoPrima);
    const arrivo = window.location.pathname;

    if (inVolo || ridotto() || !idSerie || arrivo !== "/collezione") return;

    // La pagina nuova la monta il router subito dopo questo evento: qui non
    // c'è niente da fare, basta aspettare che la carta compaia.
    avviaVolo(idSerie, async () => {});
  }

  // In cattura: deve partire prima dell'ascoltatore del router, perché
  // l'aspetto "di prima" va fotografato prima che la pagina cambi.
  window.addEventListener("popstate", alPopstate, true);
}

installaVoloIndietro();
