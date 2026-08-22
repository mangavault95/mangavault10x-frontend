import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { formattaMedia, paginaDi, tempoVisto, vaiAlConfronto } from "../dati/cineforum";
import { getIoVideoteca, getPersone, getProfiloVideoteca } from "../services/api";
import Icon from "../app/Icon";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Scheda } from "../ui/videoteca/Foglio";
import { NOMI_STATO } from "../ui/videoteca/formati";
import Esagono from "../ui/videoteca/Esagono";

/**
 * I NUMERI DI UNA PERSONA, per esteso.
 *
 * La pagina personale ne mostra tre in cima con una freccia accanto:
 * questa è dove porta la freccia. Sono gli stessi conti fatti dallo
 * stesso posto sul server (`services/cineforum.js`), non un secondo
 * calcolo — o le tre caselle e questa pagina finirebbero prima o poi
 * per dire numeri diversi della stessa cosa.
 *
 * In fondo c'è il confronto, e non è un caso che stia qui: guardare i
 * propri numeri fa venire voglia di sapere come stanno gli altri, ed
 * è il momento esatto in cui quel bottone serve.
 */

export default function NumeriVideotecaPage() {
  const { nickname } = useParams();

  const io = useRisorsa(getIoVideoteca, { attivo: !nickname });
  const nome = nickname ?? io.dati?.nickname ?? null;

  const profilo = useRisorsa(
    useCallback(() => getProfiloVideoteca(nome), [nome]),
    { attivo: Boolean(nome) }
  );

  const persone = useRisorsa(getPersone);

  const persona = profilo.dati?.utente ?? null;
  const s = profilo.dati?.statistiche ?? null;

  const tempo = s ? tempoVisto(s.minuti) : null;
  const altri = (persone.dati ?? []).filter((p) => p.id !== persona?.id);

  return (
    <PaginaVideoteca
      occhiello={persona?.nickname ?? "Videoteca"}
      titolo="I numeri"
      sommario={s ? frasePrima(s) : undefined}
      azioni={
        persona && (
          <Link to={paginaDi(persona.nickname)}>
            <Bottone>
              <Icon nome="back" dimensione={16} />
              La pagina
            </Bottone>
          </Link>
        )
      }
    >
      {profilo.inCorso && !profilo.dati && <Caricamento />}

      {profilo.errore && <Errore errore={profilo.errore} riprova={profilo.ricarica} />}

      {s && (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Casella titolo="Serie" valore={s.serie} />
            <Casella titolo="Film" valore={s.film} />
            <Casella titolo="Episodi" valore={s.episodi} />
            <Casella
              titolo={tempo.unita}
              valore={tempo.valore}
              nota={tempo.extra ? `${tempo.extra} in tutto` : null}
            />
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
              A che punto sono
            </h2>

            <Scheda className="divide-y divide-quaderno-riga">
              <Riga etichetta={NOMI_STATO.in_visione} valore={s.in_visione} su={s.serie + s.film} />
              <Riga etichetta={NOMI_STATO.completa} valore={s.finite} su={s.serie + s.film} />
              <Riga etichetta={NOMI_STATO.da_vedere} valore={s.da_vedere} su={s.serie + s.film} />
              <Riga etichetta={NOMI_STATO.in_pausa} valore={s.in_pausa} su={s.serie + s.film} />
              <Riga etichetta={NOMI_STATO.droppata} valore={s.droppate} su={s.serie + s.film} />
            </Scheda>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
              Cosa guarda
            </h2>

            {s.generi.length === 0 ? (
              <p className="text-sm text-quaderno-tenue">
                Nessun genere ancora: i generi arrivano con le serie.
              </p>
            ) : (
              <Scheda className="divide-y divide-quaderno-riga">
                {s.generi.map((g) => (
                  <Riga
                    key={g.genere}
                    etichetta={g.genere}
                    valore={g.quante}
                    su={s.generi[0].quante}
                  />
                ))}
              </Scheda>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
              Voti e parole
            </h2>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Casella
                titolo="Voto medio"
                valore={formattaMedia(s.voto_medio)}
              />
              <Casella titolo="Votate" valore={s.votate} />
              <Casella titolo="Commenti" valore={s.commenti} />
              <Casella titolo="Preferiti" valore={s.preferiti} />
            </div>
          </section>

          {altri.length > 0 && persona && (
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
                Confronta
              </h2>

              <p className="text-sm text-quaderno-tenue">
                Gli stessi numeri, accanto a quelli di qualcun altro — e le serie che avete
                guardato tutti e due.
              </p>

              <ul className="flex flex-wrap gap-2">
                {altri.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={vaiAlConfronto(persona.nickname, p.nickname)}
                      className="flex items-center gap-2 rounded-card border border-quaderno-riga bg-quaderno-foglio px-3 py-2 transition-colors duration-quick hover:border-quaderno-blu"
                    >
                      <Esagono nickname={p.nickname} colore={p.colore} dimensione={26} />

                      <span className="text-sm font-semibold text-quaderno-inchiostro">
                        {p.nickname}
                      </span>

                      <Icon nome="confronto" dimensione={16} className="text-quaderno-blu" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </PaginaVideoteca>
  );
}

/** La frase in cima: da quando guarda, e quanti giorni ci ha messo. */
function frasePrima(s) {
  if (!s.primo) return "Non c'è ancora niente da contare.";

  const da = new Date(s.primo).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome"
  });

  return `Da ${da} · ${s.giorni} ${s.giorni === 1 ? "giorno" : "giorni"} in cui è successo qualcosa`;
}

function Casella({ titolo, valore, nota }) {
  return (
    <Scheda className="px-3 py-4 text-center">
      <p className="font-numeric text-2xl font-bold text-quaderno-inchiostro">
        {typeof valore === "number" ? valore.toLocaleString("it-IT") : valore}
      </p>

      <p className="text-[0.7rem] uppercase tracking-wider text-quaderno-tenue">{titolo}</p>

      {nota && <p className="mt-1 text-[0.65rem] text-quaderno-tenue">{nota}</p>}
    </Scheda>
  );
}

/**
 * Una riga con la barretta.
 *
 * La barra è proporzionale al massimo della lista e non al totale: su
 * otto generi il totale non vuol dire niente (una serie ne ha cinque),
 * mentre «quanto il primo» si legge a colpo d'occhio.
 */
function Riga({ etichetta, valore, su }) {
  const quota = su > 0 ? Math.round((valore / su) * 100) : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-28 shrink-0 truncate text-sm text-quaderno-inchiostro sm:w-40">
        {etichetta}
      </span>

      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-quaderno-carta">
        <div className="h-full rounded-full bg-quaderno-blu" style={{ width: `${quota}%` }} />
      </div>

      <span className="w-10 shrink-0 text-right font-numeric text-sm text-quaderno-tenue">
        {valore}
      </span>
    </div>
  );
}
