import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../app/Icon";

/**
 * Le azioni di una riga, sotto tre puntini.
 *
 * Perché non i tasti in chiaro, che c'erano prima. Ogni riga di
 * classifica portava un solo comando — «Togli» — scritto per esteso e
 * acceso al passaggio del mouse: occupava una colonna fissa in tutte
 * le righe per un gesto che si fa due volte l'anno, e non aveva dove
 * crescere. Appena i comandi diventano cinque (voto, note, rimetti in
 * lettura, scheda, togli) scriverli tutti vorrebbe dire una riga di
 * elenco larga come una barra degli strumenti.
 *
 * Sotto i puntini invece la riga resta una riga, e ogni voce può
 * permettersi una frase di spiegazione — che è quello che serve
 * davvero quando due comandi vicini fanno cose simili ma non uguali
 * («togli dal tavolo» e «droppa» si somigliavano troppo, ed è per
 * questo che uno dei due era stato tolto del tutto).
 *
 * IL PANNELLO STA SU <body>, NON DENTRO LA RIGA. Le schede del tavolo
 * di lettura sono `overflow-hidden` (ci gira dentro la luce della
 * lampada), e un menu figlio verrebbe tagliato al bordo della scheda.
 * Portarlo fuori e piazzarlo alle coordinate del bottone è l'unico
 * modo che non chiede alle schede di rinunciare al loro disegno.
 */

/**
 * Una voce del menu.
 *
 * @typedef {Object} Voce
 * @property {string}   chiave      identificativo, per React
 * @property {string}   etichetta   cosa fa, all'infinito o all'imperativo
 * @property {string}  [descrizione] la riga piccola sotto: serve a
 *                                  distinguere due voci che si somigliano
 * @property {Function} [onClick]   cosa succede
 * @property {string}  [conferma]   se c'è, il primo click cambia
 *                                  l'etichetta in questa e solo il
 *                                  secondo agisce
 * @property {boolean} [pericolo]   rosso: qui sparisce roba
 * @property {boolean} [spenta]     visibile ma non premibile
 */

export default function Menu({ etichetta, voci, larghezza = "16rem" }) {
  const [aperto, setAperto] = useState(false);
  const [posizione, setPosizione] = useState(null);
  const [inConferma, setInConferma] = useState(null);

  const bottone = useRef(null);
  const pannello = useRef(null);
  const idPannello = useId();

  const disponibili = (voci || []).filter(Boolean);

  const chiudi = useCallback(() => {
    setAperto(false);
    // La conferma non sopravvive alla chiusura: riaprendo il menu il
    // tasto rosso sarebbe già armato, e il click successivo
    // cancellerebbe qualcosa senza aver chiesto niente.
    setInConferma(null);
    bottone.current?.focus();
  }, []);

  // La posizione si misura dopo il disegno del pannello, quando la sua
  // altezza è nota: serve a capire se ci sta sotto il bottone o se deve
  // aprirsi verso l'alto.
  useLayoutEffect(() => {
    if (!aperto) return undefined;

    function misura() {
      const b = bottone.current?.getBoundingClientRect();

      if (!b) return;

      const alto = pannello.current?.offsetHeight ?? 0;
      const largo = pannello.current?.offsetWidth ?? 240;

      const sotto = window.innerHeight - b.bottom;

      setPosizione({
        // Allineato a destra del bottone, ma mai oltre il bordo dello
        // schermo: sul telefono i puntini stanno a filo del margine.
        left: Math.max(8, Math.min(b.right - largo, window.innerWidth - largo - 8)),
        top: sotto > alto + 12 || sotto > b.top ? b.bottom + 6 : b.top - alto - 6
      });
    }

    misura();

    // Scorrendo, il bottone si sposta e il pannello no: invece di
    // inseguirlo si chiude. Un menu che scivola via da solo mentre
    // scorri è peggio di uno che si chiude.
    window.addEventListener("resize", misura);
    window.addEventListener("scroll", chiudi, true);

    return () => {
      window.removeEventListener("resize", misura);
      window.removeEventListener("scroll", chiudi, true);
    };
  }, [aperto, chiudi]);

  useEffect(() => {
    if (!aperto) return undefined;

    function alTasto(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        chiudi();
      }
    }

    function fuori(e) {
      if (pannello.current?.contains(e.target)) return;
      if (bottone.current?.contains(e.target)) return;

      setAperto(false);
      setInConferma(null);
    }

    document.addEventListener("keydown", alTasto, true);
    document.addEventListener("mousedown", fuori);
    document.addEventListener("touchstart", fuori);

    return () => {
      document.removeEventListener("keydown", alTasto, true);
      document.removeEventListener("mousedown", fuori);
      document.removeEventListener("touchstart", fuori);
    };
  }, [aperto, chiudi]);

  // Il fuoco entra nel menu appena si apre: da tastiera, un pannello
  // che compare senza portarci dentro il cursore è un pannello che
  // esiste solo per il mouse.
  useEffect(() => {
    if (aperto) pannello.current?.querySelector("button:not(:disabled)")?.focus();
  }, [aperto]);

  function scorri(e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    e.preventDefault();

    const tasti = [...(pannello.current?.querySelectorAll("button:not(:disabled)") || [])];
    const corrente = tasti.indexOf(document.activeElement);
    const passo = e.key === "ArrowDown" ? 1 : -1;

    tasti[(corrente + passo + tasti.length) % tasti.length]?.focus();
  }

  function premi(voce) {
    if (voce.conferma && inConferma !== voce.chiave) {
      setInConferma(voce.chiave);
      return;
    }

    setAperto(false);
    setInConferma(null);
    voce.onClick?.();
  }

  if (!disponibili.length) return null;

  return (
    <>
      <button
        ref={bottone}
        type="button"
        aria-label={etichetta}
        title={etichetta}
        aria-haspopup="menu"
        aria-expanded={aperto}
        aria-controls={aperto ? idPannello : undefined}
        onClick={(e) => {
          // Sta spesso dentro un <Link> (la riga di classifica, la
          // carta di una serie): senza questi due, aprire il menu
          // aprirebbe anche la scheda sotto.
          e.preventDefault();
          e.stopPropagation();
          setAperto((a) => !a);
        }}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-quick
                    hover:bg-glass-2 hover:text-ink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                    [@media(hover:none)]:h-10 [@media(hover:none)]:w-10
                    ${aperto ? "bg-glass-2 text-ink-bright" : "text-ink-faint"}`}
      >
        <Icon nome="puntini" dimensione={16} piena />
      </button>

      {aperto &&
        createPortal(
          <div
            ref={pannello}
            id={idPannello}
            role="menu"
            aria-label={etichetta}
            onKeyDown={scorri}
            style={{
              width: larghezza,
              // Finché la misura non è fatta il pannello è già
              // disegnato ma fuori vista: serve disegnato per potersi
              // misurare, e invisibile per non lampeggiare in alto a
              // sinistra prima di arrivare al suo posto.
              left: posizione?.left ?? -9999,
              top: posizione?.top ?? -9999
            }}
            className="fixed z-toast overflow-hidden rounded-card border border-soft bg-glass-3 p-1 shadow-float backdrop-blur-2xl animate-rise-in"
          >
            {disponibili.map((voce) => {
              const armata = inConferma === voce.chiave;

              return (
                <button
                  key={voce.chiave}
                  type="button"
                  role="menuitem"
                  disabled={voce.spenta}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    premi(voce);
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left transition-colors duration-quick
                              focus-visible:outline-none focus-visible:ring-2
                              disabled:pointer-events-none disabled:opacity-40
                              ${
                                armata
                                  ? "bg-ember/20 text-ember focus-visible:ring-ember"
                                  : voce.pericolo
                                    ? "text-ink hover:bg-ember/12 hover:text-ember focus-visible:ring-ember"
                                    : "text-ink hover:bg-glass-2 hover:text-ink-bright focus-visible:ring-brass-400"
                              }`}
                >
                  <span className="block text-sm font-medium">
                    {armata ? voce.conferma : voce.etichetta}
                  </span>

                  {voce.descrizione && !armata && (
                    <span className="mt-0.5 block text-xs leading-snug text-ink-faint">
                      {voce.descrizione}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
