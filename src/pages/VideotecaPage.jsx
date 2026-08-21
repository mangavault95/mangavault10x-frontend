import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { getVideoteca } from "../services/api";
import { useSessione } from "../dati/sessione";
import { raggruppa } from "../dati/videoteca";
import { ModuloAccesso } from "../dati/AccessoProvider";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Vuoto } from "../ui/videoteca/Foglio";
import { NOMI_STATO } from "../ui/videoteca/formati";
import CartaAnime from "../ui/videoteca/CartaAnime";
import AggiungiAnime from "../ui/videoteca/AggiungiAnime";

/**
 * La videoteca: le tue serie, con il punto in cui sei.
 *
 * «Tue» alla lettera: ogni account ha la sua, e chi guarda senza
 * essere entrato vede quella del padrone di casa — la stessa regola
 * della biblioteca.
 *
 * Un pannello per SERIE, non per scheda di AnimeClick: le stagioni si
 * accorpano qui (`dati/videoteca.js`), perché AnimeClick a volte le
 * tiene insieme (Frieren) e a volte no (Isekai Farming), e quella
 * incoerenza non deve arrivare fino alla griglia.
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
  const { utente, lettori, idVisto } = useSessione();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState("tutti");
  const [cerca, setCerca] = useState("");
  const [aggiunta, setAggiunta] = useState(false);
  const [accesso, setAccesso] = useState(false);

  const { dati, errore, inCorso, ricarica } = useRisorsa(getVideoteca);

  // Non `dati ?? []` scritto qui: quell'array nuovo a ogni render
  // farebbe ricalcolare i filtri e i conteggi anche quando i dati non
  // sono cambiati di una virgola.
  const serie = useMemo(() => raggruppa(dati ?? []), [dati]);

  const visibili = useMemo(() => {
    const testo = cerca.trim().toLowerCase();

    return serie.filter((a) => {
      if (filtro !== "tutti" && a.stato_visione !== filtro) return false;

      // La ricerca guarda anche i titoli delle singole stagioni:
      // cercare «Isekai Farming 2» deve trovare la serie, anche se il
      // pannello si chiama solo «Isekai Farming».
      if (
        testo &&
        !a.titolo.toLowerCase().includes(testo) &&
        !a.stagioni.some((s) => s.titolo.toLowerCase().includes(testo))
      ) {
        return false;
      }

      return true;
    });
  }, [serie, filtro, cerca]);

  // Di chi è la videoteca che si sta guardando. Serve solo a chi non è
  // entrato: sapere che quelle serie sono di un altro è la differenza
  // fra «il sito non funziona» e «devo entrare».
  const padrone = lettori.find((l) => l.id === idVisto);

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

  const stagioniInPiu = serie.reduce((somma, a) => somma + (a.quanteStagioni - 1), 0);

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo={utente ? "Quello che ho visto" : `La videoteca di ${padrone?.nickname ?? "casa"}`}
      sommario={
        serie.length
          ? [
              `${serie.length} serie`,
              // Le stagioni si dicono solo quando sono più delle serie:
              // altrimenti è lo stesso numero scritto due volte.
              stagioniInPiu > 0 ? `${serie.length + stagioniInPiu} stagioni` : null,
              `${episodiVisti} episodi spuntati`
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      azioni={
        utente ? (
          <Bottone tono="pieno" onClick={() => setAggiunta(true)}>
            Aggiungi una serie
          </Bottone>
        ) : (
          // La porta d'ingresso sta dove serve: chi arriva qui e vede
          // le serie di un altro deve poter entrare da questa pagina,
          // non andarsela a cercare in Gestione.
          <Bottone tono="pieno" onClick={() => setAccesso(true)}>
            Entra per avere la tua
          </Bottone>
        )
      }
    >
      {inCorso && !dati && <Caricamento testo="Apro la videoteca…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && serie.length === 0 && (
        <Vuoto
          titolo={utente ? "Non c'è ancora niente" : "Questa videoteca è vuota"}
          sommario={
            utente
              ? "Aggiungi la prima serie: la cerco su AnimeClick e mi porto dietro trama, generi, episodi e dove si vede in Italia."
              : "Entra con il tuo account — lo stesso della biblioteca — e comincia la tua: le serie, le puntate spuntate e i voti restano tuoi."
          }
          azioni={
            utente ? (
              <Bottone tono="pieno" onClick={() => setAggiunta(true)}>
                Aggiungi una serie
              </Bottone>
            ) : (
              <Bottone tono="pieno" onClick={() => setAccesso(true)}>
                Entra o registrati
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
              {visibili.map((serieIntera) => (
                <li key={serieIntera.chiave}>
                  <CartaAnime anime={serieIntera} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {aggiunta && (
        <AggiungiAnime
          chiudi={() => setAggiunta(false)}
          // Appena agganciata, si va sulla sua scheda: chi ha appena
          // aggiunto una serie vuole segnare a che punto è, non
          // ritrovarsi davanti alla griglia a cercare la copertina
          // nuova. La griglia si ricarica da sola al ritorno.
          //
          // Se l'esito non porta l'id — non dovrebbe succedere, ma il
          // pannello si chiude comunque — resta il vecchio ricarica,
          // altrimenti la serie appena aggiunta non comparirebbe.
          alFatto={(esito) =>
            esito?.anime?.id ? navigate(`/videoteca/${esito.anime.id}`) : ricarica()
          }
        />
      )}

      {accesso && (
        <ModuloAccesso
          mondo="videoteca"
          motivo="Per avere la tua videoteca: le tue serie, le tue puntate, i tuoi voti."
          onRiuscito={() => setAccesso(false)}
          onAnnulla={() => setAccesso(false)}
        />
      )}
    </PaginaVideoteca>
  );
}
