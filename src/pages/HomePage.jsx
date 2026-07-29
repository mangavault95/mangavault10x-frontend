import { useMemo } from "react";
import { Link } from "react-router-dom";
import Pagina, { Sezione } from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import Progresso from "../ui/Progresso";
import CartaSerie from "../ui/CartaSerie";
import { CaricamentoGriglia, Errore, Vuoto } from "../ui/Stati";
import { Bottone } from "../ui/Controlli";
import { useCollezione } from "../dati/collezione";
import useRisorsa from "../dati/useRisorsa";
import { getReadingSessions } from "../services/api";
import {
  completamento,
  euro,
  numeroIt,
  valoreSerie,
  volumiMancanti
} from "../dati/serie";

/**
 * Lo Scaffale: la prima cosa che si vede entrando.
 *
 * Non è "tutta la collezione" — quella è la pagina Collezione. Qui
 * stanno solo le tre domande che ci si fa davvero aprendo il sito:
 * cosa stavo leggendo, cosa mi manca, cos'ho aggiunto per ultimo.
 * Tutto il resto è a un click di distanza.
 *
 * È anche la pagina destinata a diventare l'ingresso della biblioteca
 * in tre dimensioni: la struttura a fasce orizzontali è già quella
 * che serve, lo scaffale prenderà il posto della fascia in alto.
 */
export default function HomePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();

  const { dati: sessioni } = useRisorsa(getReadingSessions);

  /* -------------------- I numeri della testata -------------------- */

  const riepilogo = useMemo(() => {
    const volumi = serie.reduce((t, s) => t + s.posseduti, 0);
    const valore = serie.reduce((t, s) => t + valoreSerie(s), 0);
    const complete = serie.filter((s) => completamento(s) === 100).length;

    return { serie: serie.length, volumi, valore, complete };
  }, [serie]);

  /* -------------------- Riprendi la lettura -------------------- */

  // Le sessioni salvate hanno il manga_id: lo riaggancio alla serie
  // vera così la carta mostra copertina e progresso aggiornati anche
  // se la sessione è stata salvata mesi fa.
  const inLettura = useMemo(() => {
    if (!sessioni?.length || !serie.length) return [];

    return sessioni
      .map((s) => {
        const collegata = serie.find((m) => String(m.id) === String(s.manga_id));

        return collegata ? { ...collegata, volumeCorrente: Number(s.volume) || 1 } : null;
      })
      .filter(Boolean)
      .slice(0, 4);
  }, [sessioni, serie]);

  /* -------------------- Da completare -------------------- */

  // Le più vicine al traguardo per prime: sono quelle che conviene
  // finire, ed è la lista che serve davvero in fumetteria.
  const daCompletare = useMemo(
    () =>
      serie
        .filter((s) => volumiMancanti(s) > 0 && s.posseduti > 0)
        .sort((a, b) => volumiMancanti(a) - volumiMancanti(b))
        .slice(0, 12),
    [serie]
  );

  const aggiunteDiRecente = useMemo(
    () =>
      [...serie]
        .filter((s) => s.dataAggiunta)
        .sort((a, b) => new Date(b.dataAggiunta) - new Date(a.dataAggiunta))
        .slice(0, 12),
    [serie]
  );

  if (errore) {
    return (
      <Pagina titolo="Lo scaffale">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  if (inCorso && !serie.length) {
    return (
      <Pagina titolo="Lo scaffale" occhiello="MangaVault">
        <CaricamentoGriglia quante={12} />
      </Pagina>
    );
  }

  return (
    <Pagina
      occhiello="MangaVault"
      titolo="Lo scaffale"
      sommario="Quello che stai leggendo, quello che ti manca, quello che è arrivato per ultimo."
      azioni={
        <Link to="/collezione">
          <Bottone variante="secondario">Sfoglia tutto</Bottone>
        </Link>
      }
    >
      <div className="space-y-14">
        {/* ---------- I quattro numeri ---------- */}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Numero etichetta="Serie" valore={numeroIt(riepilogo.serie)} />
          <Numero etichetta="Volumi in casa" valore={numeroIt(riepilogo.volumi)} />
          <Numero etichetta="Valore" valore={euro(riepilogo.valore)} />
          <Numero
            etichetta="Serie complete"
            valore={numeroIt(riepilogo.complete)}
            nota={`su ${numeroIt(riepilogo.serie)}`}
          />
        </dl>

        {/* ---------- L'ingresso ---------- */}
        <IngressoBiblioteca serie={riepilogo.serie} volumi={riepilogo.volumi} />

        {/* ---------- Riprendi ---------- */}
        {inLettura.length > 0 && (
          <Sezione
            titolo="Riprendi da qui"
            extra={
              <Link
                to="/lettura"
                className="text-sm font-medium text-brass-400 transition-opacity hover:opacity-80"
              >
                Tutte le letture →
              </Link>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {inLettura.map((s) => (
                <CartaLettura key={s.id} serie={s} />
              ))}
            </div>
          </Sezione>
        )}

        {/* ---------- Da completare ---------- */}
        <Sezione
          titolo="A un passo dalla fine"
          extra={
            <Link
              to="/collezione?filtro=da-completare"
              className="text-sm font-medium text-brass-400 transition-opacity hover:opacity-80"
            >
              Vedi tutte →
            </Link>
          }
        >
          {daCompletare.length ? (
            <FasciaCopertine serie={daCompletare} />
          ) : (
            <Vuoto
              titolo="Nessun buco nello scaffale"
              testo="Tutte le serie che hai iniziato sono complete. Complimenti, è più raro di quanto sembri."
            />
          )}
        </Sezione>

        {/* ---------- Ultimi arrivi ---------- */}
        {aggiunteDiRecente.length > 0 && (
          <Sezione titolo="Ultimi arrivi">
            <FasciaCopertine serie={aggiunteDiRecente} />
          </Sezione>
        )}
      </div>
    </Pagina>
  );
}

/* ==================================================
   PEZZI DELLA PAGINA
   ================================================== */

/**
 * La porta della biblioteca.
 *
 * Non un bottone in mezzo agli altri: una fascia larga che si comporta
 * come una soglia. Al passaggio del mouse la luce dietro si allarga e
 * i battenti si socchiudono — l'invito a entrare deve arrivare prima
 * di aver letto la scritta.
 */
function IngressoBiblioteca({ serie, volumi }) {
  return (
    <Link
      to="/biblioteca"
      className="group relative block overflow-hidden rounded-panel border border-hairline bg-glass-1 px-6 py-8 backdrop-blur-xl
                 transition-all duration-slow ease-settle hover:border-brass-400/30
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf
                 sm:px-10 sm:py-10"
    >
      {/* La luce che filtra dalla soglia */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass-400/[0.07] blur-[90px]
                   transition-all duration-slow ease-settle group-hover:h-[28rem] group-hover:w-[28rem] group-hover:bg-brass-400/[0.13]"
      />

      {/* I due battenti: si scostano di poco, quanto basta a leggerlo
          come un'apertura invece che come un'animazione */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 border-r border-hairline bg-gradient-to-r from-void/50 to-transparent
                   transition-transform duration-slow ease-settle group-hover:-translate-x-3"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 border-l border-hairline bg-gradient-to-l from-void/50 to-transparent
                   transition-transform duration-slow ease-settle group-hover:translate-x-3"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/80">
            Novità
          </p>

          <h2 className="mt-2 font-display text-2xl font-semibold text-ink-bright sm:text-3xl">
            Entra nella biblioteca
          </h2>

          <p className="mt-2 max-w-md text-sm text-ink-muted">
            {numeroIt(serie)} serie e {numeroIt(volumi)} volumi disposti su
            scaffali veri, dove lo spessore di ogni libro è quanto ne possiedi.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-card border border-soft bg-glass-2 px-5 py-2.5 text-sm font-semibold text-ink-bright transition-all duration-base group-hover:border-brass-400/40 group-hover:bg-brass-400/10 group-hover:text-brass-300">
          Apri la porta
          <span className="transition-transform duration-base ease-spring group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function Numero({ etichetta, valore, nota }) {
  return (
    <div className="rounded-panel border border-hairline bg-glass-1 px-5 py-4 backdrop-blur-xl transition-colors duration-base hover:border-soft">
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </dt>

      <dd className="mt-1.5 font-numeric text-2xl font-semibold text-ink-bright sm:text-3xl">
        {valore}
        {nota && <span className="ml-2 text-sm font-normal text-ink-faint">{nota}</span>}
      </dd>
    </div>
  );
}

/**
 * La carta di una lettura in corso: sviluppata in orizzontale perché
 * qui conta il volume a cui sei arrivato, non la copertina.
 */
function CartaLettura({ serie }) {
  const pct = completamento(serie);

  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group flex gap-4 rounded-panel border border-hairline bg-glass-1 p-3 backdrop-blur-xl
                 transition-all duration-base ease-settle hover:-translate-y-0.5 hover:border-soft hover:bg-glass-2
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
    >
      <div className="w-20 shrink-0">
        <Copertina src={serie.copertina} alt={serie.titolo} />
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-bright transition-colors group-hover:text-brass-300">
          {serie.titolo}
        </h3>

        <p className="font-numeric text-xs text-ink-muted">
          Volume {serie.volumeCorrente}
          {serie.totali ? ` di ${serie.totali}` : ""}
        </p>

        <Progresso valore={pct} sottile />
      </div>
    </Link>
  );
}

/**
 * Fascia orizzontale di copertine.
 *
 * Scorre lateralmente invece di andare a capo: una fascia deve
 * restare alta una riga, altrimenti la pagina diventa un elenco
 * infinito e si perde il colpo d'occhio. Il bordo sfumato a destra
 * suggerisce che c'è dell'altro oltre il bordo dello schermo.
 */
function FasciaCopertine({ serie }) {
  return (
    <div className="relative -mx-5 sm:-mx-8 lg:-mx-12">
      <div className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:px-8 lg:px-12">
        {serie.map((s) => (
          <div key={s.id} className="w-36 shrink-0 snap-start sm:w-40">
            <CartaSerie serie={s} />
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-shelf to-transparent lg:block"
      />
    </div>
  );
}
