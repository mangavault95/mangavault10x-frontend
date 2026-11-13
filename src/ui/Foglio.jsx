import { useEffect, useId, useLayoutEffect, useRef } from "react";
import Icon from "../app/Icon";
import Sovrapposizione from "./Sovrapposizione";

/**
 * Il foglio: l'unico modo in cui il sito apre qualcosa sopra una pagina.
 *
 * Fino al 13/11/2026 ogni finestra si costruiva da sé il velo, la
 * posizione e la chiusura, e infatti erano una ventina tutte un poco
 * diverse: alcune al centro dello schermo, altre in basso, nessuna che si
 * potesse trascinare, e la × sempre in alto a destra — il punto più
 * lontano dal pollice di chi tiene il telefono con una mano.
 *
 * Qui la forma è una sola e la decide lo schermo:
 *
 *   - sul telefono sale dal bordo basso, ha una maniglia, segue il dito e
 *     si chiude trascinandolo giù (o con un colpetto veloce); le azioni
 *     stanno in fondo, sopra la safe area;
 *   - da `sm` in su è la finestra al centro di sempre, con la sua ×.
 *
 * Chi lo usa passa titolo, contenuto e — se servono — le azioni. Non deve
 * sapere niente di veli, Escape, focus o animazioni.
 *
 *
 * PERCHÉ NON `fixed inset-0`
 *
 * La radice è scritta `inset-x-0 inset-y-0` apposta. In `index.css` e in
 * `Sovrapposizione` tutto ciò che è `.fixed.inset-0` riceve l'entrata e
 * l'uscita generiche delle vecchie finestre (sfuma e sale di 28 pixel):
 * il foglio ha le sue, e con quella classe le avrebbe tutte e due.
 */

/** Sotto questa larghezza il foglio è un foglio; sopra è una finestra. */
const LARGO = "(min-width: 640px)";

/** I token di movimento stanno in `index.css`: qui si leggono, non si riscrivono. */
function token(nome, ripiego) {
  const valore = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

  return valore || ripiego;
}

const millesimi = (nome, ripiego) => parseFloat(token(nome, "")) || ripiego;

const fermo = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * L'uscita.
 *
 * Chiudere vuol dire smontare, e un componente smontato sparisce di
 * colpo. Come in `Sovrapposizione`, mentre React toglie il foglio ne resta
 * una copia inerte che scende e sfuma, e poi si toglie da sola. Così
 * l'uscita è la stessa qualunque cosa abbia chiuso il foglio — il velo,
 * Escape, un bottone del contenuto — senza che nessuno debba chiederla.
 */
function lasciaUscita(radice) {
  // Chiuso trascinando: è già sceso da sé, una seconda discesa sarebbe un lampo.
  if (!radice || radice.dataset.sceso || fermo()) return;

  const copia = radice.cloneNode(true);

  // La copia va appesa solo se il foglio se n'è andato davvero. In
  // sviluppo React smonta e rimonta ogni effetto una volta per prova
  // (StrictMode): lì il foglio è ancora al suo posto, e una copia che
  // scende mentre l'originale resta sarebbe un fantasma a ogni apertura.
  queueMicrotask(() => {
    if (radice.isConnected) return;

    const velo = copia.querySelector("[data-foglio-velo]");
    const pannello = copia.querySelector("[data-foglio-pannello]");

    if (!velo || !pannello) return;

    copia.setAttribute("aria-hidden", "true");
    copia.inert = true;
    copia.style.pointerEvents = "none";
    copia.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));

    // Senza le classi d'entrata, o appena appesa la copia risalirebbe.
    velo.classList.remove("foglio-velo");
    pannello.classList.remove("foglio-pannello");

    document.body.appendChild(copia);

    const durata = millesimi("--d-uscita", 240);
    const opzioni = { duration: durata, easing: token("--e-uscita", "ease-in"), fill: "forwards" };

    velo.animate([{ opacity: 1 }, { opacity: 0 }], opzioni);
    pannello.animate(
      window.matchMedia(LARGO).matches
        ? [{ opacity: 1 }, { opacity: 0, transform: "translate3d(0, 16px, 0) scale(0.98)" }]
        : [{ transform: "translate3d(0, 0, 0)" }, { transform: "translate3d(0, 100%, 0)" }],
      opzioni
    );

    setTimeout(() => copia.remove(), durata + 40);
  });
}

export default function Foglio({
  titolo,
  sotto,
  azioni,
  onChiudere,
  // Quanto può allargarsi quando è una finestra. Classe intera, non un
  // pezzo: Tailwind legge i sorgenti alla lettera.
  larghezza = "sm:max-w-lg",
  // Per gli elenchi che arrivano fino al bordo con le loro righe.
  senzaMargini = false,
  className = "",
  children
}) {
  const radice = useRef(null);
  const velo = useRef(null);
  const pannello = useRef(null);
  const corpo = useRef(null);
  const chiudere = useRef(onChiudere);
  const idTitolo = useId();

  useEffect(() => {
    chiudere.current = onChiudere;
  }, [onChiudere]);

  useLayoutEffect(() => {
    const nodo = radice.current;

    return () => lasciaUscita(nodo);
  }, []);

  // Escape chiude; e il focus entra nel foglio e torna dov'era, o chi
  // naviga da tastiera resterebbe sul bottone rimasto sotto il velo.
  useEffect(() => {
    const prima = document.activeElement;

    pannello.current?.focus({ preventScroll: true });

    function alTasto(e) {
      if (e.key === "Escape") chiudere.current?.();
    }

    window.addEventListener("keydown", alTasto);

    return () => {
      window.removeEventListener("keydown", alTasto);
      if (prima instanceof HTMLElement && prima.isConnected) prima.focus({ preventScroll: true });
    };
  }, []);

  /**
   * Il trascinamento.
   *
   * Tre regole, le stesse dei fogli di iOS:
   *   - dalla testata (maniglia e titolo) parte sempre;
   *   - dal contenuto parte solo se è già in cima e si tira verso il
   *     basso — altrimenti quel gesto è lo scorrimento dell'elenco;
   *   - al rilascio decide dove sarebbe arrivato con l'inerzia: oltre
   *     metà altezza, o con un colpetto veloce, si chiude.
   *
   * Si muovono solo `transform` e `opacity`, scritti a mano sul nodo e non
   * passando dallo stato di React: a 120 Hz un render per fotogramma si
   * vedrebbe.
   *
   * Gli ascoltatori si attaccano qui e non con `onTouchMove` perché
   * devono poter fermare lo scorrimento (`preventDefault`), e React li
   * registra «passivi», cioè senza quel diritto.
   */
  useEffect(() => {
    const nodo = pannello.current;
    const sfondo = velo.current;

    if (!nodo || !sfondo) return undefined;

    let gesto = null;
    let chiusura = null;

    const posa = () => `transform ${token("--d-foglio", "380ms")} ${token("--e-posa", "ease-out")}`;

    function sposta(y) {
      const altezza = nodo.offsetHeight || 1;

      nodo.style.transition = "none";
      nodo.style.transform = `translate3d(0, ${y}px, 0)`;
      sfondo.style.opacity = String(Math.max(0, 1 - y / altezza));
    }

    function inizia(y, bersaglio) {
      if (chiusura || window.matchMedia(LARGO).matches) return;

      gesto = {
        y0: y,
        attivo: false,
        dallaTestata: Boolean(bersaglio.closest?.("[data-foglio-testata]")),
        ultimoY: y,
        ultimoT: performance.now(),
        velocita: 0,
        giu: 0
      };
    }

    /** Restituisce `true` quando il gesto è del foglio e non dell'elenco. */
    function muovi(y) {
      if (!gesto) return false;

      let dy = y - gesto.y0;

      if (!gesto.attivo) {
        // Sei pixel di tolleranza: un tocco non è mai perfettamente fermo.
        if (Math.abs(dy) < 6) return false;

        const inCima = (corpo.current?.scrollTop ?? 0) <= 0;

        if (!gesto.dallaTestata && !(inCima && dy > 0)) {
          gesto = null;
          return false;
        }

        // Il gesto comincia qui, e anche il conto della velocità: i sei
        // pixel di tolleranza non sono strada fatta dal foglio.
        gesto.attivo = true;
        gesto.y0 = y;
        gesto.ultimoY = y;
        gesto.ultimoT = performance.now();

        sposta(0);

        return true;
      }

      const ora = performance.now();

      // Media mobile: la velocità dell'ultimo campione da sola salta
      // troppo. Mai su meno di otto millesimi: due eventi arrivati nello
      // stesso fotogramma darebbero una velocità assurda.
      if (ora - gesto.ultimoT >= 8) {
        gesto.velocita = 0.7 * ((y - gesto.ultimoY) / (ora - gesto.ultimoT)) + 0.3 * gesto.velocita;
        gesto.ultimoY = y;
        gesto.ultimoT = ora;
      }

      // Verso l'alto fa resistenza: il foglio è già tutto fuori.
      gesto.giu = dy < 0 ? dy / 4 : dy;

      sposta(gesto.giu);

      return true;
    }

    function finisci() {
      const era = gesto;

      gesto = null;

      if (!era?.attivo) return;

      const altezza = nodo.offsetHeight || 1;
      // Un dito che si è fermato prima di staccarsi non ha più slancio:
      // la velocità di un decimo di secondo fa non conta.
      const slancio = performance.now() - era.ultimoT > 90 ? 0 : era.velocita;
      const arrivo = era.giu + slancio * 220;

      if (arrivo > altezza / 2) {
        // Scende da dove l'ha lasciato il dito, poi si smonta.
        const durata = millesimi("--d-uscita", 240);

        radice.current.dataset.sceso = "1";
        nodo.style.transition = `transform ${durata}ms ${token("--e-uscita", "ease-in")}`;
        nodo.style.transform = "translate3d(0, 100%, 0)";
        sfondo.style.transition = `opacity ${durata}ms linear`;
        sfondo.style.opacity = "0";
        chiusura = setTimeout(() => chiudere.current?.(), durata);

        return;
      }

      // Torna su. Alla fine gli stili scritti a mano si tolgono: un
      // `transform` rimasto addosso, anche se vale «fermo», farebbe del
      // foglio il riferimento di ogni `position: fixed` al suo interno.
      nodo.style.transition = posa();
      nodo.style.transform = "translate3d(0, 0, 0)";
      sfondo.style.opacity = "";

      nodo.addEventListener(
        "transitionend",
        () => {
          if (gesto?.attivo) return;

          nodo.style.transition = "";
          nodo.style.transform = "";
        },
        { once: true }
      );
    }

    const alTocco = (e) => inizia(e.touches[0].clientY, e.target);

    function alMovimento(e) {
      if (muovi(e.touches[0].clientY) && e.cancelable) e.preventDefault();
    }

    // Col mouse (una finestra stretta su un computer) si trascina solo
    // dalla testata: nel contenuto il mouse seleziona il testo.
    function alPuntatore(e) {
      if (e.pointerType === "touch" || !e.target.closest?.("[data-foglio-testata]")) return;
      if (e.target.closest("button, a")) return;

      inizia(e.clientY, e.target);

      const segue = (ev) => muovi(ev.clientY);

      function lascia() {
        window.removeEventListener("pointermove", segue);
        window.removeEventListener("pointerup", lascia);
        finisci();
      }

      window.addEventListener("pointermove", segue);
      window.addEventListener("pointerup", lascia);
    }

    nodo.addEventListener("touchstart", alTocco, { passive: true });
    nodo.addEventListener("touchmove", alMovimento, { passive: false });
    nodo.addEventListener("touchend", finisci);
    nodo.addEventListener("touchcancel", finisci);
    nodo.addEventListener("pointerdown", alPuntatore);

    return () => {
      clearTimeout(chiusura);
      nodo.removeEventListener("touchstart", alTocco);
      nodo.removeEventListener("touchmove", alMovimento);
      nodo.removeEventListener("touchend", finisci);
      nodo.removeEventListener("touchcancel", finisci);
      nodo.removeEventListener("pointerdown", alPuntatore);
    };
  }, []);

  return (
    <Sovrapposizione>
      <div
        ref={radice}
        className={`fixed inset-x-0 inset-y-0 z-overlay flex items-end justify-center sm:items-center sm:p-5 ${className}`}
      >
        {/* Il velo è un fratello del foglio, non un suo antenato: un
            trascinamento cominciato dentro e finito fuori non può
            arrivargli come click, e non serve `useChiusuraVelo`.
            Senza sfocatura: su un telefono è un filtro a tutto schermo
            ricalcolato a ogni fotogramma, e sotto un velo al 70% non si
            vedeva. */}
        <div
          ref={velo}
          data-foglio-velo=""
          aria-hidden="true"
          onClick={() => onChiudere?.()}
          className="foglio-velo absolute inset-0 bg-void/70"
        />

        <div
          ref={pannello}
          data-foglio-pannello=""
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitolo}
          tabIndex={-1}
          className={`foglio-pannello relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet border border-b-0 border-hairline bg-glass-3 shadow-float outline-none sm:max-h-[85dvh] sm:rounded-sheet sm:border-b ${larghezza}`}
        >
          <div
            data-foglio-testata=""
            className="shrink-0 touch-none px-5 pb-3 pt-2 sm:touch-auto sm:px-6 sm:pb-4 sm:pt-5"
          >
            <span aria-hidden="true" className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-ink-faint/60 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={idTitolo} className="font-display text-lg font-semibold text-ink-bright">
                  {titolo}
                </h2>

                {sotto && <p className="mt-0.5 text-sm text-ink-muted">{sotto}</p>}
              </div>

              {/* Sul telefono la × non si vede — si chiude trascinando o
                  toccando fuori — ma resta per chi usa un lettore di
                  schermo, che non ha né l'uno né l'altro gesto. */}
              <button
                type="button"
                onClick={() => onChiudere?.()}
                aria-label="Chiudi"
                className="sr-only shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright sm:not-sr-only sm:grid sm:h-11 sm:w-11"
              >
                <Icon nome="close" dimensione={18} />
              </button>
            </div>
          </div>

          <div
            ref={corpo}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${senzaMargini ? "" : "px-5 sm:px-6"} ${
              azioni ? "pb-4" : "pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6"
            }`}
          >
            {children}
          </div>

          {azioni && (
            <div className="flex shrink-0 gap-3 border-t border-hairline px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
              {azioni}
            </div>
          )}
        </div>
      </div>
    </Sovrapposizione>
  );
}
