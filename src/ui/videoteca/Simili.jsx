import { Link, useSearchParams } from "react-router-dom";
import useRisorsa from "../../dati/useRisorsa";
import { useSessione } from "../../dati/sessione";
import { getSimiliAnime, urlCopertina } from "../../services/api";
import { Blocco, Bottone, Pillola, Progresso, Scheda } from "./Foglio";

/**
 * «Se ti è piaciuta questa» — in fondo alla scheda di un anime.
 *
 * La regola sta nel backend (`services/similiAnime.js`), qui c'è solo
 * il modo di mostrarla. Ma due scelte di questa pagina meritano di
 * essere spiegate dove si vedono:
 *
 * 1. OGNI CARTA DICE PERCHÉ È LÌ. «In 539 l'hanno accostata a questa»,
 *    oppure i temi che le due serie hanno in comune. Un consiglio senza
 *    motivo si legge come un banner pubblicitario, e per di più non dà
 *    modo di capire quando ha sbagliato.
 *
 * 2. I DUE MUCCHI NON SONO LO STESSO INVITO, e per questo hanno due
 *    forme diverse invece di due titoletti sopra la stessa griglia.
 *    «Riprendile» sono righe larghe con dentro il progresso, perché la
 *    domanda è «a che punto ero?» e la risposta è un numero; «Da
 *    scoprire» sono copertine, perché lì non c'è nessun numero da
 *    guardare e quello che conta è la faccia della serie.
 *
 * Riprendile viene PRIMA anche se è il mucchio più piccolo: chi arriva
 * in fondo a questa pagina ha appena guardato qualcosa, e «ne hai una a
 * metà che le somiglia» è un invito che si può accogliere stasera. La
 * scoperta può aspettare la riga dopo.
 *
 * È un di più: se non risponde nessuna delle due fonti la sezione
 * sparisce, senza lasciare un riquadro d'errore in coda alla scheda.
 */
export default function Simili({ anime }) {
  const { utente } = useSessione();
  const [parametri, setParametri] = useSearchParams();

  const id = anime?.id;
  const { dati, inCorso } = useRisorsa(() => getSimiliAnime(id), { attivo: Boolean(id) });

  if (inCorso) return <Attesa />;

  const daScoprire = dati?.daScoprire || [];
  const riprendile = dati?.riprendile || [];

  if (!daScoprire.length && !riprendile.length) return null;

  /**
   * «Aggiungi» scrive lo stesso `?aggiungi=` che la cornice legge
   * (vedi `app/Shell.jsx`): il pannello di ricerca si apre già col
   * titolo scritto dentro. Non serve una rotta nuova né un secondo
   * pannello — e quella strada passa dalla ricerca vera, che sa
   * accorpare le stagioni, cosa che un «aggiungi al volo» partendo da
   * un identificativo non saprebbe fare.
   */
  function cerca(titolo) {
    const nuovi = new URLSearchParams(parametri);
    nuovi.set("aggiungi", titolo);
    setParametri(nuovi);
  }

  return (
    <Blocco
      titolo="Se ti è piaciuta"
      extra={
        <span className="text-right text-[0.7rem] leading-tight text-quaderno-tenue">
          per com'è fatta, non per il genere
          {dati.gia_viste > 0 && (
            <>
              <br />
              {dati.gia_viste === 1
                ? "un altro consiglio l'avevi già visto"
                : `altri ${dati.gia_viste} li avevi già visti`}
            </>
          )}
        </span>
      }
    >
      {/* I temi della serie aperta: dicono con che metro sono stati
          scelti i consigli qui sotto. Senza, «perché proprio questi?»
          resta una domanda senza risposta visibile. */}
      {dati.temi?.length > 0 && (
        <p className="-mt-1 text-xs text-quaderno-tenue">
          Questa serie è fatta di:{" "}
          <span className="text-quaderno-inchiostro">{dati.temi.join(" · ")}</span>
        </p>
      )}

      {riprendile.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-quaderno-tenue">
            Ne hai già in videoteca, lasciate a metà
          </h3>

          <div className="grid gap-2 sm:grid-cols-2">
            {riprendile.map((c) => (
              <RigaRipresa key={c.chiave} carta={c} />
            ))}
          </div>
        </div>
      )}

      {daScoprire.length > 0 && (
        <div className="space-y-2">
          {riprendile.length > 0 && (
            <h3 className="pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-quaderno-tenue">
              Da scoprire
            </h3>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {daScoprire.map((c) => (
              <CartaSimile
                key={c.chiave}
                carta={c}
                cerca={utente ? () => cerca(c.titolo) : null}
              />
            ))}
          </div>
        </div>
      )}
    </Blocco>
  );
}

/**
 * Una serie che hai già e che è rimasta indietro.
 *
 * Porta il progresso e non il motivo per esteso: qui la notizia è «sei
 * alla 2 di 12», e il perché è consigliata sta scritto sotto in piccolo
 * solo per chi vuole saperlo. All'incontrario delle carte di scoperta,
 * dove il motivo è l'unica cosa che si ha.
 */
function RigaRipresa({ carta }) {
  const v = carta.inVideoteca;

  return (
    <Link
      to={`/videoteca/${v.id}`}
      className="group flex gap-3 rounded-card border border-quaderno-riga bg-quaderno-foglio p-2 transition-shadow duration-quick hover:shadow-lift
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta"
    >
      <Copertina carta={carta} className="h-[4.5rem] w-[3.4rem] shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <h4 className="line-clamp-1 text-sm font-semibold text-quaderno-inchiostro">
          {carta.titolo}
        </h4>

        <p className="font-numeric text-[0.7rem] text-quaderno-blu">
          {v.ultimoVisto
            ? `il prossimo è l'episodio ${v.ultimoVisto + 1}`
            : "non l'hai ancora cominciata"}
        </p>

        <Progresso visti={v.ultimoVisto || 0} su={v.episodi} className="mt-auto" />
      </div>
    </Link>
  );
}

/** Una serie che non hai. */
function CartaSimile({ carta, cerca }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-quaderno-riga bg-quaderno-foglio">
      <a
        href={carta.collegamento || undefined}
        target="_blank"
        rel="noopener noreferrer"
        title={`${carta.titolo} — apri la scheda sulla fonte`}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-quaderno-blu"
      >
        <div className="relative">
          <Copertina carta={carta} className="aspect-[3/4] w-full" />

          {/* Che tutt'e due le fonti la accostino a questa serie è il
              segnale più forte che la sezione abbia: due gruppi di
              persone diversi, in due lingue, hanno pensato la stessa
              cosa. Merita di vedersi sulla copertina invece che nella
              riga del motivo insieme a tutto il resto. */}
          {carta.accordo && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-quaderno-blu px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white">
              doppia
            </span>
          )}
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h4 className="line-clamp-2 min-h-[2.3rem] text-[0.82rem] font-semibold leading-snug text-quaderno-inchiostro">
          {carta.titolo}
        </h4>

        {carta.temiInComune.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {carta.temiInComune.slice(0, 2).map((t) => (
              <Pillola key={t} tono="contorno" className="normal-case tracking-normal">
                {t}
              </Pillola>
            ))}
          </div>
        ) : (
          carta.motivo && (
            <p className="text-[0.68rem] italic leading-snug text-quaderno-tenue">
              {carta.motivo}
            </p>
          )
        )}

        {cerca && (
          <Bottone
            tono="quieto"
            onClick={cerca}
            className="mt-auto w-full justify-center px-2 py-1 text-xs"
            title={`Cerca «${carta.titolo}» per aggiungerla`}
          >
            Aggiungi
          </Bottone>
        )}
      </div>
    </div>
  );
}

function Copertina({ carta, className = "" }) {
  if (!carta.copertina) {
    return (
      <div
        className={`grid place-items-center overflow-hidden rounded bg-quaderno-carta px-2 text-center text-[0.62rem] leading-tight text-quaderno-tenue ${className}`}
      >
        {carta.titolo}
      </div>
    );
  }

  return (
    <img
      src={urlCopertina(carta.copertina)}
      alt=""
      loading="lazy"
      className={`overflow-hidden rounded bg-quaderno-carta object-cover ${className}`}
    />
  );
}

/**
 * L'attesa.
 *
 * Un riquadro grigio e non uno «sto caricando»: questa sezione
 * interroga due siti esterni e può metterci qualche secondo, e per
 * tutto quel tempo la pagina deve già avere l'altezza che avrà. Senza,
 * la scheda si allunga di colpo sotto chi sta leggendo le note.
 */
function Attesa() {
  return (
    <Blocco titolo="Se ti è piaciuta">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Scheda key={i} className="overflow-hidden">
            <div className="aspect-[3/4] w-full animate-pulse bg-quaderno-carta" />
            <div className="space-y-1.5 p-2.5">
              <div className="h-3 w-4/5 animate-pulse rounded bg-quaderno-carta" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-quaderno-carta" />
            </div>
          </Scheda>
        ))}
      </div>
    </Blocco>
  );
}
