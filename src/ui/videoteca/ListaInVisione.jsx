import { useState } from "react";
import { Link } from "react-router-dom";
import { segnaEpisodio, urlCopertina } from "../../services/api";
import { Bottone, Progresso, Scheda } from "./Foglio";
import { quandoBreve } from "./formati";

/**
 * Cosa si sta guardando adesso, dentro la propria pagina.
 *
 * Era «In visione», quarta voce della barra e indirizzo suo
 * (`/visione`): per saperlo bisognava lasciare la propria pagina e
 * andarci apposta. Ma è la prima domanda che ci si fa aprendo la
 * propria videoteca — «a che punto ero?» — non una gita a parte,
 * quindi ora sta qui in cima, prima degli scaffali che si scorrono
 * per curiosare.
 *
 * Lavora sulle righe GREZZE (una per scheda AnimeClick), non sulle
 * serie raggruppate della griglia: «in visione» ha senso scheda per
 * scheda — si può aver finito la prima stagione di Isekai Farming e
 * non ancora cominciato la seconda — e un gruppo appiattirebbe le due
 * in un solo stato, nascondendo quale stagione segnare.
 *
 * Non compare affatto quando non c'è niente in corso: un titolo
 * seguito dal vuoto, sopra gli scaffali che invece un motivo per
 * restare vuoti ce l'hanno sempre (`vuoto` di `Fila`), sarebbe solo
 * una domanda senza risposta.
 *
 * Tagliata a `LIMITE` righe, con un «Mostra tutte» che le sblocca sul
 * posto invece di aprire un'altra pagina: su dati veri «in visione»
 * arriva a 27 serie, e mostrarle tutte di default renderebbe la
 * propria pagina lunga quanto tutta la griglia. Non è un rinvio a
 * `/visione` — quell'indirizzo non esiste più — perché non c'è più
 * bisogno di un'altra pagina per una lista che può semplicemente
 * allungarsi.
 */
const LIMITE = 6;

export default function ListaInVisione({ righe, setRighe, ricarica, puoiScrivere }) {
  const [segnando, setSegnando] = useState(null);
  const [espansa, setEspansa] = useState(false);

  const inVisione = (righe ?? [])
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
        // già viste. Il conto è sulle puntate *elencate*, non su
        // quelle dichiarate dalla scheda.
        pronto: prossimo <= disponibili
      };
    })
    // Chi ha una puntata pronta davanti, chi è in pari dietro: se sei
    // arrivato in fondo a quello che c'è, quella serie per stasera
    // non è una scelta.
    .sort((a, b) => Number(b.pronto) - Number(a.pronto));

  if (inVisione.length === 0) return null;

  const visibili = espansa ? inVisione : inVisione.slice(0, LIMITE);

  async function spunta(anime) {
    setSegnando(anime.id);

    try {
      await segnaEpisodio(anime.id, anime.prossimo);

      // Non ricarico tutta la videoteca per una casella: aggiorno la
      // riga e basta.
      setRighe((precedenti) =>
        precedenti?.map((a) =>
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
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
        In visione
        <span className="ml-2 font-numeric text-sm font-normal text-quaderno-tenue">
          {inVisione.length}
        </span>
      </h2>

      <ul className="space-y-2">
        {visibili.map((anime) => (
          <li key={anime.id}>
            <Scheda className="flex flex-wrap items-center gap-4 p-3">
              <Link
                to={`/videoteca/${anime.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
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

              {puoiScrivere && anime.pronto && (
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

      {inVisione.length > LIMITE && (
        <button
          type="button"
          onClick={() => setEspansa((e) => !e)}
          className="text-sm font-semibold text-quaderno-blu hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          {espansa ? "Mostra meno" : `Mostra tutte (${inVisione.length})`}
        </button>
      )}
    </section>
  );
}
