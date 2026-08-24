import { useEffect, useRef, useState } from "react";
import Icon from "../../app/Icon";
import { MISURE, pesoDi, riduci } from "../../dati/immagini";
import { raggruppa } from "../../dati/videoteca";
import { getVideoteca, urlCopertina } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";

/**
 * Da dove viene un'immagine di profilo.
 *
 * Due strade, e la seconda è quella che verrà usata di più:
 *
 *   DAL DISPOSITIVO  una foto del telefono o un file del computer.
 *   DA UNA COPERTINA  una delle serie che si hanno in videoteca.
 *
 * La seconda esiste perché è il caso vero: questa è la pagina di
 * qualcuno dentro una videoteca, e nove volte su dieci la faccia che
 * uno vuole metterci è il personaggio della serie che sta guardando.
 * Andarla a cercare su internet, salvarla e ricaricarla sarebbe tre
 * gesti per una cosa che il sito ha già in casa.
 *
 * ---------------------------------------------------------------
 * QUELLO CHE PARTE NON È IL FILE SCELTO
 *
 * Ogni immagine passa da `dati/immagini.js`: ritagliata al centro,
 * ridotta alla misura giusta, riscritta in WebP. Una foto da quattro
 * megabyte diventa una ventina di kilobyte prima di toccare la rete.
 * Il peso finale si scrive a schermo, perché è l'unica cosa che
 * spiega perché il caricamento è istantaneo.
 */

export default function SceltaImmagine({ misura = "faccia", titolo, chiudi, alScelto }) {
  const velo = useChiusuraVelo(chiudi);
  const [strada, setStrada] = useState("copertine");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState(null);

  async function usa(sorgente) {
    setInCorso(true);
    setErrore(null);

    try {
      const dataUri = await riduci(sorgente, MISURE[misura]);

      alScelto(dataUri, pesoDi(dataUri));
    } catch (e) {
      setErrore(e);
      setInCorso(false);
    }
  }

  return (
    <Sovrapposizione>
      <div
        {...velo}
        role="dialog"
        aria-label={titolo}
        className="fixed inset-0 z-modal flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      >
        <div className="flex max-h-[85vh] w-full flex-col rounded-t-sheet border-t border-quaderno-riga bg-quaderno-foglio shadow-float sm:max-w-lg sm:rounded-panel sm:border">
          <header className="flex items-center gap-3 border-b border-quaderno-riga px-4 py-3">
            <h2 className="min-w-0 flex-1 font-display text-lg font-semibold text-quaderno-inchiostro">
              {titolo}
            </h2>

            <button
              type="button"
              onClick={chiudi}
              aria-label="Chiudi"
              className="text-quaderno-tenue hover:text-quaderno-inchiostro"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </header>

          <div className="flex gap-1.5 border-b border-quaderno-riga px-4 py-2">
            <Linguetta acceso={strada === "copertine"} onClick={() => setStrada("copertine")}>
              Da una copertina
            </Linguetta>

            <Linguetta acceso={strada === "file"} onClick={() => setStrada("file")}>
              Dal dispositivo
            </Linguetta>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {errore && (
              <p className="mb-3 rounded-card bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
                {errore.message}
              </p>
            )}

            {inCorso ? (
              <p className="py-10 text-center text-sm text-quaderno-tenue" role="status">
                Ritaglio e rimpicciolisco…
              </p>
            ) : strada === "copertine" ? (
              <DaCopertine usa={usa} />
            ) : (
              <DaFile usa={usa} setErrore={setErrore} />
            )}
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}

function Linguetta({ acceso, children, ...resto }) {
  return (
    <button
      type="button"
      aria-pressed={acceso}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-quick ${
        acceso
          ? "bg-quaderno-blu text-white"
          : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
      }`}
      {...resto}
    >
      {children}
    </button>
  );
}

/* ==================================================
   DAL DISPOSITIVO
   ================================================== */

/**
 * Un file dal telefono o dal computer.
 *
 * `accept="image/*"` non è solo un filtro: sul telefono è quello che
 * fa comparire «Scatta una foto» accanto alla galleria.
 *
 * Il riquadro accetta anche il trascinamento, che sul computer è il
 * gesto che tutti provano per primo — e che senza `preventDefault`
 * farebbe aprire l'immagine al posto del sito, buttando via la pagina
 * su cui si stava lavorando.
 */
function DaFile({ usa, setErrore }) {
  const campo = useRef(null);
  const [sopra, setSopra] = useState(false);

  function prendi(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrore(new Error("Quello non è un file di immagine"));
      return;
    }

    usa(file);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => campo.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSopra(true);
        }}
        onDragLeave={() => setSopra(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSopra(false);
          prendi(e.dataTransfer.files?.[0]);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-card border border-dashed px-4 py-10 text-center transition-colors duration-quick ${
          sopra
            ? "border-quaderno-blu bg-quaderno-blu-tenue"
            : "border-quaderno-riga hover:border-quaderno-blu"
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-quaderno-carta text-quaderno-blu">
          <Icon nome="plus" dimensione={22} />
        </span>

        <span className="text-sm font-semibold text-quaderno-inchiostro">
          Scegli un'immagine
        </span>

        <span className="text-xs text-quaderno-tenue">
          Dalla galleria, dalla fotocamera o trascinandola qui
        </span>
      </button>

      <input
        ref={campo}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => prendi(e.target.files?.[0])}
      />

      <p className="mt-3 text-xs text-quaderno-tenue">
        Viene ritagliata al centro e rimpicciolita qui sul dispositivo: al server arrivano
        pochi kilobyte, non la foto intera.
      </p>
    </div>
  );
}

/* ==================================================
   DA UNA COPERTINA
   ================================================== */

/**
 * Le copertine della propria videoteca.
 *
 * Si accorpano come in griglia (`raggruppa`), o Frieren comparirebbe
 * due volte perché sono due stagioni. Le copertine passano dal ponte
 * del backend, come dappertutto: AnimeClick non manda le intestazioni
 * per il disegno su tela, e senza quel giro l'immagine si vedrebbe ma
 * non si potrebbe ritagliare.
 */
function DaCopertine({ usa }) {
  const [serie, setSerie] = useState(null);
  const [errore, setErrore] = useState(null);
  const [cerca, setCerca] = useState("");

  useEffect(() => {
    getVideoteca()
      .then((righe) => setSerie(raggruppa(righe ?? []).filter((s) => s.cover_url)))
      .catch(setErrore);
  }, []);

  if (errore) {
    return <p className="py-8 text-center text-sm text-quaderno-tenue">{errore.message}</p>;
  }

  if (!serie) {
    return (
      <p className="py-8 text-center text-sm text-quaderno-tenue" role="status">
        Apro la videoteca…
      </p>
    );
  }

  if (serie.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-quaderno-tenue">
        Non hai ancora nessuna serie con una copertina. Prova con un file dal dispositivo.
      </p>
    );
  }

  const parola = cerca.trim().toLowerCase();

  const visibili = parola
    ? serie.filter((s) => s.titolo.toLowerCase().includes(parola))
    : serie;

  return (
    <div>
      <input
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
        placeholder="Cerca fra le tue serie…"
        aria-label="Cerca una serie"
        className="mb-3 w-full rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
          focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
      />

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {visibili.map((s) => (
          <li key={s.chiave}>
            <button
              type="button"
              onClick={() => usa(urlCopertina(s.cover_url))}
              title={s.titolo}
              className="block w-full overflow-hidden rounded-card border border-quaderno-riga transition-colors duration-quick hover:border-quaderno-blu
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
            >
              <img
                src={urlCopertina(s.cover_url)}
                alt={s.titolo}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {visibili.length === 0 && (
        <p className="py-6 text-center text-sm text-quaderno-tenue">Nessun titolo con questo nome.</p>
      )}
    </div>
  );
}

/**
 * Un bottoncino rotondo appoggiato sopra un'immagine.
 *
 * Scuro e sfocato dietro, perché sotto ci può essere qualunque cosa:
 * su una copertina chiara un tasto bianco sparirebbe, e su una scura
 * sparirebbe uno nero. Il velo scuro funziona su tutte e due.
 */
export function TastoTondo({ etichetta, icona, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etichetta}
      title={etichetta}
      className={`grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-quick hover:bg-black/65
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
    >
      <Icon nome={icona} dimensione={15} />
    </button>
  );
}

/** Il bottoncino rotondo che apre questo pannello. */
export function TastoModifica(props) {
  return <TastoTondo icona="matita" {...props} />;
}
