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
 * tue, e — da quando la videoteca è di ciascuno — quali serie ci stanno
 * dentro. Chi arriva e vuole entrare non deve dover fingere di
 * modificare una scheda per trovare il modulo.
 *
 * È anche l'unico posto dove si legge il proprio soprannome, e serve:
 * con due persone che usano lo stesso sito dallo stesso divano,
 * sapere per chi si sta votando non è un dettaglio.
 *
 * Si veste come il mondo in cui sta, per la stessa ragione della
 * cornice: sulla carta chiara della videoteca, un bottone d'ottone su
 * vetro scuro sembra un pezzo caduto da un'altra pagina. Le classi
 * stanno scritte per intero — Tailwind legge i sorgenti alla lettera.
 */
const VESTI = {
  biblioteca: {
    ospite:
      "border border-hairline text-ink-muted hover:border-soft hover:text-ink-bright",
    iniziale:
      "border border-brass-400/40 bg-brass-400/15 text-brass-300 hover:bg-brass-400/25",
    pannello: "border-hairline bg-glass-3 backdrop-blur-2xl",
    nome: "font-display text-sm font-semibold text-ink-bright",
    ruolo: "mt-0.5 text-xs text-ink-muted",
    esci:
      "mt-3 w-full rounded-card border border-hairline px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
  },
  videoteca: {
    ospite:
      "border border-quaderno-riga text-quaderno-tenue hover:border-quaderno-blu hover:text-quaderno-inchiostro",
    iniziale:
      "border border-quaderno-blu/30 bg-quaderno-blu-tenue text-quaderno-blu hover:bg-quaderno-blu hover:text-white",
    pannello: "border-quaderno-riga bg-quaderno-foglio",
    nome: "font-display text-sm font-semibold text-quaderno-inchiostro",
    ruolo: "mt-0.5 text-xs text-quaderno-tenue",
    esci:
      "mt-3 w-full rounded-card border border-quaderno-riga px-3 py-2 text-sm font-medium text-quaderno-tenue transition-colors duration-quick hover:text-quaderno-inchiostro"
  }
};

export default function Identita({ compatto = false, mondo = "biblioteca" }) {
  const { utente, esci } = useSessione();
  const [aperto, setAperto] = useState(false);
  const [accessoAperto, setAccessoAperto] = useState(false);

  const veste = VESTI[mondo] || VESTI.biblioteca;

  if (!utente) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAccessoAperto(true)}
          title="Entra"
          aria-label="Entra"
          className={`grid place-items-center rounded-card transition-all duration-quick active:scale-95
                      ${veste.ospite} ${compatto ? "h-9 w-9" : "h-11 w-11"}`}
        >
          <Sagoma />
        </button>

        {accessoAperto && (
          <ModuloAccesso
            mondo={mondo}
            motivo={
              mondo === "videoteca"
                ? "Per avere la tua videoteca: le tue serie, le tue puntate, i tuoi voti."
                : "Per avere i tuoi voti e le tue letture."
            }
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
        className={`grid place-items-center rounded-full font-display text-sm font-semibold
                    transition-all duration-quick active:scale-95
                    ${veste.iniziale} ${compatto ? "h-9 w-9" : "h-11 w-11"}`}
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

          <div
            className={`absolute bottom-0 left-full z-toast ml-3 w-52 rounded-panel border p-4 shadow-float ${veste.pannello}`}
          >
            <p className={veste.nome}>{utente.nickname}</p>

            <p className={veste.ruolo}>
              {utente.proprietario ? "Padrone di casa" : "Lettore"}
            </p>

            <button
              type="button"
              onClick={() => {
                setAperto(false);
                esci();
              }}
              className={veste.esci}
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
