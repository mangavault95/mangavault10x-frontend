import { useState } from "react";
import { ModuloAccesso } from "../dati/AccessoProvider";
import { useSessione } from "../dati/sessione";

/**
 * Chi sei, in un angolo della barra.
 *
 * Serviva una porta d'ingresso vera. Finché il lettore era uno,
 * l'accesso compariva solo quando si provava a salvare qualcosa —
 * bastava, perché era l'unica cosa che l'accesso serviva a fare. Ora
 * decide anche COSA VEDI: quali voti sono accesi, quali letture sono le
 * tue. Chi arriva e vuole entrare non deve dover fingere di modificare
 * una scheda per trovare il modulo.
 *
 * È anche l'unico posto dove si legge il proprio soprannome, e serve:
 * con due persone che usano lo stesso sito dallo stesso divano,
 * sapere per chi si sta votando non è un dettaglio.
 */
export default function Identita({ compatto = false }) {
  const { utente, esci } = useSessione();
  const [aperto, setAperto] = useState(false);
  const [accessoAperto, setAccessoAperto] = useState(false);

  if (!utente) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAccessoAperto(true)}
          title="Entra"
          aria-label="Entra"
          className={`grid place-items-center rounded-card border border-hairline text-ink-muted transition-all duration-quick
                      hover:border-soft hover:text-ink-bright active:scale-95
                      ${compatto ? "h-9 w-9" : "h-11 w-11"}`}
        >
          <Sagoma />
        </button>

        {accessoAperto && (
          <ModuloAccesso
            motivo="Per avere i tuoi voti e le tue letture."
            onRiuscito={() => setAccessoAperto(false)}
            onAnnulla={() => setAccessoAperto(false)}
          />
        )}
      </>
    );
  }

  const iniziale = (utente.nickname || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAperto((a) => !a)}
        title={utente.nickname}
        aria-expanded={aperto}
        aria-label={`Sei ${utente.nickname}`}
        className={`grid place-items-center rounded-full border border-brass-400/40 bg-brass-400/15 font-display text-sm font-semibold text-brass-300
                    transition-all duration-quick hover:bg-brass-400/25 active:scale-95
                    ${compatto ? "h-9 w-9" : "h-11 w-11"}`}
      >
        {iniziale}
      </button>

      {aperto && (
        <>
          {/* Il velo prende i click fuori: un pannellino che non si
              chiude cliccando altrove resta lì a coprire la pagina. */}
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setAperto(false)}
            className="fixed inset-0 z-sticky cursor-default"
          />

          <div className="absolute bottom-0 left-full z-toast ml-3 w-52 rounded-panel border border-hairline bg-glass-3 p-4 shadow-float backdrop-blur-2xl">
            <p className="font-display text-sm font-semibold text-ink-bright">
              {utente.nickname}
            </p>

            <p className="mt-0.5 text-xs text-ink-muted">
              {utente.proprietario ? "Padrone di casa" : "Lettore"}
            </p>

            <button
              type="button"
              onClick={() => {
                setAperto(false);
                esci();
              }}
              className="mt-3 w-full rounded-card border border-hairline px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
            >
              Esci
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Una sagoma di persona: chiunque, cioè nessuno in particolare. */
function Sagoma() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}
