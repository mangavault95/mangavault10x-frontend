import { useNavigate } from "react-router-dom";
import useColoriCopertina from "./coloriCopertina";

/**
 * Lo scaffale vero: dei volumi si vede solo la costa, come quando
 * i libri sono in fila e guardi la libreria di lato.
 *
 * Ogni costa è costruita a mano in CSS 3D — non è un'immagine
 * ruotata. Ha tre facce: il dorso che guardi, il taglio dei fogli
 * che sporge di lato, e l'ombra che la stacca da quella accanto.
 * I colori vengono dalla copertina vera, quindi lo scaffale ha
 * l'aspetto disordinato e riconoscibile di una libreria vera invece
 * di una tabella colorata.
 */

/** Le sigle degli editori italiani, per la targhetta in basso. */
const SIGLE = {
  Panini: "PAN",
  "Panini Comics": "PAN",
  "Panini S.p.A.": "PAN",
  "Star Comics": "★",
  "J-POP": "JP",
  "J-Pop": "JP",
  Dynit: "DYN",
  "Edizioni BD": "BD",
  "Coconino Press": "CCN",
  Toshokan: "TSK",
  "Play Press": "PP",
  "Granata Press": "GP",
  GP: "GP",
  "Canicola Edizioni": "CAN",
  Kappa: "KAP",
  Goen: "GOEN",
  Flashbook: "FB"
};

function siglaEditore(editore) {
  if (!editore) return null;
  if (SIGLE[editore]) return SIGLE[editore];

  // Editore sconosciuto: iniziali delle prime due parole.
  return editore
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/* ==================================================
   UNA COSTA
   ================================================== */

function Costa({ serie, altezza, spessore, onApri }) {
  const colori = useColoriCopertina(serie.coverurl, serie.titolo);
  const sigla = siglaEditore(serie.editore);

  return (
    <button
      type="button"
      onClick={onApri}
      aria-label={
        `${serie.titolo}${serie.editore ? `, ${serie.editore}` : ""}, ` +
        `${serie.volumi_letti} volumi letti` +
        (serie.mancanti > 0 ? `, ${serie.mancanti} ancora da leggere` : ", serie completata") +
        (serie.droppato ? ", droppata" : "")
      }
      title={
        serie.mancanti > 0
          ? `${serie.titolo} — mancano ${serie.mancanti} volumi`
          : `${serie.titolo} — completata`
      }
      className="group relative shrink-0 origin-bottom transition-transform duration-base ease-spring
                 hover:-translate-y-3 hover:rotate-[-1.5deg]
                 focus-visible:outline-none focus-visible:-translate-y-3
                 focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf"
      style={{
        width: `${spessore}px`,
        height: `${altezza}px`,
        transformStyle: "preserve-3d"
      }}
    >
      {/* --- Il taglio dei fogli: la faccia laterale --- */}
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] -right-[5px] w-[6px] rounded-r-[1px] opacity-90"
        style={{
          background:
            "repeating-linear-gradient(to bottom, #d9d3c6 0 1px, #b8b1a2 1px 2.5px)",
          transform: "rotateY(38deg)",
          transformOrigin: "left center"
        }}
      />

      {/* --- Il dorso --- */}
      <span
        className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-[2px] py-2 shadow-raised"
        style={{
          background: `linear-gradient(170deg, ${colori.alto}, ${colori.basso})`
        }}
      >
        {/* In alto: filetto stampato se la serie è finita, segnalibro
            sporgente se restano volumi da leggere. In una libreria vera
            è così che riconosci a colpo d'occhio i libri lasciati a
            metà — e funziona anche per chi non distingue i colori,
            perché cambia la forma, non solo la tinta. */}
        {serie.mancanti > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-[7px] left-1/2 h-[15px] w-[7px] -translate-x-1/2 rounded-b-[2px] bg-ember shadow-lift"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)" }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="h-[2px] w-[60%] rounded-full opacity-50"
            style={{ background: colori.testo }}
          />
        )}

        {/* Il titolo, scritto per il lungo come sui libri veri */}
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 py-1 text-[0.62rem] font-semibold tracking-wide"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            color: colori.testo,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            maxHeight: `${altezza - 58}px`
          }}
        >
          {serie.titolo}
        </span>

        {/* La targhetta dell'editore, in basso */}
        {sigla && (
          <span
            className="rounded-[2px] px-1 py-[1px] text-[0.5rem] font-bold leading-none tracking-tighter"
            style={{
              color: colori.basso,
              background: colori.testo,
              opacity: 0.85
            }}
          >
            {sigla}
          </span>
        )}

        {/* Luce che scorre sul dorso al passaggio del mouse */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-base group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)"
          }}
        />

        {/* Ombra sul bordo sinistro: stacca dalla costa vicina */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-2"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.45), transparent)" }}
        />
      </span>

      {/* Serie droppata: una X ben visibile, non solo un colore
          diverso — deve saltare all'occhio anche scorrendo veloce. */}
      {serie.droppato && (
        <span
          aria-hidden="true"
          title="Droppata"
          className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-ember text-void shadow-lift"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </span>
      )}
    </button>
  );
}

/* ==================================================
   IL RIPIANO
   ================================================== */

/**
 * Altezza e spessore stabili per una serie: derivano dai suoi dati,
 * non dal caso, così lo scaffale non si riordina a ogni visita.
 * Una serie lunga occupa più spazio, come nella realtà.
 */
function misure(serie) {
  const seme = [...String(serie.titolo || "")].reduce(
    (n, c) => n + c.charCodeAt(0),
    0
  );

  const volumi = Number(serie.volumi_letti) || 1;

  return {
    // Fra 168 e 210 px: variazione sufficiente a non sembrare una tabella
    altezza: 168 + (seme % 43),
    // Le serie lunghe hanno il dorso più largo
    spessore: Math.min(46, 22 + Math.round(Math.log2(volumi + 1) * 7))
  };
}

export default function ScaffaleCoste({ serie }) {
  const navigate = useNavigate();

  if (!serie?.length) return null;

  return (
    <div
      className="relative overflow-x-auto pb-1"
      style={{ perspective: "1100px" }}
    >
      {/* Le coste appoggiate sul ripiano */}
      <ul
        className="flex items-end gap-[3px] px-4 pt-8"
        style={{ transformStyle: "preserve-3d" }}
      >
        {serie.map((s) => {
          const { altezza, spessore } = misure(s);

          return (
            <li key={s.manga_id} className="contents">
              <Costa
                serie={s}
                altezza={altezza}
                spessore={spessore}
                onApri={() => navigate(`/serie/${s.manga_id}`)}
              />
            </li>
          );
        })}
      </ul>

      {/* Il ripiano di legno su cui poggiano */}
      <div className="relative">
        <div className="h-[10px] rounded-[2px] bg-gradient-to-b from-brass-900/70 via-[#2a1f14] to-[#150f0a] shadow-float" />
        {/* Il bordo frontale, illuminato da sopra */}
        <div className="h-[3px] rounded-b-[2px] bg-gradient-to-b from-brass-700/30 to-transparent" />
      </div>
    </div>
  );
}
