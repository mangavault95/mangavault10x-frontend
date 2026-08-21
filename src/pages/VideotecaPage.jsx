import { useMemo, useState } from "react";
import useRisorsa from "../dati/useRisorsa";
import { getVideoteca } from "../services/api";
import { useSessione } from "../dati/sessione";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Vuoto } from "../ui/videoteca/Foglio";
import { NOMI_STATO } from "../ui/videoteca/formati";
import CartaAnime from "../ui/videoteca/CartaAnime";
import AggiungiAnime from "../ui/videoteca/AggiungiAnime";

/**
 * La videoteca: tutti gli anime, con il punto in cui sei.
 *
 * I filtri sono quelli che si usano davvero — lo stato della visione,
 * non il genere. Chi apre questa pagina di solito sta cercando "cosa
 * stavo guardando" o "cosa devo ancora cominciare", e sono due
 * domande sullo stato.
 */

const FILTRI = [
  { id: "tutti", etichetta: "Tutti" },
  { id: "in_visione", etichetta: NOMI_STATO.in_visione },
  { id: "da_vedere", etichetta: NOMI_STATO.da_vedere },
  { id: "completa", etichetta: NOMI_STATO.completa },
  { id: "in_pausa", etichetta: NOMI_STATO.in_pausa },
  { id: "droppata", etichetta: NOMI_STATO.droppata }
];

export default function VideotecaPage() {
  const { utente } = useSessione();
  const [filtro, setFiltro] = useState("tutti");
  const [cerca, setCerca] = useState("");
  const [aggiunta, setAggiunta] = useState(false);

  const { dati, errore, inCorso, ricarica } = useRisorsa(getVideoteca);

  // Non `dati ?? []` scritto qui: quell'array nuovo a ogni render
  // farebbe ricalcolare i filtri e i conteggi anche quando i dati non
  // sono cambiati di una virgola.
  const serie = useMemo(() => dati ?? [], [dati]);

  const visibili = useMemo(() => {
    const testo = cerca.trim().toLowerCase();

    return serie.filter((a) => {
      if (filtro !== "tutti" && a.stato_visione !== filtro) return false;
      if (testo && !a.titolo.toLowerCase().includes(testo)) return false;

      return true;
    });
  }, [serie, filtro, cerca]);

  // I conteggi stanno accanto ai filtri: un filtro che porta a una
  // pagina vuota è una fatica sprecata, e il numero lo dice prima.
  const conteggi = useMemo(() => {
    const per = { tutti: serie.length };

    for (const a of serie) {
      if (a.stato_visione) per[a.stato_visione] = (per[a.stato_visione] || 0) + 1;
    }

    return per;
  }, [serie]);

  const episodiVisti = serie.reduce((somma, a) => somma + Number(a.episodi_visti || 0), 0);

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="Quello che ho visto"
      sommario={
        serie.length
          ? `${serie.length} ${serie.length === 1 ? "titolo" : "titoli"} · ${episodiVisti} episodi spuntati`
          : undefined
      }
      azioni={
        utente && (
          <Bottone tono="pieno" onClick={() => setAggiunta(true)}>
            Aggiungi una serie
          </Bottone>
        )
      }
    >
      {inCorso && !dati && <Caricamento testo="Apro la videoteca…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && serie.length === 0 && (
        <Vuoto
          titolo="Non c'è ancora niente"
          sommario="Aggiungi la prima serie: la cerco su AnimeClick e mi porto dietro trama, generi, episodi e dove si vede in Italia."
          azioni={
            utente && (
              <Bottone tono="pieno" onClick={() => setAggiunta(true)}>
                Aggiungi una serie
              </Bottone>
            )
          }
        />
      )}

      {dati && serie.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {FILTRI.map((f) => {
                const quante = conteggi[f.id] || 0;
                const acceso = filtro === f.id;

                if (f.id !== "tutti" && quante === 0) return null;

                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltro(f.id)}
                    aria-pressed={acceso}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-quick
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                      ${
                        acceso
                          ? "bg-quaderno-blu text-white"
                          : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
                      }`}
                  >
                    {f.etichetta}
                    <span className="ml-1.5 font-numeric opacity-70">{quante}</span>
                  </button>
                );
              })}
            </div>

            <input
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Cerca fra i tuoi titoli"
              aria-label="Cerca fra i titoli in videoteca"
              className="ml-auto w-full min-w-0 rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-1.5 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue sm:w-56
                focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
            />
          </div>

          {visibili.length === 0 ? (
            <Vuoto
              titolo="Nessun titolo con questo filtro"
              sommario="Prova a togliere la ricerca o a guardare fra tutti."
              azioni={
                <Bottone
                  onClick={() => {
                    setFiltro("tutti");
                    setCerca("");
                  }}
                >
                  Mostra tutti
                </Bottone>
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibili.map((anime) => (
                <li key={anime.id}>
                  <CartaAnime anime={anime} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {aggiunta && <AggiungiAnime chiudi={() => setAggiunta(false)} alFatto={ricarica} />}
    </PaginaVideoteca>
  );
}
