import { useState } from "react";
import Icon from "../app/Icon";
import { useAccessoProtetto } from "../dati/accesso";
import { updateManga, updateRating } from "../services/api";

/**
 * I tre gesti che prima costringevano ad aprire Gestione: segnare un
 * preferito, dare un voto, muovere il contatore dei volumi.
 *
 * Tutti e tre condividono lo stesso schema — cambia lo schermo subito,
 * poi manda la modifica al server, e se qualcosa va storto torna
 * indietro. Aspettare la risposta di Render prima di mostrare la
 * stella accesa renderebbe ogni click una piccola attesa; sbagliare
 * silenziosamente sarebbe peggio, quindi l'errore che arriva riporta
 * tutto com'era e lo dice.
 *
 * La scrittura resta protetta: `useAccessoProtetto` apre un accesso
 * compatto proprio qui se serve, invece di mandare a `/admin`.
 */

/* ==================================================
   PREFERITO
   ================================================== */

export function BottonePreferito({ serie, onCambiato, dimensione = 18, className = "" }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);
  const [erroreVisibile, setErroreVisibile] = useState(false);

  async function alClick(e) {
    // Sta quasi sempre sopra un <Link> (la copertina in una griglia):
    // senza questi due, il click aprirebbe anche la scheda della serie.
    e.preventDefault();
    e.stopPropagation();

    if (inCorso) return;

    const nuovo = !serie.preferito;

    setInCorso(true);
    setErroreVisibile(false);
    onCambiato?.(nuovo);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { preferito: nuovo }));
    } catch (err) {
      if (!err?.annullato) {
        onCambiato?.(serie.preferito);
        setErroreVisibile(true);
      }
    } finally {
      setInCorso(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alClick}
      disabled={inCorso}
      title={serie.preferito ? "Togli dai preferiti" : "Segna come preferito"}
      aria-pressed={serie.preferito}
      className={`grid place-items-center rounded-full transition-all duration-quick ease-spring
                  active:scale-90 disabled:opacity-50
                  ${serie.preferito ? "text-brass-400" : "text-ink-faint hover:text-brass-300"}
                  ${className}`}
    >
      <Icon nome="star" dimensione={dimensione} piena={serie.preferito} />
      {erroreVisibile && <span className="sr-only">Salvataggio non riuscito</span>}
    </button>
  );
}

/* ==================================================
   VOTO — cinque stelle, ognuna vale due punti
   ================================================== */

/**
 * Il voto è su dieci con un decimale (`8.5`), ma nessuno pensa in
 * decimi guardando delle stelle: cinque stelle, ciascuna vale due
 * punti, e la metà sinistra o destra della stella decide se il click
 * vale un punto pieno o mezzo.
 */
export function VotoStelle({ serie, onCambiato, dimensione = 20, sospeso = false }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);
  const [anteprima, setAnteprima] = useState(null);

  const valoreVisibile = anteprima ?? serie.valutazione ?? 0;

  async function salva(nuovo, e) {
    e?.preventDefault();
    e?.stopPropagation();

    if (inCorso || nuovo === serie.valutazione) return;

    const precedente = serie.valutazione;

    setInCorso(true);
    onCambiato?.(nuovo);

    try {
      await eseguiProtetto(() => updateRating(serie.id, nuovo));
    } catch (err) {
      if (!err?.annullato) onCambiato?.(precedente);
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${sospeso ? "opacity-60" : ""}`}
      onMouseLeave={() => setAnteprima(null)}
      role="radiogroup"
      aria-label={`Voto: ${valoreVisibile.toFixed(1)} su 10`}
    >
      {[0, 1, 2, 3, 4].map((indice) => {
        const soglia = (indice + 1) * 2;
        const quotaStella = Math.max(0, Math.min(1, valoreVisibile - indice * 2));

        return (
          <button
            key={indice}
            type="button"
            disabled={inCorso}
            className="relative grid place-items-center p-0.5 text-ink-faint transition-transform duration-quick ease-spring hover:scale-110 disabled:pointer-events-none"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const meta = (e.clientX - r.left) / r.width < 0.5;

              setAnteprima(indice * 2 + (meta ? 1 : 2));
            }}
            onClick={(e) => salva(anteprima ?? soglia, e)}
          >
            {/* Il contorno vuoto sta sempre sotto; sopra, una stella
                piena ritagliata alla percentuale giusta con `clip-path`
                — è così che si ottiene una mezza stella senza dover
                disegnare un tracciato apposta. */}
            <span className="relative block" style={{ width: dimensione, height: dimensione }}>
              <Icon nome="star" dimensione={dimensione} className="absolute inset-0" />

              {quotaStella > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden text-brass-400"
                  style={{ width: `${quotaStella * 100}%` }}
                >
                  <Icon nome="star" dimensione={dimensione} piena />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ==================================================
   VOLUMI POSSEDUTI — contapagine
   ================================================== */

export function ContaVolumi({ serie, onCambiato, compatto = false }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);

  async function cambia(delta, e) {
    e?.preventDefault();
    e?.stopPropagation();

    if (inCorso) return;

    const nuovo = Math.max(0, serie.posseduti + delta);

    if (nuovo === serie.posseduti) return;

    setInCorso(true);
    onCambiato?.(nuovo);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { volumiposseduti: nuovo }));
    } catch (err) {
      if (!err?.annullato) onCambiato?.(serie.posseduti);
    } finally {
      setInCorso(false);
    }
  }

  const misura = compatto
    ? "h-6 w-6 text-xs"
    : "h-8 w-8 text-sm";

  return (
    <div
      className={`inline-flex items-center rounded-card border border-hairline bg-glass-2 ${
        compatto ? "gap-0.5 p-0.5" : "gap-1 p-1"
      }`}
    >
      <button
        type="button"
        onClick={(e) => cambia(-1, e)}
        disabled={inCorso || serie.posseduti <= 0}
        aria-label="Un volume in meno"
        className={`grid place-items-center rounded-lg text-ink-muted transition-all duration-quick
                    hover:bg-glass-3 hover:text-ink-bright active:scale-90
                    disabled:pointer-events-none disabled:opacity-30 ${misura}`}
      >
        −
      </button>

      <span className={`min-w-[1.5rem] text-center font-numeric font-semibold text-ink-bright ${compatto ? "text-xs" : "text-sm"}`}>
        {serie.posseduti}
      </span>

      <button
        type="button"
        onClick={(e) => cambia(1, e)}
        disabled={inCorso || (serie.totali && serie.posseduti >= serie.totali)}
        aria-label="Un volume in più"
        title={
          serie.totali && serie.posseduti >= serie.totali
            ? "Hai già tutti i volumi usciti"
            : "Un volume in più"
        }
        className={`grid place-items-center rounded-lg text-ink-muted transition-all duration-quick
                    hover:bg-glass-3 hover:text-ink-bright active:scale-90
                    disabled:pointer-events-none disabled:opacity-30 ${misura}`}
      >
        +
      </button>
    </div>
  );
}
