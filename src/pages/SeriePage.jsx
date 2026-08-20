import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Copertina from "../ui/Copertina";
import Progresso from "../ui/Progresso";
import TitoliSimili from "../ui/TitoliSimili";
import OpereAutore from "../ui/OpereAutore";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import { Sezione } from "../ui/Pagina";
import { BottonePreferito, ContaVolumi } from "../ui/AzioniSerie";
import VotiPersone from "../ui/VotiPersone";
import Icon from "../app/Icon";
import { edizioniSorelle, useCollezione, useSerie } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import {
  getMarketPrice,
  getStoricoPerSerie,
  saveReadingSession,
  updateManga,
  urlCopertina
} from "../services/api";
import { generiDiSerie, idDa } from "../dati/generi";
import { nomiAutori } from "../dati/autore";
import useRisorsa from "../dati/useRisorsa";
import {
  ETICHETTE_STATO,
  completamento,
  dataIt,
  euro,
  totaleDisponibile,
  valoreSerie,
  volumiMancanti,
  votoIt
} from "../dati/serie";

/**
 * La scheda di una serie.
 *
 * Prima era una finestra sovrapposta: non aveva un indirizzo, il
 * tasto Indietro chiudeva tutto il sito e non si poteva mandare a
 * nessuno. Adesso è una pagina vera, `/serie/12`, con un titolo nella
 * scheda del browser e la cronologia che funziona.
 */
export default function SeriePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { serie, inCorso, errore } = useSerie(id);

  // Quale autore si sta guardando nel pannello delle opere: `null`
  // quando è chiuso.
  const [autoreAperto, setAutoreAperto] = useState(null);

  // Quali volumi hai già finito. Lo storico è raggruppato per serie,
  // quindi basta pescare la riga di questa: è una sola richiesta e
  // vale anche per le sezioni sotto.
  const storico = useRisorsa(getStoricoPerSerie);

  const volumiLetti = useMemo(() => {
    const riga = (storico.dati || []).find(
      (s) => String(s.manga_id) === String(id)
    );

    return (riga?.volumi || []).map(Number);
  }, [storico.dati, id]);
  const { serie: tutte, ricarica, aggiornaLocale } = useCollezione();

  // Riprendere una serie droppata scrive due cose sul server: da quando
  // i lettori sono due, scrivere vuol dire dire chi sei.
  const eseguiProtetto = useAccessoProtetto();

  if (errore) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Errore errore={errore} riprova={ricarica} />
      </div>
    );
  }

  // Finché la collezione sta arrivando, "non trovata" sarebbe una
  // bugia: la serie potrebbe esserci eccome.
  if (inCorso && !serie) return <ScheletroScheda />;

  if (!serie) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Vuoto
          titolo="Questa serie non è in collezione"
          testo="L'indirizzo punta a una scheda che non esiste più, o che non è mai esistita."
          azione={
            <Link to="/collezione">
              <Bottone>Torna alla collezione</Bottone>
            </Link>
          }
        />
      </div>
    );
  }

  const pct = completamento(serie);
  const mancanti = volumiMancanti(serie);
  const totaleAttuale = totaleDisponibile(serie);
  const sorelle = edizioniSorelle(serie, tutte);

  // Letto/in lettura/non letto guarda cosa hai davvero finito, non
  // quanti volumi possiedi: sono due domande diverse (vedi Volumi).
  const statoLettura =
    volumiLetti.length === 0
      ? "non_letto"
      : serie.totali && volumiLetti.length >= serie.totali
        ? "letto"
        : "in_lettura";

  const ETICHETTE_LETTURA = {
    letto: { testo: "Letto", tono: "jade" },
    in_lettura: { testo: "In lettura", tono: "lapis" },
    non_letto: { testo: "Non letto", tono: "neutro" }
  };

  // Riprendere in mano una serie droppata: click su un volume,
  // ripulisce il flag e riapre la lettura esattamente lì.
  async function riprendi(numero) {
    try {
      await eseguiProtetto(() =>
        Promise.all([
          updateManga(serie.id, { droppato: false }),
          saveReadingSession({
            manga_id: serie.id,
            titolo: serie.titolo,
            autore: serie.autore || "",
            coverurl: serie.copertina || "",
            volume: numero,
            volumitotali: serie.totali ?? null
          })
        ])
      );

      aggiornaLocale(serie.id, { droppato: false });
      navigate("/letture");
    } catch {
      // Un tentativo fallito qui non è grave: si può sempre riaprire
      // la lettura dalla pagina Letture. Non serve un banner d'errore
      // per un click su un quadratino.
    }
  }

  return (
    <article>
      {/* ---------- Testata con la copertina come sfondo ----------
          Il colore dominante della copertina diventa l'atmosfera della
          pagina: ogni serie ha la sua luce invece di un fondo uguale
          per tutte. La sfocatura pesante evita che l'immagine competa
          con il testo. */}
      <div className="relative">
        {serie.copertina && (
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            <img
              src={urlCopertina(serie.copertina)}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-25 blur-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-shelf/40 via-shelf/80 to-shelf" />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright sm:mb-8"
          >
            <Icon nome="back" dimensione={16} />
            Indietro
          </button>

          <div className="grid gap-5 sm:gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
            {/* Sul telefono la copertina è più piccola: a 176 pixel di
                larghezza è alta 264, e insieme al titolo e alle etichette
                si mangiava tutta la prima schermata prima della trama. */}
            <div className="mx-auto w-32 sm:w-44 md:mx-0 md:w-full">
              <Copertina src={serie.copertina} alt={serie.titolo} priorita />
            </div>

            <div className="min-w-0 space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink-bright sm:text-4xl lg:text-5xl">
                    {serie.titolo}
                  </h1>

                  {/* Preferito e voto qui: è il posto dove prima
                      servivano il pannello Gestione, adesso bastano
                      un click e — se serve — un accesso al volo. */}
                  <BottonePreferito
                    serie={serie}
                    dimensione={26}
                    className="mt-1 shrink-0"
                    onCambiato={(nuovo) => aggiornaLocale(serie.id, { preferito: nuovo })}
                  />
                </div>

                <Autori serie={serie} onScegli={setAutoreAperto} />

                {/* Un voto per persona, con il nome accanto: sulla
                    stessa serie ci sono due giudizi e nessuno dei due
                    è "il" voto. Il proprio si tocca, l'altro si legge. */}
                <VotiPersone serie={serie} />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {serie.stato && (
                    <Etichetta tono={serie.stato === "conclusa" ? "jade" : "lapis"}>
                      {ETICHETTE_STATO[serie.stato] || serie.stato}
                    </Etichetta>
                  )}

                  {serie.edizione && <Etichetta tono="brass">{serie.edizione}</Etichetta>}

                  {pct === 100 && <Etichetta tono="jade">Serie completa</Etichetta>}

                  {serie.droppato ? (
                    <Etichetta tono="ember">Droppato</Etichetta>
                  ) : (
                    <Etichetta tono={ETICHETTE_LETTURA[statoLettura].tono}>
                      {ETICHETTE_LETTURA[statoLettura].testo}
                    </Etichetta>
                  )}

                  {mancanti > 0 && (
                    <Etichetta tono="ember">
                      {mancanti === 1 ? "manca 1 volume" : `mancano ${mancanti} volumi`}
                    </Etichetta>
                  )}

                  {generiDiSerie(serie).map((g) => (
                    <Link
                      key={g}
                      to={`/collezione?generi=${idDa(g)}`}
                      className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
                    >
                      {g}
                    </Link>
                  ))}
                </div>

                {sorelle.length > 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                    Altre edizioni:
                    {sorelle.map((s) => (
                      <Link
                        key={s.id}
                        to={`/serie/${s.id}`}
                        className="text-lapis underline decoration-lapis/30 underline-offset-2 hover:decoration-lapis"
                      >
                        {s.edizione || s.titolo}
                      </Link>
                    ))}
                  </p>
                )}
              </div>

              {/* ---------- Progresso ---------- */}
              <div className="max-w-md space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ContaVolumi
                      serie={serie}
                      onCambiato={(nuovo) => aggiornaLocale(serie.id, { posseduti: nuovo })}
                    />

                    <span className="font-numeric text-sm text-ink-faint">
                      {totaleAttuale ? `su ${totaleAttuale}` : "volumi"}
                    </span>
                  </div>

                  {pct !== null && (
                    <span className="font-numeric text-sm text-ink-muted">{pct}%</span>
                  )}
                </div>

                <Progresso
                  valore={pct}
                  etichetta={
                    pct !== null
                      ? `${serie.titolo} completa al ${pct}%`
                      : `${serie.titolo}: in corso, volumi totali non ancora noti`
                  }
                />

                {totaleAttuale === null && (
                  <p className="text-xs text-ink-faint">
                    Numero totale di volumi non registrato: il completamento non è calcolabile.
                  </p>
                )}
              </div>

              {/* ---------- I dati secchi ---------- */}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-6 sm:grid-cols-4">
                <Dato etichetta="Editore" valore={serie.editore} />
                {/* Le stelle qui sopra dicono chi ha dato cosa; questo
                    numero dice come sta messa la serie in casa. Con un
                    voto solo sarebbe la stessa cosa scritta due volte,
                    e infatti compare solo quando i giudizi sono due. */}
                <Dato
                  etichetta="Voto medio"
                  valore={
                    serie.voti?.length > 1
                      ? `${votoIt(
                          Math.round(
                            (serie.voti.reduce((t, v) => t + v.voto, 0) / serie.voti.length) * 10
                          ) / 10
                        )} / 5`
                      : null
                  }
                />
                <Dato
                  etichetta="Prezzo al volume"
                  valore={serie.costo ? euro(serie.costo) : null}
                />
                <Dato
                  etichetta="Valore in casa"
                  valore={serie.costo ? euro(valoreSerie(serie)) : null}
                />
                <Dato etichetta="Aggiunta il" valore={dataIt(serie.dataAggiunta)} />
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Corpo ---------- */}
      <div className="mx-auto w-full max-w-[80rem] space-y-8 px-4 pb-16 sm:space-y-14 sm:px-8 lg:px-12">
        {serie.trama && (
          <Sezione titolo="Trama">
            <p className="max-w-3xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
              {serie.trama}
            </p>
          </Sezione>
        )}

        {serie.totali > 0 && (
          <Volumi serie={serie} letti={volumiLetti} onRiprendi={riprendi} />
        )}

        <QuotazioneMercato serie={serie} sorelle={sorelle} />

        {/* La chiave rimonta la sezione quando si passa da una serie a
            un'altra senza uscire dalla pagina (i titoli simili portano
            proprio lì): senza, resterebbero appesi i consigli della
            scheda precedente. */}
        <TitoliSimili key={serie.id} serie={serie} />
      </div>

      {autoreAperto && (
        <OpereAutore
          nome={autoreAperto}
          // La scheda AnimeClick di questa serie: se il nome dell'autore
          // com'è scritto qui non trova niente da loro, la sua grafia
          // giusta si legge da lì.
          riferimento={serie.animeClickId}
          onChiudere={() => setAutoreAperto(null)}
        />
      )}
    </article>
  );
}

/* ==================================================
   PEZZI DELLA PAGINA
   ================================================== */

/**
 * Chi l'ha fatta, un nome alla volta e cliccabile.
 *
 * Sono bottoni e non link: aprono un pannello sulla stessa pagina,
 * senza portare via da quello che si stava guardando. Il sottolineato
 * tratteggiato è il modo di dire che c'è dell'altro sotto senza fare la
 * figura di un link che porta fuori.
 */
function Autori({ serie, onScegli }) {
  const nomi = nomiAutori(serie.autore, serie.disegnatore);

  if (!nomi.length) {
    return <p className="text-ink-muted">Autore non registrato</p>;
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
      {nomi.map((nome, i) => (
        <span key={nome} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">·</span>}

          <button
            type="button"
            onClick={() => onScegli(nome)}
            title={`Tutte le opere di ${nome}`}
            className="underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors duration-quick hover:text-ink-bright hover:decoration-brass-400"
          >
            {nome}
          </button>
        </span>
      ))}
    </p>
  );
}

function Etichetta({ tono = "neutro", children }) {
  const toni = {
    neutro: "border-hairline bg-glass-1 text-ink-muted",
    jade: "border-jade/25 bg-jade/10 text-jade",
    lapis: "border-lapis/25 bg-lapis/10 text-lapis",
    ember: "border-ember/25 bg-ember/10 text-ember",
    brass: "border-brass-400/25 bg-brass-400/10 text-brass-300"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toni[tono]}`}>
      {children}
    </span>
  );
}

function Dato({ etichetta, valore }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-faint">{etichetta}</dt>
      <dd className="mt-1 text-sm text-ink-bright">{valore || "—"}</dd>
    </div>
  );
}

/**
 * I volumi come quadratini, con tre stati distinti:
 *
 *   letto      — pieno, in ottone: l'hai finito
 *   posseduto  — contorno pieno ma fondo tenue: ce l'hai, non l'hai letto
 *   mancante   — contorno tratteggiato: non ce l'hai
 *
 * Servono tre stati e non due perché "avere" e "aver letto" sono cose
 * diverse, ed è proprio la differenza fra le due che dice cosa
 * leggere stasera.
 */
function Volumi({ serie, letti = [], onRiprendi }) {
  const insiemeLetti = new Set(letti.map(Number));

  // Cliccabili solo se la serie è droppata: altrimenti sarebbe un
  // quadratino che sembra un bottone ma non fa niente in nessun altro
  // stato, e cliccarlo per sbaglio riaprirebbe una lettura non voluta.
  const riprendibile = Boolean(serie.droppato) && typeof onRiprendi === "function";

  return (
    <Sezione
      titolo="Volumi"
      extra={
        <span className="font-numeric text-sm text-ink-muted">
          {insiemeLetti.size > 0 && (
            <span className="text-brass-400">{insiemeLetti.size} letti · </span>
          )}
          {serie.posseduti} di {serie.totali}
        </span>
      }
    >
      {riprendibile && (
        <p className="mb-3 text-xs text-ink-faint">
          Serie droppata — clicca un volume per riprendere da lì.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: serie.totali }).map((_, i) => {
          const numero = i + 1;

          // Senza l'elenco dei volumi singoli si assume la sequenza da
          // 1: è vero per quasi tutte le collezioni, e comunque il
          // conteggio totale resta quello registrato.
          const posseduto = numero <= serie.posseduti;
          const letto = insiemeLetti.has(numero);

          const stato = letto
            ? "letto"
            : posseduto
              ? "posseduto"
              : "mancante";

          const aspetto = {
            letto:
              "border-brass-400 bg-brass-400 font-semibold text-void shadow-brass",
            posseduto: "border-brass-400/30 bg-brass-400/12 text-brass-300",
            mancante: "border-dashed border-soft text-ink-faint"
          }[stato];

          const descrizione = {
            letto: `Volume ${numero}: letto`,
            posseduto: `Volume ${numero}: in collezione, non ancora letto`,
            mancante: `Volume ${numero}: manca`
          }[stato] + (riprendibile ? ", clicca per riprendere la lettura da qui" : "");

          const Elemento = riprendibile ? "button" : "span";

          return (
            <Elemento
              key={numero}
              type={riprendibile ? "button" : undefined}
              onClick={riprendibile ? () => onRiprendi(numero) : undefined}
              title={descrizione}
              aria-label={descrizione}
              className={`grid h-9 w-9 place-items-center rounded-lg border font-numeric text-xs transition-transform duration-quick ease-spring hover:scale-110 ${aspetto}
                ${riprendibile ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400" : ""}`}
            >
              {numero}
            </Elemento>
          );
        })}
      </div>
    </Sezione>
  );
}

/**
 * Quanto chiedono su eBay per questa serie, adesso.
 *
 * Non è "quanto si è venduta": l'API gratuita di eBay vede solo gli
 * annunci attivi, non le vendite concluse — quella vera richiede
 * un'approvazione speciale che eBay non concede ai piccoli sviluppatori.
 * Dire "prezzo medio degli annunci attivi" è meno impressionante di
 * "media delle vendite", ma è quello che il dato è davvero.
 *
 * Il caricamento parte solo al click: interrogare eBay per ogni
 * scheda aperta sarebbe lento e inutile nella maggior parte dei casi.
 */
function QuotazioneMercato({ serie, sorelle }) {
  const [stato, setStato] = useState("fermo");
  const [dati, setDati] = useState(null);

  async function chiedi() {
    setStato("caricamento");

    try {
      const risposta = await getMarketPrice({
        titolo: serie.titolo,
        edizione: serie.edizione,
        // Le etichette delle edizioni sorelle: servono al server per
        // scartare gli annunci che nominano l'edizione sbagliata.
        altreEdizioni: sorelle.map((s) => s.edizione).filter(Boolean),
        volumiTotali: serie.totali
      });

      setDati(risposta);
      setStato("fatto");
    } catch (e) {
      setStato(e?.status === 501 ? "non_configurato" : "errore");
    }
  }

  const nonConfigurato = stato === "non_configurato";
  const scartati = dati?.campioneGrezzo > dati?.campione ? dati.campioneGrezzo - dati.campione : 0;

  return (
    <Sezione titolo="Prezzo su eBay">
      <div className="flex flex-wrap items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl">
        {stato === "fatto" && dati ? (
          <div className="space-y-1">
            {/* La mediana, non la media: un lotto completo o un
                esemplare da collezione messo in vendita insieme ai
                singoli volumi sposterebbe la media di decine di euro. */}
            <p className="font-numeric text-2xl font-semibold text-ink-bright">
              {dati.mediana ? euro(dati.mediana) : "Nessun dato"}
            </p>

            <p className="text-xs text-ink-muted">
              {dati.mediana
                ? `Mediana di ${dati.campione} annunci di serie completa su eBay Italia${
                    serie.edizione ? ` (edizione ${serie.edizione})` : ""
                  }${dati.media ? ` — media ${euro(dati.media)}` : ""}.`
                : dati.campioneGrezzo > 0
                  ? `Trovati ${dati.campioneGrezzo} annunci, ma nessuno sembrava la serie completa nell'edizione giusta.`
                  : "Nessun annuncio attivo trovato per questo titolo."}
            </p>

            {/* Trasparenza sul filtro: se il campione si è ridotto molto
                è giusto dirlo, invece di far sembrare il numero più
                solido di quanto sia. */}
            {scartati > 0 && (
              <p className="text-xs text-ink-faint">
                Scartati {scartati} annunci su {dati.campioneGrezzo}: volumi singoli o edizione diversa.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {stato === "errore"
              ? "La ricerca su eBay non ha risposto. Riprova fra poco."
              : nonConfigurato
                ? "Questa funzione non è ancora attivata: servono le credenziali eBay sul server."
                : "Cerca su eBay quanto chiedono adesso per la serie completa."}
          </p>
        )}

        {!nonConfigurato && (
          <Bottone
            variante="secondario"
            onClick={chiedi}
            disabled={stato === "caricamento"}
            className="ml-auto"
          >
            {stato === "caricamento" ? "Cerco…" : stato === "fatto" ? "Aggiorna" : "Cerca"}
          </Bottone>
        )}
      </div>
    </Sezione>
  );
}

function ScheletroScheda() {
  return (
    <div className="mx-auto w-full max-w-[80rem] px-5 py-12 sm:px-8 lg:px-12" role="status">
      <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
        <div className="aspect-cover w-44 rounded-card border border-hairline bg-glass-1 md:w-full" />

        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded-lg bg-glass-1" />
          <div className="h-4 w-1/3 rounded bg-glass-1" />
          <div className="h-2 w-full max-w-md rounded bg-glass-1" />
        </div>
      </div>

      <span className="sr-only">Caricamento della scheda in corso</span>
    </div>
  );
}
