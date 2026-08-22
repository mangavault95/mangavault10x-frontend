import { useState } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { getVideoteca, segnaEpisodio, urlCopertina } from "../services/api";
import PaginaVideoteca, {
  Bottone,
  Caricamento,
  Errore,
  Progresso,
  Scheda,
  Vuoto
} from "../ui/videoteca/Foglio";
import { quandoBreve } from "../ui/videoteca/formati";

/**
 * Cosa stai guardando adesso — il gemello di «In lettura».
 *
 * Una riga per serie, e su ogni riga il gesto che serve davvero:
 * spuntare la puntata dopo. Chi apre questa pagina ha appena finito di
 * guardare qualcosa, e non deve entrare in una scheda per dirlo.
 *
 * L'ordine mette davanti chi ha un episodio pronto e indietro chi è in
 * pari: se sei arrivato in fondo a quello che c'è, quella serie per
 * stasera non è una scelta.
 */
export default function VisionePage() {
  const { utente } = useSessione();
  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(getVideoteca);
  const [segnando, setSegnando] = useState(null);

  const inVisione = (dati ?? [])
    .filter((a) => a.stato_visione === "in_visione")
    .map((a) => {
      const visti = Number(a.episodi_visti || 0);
      const disponibili = Number(a.episodi_disponibili || 0);
      const prossimo = Number(a.ultimo_visto || 0) + 1;

      return {
        ...a,
        visti,
        disponibili,
        prossimo,
        // C'è una puntata pronta solo se ne esiste una oltre a quelle
        // già viste. Il conto è sulle puntate *elencate*, non su quelle
        // dichiarate dalla scheda.
        pronto: prossimo <= disponibili
      };
    })
    .sort((a, b) => Number(b.pronto) - Number(a.pronto));

  async function spunta(anime) {
    setSegnando(anime.id);

    try {
      await segnaEpisodio(anime.id, anime.prossimo);

      // Non ricarico tutta la videoteca per una casella: aggiorno la
      // riga e basta.
      setDati((precedente) =>
        precedente?.map((a) =>
          a.id === anime.id
            ? {
                ...a,
                episodi_visti: Number(a.episodi_visti || 0) + 1,
                ultimo_visto: anime.prossimo
              }
            : a
        )
      );
    } catch {
      await ricarica();
    } finally {
      setSegnando(null);
    }
  }

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="In visione"
      sommario="Le serie cominciate e non ancora finite."
    >
      {inCorso && !dati && <Caricamento />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && inVisione.length === 0 && (
        <Vuoto
          titolo="Non stai guardando niente"
          sommario="Una serie entra qui appena spunti il suo primo episodio."
          azioni={
            <Link to="/videoteca/io">
              <Bottone tono="pieno">Vai alla videoteca</Bottone>
            </Link>
          }
        />
      )}

      <ul className="space-y-2">
        {inVisione.map((anime) => (
          <li key={anime.id}>
            <Scheda className="flex flex-wrap items-center gap-4 p-3">
              <Link to={`/videoteca/${anime.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-quaderno-carta">
                  {anime.cover_url && (
                    <img
                      src={urlCopertina(anime.cover_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
                    {anime.titolo}
                  </p>

                  <p className="mb-1.5 text-xs text-quaderno-tenue">
                    {anime.pronto
                      ? `Il prossimo è l'episodio ${anime.prossimo}`
                      : anime.prossima_uscita
                        ? `In pari — il ${anime.prossimo_episodio} esce ${quandoBreve(anime.prossima_uscita)}`
                        : "In pari con quello che è uscito"}
                  </p>

                  <Progresso
                    visti={anime.visti}
                    su={anime.disponibili || anime.episodi_totali || null}
                    className="max-w-xs"
                  />
                </div>
              </Link>

              {utente && anime.pronto && (
                <Bottone
                  tono="pieno"
                  onClick={() => spunta(anime)}
                  disabled={segnando === anime.id}
                >
                  {segnando === anime.id ? "Segno…" : `Ho visto il ${anime.prossimo}`}
                </Bottone>
              )}
            </Scheda>
          </li>
        ))}
      </ul>
    </PaginaVideoteca>
  );
}
