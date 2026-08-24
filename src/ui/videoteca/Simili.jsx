import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useRisorsa from "../../dati/useRisorsa";
import { useSessione } from "../../dati/sessione";
import { getAnteprimaConsiglio, getSimiliAnime, urlCopertina } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import { Blocco, Bottone, Pillola, Progresso, Scheda } from "./Foglio";
import { NOMI_TIPO } from "./formati";

/**
 * Sotto questo voto i consigli non si mostrano affatto.
 *
 * Chiesto da Carmine, ed è la regola giusta: tutta questa sezione dice
 * «se ti è piaciuta questa, guarda quest'altra». Su una serie a cui hai
 * dato uno o due stelle la premessa è falsa, e quello che ne esce non è
 * un consiglio debole — è un consiglio al contrario, che ti propone
 * altre cose fatte come quella che non ti è piaciuta.
 *
 * Il tre resta fuori dal taglio di proposito: è il voto di chi non si è
 * pronunciato, non di chi ha detto di no.
 */
const VOTO_MINIMO = 2;

/**
 * «Se ti è piaciuta questa» — in fondo alla scheda di un anime.
 *
 * La regola sta nel backend (`services/similiAnime.js`), qui c'è solo
 * il modo di mostrarla. Ma tre scelte di questa pagina meritano di
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
 * 3. TOCCARE UN CONSIGLIO APRE UN RIQUADRO, NON UN ALTRO SITO. Prima
 *    portava su AniList: fuori di qui, in inglese, e con la domanda
 *    vera («la aggiungo o no?») lasciata a metà. Adesso si apre la
 *    trama in italiano, e da lì si decide.
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
  const [aperta, setAperta] = useState(null);

  const voto = Number(anime?.voto) || 0;
  const bocciata = voto > 0 && voto <= VOTO_MINIMO;

  // Non si chiede nemmeno: una serie bocciata non ha consigli da dare,
  // e interrogare due siti esterni per buttare via la risposta sarebbe
  // lavoro fatto per niente.
  const id = anime?.id;
  const { dati, inCorso } = useRisorsa(() => getSimiliAnime(id), {
    attivo: Boolean(id) && !bocciata
  });

  if (bocciata) return null;
  if (inCorso) return <Attesa />;

  const daScoprire = dati?.daScoprire || [];
  const riprendile = dati?.riprendile || [];

  if (!daScoprire.length && !riprendile.length) return null;

  /**
   * «Aggiungi» scrive lo stesso `?aggiungi=` che la cornice legge
   * (vedi `app/Shell.jsx`): il pannello di ricerca si apre già col
   * titolo scritto dentro, e cerca da solo.
   *
   * Perché passare di lì invece di aggiungere al volo con l'id che il
   * riquadro ha già in mano: quel pannello è l'unico posto che sa
   * chiedere ad AnimeClick di che PARTI è fatta la serie — stagioni,
   * film, OAV — e metterle nello stesso gruppo. Un'aggiunta diretta
   * porterebbe dentro una stagione sola, che è il disordine che la
   * migrazione 014 è servita a togliere.
   */
  function aggiungi(titolo) {
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
                // Il riquadro interroga AnimeClick, e quella rotta vuole
                // il token come tutte le altre che lo fanno. Senza
                // accesso resta il collegamento alla fonte: meno bello,
                // ma è quello che si può offrire.
                apri={utente ? () => setAperta(c) : null}
              />
            ))}
          </div>
        </div>
      )}

      {aperta && (
        <Anteprima
          carta={aperta}
          chiudi={() => setAperta(null)}
          aggiungi={() => {
            setAperta(null);
            aggiungi(aperta.titolo);
          }}
        />
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
 *
 * E qui il tocco porta davvero da qualche parte — alla scheda che è già
 * in casa — quindi resta un collegamento vero e non apre riquadri.
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
function CartaSimile({ carta, apri }) {
  const dentro = (
    <>
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

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 text-left">
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
      </div>
    </>
  );

  const stile = `flex h-full flex-col overflow-hidden rounded-card border border-quaderno-riga bg-quaderno-foglio text-left
    transition-shadow duration-quick hover:shadow-lift
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta`;

  if (apri) {
    return (
      <button type="button" onClick={apri} className={stile} title={`${carta.titolo} — leggi di cosa parla`}>
        {dentro}
      </button>
    );
  }

  return (
    <a
      href={carta.collegamento || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={stile}
      title={`${carta.titolo} — apri la scheda sulla fonte`}
    >
      {dentro}
    </a>
  );
}

/**
 * Il riquadro che si apre toccando un consiglio.
 *
 * Risponde alla sola domanda che serve per decidere — di cosa parla, di
 * che anno è, quante puntate, dove si vede — e mette il bottone accanto
 * alla risposta invece che a due schermate di distanza.
 *
 * Passa da `Sovrapposizione` perché è un velo `fixed inset-0` aperto da
 * dentro una pagina: `<main>` porta un transform e senza il portale il
 * riquadro si centrerebbe sull'altezza dell'INTERA scheda, comparendo
 * molto più in basso di dove si è premuto. È la trappola già pagata una
 * volta in questo progetto.
 */
function Anteprima({ carta, chiudi, aggiungi }) {
  const { dati, inCorso, errore } = useRisorsa(
    () =>
      getAnteprimaConsiglio({
        animeclickId: carta.animeclickId,
        titoli: carta.titoliRicerca?.length ? carta.titoliRicerca : [carta.titolo]
      }),
    { attivo: true }
  );

  useEffect(() => {
    function suTasto(e) {
      if (e.key === "Escape") chiudi();
    }

    window.addEventListener("keydown", suTasto);

    return () => window.removeEventListener("keydown", suTasto);
  }, [chiudi]);

  const trovata = dati?.trovata;

  // Il titolo con cui AnimeClick la conosce può essere un altro: le due
  // fonti parlano lingue diverse e «Delicious in Dungeon» qui si chiama
  // «Dungeon Food». Si mostrano tutt'e due quando non coincidono —
  // serve a riconoscerla, e serve a vedere subito se la ricerca ha
  // agganciato la serie sbagliata.
  const nomeTrovato = trovata ? dati.titolo : null;
  const altroNome = nomeTrovato && nomeTrovato !== carta.titolo ? nomeTrovato : null;

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center p-3"
        role="dialog"
        aria-label={`${carta.titolo} — di cosa parla`}
      >
        <button
          type="button"
          aria-label="Chiudi"
          onClick={chiudi}
          className="absolute inset-0 bg-quaderno-inchiostro/40"
        />

        <Scheda className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden shadow-float">
          <div className="flex-1 overflow-y-auto">
            <div className="flex gap-4 p-5">
              <Copertina
                carta={{ ...carta, copertina: dati?.cover_url || carta.copertina }}
                className="hidden h-[13rem] w-[9.5rem] shrink-0 sm:block"
                pigra={false}
              />

              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h2 className="font-display text-xl font-bold leading-tight text-quaderno-inchiostro">
                    {carta.titolo}
                  </h2>

                  {altroNome && (
                    <p className="mt-0.5 text-xs text-quaderno-tenue">
                      su AnimeClick: {altroNome}
                    </p>
                  )}

                  {carta.motivo && (
                    <p className="mt-1.5 text-xs italic text-quaderno-tenue">{carta.motivo}</p>
                  )}
                </div>

                {trovata && (
                  <div className="flex flex-wrap items-center gap-1.5 font-numeric text-xs text-quaderno-tenue">
                    {dati.tipo && <Pillola>{NOMI_TIPO[dati.tipo] || dati.tipo}</Pillola>}
                    {dati.anno_inizio && <span>{dati.anno_inizio}</span>}
                    {dati.episodi_dichiarati && <span>· {dati.episodi_dichiarati} episodi</span>}
                  </div>
                )}

                {carta.temiInComune.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {carta.temiInComune.map((t) => (
                      <Pillola key={t} tono="blu" className="normal-case tracking-normal">
                        {t}
                      </Pillola>
                    ))}
                  </div>
                )}

                {inCorso && (
                  <p className="text-sm text-quaderno-tenue" role="status">
                    Cerco la trama su AnimeClick…
                  </p>
                )}

                {!inCorso && (errore || !trovata) && (
                  <p className="text-sm text-quaderno-tenue">
                    AnimeClick non ha una scheda per questa serie, quindi la trama in italiano
                    non c'è. Il collegamento qui sotto porta alla fonte che l'ha consigliata.
                  </p>
                )}

                {trovata && dati.trama && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-quaderno-inchiostro">
                    {dati.trama}
                  </p>
                )}

                {trovata && dati.generi?.length > 0 && (
                  <p className="text-xs text-quaderno-tenue">
                    <span className="font-semibold uppercase tracking-wider">Generi</span>{" "}
                    {dati.generi.join(", ")}
                  </p>
                )}

                {trovata && dati.distributori?.length > 0 && (
                  <p className="text-xs text-quaderno-tenue">
                    <span className="font-semibold uppercase tracking-wider">Dove si vede</span>{" "}
                    {dati.distributori.join(", ")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-quaderno-riga bg-quaderno-carta px-5 py-3">
            <Bottone tono="pieno" onClick={aggiungi}>
              Aggiungi alla videoteca
            </Bottone>

            <a
              href={dati?.url || carta.collegamento || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-quaderno-tenue transition-colors duration-quick hover:text-quaderno-inchiostro
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta"
            >
              Apri la scheda intera
            </a>

            <Bottone onClick={chiudi} className="ml-auto">
              Chiudi
            </Bottone>
          </div>
        </Scheda>
      </div>
    </Sovrapposizione>
  );
}

/**
 * Una copertina, dal ponte del backend.
 *
 * ⚠️ `pigra` esiste per una trappola vera, pagata qui: un'immagine con
 * `loading="lazy"` dentro un riquadro appena aperto **non parte mai**.
 * Non è lenta — la richiesta non viene proprio fatta: il browser decide
 * se caricare una lazy guardando dove sta rispetto alla finestra, e
 * l'elemento nasce dentro un portale montato in quell'istante, quando
 * quel calcolo è già passato. Il risultato è un rettangolo grigio per
 * sempre, con `complete: false` e zero righe nella rete — cioè un
 * guasto che non somiglia a un guasto. Verificato: la stessa immagine
 * con `eager` arriva in un istante (3000 px di lato).
 *
 * Nella griglia la pigrizia serve e resta (sei copertine, spesso sotto
 * il bordo dello schermo); nel riquadro no, ed è una sola immagine che
 * qualcuno ha appena chiesto di vedere.
 */
function Copertina({ carta, className = "", pigra = true }) {
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
      loading={pigra ? "lazy" : "eager"}
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
