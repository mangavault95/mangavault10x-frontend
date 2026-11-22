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
 *  - il tasto indietro del browser (`installaVoloIndietro`, che ascolta
 *    `popstate`). Dopo un gesto del sistema (scorrere dal bordo su iPhone,
 *    il gesto indietro di Android) invece no: il sistema ha già la sua
 *    animazione, e il volo sopra la ripeteva.
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

  // `startViewTransition` fotografa «il prima» alla prossima occasione di
  // disegno, cioè DOPO l'evento in corso e dopo i suoi microtask. React
  // Router, sentito il `popstate`, aggiorna subito la pagina (un evento di
  // navigazione è «discreto»: React lo svolge in sincrono): quando il browser
  // scattava la foto la scheda era già sparita, e il volo aveva solo l'arrivo.
  // Col bottone non succedeva perché lì la navigazione è dentro la
  // transizione. Qui si fa lo stesso: l'evento originale si ferma, e il
  // router lo riceve di nuovo dentro la transizione, a foto scattata.
  let rilancio = false;

  // IL GESTO DEL SISTEMA HA GIÀ LA SUA ANIMAZIONE (22/11/2026).
  // Scorrendo dal bordo su iPhone (o col gesto indietro di Android) il sistema fa
  // scivolare via la scheda e mostra la Collezione sotto il dito; il `popstate` arriva
  // a gesto finito. Il volo partiva lo stesso: la sua foto «di prima» era la scheda,
  // che ricompariva per un attimo, e poi la copertina volava. Due ritorni uno dopo
  // l'altro: il movimento poco fluido. Dopo un gesto del sistema il volo non parte.
  //
  // Come si riconosce: `hasUAVisualTransition` sull'evento, dove il browser lo dice;
  // dove non lo dice (Safari), un tocco partito dal bordo dello schermo ancora in corso
  // o finito da poco. Il pulsante «Indietro» della scheda non passa di qui e vola sempre.
  const BORDO_PX = 30;
  const DOPO_GESTO_MS = 1500;
  let toccoDalBordo = -Infinity; // Infinity mentre il dito è giù, poi l'istante in cui si è alzato

  const opzioni = { capture: true, passive: true };

  window.addEventListener(
    "touchstart",
    (e) => {
      const x = e.touches?.[0]?.clientX;

      if (x != null && (x <= BORDO_PX || x >= window.innerWidth - BORDO_PX)) toccoDalBordo = Infinity;
    },
    opzioni
  );

  const toccoFinito = () => {
    if (toccoDalBordo === Infinity) toccoDalBordo = performance.now();
  };

  window.addEventListener("touchend", toccoFinito, opzioni);
  window.addEventListener("touchcancel", toccoFinito, opzioni);

  const dopoGestoDelSistema = (e) => e.hasUAVisualTransition === true || performance.now() - toccoDalBordo < DOPO_GESTO_MS;

  function alPopstate(e) {
    if (rilancio) return;

    const idSerie = idDaPercorso(percorsoPrima);
    const arrivo = window.location.pathname;

    if (inVolo || ridotto() || !idSerie || arrivo !== "/collezione") return;

    // Il sistema ha già animato il ritorno: il router riceve l'evento così com'è.
    if (dopoGestoDelSistema(e)) {
      toccoDalBordo = -Infinity;
      return;
    }

    e.stopImmediatePropagation();

    let fatto = false;
    const consegna = () => {
      if (fatto) return;
      fatto = true;
      rilancio = true;

      try {
        window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
      } finally {
        rilancio = false;
      }
    };

    avviaVolo(idSerie, async () => consegna());

    // Se la transizione non parte (scheda in secondo piano) il gesto non
    // deve restare senza effetto: il router riceve l'evento comunque.
    setTimeout(consegna, 400);
  }

  // In cattura: deve partire prima dell'ascoltatore del router.
  window.addEventListener("popstate", alPopstate, true);
}

installaVoloIndietro();
