import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Copertina from "../ui/Copertina";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import { Sezione } from "../ui/Pagina";
import CartaSerie from "../ui/CartaSerie";
import Icon from "../app/Icon";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { getMarketPrice, getWishlist } from "../services/api";
import { cercaFuori, scegliCorrispondenza, similiFuoriPerId } from "../bibliotecario/esterni";
import { indiceAutori } from "../dati/corrispondenzaAutore";
import { costruisciCercaPosseduto } from "../dati/consigli";
import { euro, separaGeneri } from "../dati/serie";

/**
 * La scheda di un desiderio.
 *
 * Stessa struttura di `SeriePage` (copertina, dati secchi, sezioni
 * sotto), ma qui non c'è ancora una serie in collezione da leggere:
 * i dati certi sono quelli scritti a mano nel modulo Aggiungi, il
 * resto — stato editoriale, voto, raccomandazioni — arriva da una
 * sola interrogazione ad AniList fatta al montaggio, la stessa fonte
 * già usata dal bibliotecario e dai consigli della Collezione.
 */
export default function DesiderioPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { dati: lista, inCorso, errore, ricarica } = useRisorsa(getWishlist);
  const { serie: collezione } = useCollezione();

  const elemento = useMemo(
    () => (lista || []).find((e) => String(e.id) === String(id)) || null,
    [lista, id]
  );

  const [aniList, setAniList] = useState(null);
  const [cercandoAniList, setCercandoAniList] = useState(false);

  useEffect(() => {
    if (!elemento) return;

    let annullato = false;

    // Flag di caricamento per una ricerca avviata dall'effetto stesso:
    // non c'è un modo di derivarlo senza stato.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCercandoAniList(true);

    (async () => {
      try {
        const risultati = await cercaFuori(elemento.titolo, 3);
        const corrispondenza = scegliCorrispondenza(risultati, { autore: elemento.autori });

        if (!annullato) setAniList(corrispondenza?.manga || null);
      } catch {
        if (!annullato) setAniList(null);
      } finally {
        if (!annullato) setCercandoAniList(false);
      }
    })();

    return () => {
      annullato = true;
    };
  }, [elemento]);

  const generiElemento = useMemo(() => separaGeneri(elemento?.generi), [elemento]);
  const autoriElemento = elemento?.autori || "";

  /**
   * Chi lo ha consigliato non è un genere in comune, è chi ha letto
   * entrambe le opere: le raccomandazioni di AniList vengono da chi ha
   * segnato "se ti è piaciuto questo, prova anche quest'altro" — lo
   * stesso segnale già usato da `dati/consigli.js` per la Collezione.
   * La sovrapposizione di generi da sola accostava cose senza relazione
   * reale (es. Dentro Mari → L'attacco dei giganti, stesso genere
   * "Psychological" e nient'altro in comune).
   */
  const [raccomandatiEsterni, setRaccomandatiEsterni] = useState([]);

  useEffect(() => {
    if (!aniList?.idEsterno) {
      // Nessuna corrispondenza AniList: si svuota invece di lasciare le
      // raccomandazioni del desiderio aperto in precedenza.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRaccomandatiEsterni([]);
      return;
    }

    let annullato = false;

    (async () => {
      try {
        const raccomandati = await similiFuoriPerId(aniList.idEsterno);
        if (!annullato) setRaccomandatiEsterni(raccomandati);
      } catch {
        if (!annullato) setRaccomandatiEsterni([]);
      }
    })();

    return () => {
      annullato = true;
    };
  }, [aniList?.idEsterno]);

  /** Fra le raccomandazioni vere, solo quelle che possiedi già. */
  const simili = useMemo(() => {
    if (!raccomandatiEsterni.length) return [];

    const cercaPosseduto = costruisciCercaPosseduto(collezione);
    const viste = new Set();
    const trovate = [];

    for (const r of raccomandatiEsterni) {
      const posseduta = cercaPosseduto(r);
      if (posseduta && !viste.has(posseduta.id)) {
        viste.add(posseduta.id);
        trovate.push(posseduta);
      }
    }

    return trovate.slice(0, 6);
  }, [raccomandatiEsterni, collezione]);

  /** Altro dello stesso autore che possiedi già, tollerando la romanizzazione. */
  const stessoAutore = useMemo(() => {
    if (!autoriElemento) return [];

    return indiceAutori(collezione).trovaSerie(autoriElemento);
  }, [collezione, autoriElemento]);

  if (errore) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Errore errore={errore} riprova={ricarica} />
      </div>
    );
  }

  if (inCorso && !lista) return <ScheletroScheda />;

  if (!elemento) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Vuoto
          titolo="Questo desiderio non c'è più"
          testo="L'indirizzo punta a una voce che non esiste più — magari l'hai già segnata come comprata, o l'hai tolta dalla lista."
          azione={
            <Link to="/wishlist">
              <Bottone>Torna ai desideri</Bottone>
            </Link>
          }
        />
      </div>
    );
  }

  // Il voto di AniList è già su base 10 (vedi `bibliotecario/esterni.js`):
  // qui si dimezza per la stessa scala a 5 stelle usata sulla collezione.
  const voto5 = aniList?.voto != null ? Math.round((aniList.voto / 2) * 10) / 10 : null;
  const consigliato = voto5 != null ? voto5 >= 3.5 : null;
  const statoLabel = aniList?.stato
    ? aniList.stato.charAt(0).toUpperCase() + aniList.stato.slice(1)
    : null;
  const volumiUfficiali = aniList?.volumi ?? elemento.volumitotali ?? null;

  return (
    <article>
      <div className="mx-auto w-full max-w-[80rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright"
        >
          <Icon nome="back" dimensione={16} />
          Indietro
        </button>

        <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
          <div className="mx-auto w-44 md:mx-0 md:w-full">
            <Copertina src={elemento.coverurl} alt={elemento.titolo} priorita />
          </div>

          <div className="min-w-0 space-y-6">
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink-bright sm:text-4xl lg:text-5xl">
                {elemento.titolo}
              </h1>

              <p className="text-ink-muted">{elemento.autori || "Autore non registrato"}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {statoLabel && (
                  <Etichetta tono={aniList.stato === "conclusa" ? "jade" : "lapis"}>
                    {statoLabel}
                  </Etichetta>
                )}

                {volumiUfficiali > 0 && (
                  <Etichetta>{volumiUfficiali} volumi</Etichetta>
                )}

                {voto5 != null && (
                  <Etichetta tono={consigliato ? "jade" : "neutro"}>
                    {voto5.toFixed(1)}/5 su AniList{consigliato ? " · Consigliato" : ""}
                  </Etichetta>
                )}

                {cercandoAniList && !aniList && (
                  <span className="text-xs text-ink-faint">Cerco dati aggiornati su AniList…</span>
                )}

                {generiElemento.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[80rem] space-y-14 px-5 pb-16 sm:px-8 lg:px-12">
        {elemento.trama && (
          <Sezione titolo="Trama">
            <p className="max-w-3xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
              {elemento.trama}
            </p>
          </Sezione>
        )}

        <QuotazioneMercatoDesiderio elemento={elemento} />

        {stessoAutore.length > 0 && (
          <Sezione titolo={`Altro di ${elemento.autori} che hai`}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8">
              {stessoAutore.map((s) => (
                <CartaSerie key={s.id} serie={s} />
              ))}
            </div>
          </Sezione>
        )}

        {simili.length > 0 && (
          <Sezione titolo="Simili che hai già">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8">
              {simili.map((s) => (
                <CartaSerie key={s.id} serie={s} />
              ))}
            </div>
          </Sezione>
        )}
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
    lapis: "border-lapis/25 bg-lapis/10 text-lapis"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toni[tono]}`}>
      {children}
    </span>
  );
}

/**
 * Quanto chiedono su eBay per questo titolo, adesso — stesso pattern
 * di `SeriePage.QuotazioneMercato`, con in più la stima sull'intera
 * collezione quando il numero di volumi è noto.
 */
function QuotazioneMercatoDesiderio({ elemento }) {
  const [stato, setStato] = useState("fermo");
  const [dati, setDati] = useState(null);

  async function chiedi() {
    setStato("caricamento");

    try {
      const risposta = await getMarketPrice(elemento.titolo);

      setDati(risposta);
      setStato("fatto");
    } catch (e) {
      setStato(e?.status === 501 ? "non_configurato" : "errore");
    }
  }

  const nonConfigurato = stato === "non_configurato";

  const totaleCollezione =
    dati?.mediana && elemento.volumitotali ? dati.mediana * elemento.volumitotali : null;

  return (
    <Sezione titolo="Prezzo su eBay">
      <div className="flex flex-wrap items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl">
        {stato === "fatto" && dati ? (
          <div className="space-y-1">
            <p className="font-numeric text-2xl font-semibold text-ink-bright">
              {dati.mediana ? euro(dati.mediana) : "Nessun dato"}
              {dati.mediana && (
                <span className="ml-2 text-sm font-normal text-ink-muted">al volume</span>
              )}
            </p>

            <p className="text-xs text-ink-muted">
              {dati.mediana
                ? `Mediana di ${dati.campione} annunci attivi su eBay Italia${
                    dati.media ? ` — media ${euro(dati.media)}` : ""
                  }.`
                : "Nessun annuncio attivo trovato per questo titolo."}
            </p>

            {totaleCollezione != null && (
              <p className="pt-1 text-sm text-ink-bright">
                Stima per l'intera collezione ({elemento.volumitotali} volumi):{" "}
                <strong className="font-numeric">{euro(totaleCollezione)}</strong>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {stato === "errore"
              ? "La ricerca su eBay non ha risposto. Riprova fra poco."
              : nonConfigurato
                ? "Questa funzione non è ancora attivata: servono le credenziali eBay sul server."
                : "Cerca su eBay quanto chiedono adesso per questo titolo."}
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
        </div>
      </div>

      <span className="sr-only">Caricamento della scheda in corso</span>
    </div>
  );
}
