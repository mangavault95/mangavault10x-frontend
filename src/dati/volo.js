import { flushSync } from "react-dom";

/**
 * Il volo di ritorno (03/11/2026): dalla scheda di una serie, la copertina
 * torna al suo posto nella griglia da cui era partita.
 *
 * È il contrario di `apriConVolo` in `ui/CartaSerie.jsx`: lì la carta
 * cliccata riceve il nome della transizione, qui lo riceve la carta di
 * ritorno, che si trova solo DOPO che la pagina di prima è tornata a
 * esistere. Per questo la funzione della transizione aspetta un attimo e
 * poi la cerca (e, se è fuori dallo schermo, la porta in vista: senza,
 * la copertina volerebbe verso un punto che nessuno vede).
 *
 * Se la carta non c'è — si era arrivati da Home, da un indirizzo salvato —
 * il nome resta solo sulla copertina della scheda, che sfuma come ogni
 * altro cambio di pagina. Mai un tocco morto: `navigate` parte comunque.
 */
export function tornaIndietroConVolo(navigate, idSerie) {
  const ridotto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (typeof document.startViewTransition !== "function" || ridotto) {
    navigate(-1);
    return;
  }

  let fatto = false;
  let carta = null;

  const pulisci = () => {
    if (carta) carta.style.viewTransitionName = "";
  };

  const vai = async () => {
    if (fatto) return;
    fatto = true;

    flushSync(() => navigate(-1));

    // La pagina di prima è montata; l'effetto che rimette lo scorrimento
    // in cima (Shell) parte subito dopo, e la carta si cerca dopo di lui.
    await new Promise((r) => setTimeout(r, 40));

    const cerca = `a[href="/serie/${idSerie}"], a[href^="/serie/${idSerie}?"]`;
    const trovata = document.querySelector(`${cerca}`)?.querySelector("[data-copertina]");

    if (!trovata) return;

    const r = trovata.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) {
      trovata.scrollIntoView({ block: "center", behavior: "instant" });
    }

    carta = trovata;
    carta.style.viewTransitionName = "copertina-serie";
  };

  try {
    const volo = document.startViewTransition(vai);

    volo.finished.then(pulisci, pulisci);
    setTimeout(vai, 400);
  } catch {
    vai();
  }
}
