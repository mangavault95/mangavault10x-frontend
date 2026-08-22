import { useEffect, useRef, useState } from "react";
import Icon from "../../app/Icon";
import { useSessione } from "../../dati/sessione";
import { corrisponde, raggruppa } from "../../dati/videoteca";
import { getVideoteca, scriviMessaggio, urlCopertina } from "../../services/api";
import Esagono from "./Esagono";
import { Bottone, Scheda } from "./Foglio";

/**
 * La casella in cima al Cineforum: quello che si scrive apposta.
 *
 * Tutto il resto del feed è dedotto — serie aggiunte, puntate
 * spuntate, voti — e quelle cose raccontano cosa hai fatto ma non
 * cosa pensi. Questa casella serve alle frasi che nessun evento
 * potrebbe dedurre: «qualcuno l'ha visto?», «stasera comincio
 * Monster».
 *
 * Sta aperta e non dietro un bottone «scrivi»: una casella che si
 * vede è un invito, un bottone che la apre è un ostacolo in più
 * davanti alla cosa che rende viva la pagina.
 *
 * L'AGGANCIO A UNA SERIE è facoltativo e si cerca nella PROPRIA
 * videoteca, non nel catalogo intero: nove volte su dieci si parla di
 * qualcosa che si sta guardando, e cercare fra quaranta titoli propri
 * costa una richiesta invece di una ricerca su AnimeClick.
 */

export default function ComponiMessaggio({ alFatto, chiediAccesso }) {
  const { utente, lettori } = useSessione();

  const [testo, setTesto] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState(null);

  const [agganciando, setAgganciando] = useState(false);
  const [serie, setSerie] = useState(null);

  const mioColore = lettori.find((l) => l.id === utente?.id)?.colore ?? null;

  async function manda(e) {
    e.preventDefault();

    const pulito = testo.trim();

    if (!pulito || inCorso) return;

    setInCorso(true);
    setErrore(null);

    try {
      await scriviMessaggio({ testo: pulito, animeId: serie?.id ?? null });

      setTesto("");
      setSerie(null);
      alFatto?.();
    } catch (err) {
      setErrore(err);
    } finally {
      setInCorso(false);
    }
  }

  if (!utente) {
    return (
      <Scheda className="flex flex-wrap items-center gap-3 p-4">
        <Icon nome="cineforum" dimensione={20} className="text-quaderno-tenue" />

        <p className="min-w-0 flex-1 text-sm text-quaderno-tenue">
          Qui si legge cosa hanno guardato tutti. Per scrivere e rispondere serve entrare.
        </p>

        <Bottone tono="pieno" onClick={chiediAccesso}>
          Entra
        </Bottone>
      </Scheda>
    );
  }

  return (
    <Scheda className="p-3 sm:p-4">
      <form onSubmit={manda}>
        <div className="flex gap-3">
          <Esagono nickname={utente.nickname} colore={mioColore} dimensione={38} />

          <div className="min-w-0 flex-1">
            <TestoCheCresce
              valore={testo}
              cambia={setTesto}
              // Ctrl+Invio manda, Invio va a capo: qui si scrive anche
              // qualche riga, e un Invio che pubblica a metà pensiero
              // è il modo più veloce di far scrivere meno.
              manda={manda}
            />

            {serie && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-quaderno-riga bg-quaderno-carta py-1 pl-1 pr-2">
                <div className="h-9 w-6 shrink-0 overflow-hidden rounded-sm bg-quaderno-riga">
                  {serie.cover_url && (
                    <img src={urlCopertina(serie.cover_url)} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <span className="text-xs font-semibold text-quaderno-inchiostro">{serie.titolo}</span>

                <button
                  type="button"
                  onClick={() => setSerie(null)}
                  aria-label="Togli la serie"
                  className="text-quaderno-tenue hover:text-quaderno-inchiostro"
                >
                  <Icon nome="close" dimensione={14} />
                </button>
              </div>
            )}

            {errore && <p className="mt-2 text-xs text-quaderno-tenue">{errore.message}</p>}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Bottone tono="nudo" onClick={() => setAgganciando((a) => !a)} className="px-2">
                <Icon nome="pellicola" dimensione={16} />
                {serie ? "Cambia serie" : "Aggancia una serie"}
              </Bottone>

              <Bottone tono="pieno" type="submit" disabled={!testo.trim() || inCorso}>
                {inCorso ? "Pubblico…" : "Pubblica"}
              </Bottone>
            </div>
          </div>
        </div>
      </form>

      {agganciando && (
        <SceltaSerie
          scegli={(s) => {
            setSerie(s);
            setAgganciando(false);
          }}
          chiudi={() => setAgganciando(false)}
        />
      )}
    </Scheda>
  );
}

/**
 * Un'area di testo che cresce con quello che ci si scrive.
 *
 * Una casella a tre righe fisse che scorre dentro sé stessa nasconde
 * l'inizio di quello che si sta scrivendo, ed è il motivo per cui i
 * messaggi lunghi vengono male: non si rilegge quello che si è detto
 * due frasi fa.
 */
function TestoCheCresce({ valore, cambia, manda }) {
  const riferimento = useRef(null);

  function adatta(elemento) {
    if (!elemento) return;

    // Si azzera prima di misurare, o l'altezza non torna mai indietro
    // quando si cancella.
    elemento.style.height = "auto";
    elemento.style.height = `${elemento.scrollHeight}px`;
  }

  return (
    <textarea
      ref={riferimento}
      value={valore}
      rows={2}
      onChange={(e) => {
        cambia(e.target.value);
        adatta(e.target);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) manda(e);
      }}
      placeholder="Cosa stai guardando?"
      aria-label="Scrivi un messaggio per tutti"
      className="w-full resize-none bg-transparent text-[0.95rem] leading-relaxed text-quaderno-inchiostro placeholder:text-quaderno-tenue focus:outline-none"
    />
  );
}

/**
 * La scelta della serie: fra le proprie, cercando.
 *
 * La videoteca si chiede solo quando serve — chi non aggancia mai una
 * serie non se la porta a casa — e si accorpa con le stesse regole
 * della griglia, così «Noragami» è una voce sola e non due stagioni.
 */
function SceltaSerie({ scegli, chiudi }) {
  const [dati, setDati] = useState(null);
  const [cerca, setCerca] = useState("");
  const [errore, setErrore] = useState(null);

  // Una volta sola, alla prima apertura: il pannello si monta solo
  // quando qualcuno preme «Aggancia una serie».
  useEffect(() => {
    getVideoteca()
      .then((righe) => setDati(raggruppa(righe ?? [])))
      .catch(setErrore);
  }, []);

  const visibili = (dati ?? []).filter((s) => corrisponde(s, cerca)).slice(0, 8);

  return (
    <div className="mt-3 border-t border-quaderno-riga pt-3">
      <input
        autoFocus
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
        placeholder="Cerca fra le tue serie…"
        aria-label="Cerca una serie da agganciare"
        className="w-full rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
          focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
      />

      {errore && <p className="mt-2 text-xs text-quaderno-tenue">{errore.message}</p>}

      {!dati && !errore && <p className="mt-2 text-xs text-quaderno-tenue">Un momento…</p>}

      <ul className="mt-2 space-y-1">
        {visibili.map((s) => (
          <li key={s.chiave}>
            <button
              type="button"
              onClick={() => scegli({ id: s.id, titolo: s.titolo, cover_url: s.cover_url })}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-quaderno-carta"
            >
              <div className="h-9 w-6 shrink-0 overflow-hidden rounded-sm bg-quaderno-carta">
                {s.cover_url && (
                  <img src={urlCopertina(s.cover_url)} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              <span className="min-w-0 truncate text-sm text-quaderno-inchiostro">{s.titolo}</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={chiudi}
        className="mt-1 text-xs font-medium text-quaderno-tenue hover:text-quaderno-inchiostro"
      >
        Lascia stare
      </button>
    </div>
  );
}
