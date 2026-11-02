import { useState } from "react";
import { useSessione } from "../dati/sessione";
import { scegliTema, temaDi } from "../dati/tema";

/**
 * Notte o Giorno: l'interruttore delle impostazioni.
 *
 * Sta in due posti — il foglio «Tu» del telefono e il menu del proprio
 * nome su schermo largo — e quindi è un componente solo: due copie dello
 * stesso interruttore finirebbero per dire cose diverse.
 *
 * La scelta si ricorda per persona (o per dispositivo, per chi non è
 * entrato). L'accento non si sceglie qui: è il colore di chi guarda.
 */
const VOCI = [
  { id: "notte", etichetta: "Notte", kana: "夜", segno: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
  {
    id: "giorno",
    etichetta: "Giorno",
    kana: "昼",
    segno: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
  }
];

export default function SceltaTema({ className = "" }) {
  const { utente } = useSessione();
  const [tema, setTema] = useState(() => temaDi(utente));

  return (
    <div role="group" aria-label="Tema" className={`grid grid-cols-2 gap-1 rounded-card bg-shelf p-1 ${className}`}>
      {VOCI.map((v) => {
        const acceso = tema === v.id;

        return (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              scegliTema(utente, v.id);
              setTema(v.id);
            }}
            aria-pressed={acceso}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-quick
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
              ${acceso ? "insegna" : "text-ink-muted hover:text-ink-bright"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={v.segno} />
            </svg>
            {v.etichetta}
            <span aria-hidden="true" className="font-pixel text-[0.7rem] font-normal opacity-70">{v.kana}</span>
          </button>
        );
      })}
    </div>
  );
}
