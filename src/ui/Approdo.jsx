import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TornaInBiblioteca from "./TornaInBiblioteca";

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
 * DUE MONDI, NESSUN PONTE
 *
 * C'era un collegamento da qui alla pagina-elenco corrispondente, ed è
 * stato tolto. Sembrava un gesto di cortesia — «gli stessi dati, di là»
 * — ma faceva esattamente il danno che queste pagine devono evitare:
 * dichiarava che sono due modi di guardare la stessa tabella, mentre
 * devono essere due posti diversi. Dalla stanza si arriva alla bacheca;
 * all'elenco dei desideri si arriva dalla barra laterale. Chi vuole
 * l'altro passa dalla sala, che è la porta di tutto.
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

export default function Approdo({ titolo, fondo, children, className = "" }) {
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

      {/* ---------- La via di ritorno ----------
          Una sola, e grossa. Era un bottone di vetro fra i tanti, e da
          una pagina che riempie lo schermo di uno scontrino o di un muro
          di sughero la strada per tornare indietro deve essere la cosa
          più evidente che c'è: qui dentro non c'è nient'altro da
          premere, e chi non la trova resta chiuso in un cassetto. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-sticky p-5 sm:p-6">
        <TornaInBiblioteca onClick={esci} />
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
