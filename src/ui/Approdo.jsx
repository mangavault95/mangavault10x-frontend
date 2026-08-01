import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../app/Icon";

/**
 * La cornice delle pagine che si raggiungono dalla stanza.
 *
 * Sono quattro — lo scontrino, la bacheca, il volume aperto, il banco —
 * e sono la seconda veste di dati che hanno già la loro pagina nella
 * barra laterale. Non è duplicazione: chi arriva qui ha appena visto la
 * telecamera fermarsi davanti a un oggetto, e aprirgli una tabella con i
 * filtri spezzerebbe in due la cosa che si era appena costruita. Chi ha
 * premuto «4» voleva la tabella, e la tabella è rimasta dov'era.
 *
 *
 * IL NERO È LA GIUNTURA
 *
 * Uscendo dalla stanza la scena si spegne (vedi `tre/avvicinamento.js`,
 * `accosta`): l'ultimo fotogramma del canvas è buio. Questa cornice
 * comincia dallo stesso buio e si alza da lì — quindi fra il canvas che
 * muore e il DOM che nasce non c'è nessun fotogramma in cui si vedano
 * tutti e due, e il cambio di tecnologia non si vede.
 *
 * Uscendo di qui succede il contrario: prima si torna neri, e solo dopo
 * si naviga. Di là la stanza trova il velo già alzato e ci riemerge
 * sotto. Fra andata e ritorno la regola è una sola — **non si cambia
 * schermata se non al buio**.
 *
 *
 * IL RITORNO NON È «INDIETRO»
 *
 * Si torna sempre alla stanza, mai alla cronologia del browser. Chi è
 * arrivato qui da un indirizzo scritto a mano, o da un preferito, non ha
 * nessuna stanza dietro le spalle: `history.back()` lo porterebbe fuori
 * dal sito. E chi è arrivato dalla stanza ci vuole tornare comunque —
 * che è quello che «torna nella stanza» dice, invece di «indietro», che
 * non si sa mai dove porti.
 */

// Poco più della transizione qui sotto: si naviga quando il nero c'è
// davvero, mai prima.
const NERO_MS = 420;

export default function Approdo({
  titolo,
  elenco,
  fondo,
  children,
  className = ""
}) {
  const navigate = useNavigate();

  // Tre stati e non due: si nasce neri, ci si alza, e alla fine si torna
  // neri per un'altra ragione. Un booleano solo li confonderebbe.
  const [alzato, setAlzato] = useState(false);
  const [uscendo, setUscendo] = useState(false);

  useEffect(() => {
    // Un fotogramma di ritardo: montare già alzati salterebbe la
    // transizione invece di farla partire.
    const su = requestAnimationFrame(() => setAlzato(true));

    return () => cancelAnimationFrame(su);
  }, []);

  const esci = useCallback(() => {
    setUscendo(true);

    setTimeout(() => navigate("/"), NERO_MS);
  }, [navigate]);

  useEffect(() => {
    function alTasto(e) {
      if (e.key !== "Escape") return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      e.preventDefault();
      esci();
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [esci]);

  return (
    <div className={`relative min-h-dvh overflow-hidden ${className}`}>
      {fondo}

      <div className="relative z-raised">{children}</div>

      {/* ---------- I due comandi ---------- */}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-sticky flex items-start justify-between gap-4 p-5 sm:p-6">
        <button
          onClick={esci}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-hairline bg-void/70 py-2 pl-3 pr-4 text-sm font-medium text-ink-bright
                     shadow-float backdrop-blur-xl transition-all duration-quick ease-settle
                     hover:border-brass-400/40 hover:text-brass-300 active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <Icon nome="porta" dimensione={16} />
          Torna nella stanza
          <kbd className="ml-1 rounded border border-soft px-1.5 py-0.5 font-numeric text-[0.6rem] text-ink-muted">
            Esc
          </kbd>
        </button>

        {/* L'altra veste degli stessi dati, dichiarata. Senza, questa
            pagina sembrerebbe l'unica che c'è, e chi cerca la ricerca o
            i moduli di modifica penserebbe che siano spariti. */}
        {elenco && (
          <Link
            to={elenco.percorso}
            className="pointer-events-auto rounded-full border border-hairline bg-void/70 px-4 py-2 text-xs text-ink-muted
                       shadow-float backdrop-blur-xl transition-colors duration-quick
                       hover:border-soft hover:text-ink-bright
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
          >
            {elenco.etichetta}
          </Link>
        )}
      </div>

      {titolo && <h1 className="sr-only">{titolo}</h1>}

      {/* ---------- Il velo ---------- */}

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-overlay bg-void transition-opacity ease-settle
                    ${alzato && !uscendo ? "opacity-0" : "opacity-100"}`}
        style={{ transitionDuration: `${uscendo ? NERO_MS : 700}ms` }}
      />
    </div>
  );
}
