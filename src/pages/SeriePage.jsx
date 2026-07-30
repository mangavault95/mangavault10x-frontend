import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Copertina from "../ui/Copertina";
import Progresso from "../ui/Progresso";
import CartaSerie from "../ui/CartaSerie";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import { Sezione } from "../ui/Pagina";
import { BottonePreferito, ContaVolumi, VotoStelle } from "../ui/AzioniSerie";
import Icon from "../app/Icon";
import { useCollezione, useSerie } from "../dati/collezione";
import { getMarketPrice, getStoricoPerSerie, urlCopertina } from "../services/api";
import { generiDiSerie, idDa } from "../dati/generi";
import useRisorsa from "../dati/useRisorsa";
import {
  ETICHETTE_STATO,
  completamento,
  dataIt,
  euro,
  valoreSerie,
  volumiMancanti
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

        <div className="relative mx-auto w-full max-w-[80rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <button
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright"
          >
            <Icon nome="back" dimensione={16} />
            Indietro
          </button>

          <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
            <div className="mx-auto w-44 md:mx-0 md:w-full">
              <Copertina src={serie.copertina} alt={serie.titolo} priorita />
            </div>

            <div className="min-w-0 space-y-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink-bright sm:text-4xl lg:text-5xl">
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

                <p className="text-ink-muted">
                  {[serie.autore, serie.disegnatore !== serie.autore && serie.disegnatore]
                    .filter(Boolean)
                    .join(" · ") || "Autore non registrato"}
                </p>

                <VotoStelle
                  serie={serie}
                  onCambiato={(nuovo) => aggiornaLocale(serie.id, { valutazione: nuovo })}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {serie.stato && (
                    <Etichetta tono={serie.stato === "conclusa" ? "jade" : "lapis"}>
                      {ETICHETTE_STATO[serie.stato] || serie.stato}
                    </Etichetta>
                  )}

                  {pct === 100 && <Etichetta tono="jade">Serie completa</Etichetta>}

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
                      {serie.totali ? `su ${serie.totali}` : "volumi"}
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

                {serie.totali === null && (
                  <p className="text-xs text-ink-faint">
                    Numero totale di volumi non registrato: il completamento non è calcolabile.
                  </p>
                )}
              </div>

              {/* ---------- I dati secchi ---------- */}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-6 sm:grid-cols-4">
                <Dato etichetta="Editore" valore={serie.editore} />
                <Dato
                  etichetta="Voto"
                  valore={serie.valutazione ? `${serie.valutazione} / 5` : null}
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
      <div className="mx-auto w-full max-w-[80rem] space-y-14 px-5 pb-16 sm:px-8 lg:px-12">
        {serie.trama && (
          <Sezione titolo="Trama">
            <p className="max-w-3xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
              {serie.trama}
            </p>
          </Sezione>
        )}

        {serie.totali > 0 && <Volumi serie={serie} letti={volumiLetti} />}

        <QuotazioneMercato serie={serie} />

        <Simili serie={serie} tutte={tutte} />
      </div>
    </article>
  );
}

/* ==================================================
   PEZZI DELLA PAGINA
   ================================================== */

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
function Volumi({ serie, letti = [] }) {
  const insiemeLetti = new Set(letti.map(Number));

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
          }[stato];

          return (
            <span
              key={numero}
              title={descrizione}
              aria-label={descrizione}
              className={`grid h-9 w-9 place-items-center rounded-lg border font-numeric text-xs transition-transform duration-quick ease-spring hover:scale-110 ${aspetto}`}
            >
              {numero}
            </span>
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
function QuotazioneMercato({ serie }) {
  const [stato, setStato] = useState("fermo");
  const [dati, setDati] = useState(null);

  async function chiedi() {
    setStato("caricamento");

    try {
      const risposta = await getMarketPrice(serie.titolo);

      setDati(risposta);
      setStato("fatto");
    } catch (e) {
      setStato(e?.status === 501 ? "non_configurato" : "errore");
    }
  }

  const nonConfigurato = stato === "non_configurato";

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
                ? `Mediana di ${dati.campione} annunci attivi su eBay Italia${
                    dati.media ? ` — media ${euro(dati.media)}` : ""
                  }.`
                : "Nessun annuncio attivo trovato per questo titolo."}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {stato === "errore"
              ? "La ricerca su eBay non ha risposto. Riprova fra poco."
              : nonConfigurato
                ? "Questa funzione non è ancora attivata: servono le credenziali eBay sul server."
                : "Cerca su eBay quanto chiedono adesso per questa serie."}
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

/** Altre serie che condividono un genere: il modo naturale di girare. */
function Simili({ serie, tutte }) {
  const simili = useMemo(() => {
    // Canonicalizzati da entrambi i lati: senza, una serie taggata
    // "Avventura" e una "Adventure" non si sarebbero mai riconosciute
    // vicine, pur essendo lo stesso genere scritto in due lingue.
    const miei = generiDiSerie(serie);
    if (!miei.length) return [];

    return tutte
      .filter((s) => s.id !== serie.id && generiDiSerie(s).some((g) => miei.includes(g)))
      .sort((a, b) => (b.valutazione ?? 0) - (a.valutazione ?? 0))
      .slice(0, 6);
  }, [serie, tutte]);

  if (!simili.length) return null;

  return (
    <Sezione titolo="Dallo stesso scaffale">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8">
        {simili.map((s) => (
          <CartaSerie key={s.id} serie={s} />
        ))}
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
