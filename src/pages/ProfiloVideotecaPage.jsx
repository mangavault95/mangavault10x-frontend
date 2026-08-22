import { useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { paginaDi, tesserine } from "../dati/cineforum";
import { raggruppa } from "../dati/videoteca";
import {
  getIoVideoteca,
  getPersone,
  getProfiloVideoteca,
  getVideoteca
} from "../services/api";
import Icon from "../app/Icon";
import PaginaVideoteca, { Caricamento, Errore, Scheda } from "../ui/videoteca/Foglio";
import Fila, { PostoAggiungi, PostoSerie } from "../ui/videoteca/Fila";
import TestaProfilo from "../ui/videoteca/TestaProfilo";

/**
 * LA PAGINA DI UNA PERSONA.
 *
 * È la videoteca com'era prima — le copertine, il progresso, i voti —
 * con addosso il nome di chi è. Il cambiamento non è grafico: prima
 * quella griglia stava all'indirizzo `/videoteca` ed era «la
 * videoteca», al singolare, come se ce ne fosse una sola. Adesso è
 * `/videoteca/chi/<soprannome>` ed è la pagina di qualcuno, che
 * chiunque può aprire.
 *
 * ---------------------------------------------------------------
 * PERCHÉ RIPIANI E NON UNA GRIGLIA
 *
 * Una griglia di quaranta copertine è alta due schermate: «film» e
 * «preferiti» esisterebbero solo per chi scorre fino in fondo, cioè
 * nessuno. Quattro ripiani che scorrono in orizzontale stanno in una
 * schermata e mostrano che ci sono. La griglia intera non è sparita —
 * è dietro «Vedi tutto», dove ci si va quando si sta cercando
 * qualcosa invece di guardarsi intorno.
 *
 * ---------------------------------------------------------------
 * DUE INDIRIZZI, UNA PAGINA
 *
 *   /videoteca/io              la propria (o quella del padrone di
 *                              casa, per chi guarda senza entrare)
 *   /videoteca/chi/<nome>      quella di qualcuno
 *
 * Il primo esiste perché la barra si disegna prima che il server
 * abbia detto chi sei, e una voce di menu non può aspettare una
 * richiesta per sapere dove punta.
 */

export default function ProfiloVideotecaPage() {
  const { nickname } = useParams();
  const { utente } = useSessione();

  // Chi sono, quando l'indirizzo non lo dice. Parte solo in quel caso:
  // aprendo la pagina di un altro questa richiesta non si fa.
  const io = useRisorsa(getIoVideoteca, { attivo: !nickname });

  const nome = nickname ?? io.dati?.nickname ?? null;

  const profilo = useRisorsa(
    useCallback(() => getProfiloVideoteca(nome), [nome]),
    { attivo: Boolean(nome) }
  );

  const persona = profilo.dati?.utente ?? null;
  const statistiche = profilo.dati?.statistiche ?? null;

  // Le copertine si chiedono alla rotta di sempre, con il numero di
  // chi si sta guardando: `/api/anime?utente=3`. Non c'è una rotta
  // nuova apposta perché non c'è niente di nuovo da leggere — è la
  // stessa videoteca, di un'altra persona.
  const videoteca = useRisorsa(
    useCallback(() => getVideoteca(persona?.id), [persona?.id]),
    { attivo: Boolean(persona?.id) }
  );

  const persone = useRisorsa(getPersone);

  const serie = useMemo(() => raggruppa(videoteca.dati ?? []), [videoteca.dati]);

  const { soloSerie, film, preferiti } = useMemo(
    () => ({
      // Un film è un anime con un episodio solo: cambia la parola
      // sulla scheda, non il modello — ma su un ripiano cambia tutto,
      // perché «cosa sto guardando» e «cosa ho visto al cinema» sono
      // due domande diverse.
      soloSerie: serie.filter((s) => s.tipo !== "film"),
      film: serie.filter((s) => s.tipo === "film"),
      preferiti: serie.filter((s) => s.preferito)
    }),
    [serie]
  );

  const mia = Boolean(utente && persona && utente.id === persona.id);
  const base = persona ? paginaDi(persona.nickname) : null;

  const errore = io.errore || profilo.errore || videoteca.errore;
  const caricando = (io.inCorso && !io.dati) || (profilo.inCorso && !profilo.dati);

  return (
    <PaginaVideoteca titolo={null}>
      {caricando && <Caricamento testo="Apro la pagina…" />}

      {errore && (
        <Errore
          errore={errore}
          riprova={() => {
            profilo.ricarica();
            videoteca.ricarica();
          }}
        />
      )}

      {persona && (
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <TestaProfilo
            persona={persona}
            mia={mia}
            altrePersone={persone.dati ?? []}
            sommario={sommarioDi(statistiche)}
          />

          <Numeri statistiche={statistiche} base={base} />

          <Fila
            titolo="Serie"
            quante={soloSerie.length}
            tutto={`${base}/tutto`}
            vuoto={
              mia
                ? "Non hai ancora nessuna serie. Si aggiungono cercandole su AnimeClick."
                : `${persona.nickname} non ha ancora nessuna serie.`
            }
          >
            {soloSerie.length > 0 &&
              soloSerie.slice(0, 12).map((s) => <PostoSerie key={s.chiave} serie={s} />)}
          </Fila>

          <Fila
            titolo="Film"
            quante={film.length}
            tutto={film.length > 0 ? `${base}/tutto?tipo=film` : null}
            vuoto={
              mia ? "Nessun film, per ora." : `${persona.nickname} non ha ancora nessun film.`
            }
          >
            {film.length > 0 &&
              film.slice(0, 12).map((s) => <PostoSerie key={s.chiave} serie={s} />)}
          </Fila>

          <Fila
            titolo="Preferiti"
            quante={preferiti.length}
            tutto={preferiti.length > 0 ? `${base}/tutto?filtro=preferiti` : null}
            vuoto={
              mia
                ? "La vetrina è vuota. Il cuoricino sulla scheda di una serie la mette qui."
                : `${persona.nickname} non ha ancora scelto niente.`
            }
          >
            {(preferiti.length > 0 || mia) && (
              <>
                {preferiti.slice(0, 12).map((s) => (
                  <PostoSerie key={s.chiave} serie={s} />
                ))}

                {/* Il «più» sta in fondo e non in testa: in testa
                    spingerebbe via la prima copertina ogni volta, e la
                    vetrina si guarda per quello che c'è dentro. */}
                {mia && <PostoAggiungi testo="Scegli" to={`${base}/tutto`} />}
              </>
            )}
          </Fila>
        </div>
      )}
    </PaginaVideoteca>
  );
}

/** La riga sotto il nome: la sola frase che dice chi è questa persona. */
function sommarioDi(statistiche) {
  if (!statistiche) return null;

  const pezzi = [
    `${statistiche.serie} ${statistiche.serie === 1 ? "serie" : "serie"}`,
    statistiche.film > 0 ? `${statistiche.film} ${statistiche.film === 1 ? "film" : "film"}` : null,
    `${statistiche.episodi} episodi`
  ];

  return pezzi.filter(Boolean).join(" · ");
}

/**
 * Le tre caselle, con la freccia che porta al resto.
 *
 * Tre e non sei: è un'anteprima, e un riquadro che prova a dire tutto
 * smette di essere un riassunto. Le tre sono le domande che uno si fa
 * guardando la pagina di un altro — quanto ha visto, per quanto
 * tempo, e da lì in poi si va a vedere.
 */
function Numeri({ statistiche, base }) {
  if (!statistiche) return null;

  const caselle = tesserine(statistiche);

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">Statistiche</h2>

      <div className="flex items-stretch gap-2 sm:gap-3">
        {caselle.map((c) => (
          <Scheda key={c.chiave} className="flex-1 px-2 py-3 text-center sm:px-4 sm:py-4">
            <p
              className="font-numeric text-xl font-bold text-quaderno-inchiostro sm:text-2xl"
              title={c.extra}
            >
              {c.valore.toLocaleString("it-IT")}
            </p>

            <p className="text-[0.7rem] uppercase tracking-wider text-quaderno-tenue">
              {c.etichetta}
            </p>
          </Scheda>
        ))}

        <Link
          to={`${base}/numeri`}
          aria-label="Tutti i numeri"
          className="grid w-12 shrink-0 place-items-center rounded-card border border-quaderno-riga bg-quaderno-foglio text-quaderno-blu transition-colors duration-quick hover:bg-quaderno-blu-tenue
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          <Icon nome="avanti" dimensione={20} />
        </Link>
      </div>
    </section>
  );
}
