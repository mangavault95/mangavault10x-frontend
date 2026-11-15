import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useCollezione } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { ossoDelTitolo } from "../dati/identita";
import { useCopertinaVolume } from "../dati/copertineVolumi";
import { useLettoreCodici } from "../dati/lettoreCodici";
import { euro, prossimoVolume, totaleDisponibile } from "../dati/serie";
import { vibra } from "../dati/tatto";
import {
  annullaAcquisti,
  collegaIsbn,
  dopoIlRipiego,
  getIsbn,
  registraAcquisto,
  scollegaIsbn,
  urlCopertina
} from "../services/api";

/**
 * SCANSIONA — «ce l'ho già?» col codice a barre (14/11/2026, rifatta il 15).
 *
 * In fumetteria si inquadra il retro del volume e la pagina dice «ce l'hai»,
 * «ti manca» o «non è in collezione», con un tocco per registrare l'acquisto.
 * Cosa sia un codice lo decide il backend (`services/isbn.js`): prima fra i
 * codici già collegati, poi nei cataloghi. Qui si legge, si mostra e si
 * conferma — e ogni conferma si ricorda, così il sito impara i vostri volumi
 * e la volta dopo non chiede niente a nessuno.
 *
 *
 * QUANDO LA FOTOCAMERA ASCOLTA
 *
 * La fotocamera legge dieci volte al secondo; cosa farne si decide qui:
 *
 *   - lo stesso codice che è già sullo schermo non si richiede (prima
 *     ripartiva una richiesta ogni quattro secondi, finché restava inquadrato);
 *   - se la risposta chiede una decisione («ti manca», «quale serie è?») la
 *     lettura è IN PAUSA finché non si decide o non si tocca «Scansiona un
 *     altro»: un secondo volume che passa davanti non deve portarsi via il
 *     bottone che si stava per premere;
 *   - se la risposta è solo da leggere («ce l'hai», «registrato») si può
 *     passare al volume dopo senza toccare niente: è così che si controlla
 *     una pila.
 *
 *
 * I CODICI DA EDICOLA
 *
 * Un codice che non comincia per 978/979 non è un ISBN. È lo stesso per tutti
 * i numeri di una collana, e il numero sta nelle cifre piccole accanto.
 * Quelle cifre a volte si leggono un attimo dopo il codice: per un codice
 * così si aspetta poco più di un secondo prima di chiedere, e se nel
 * frattempo arrivano si usano.
 */

const ATTESA_CIFRE_PICCOLE_MS = 1200;

const eUnLibro = (codice) => /^97[89]/.test(codice);
const chiaveDi = (codice, aggiunta) => (aggiunta && !eUnLibro(codice) ? `${codice}-${aggiunta}` : codice);

/** «6,50», «6.5», «6» → 6.5; vuoto o illeggibile → null (decide il server). */
function prezzoDa(testo) {
  const pulito = String(testo ?? "").trim().replace(",", ".");

  if (!/^\d{1,4}(\.\d{1,2})?$/.test(pulito)) return null;

  return Number(pulito);
}

export default function ScansionaPage() {
  const { serie: collezione, ricarica: ricaricaCollezione } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();

  const video = useRef(null);
  const richiesta = useRef(0);
  const attesa = useRef(null);

  const [esito, setEsito] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [problema, setProblema] = useState(null);
  const [registrato, setRegistrato] = useState(null);
  const [scritto, setScritto] = useState("");
  // I volumi passati sotto la fotocamera in questa visita, dal più recente.
  const [visti, setVisti] = useState([]);

  // Una risposta che si legge e basta lascia la fotocamera libera; una che
  // chiede una decisione la mette in pausa.
  const soloDaLeggere = !esito || registrato || esito.stato === "ce_l_hai" || esito.stato === "codice_non_valido";

  // La lettura arriva da fuori da React, dieci volte al secondo: legge lo
  // stato di adesso da qui, non da una chiusura vecchia di un render.
  const adesso = useRef({});
  const inPausa = !soloDaLeggere;
  const codiceInVista = esito?.codice ?? null;

  useLayoutEffect(() => {
    adesso.current = { inPausa, occupato, codice: codiceInVista };
  });

  // …ma lo stato arriva un attimo dopo la lettura (React lo scrive al prossimo
  // disegno): fra le due, lo stesso codice letto tre volte non deve partire
  // tre volte. Questo si scrive subito, nel momento stesso della lettura.
  const appenaLetto = useRef({ codice: null, quando: 0 });

  const annota = useCallback((risposta, cambio = {}) => {
    if (!risposta?.serie || !risposta.numero) return;

    const chiave = chiaveDi(risposta.codice, risposta.aggiunta);
    const riga = {
      chiave,
      titolo: risposta.serie.titolo,
      numero: risposta.numero,
      stato: risposta.stato,
      ...cambio
    };

    setVisti((prima) => [riga, ...prima.filter((v) => v.chiave !== chiave)].slice(0, 30));
  }, []);

  const mostra = useCallback(
    (risposta) => {
      setEsito(risposta);
      setRegistrato(null);
      annota(risposta);
    },
    [annota]
  );

  /** Fa una domanda al server e ne mostra la risposta; una domanda più recente la scavalca. */
  const domanda = useCallback(
    async (chiedi, seFallisce) => {
      const mia = ++richiesta.current;

      setOccupato(true);
      setProblema(null);

      try {
        const risposta = await eseguiProtetto(chiedi);

        if (mia === richiesta.current) mostra(risposta);
      } catch (e) {
        if (mia === richiesta.current && !e?.annullato) setProblema(e?.message || seFallisce);
      } finally {
        if (mia === richiesta.current) setOccupato(false);
      }
    },
    [eseguiProtetto, mostra]
  );

  const cerca = useCallback(
    (codice, aggiunta = null) => {
      vibra();

      return domanda(() => getIsbn(codice, { aggiunta }), "Non riesco a chiedere il codice adesso.");
    },
    [domanda]
  );

  const letto = useCallback(
    (codice, aggiunta) => {
      const ora = adesso.current;

      if (ora.inPausa || ora.occupato) return;
      // È il codice già sullo schermo (anche se stavolta le cifre piccole non si sono lette).
      if (codice === ora.codice) return;

      const istante = Date.now();

      if (eUnLibro(codice) || aggiunta) {
        if (appenaLetto.current.codice === codice && istante - appenaLetto.current.quando < 1500) return;

        appenaLetto.current = { codice, quando: istante };
      }

      if (!eUnLibro(codice) && !aggiunta) {
        if (attesa.current?.codice === codice) return;

        clearTimeout(attesa.current?.timer);
        attesa.current = {
          codice,
          timer: setTimeout(() => {
            attesa.current = null;
            cerca(codice);
          }, ATTESA_CIFRE_PICCOLE_MS)
        };

        return;
      }

      clearTimeout(attesa.current?.timer);
      attesa.current = null;
      cerca(codice, aggiunta);
    },
    [cerca]
  );

  const fotocamera = useLettoreCodici(video, letto);

  // Uscendo dalla pagina, un codice da edicola che stava aspettando le sue cifre piccole non deve partire.
  useEffect(() => () => clearTimeout(attesa.current?.timer), []);

  function dopo() {
    richiesta.current += 1;
    clearTimeout(attesa.current?.timer);
    attesa.current = null;
    appenaLetto.current = { codice: null, quando: 0 };
    setEsito(null);
    setRegistrato(null);
    setProblema(null);
    setOccupato(false);
  }

  async function registra(prezzo) {
    setOccupato(true);
    setProblema(null);

    try {
      const fatto = await eseguiProtetto(() => registraAcquisto(esito.serie.id, { volumi: [esito.numero], prezzo }));

      vibra("conferma");
      setRegistrato(fatto);
      annota(esito, { stato: "comprato" });
      ricaricaCollezione();

      // Averlo comprato è la conferma che il catalogo aveva ragione: il codice
      // si ricorda, e la prossima volta non si chiede a nessuno. Se non riesce
      // non importa: l'acquisto è fatto, si richiederà al catalogo.
      if (esito.libro && esito.fonte !== "collegato") {
        collegaIsbn({ codice: esito.codice, mangaId: esito.serie.id, numero: esito.numero }).catch(() => {});
      }
    } catch (e) {
      if (!e?.annullato) setProblema(e?.message || "L'acquisto non è stato registrato.");
    } finally {
      setOccupato(false);
    }
  }

  async function annulla() {
    setOccupato(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      annota(esito);
      ricaricaCollezione();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    } finally {
      setOccupato(false);
    }
  }

  const collega = (serie, numero, cambiaSerie = false) =>
    domanda(
      () => collegaIsbn({ codice: esito.codice, aggiunta: esito.aggiunta, mangaId: serie.id, numero, cambiaSerie }),
      "Non sono riuscito a ricordare il codice."
    );

  const dimentica = () =>
    domanda(async () => {
      await scollegaIsbn({ codice: esito.codice, aggiunta: esito.aggiunta });

      return getIsbn(esito.codice, { aggiunta: esito.aggiunta });
    }, "Non sono riuscito a dimenticare il codice.");

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-bright">Scansiona</h1>
        <Link to="/cerca" className="bersaglio text-sm font-medium text-ciano hover:underline">
          Cerca a mano
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Inquadra il codice a barre sul retro del volume.</p>

      <Inquadratura video={video} fotocamera={fotocamera} inPausa={inPausa} />

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();

          const codice = scritto.replace(/[\s-]/g, "");

          if (!codice) return;

          dopo();
          setScritto("");
          cerca(codice);
        }}
      >
        <input
          value={scritto}
          onChange={(e) => setScritto(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Oppure scrivi il codice"
          aria-label="Codice a barre"
          className="h-11 min-w-0 flex-1 rounded-card bg-alcove px-3 text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <button type="submit" disabled={occupato || !scritto.trim()} className="h-11 rounded-card bg-glass-2 px-4 font-semibold text-ink-bright disabled:opacity-50">
          Cerca
        </button>
      </form>

      {problema && (
        <p role="alert" className="mt-4 rounded-card border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {problema}
        </p>
      )}

      {occupato && !esito && <p className="mt-4 text-sm text-ink-muted">Cerco il volume…</p>}

      {esito && (
        <Risposta
          // Un codice nuovo riparte da zero: il prezzo scritto per il volume di prima non vale per questo.
          key={`${chiaveDi(esito.codice || "", esito.aggiunta)}:${esito.stato}`}
          esito={esito}
          collezione={collezione}
          occupato={occupato}
          registrato={registrato}
          onRegistra={registra}
          onAnnulla={annulla}
          onCollega={collega}
          onDimentica={dimentica}
          onDopo={dopo}
        />
      )}

      {visti.length > 0 && <Visti righe={visti} />}
    </div>
  );
}

function Inquadratura({ video, fotocamera, inPausa }) {
  const { stato, torcia, cambiaTorcia, riprova } = fotocamera;

  return (
    <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-panel bg-alcove">
      <video ref={video} muted playsInline autoPlay className="h-full w-full object-cover" aria-label="Fotocamera" />

      {stato === "ok" && !inPausa && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-card border-2 border-brass-400/80" />
      )}

      {stato === "ok" && inPausa && (
        <p className="absolute inset-x-0 bottom-0 bg-void/70 px-3 py-1.5 text-center text-xs text-ink-bright">
          In pausa: decidi qui sotto, o tocca «Scansiona un altro».
        </p>
      )}

      {stato === "ok" && torcia !== null && (
        <button
          type="button"
          onClick={cambiaTorcia}
          aria-pressed={torcia}
          aria-label={torcia ? "Spegni la luce" : "Accendi la luce"}
          className={`absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full ${torcia ? "bg-brass-400 text-void" : "bg-void/60 text-ink-bright"}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 2h6l-1 7h4l-8 13 2-9H8z" />
          </svg>
        </button>
      )}

      {stato !== "ok" && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-muted">
          <div>
            {stato === "avvio" && <p>Accendo la fotocamera…</p>}
            {stato === "negata" && (
              <p>Il permesso alla fotocamera è negato. Si riattiva dalle impostazioni del browser (o dell&apos;app), oppure scrivi il codice qui sotto.</p>
            )}
            {stato === "assente" && <p>La fotocamera non è disponibile. Scrivi il codice qui sotto.</p>}
            {stato !== "avvio" && (
              <button type="button" onClick={riprova} className="mt-3 h-11 rounded-card bg-glass-2 px-4 font-semibold text-ink-bright">
                Riprova
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Copertina({ src }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 256);

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" onError={dopoIlRipiego(() => setRotta(true))} className="h-24 w-16 shrink-0 rounded-card object-cover" />
  ) : (
    <span aria-hidden="true" className="h-24 w-16 shrink-0 rounded-card bg-glass-2" />
  );
}

const TONI = {
  ce_l_hai: "border-jade/40 bg-jade/10",
  ti_manca: "border-brass-400/40 bg-brass-400/10",
  codice_non_valido: "border-ember/40 bg-ember/10"
};

function Risposta({ esito, collezione, occupato, registrato, onRegistra, onAnnulla, onCollega, onDimentica, onDopo }) {
  const { stato, serie, numero } = esito;
  const [correggo, setCorreggo] = useState(false);

  // La scheda della serie com'è in collezione: serve per la stima del prezzo e per il volume che viene dopo.
  const scheda = useMemo(() => (serie ? collezione.find((s) => Number(s.id) === Number(serie.id)) : null), [serie, collezione]);

  // La copertina di QUEL volume, non della serie: prima quella che manda il catalogo per il
  // codice inquadrato (è il volume che si ha in mano, col suo numero sopra), poi quella del
  // numero fra le copertine dei volumi che il sito ha già, e solo in fondo quella della serie.
  const delNumero = useCopertinaVolume(serie?.id ?? null, numero ?? null, serie?.copertina ?? null, 256);
  const copertina = esito.copertina || delNumero;

  const nome = serie ? `${serie.titolo}${numero ? ` ${numero}` : ""}` : esito.titolo;
  const sotto = [serie?.edizione, esito.editore || serie?.editore].filter(Boolean).join(" · ");

  return (
    <section className={`mt-5 rounded-panel border p-4 ${(registrato ? TONI.ce_l_hai : TONI[stato]) || "border-hairline bg-alcove"}`} aria-live="polite">
      {(serie || esito.titolo) && (
        <div className="flex gap-3">
          <Copertina src={copertina} />
          <div className="min-w-0">
            {/* La serie è riconosciuta con certezza: lo si dice in verde, prima di tutto il resto. */}
            {serie && ["ce_l_hai", "ti_manca", "che_volume"].includes(stato) && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-jade">✓ Riconosciuto</p>
            )}
            <p className="font-display text-xl font-bold leading-tight text-ink-bright">{nome}</p>
            {sotto && <p className="mt-1 text-sm text-ink-muted">{sotto}</p>}
          </div>
        </div>
      )}

      {stato === "ce_l_hai" && <p className="mt-3 text-lg font-semibold text-jade">Ce l&apos;hai già ✓</p>}

      {stato === "ti_manca" && !registrato && (
        <TiManca esito={esito} scheda={scheda} occupato={occupato} onRegistra={onRegistra} />
      )}

      {registrato && (
        <div className="mt-3 flex items-center gap-3">
          <p className="flex-1 text-lg font-semibold text-jade">Registrato ✓</p>
          <button type="button" onClick={onAnnulla} disabled={occupato} className="bersaglio font-semibold text-brass-300 disabled:opacity-50">
            Annulla
          </button>
        </div>
      )}

      {stato === "che_volume" && !correggo && (
        <CheVolume
          serie={serie}
          scheda={scheda}
          daEdicola={!esito.libro}
          suggerito={scheda ? prossimoVolume(scheda) : null}
          occupato={occupato}
          onNumero={(n) => onCollega(serie, n)}
          onAltraSerie={() => setCorreggo(true)}
        />
      )}

      {stato === "scegli" && (
        <>
          <p className="mt-3 text-lg font-semibold text-ink-bright">{esito.candidate.length > 1 ? "Quale di queste è?" : "È questa?"}</p>
          <p className="mt-1 text-sm text-ink-muted">Non ne sono sicuro: confermalo tu e me lo ricordo.</p>
          <Scelta candidate={esito.candidate} collezione={collezione} numeroIniziale={numero} occupato={occupato} onScelta={onCollega} />
          <Altrove etichetta="Nessuna di queste" collezione={collezione} numeroIniziale={numero} occupato={occupato} onScelta={onCollega} />
        </>
      )}

      {stato === "non_in_collezione" && (
        <>
          <p className="mt-3 text-lg font-semibold text-ink-bright">Non è in collezione</p>
          <p className="mt-1 text-sm text-ink-muted">Nessuna delle vostre serie ha questo titolo.</p>
          <Link
            to={`/collezione?nuova=${encodeURIComponent(esito.serieTitolo || esito.titolo || "")}`}
            className="mt-3 inline-flex h-11 items-center rounded-card bg-glass-2 px-4 font-semibold text-ink-bright"
          >
            Aggiungila alla collezione
          </Link>
          <Altrove etichetta="È una serie che ho già, con un altro titolo" collezione={collezione} numeroIniziale={numero} occupato={occupato} onScelta={onCollega} />
        </>
      )}

      {stato === "non_riconosciuto" && (
        <>
          <p className="mt-1 text-lg font-semibold text-ink-bright">Non conosco questo codice</p>
          <p className="mt-1 text-sm text-ink-muted">
            {esito.periodico
              ? "È un codice da edicola, non un ISBN: i cataloghi dei libri non lo conoscono."
              : /chiave/i.test(esito.motivo || "")
                ? "Google Books non è configurato sul server (manca la chiave), e l'altro catalogo non ha questo volume."
                : /quota/i.test(esito.motivo || "")
                  ? "Google Books per oggi ha finito le richieste, e l'altro catalogo non ha questo volume."
                  : esito.motivo
                    ? "I cataloghi adesso non rispondono."
                    : "Né Google Books né Open Library hanno questo volume: capita, con le edizioni italiane."}{" "}
            Dimmi tu che serie è: due lettere e due tocchi, poi me lo ricordo.
          </p>
          {esito.periodico && !esito.aggiunta && (
            <p className="mt-2 text-xs text-ink-muted">
              Se accanto al codice ci sono delle cifre piccole, inquadra anche quelle: così ricordo il volume, non solo la serie.
            </p>
          )}
          <CercaSerie collezione={collezione} occupato={occupato} onScelta={onCollega} />
        </>
      )}

      {stato === "codice_non_valido" && <p className="mt-1 text-lg font-semibold text-ember">Questo non è un codice a barre di un volume. Riprova.</p>}

      {/* Una risposta con la serie può essere sbagliata (un catalogo impreciso, un collegamento fatto di fretta): si corregge da qui. */}
      {serie && (stato === "ce_l_hai" || stato === "ti_manca" || correggo) && !registrato && (
        <Correzione
          aperta={correggo}
          onApri={() => setCorreggo(true)}
          collezione={collezione}
          numeroIniziale={numero}
          occupato={occupato}
          collegato={esito.fonte === "collegato"}
          onScelta={(s, n) => onCollega(s, n, true)}
          onDimentica={onDimentica}
        />
      )}

      <button type="button" onClick={onDopo} className="mt-4 h-11 w-full rounded-card bg-glass-2 font-semibold text-ink-bright">
        Scansiona un altro
      </button>

      {/* Quello che il catalogo ha risposto, parola per parola: serve a capire perché un numero non è uscito. */}
      {(esito.grezzo || esito.motivo) && (
        <details className="mt-3 text-xs text-ink-muted">
          <summary className="cursor-pointer py-2">Cosa dice il catalogo</summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-card bg-void/40 p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify({ codice: esito.codice, fonte: esito.fonte, numeroDa: esito.numeroDa, motivo: esito.motivo, ...esito.grezzo }, null, 1)}
          </pre>
        </details>
      )}
    </section>
  );
}

function TiManca({ esito, scheda, occupato, onRegistra }) {
  // Il prezzo di copertina del catalogo, se c'è; altrimenti il campo resta
  // vuoto e sotto si legge la stima che userà il server (quella della scheda).
  const [prezzo, setPrezzo] = useState(esito.prezzoCopertina != null ? String(esito.prezzoCopertina).replace(".", ",") : "");
  const stima = scheda ? (scheda.grezzo?.PrezzoCopertina ? Number(scheda.grezzo.PrezzoCopertina) : scheda.costo) : null;
  const scrittoMale = prezzo.trim() !== "" && prezzoDa(prezzo) === null;

  return (
    <>
      <p className="mt-3 text-lg font-semibold text-brass-300">Ti manca</p>
      {esito.mancanti > 0 && (
        <p className="mt-1 text-sm text-ink-muted">
          {esito.mancanti === 1
            ? "Prima di questo ne manca un altro della serie."
            : `Prima di questo ne mancano altri ${esito.mancanti} della serie.`}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <label htmlFor="prezzo-scansione" className="text-sm text-ink-muted">
          Pagato
        </label>
        <input
          id="prezzo-scansione"
          value={prezzo}
          onChange={(e) => setPrezzo(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={stima ? String(stima).replace(".", ",") : "—"}
          aria-invalid={scrittoMale}
          className="h-11 w-24 rounded-card bg-void/40 px-3 text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <span className="text-sm text-ink-muted">€</span>
        <span className="min-w-0 flex-1 text-xs text-ink-muted">
          {scrittoMale ? "Scrivi il prezzo così: 6,50" : prezzo.trim() === "" ? (stima ? `Vuoto: ${euro(stima)}, il prezzo della scheda` : "Vuoto: senza prezzo") : ""}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onRegistra(prezzoDa(prezzo))}
        disabled={occupato || scrittoMale}
        className="insegna mt-3 h-12 w-full rounded-card font-semibold transition-transform duration-quick active:scale-[0.98] disabled:opacity-50"
      >
        {occupato ? "Registro…" : "Registra come comprato"}
      </button>
    </>
  );
}

function CampoNumero({ valore, onChange, id }) {
  return (
    <input
      id={id}
      value={valore}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
      inputMode="numeric"
      autoComplete="off"
      placeholder="N."
      aria-label="Numero del volume"
      className="h-11 w-16 rounded-card bg-void/40 px-2 text-center text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
    />
  );
}

/**
 * La serie si sa, il numero no: il catalogo scrive «Blue box» e basta, o il
 * codice è da edicola e vale per tutti i numeri.
 *
 * Non si chiede di SCRIVERE niente: si mostrano i numeri della serie, verdi
 * quelli che avete e rosa quelli che mancano. Chi ha il volume in mano legge
 * il numero sul dorso e ha già la risposta guardando il colore; toccandolo il
 * codice si ricorda, e la prossima volta la risposta è diretta.
 */
function CheVolume({ serie, scheda, daEdicola, suggerito, occupato, onNumero, onAltraSerie }) {
  return (
    <div className="mt-3">
      <p className="text-lg font-semibold text-ink-bright">Che numero hai in mano?</p>
      <p className="mt-1 text-sm text-ink-muted">
        {daEdicola ? "Questo codice è lo stesso per tutti i numeri della serie." : "Il catalogo non scrive il numero di questo volume."} Me lo ricordo
        per la prossima volta.
      </p>

      <Numeri titolo={serie.titolo} scheda={scheda} suggerito={suggerito} occupato={occupato} onNumero={onNumero} />

      <button type="button" onClick={onAltraSerie} className="bersaglio mt-3 text-sm font-medium text-ciano underline underline-offset-4">
        Non è {serie.titolo}
      </button>
    </div>
  );
}

/**
 * I numeri di una serie, da toccare: verdi quelli che avete, rosa quelli che
 * mancano. Chi ha il volume in mano legge il numero sul dorso e dal colore ha
 * già la risposta. Senza la scheda della serie (non ancora arrivata) resta un
 * campo da scrivere.
 */
function Numeri({ titolo, scheda, suggerito, occupato, onNumero }) {
  const [numero, setNumero] = useState("");

  const presenti = useMemo(() => new Set(scheda?.numeri ?? []), [scheda]);
  // Fin dove arrivano i numeri: i volumi usciti che conosciamo, o l'ultimo posseduto, più un paio oltre.
  const fino = scheda ? Math.min(Math.max(totaleDisponibile(scheda) || 0, ...presenti, suggerito || 1) + 2, 250) : 0;

  // Il campo da scrivere: da solo quando la scheda non c'è, e sotto i numeri per quelli che
  // la griglia non mostra (una serie di cui non sappiamo quanti volumi sono usciti).
  const campo = (etichetta) => (
    <form
      className="mt-3 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (numero) onNumero(Number(numero));
      }}
    >
      {etichetta && <span className="text-xs text-ink-muted">{etichetta}</span>}
      <CampoNumero valore={numero} onChange={setNumero} />
      <button
        type="submit"
        disabled={occupato || !numero}
        className={`h-11 rounded-card px-4 font-semibold disabled:opacity-50 ${etichetta ? "bg-glass-2 text-ink-bright" : "insegna flex-1"}`}
      >
        Controlla
      </button>
    </form>
  );

  if (!fino) return campo(null);

  return (
    <>
      <p className="mt-3 flex gap-4 text-xs text-ink-muted" aria-hidden="true">
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-jade" />ce l&apos;hai</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-brass-400" />ti manca</span>
      </p>
      <div className="mt-2 grid grid-cols-6 gap-2" role="group" aria-label={`Volumi di ${titolo}`}>
        {Array.from({ length: fino }, (_, k) => k + 1).map((n) => {
          const tuo = presenti.has(n);

          return (
            <button
              key={n}
              type="button"
              disabled={occupato}
              onClick={() => onNumero(n)}
              aria-label={`Volume ${n}, ${tuo ? "ce l'hai" : "ti manca"}`}
              className={`h-11 rounded-card font-numeric text-base font-semibold disabled:opacity-50 ${
                tuo ? "bg-jade/15 text-jade" : "bg-brass-400/15 text-brass-300"
              } ${n === suggerito ? "ring-2 ring-brass-400" : ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {campo("Un altro numero")}
    </>
  );
}

function RigaSerie({ serie, occupato, onClick }) {
  return (
    <button
      type="button"
      disabled={occupato}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-card bg-glass-2 px-3 py-2 text-left disabled:opacity-50"
    >
      <span className="min-w-0 flex-1 font-semibold leading-snug text-ink-bright">{serie.titolo}</span>
      <span className="shrink-0 text-xs text-ink-muted">{[serie.edizione, serie.editore].filter(Boolean).join(" · ")}</span>
    </button>
  );
}

/** Le serie proposte dal server: un tocco se il catalogo sa il numero, altrimenti un tocco sulla serie e uno sul numero. */
function Scelta({ candidate, collezione, numeroIniziale, occupato, onScelta }) {
  const [scelta, setScelta] = useState(null);

  if (scelta) {
    const scheda = collezione.find((s) => Number(s.id) === Number(scelta.id)) || null;

    return (
      <div className="mt-3">
        <p className="text-sm text-ink-bright">
          <span className="font-semibold">{scelta.titolo}</span>: che numero è?{" "}
          <button type="button" onClick={() => setScelta(null)} className="bersaglio font-medium text-ciano underline underline-offset-4">
            Cambia serie
          </button>
        </p>
        <Numeri
          titolo={scelta.titolo}
          scheda={scheda}
          suggerito={scheda ? prossimoVolume(scheda) : null}
          occupato={occupato}
          onNumero={(n) => onScelta(scelta, n)}
        />
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {candidate.map((s) => (
        <li key={s.id}>
          <RigaSerie serie={s} occupato={occupato} onClick={() => (numeroIniziale ? onScelta(s, Number(numeroIniziale)) : setScelta(s))} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Cerca fra tutte le serie in collezione: due lettere, un tocco sulla serie, un
 * tocco sul numero. Se il numero si sa già (lo ha detto il catalogo) e non lo
 * si sta correggendo (`chiediNumero`), basta il tocco sulla serie.
 */
function CercaSerie({ collezione, numeroIniziale, chiediNumero = false, occupato, onScelta }) {
  const [testo, setTesto] = useState("");
  const [scelta, setScelta] = useState(null);

  const trovate = useMemo(() => {
    const parole = ossoDelTitolo(testo).split(" ").filter(Boolean);

    if (!parole.length) return [];

    return collezione.filter((s) => parole.every((p) => ossoDelTitolo(s.titolo).includes(p))).slice(0, 6);
  }, [testo, collezione]);

  if (scelta) {
    return (
      <div className="mt-3">
        <p className="text-sm text-ink-bright">
          <span className="font-semibold">{scelta.titolo}</span>
          {scelta.edizione ? ` · ${scelta.edizione}` : ""}: che numero è?{" "}
          <button type="button" onClick={() => setScelta(null)} className="bersaglio font-medium text-ciano underline underline-offset-4">
            Cambia serie
          </button>
        </p>
        <Numeri
          titolo={scelta.titolo}
          scheda={scelta}
          suggerito={numeroIniziale || prossimoVolume(scelta)}
          occupato={occupato}
          onNumero={(n) => onScelta(scelta, n)}
        />
      </div>
    );
  }

  return (
    <div className="mt-3">
      <input
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        autoComplete="off"
        placeholder="Scrivi il titolo della serie"
        aria-label="Titolo della serie"
        className="h-11 w-full rounded-card bg-void/40 px-3 text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
      />
      <ul className="mt-2 space-y-2">
        {trovate.map((s) => (
          <li key={s.id}>
            <RigaSerie
              serie={s}
              occupato={occupato}
              onClick={() => (numeroIniziale && !chiediNumero ? onScelta(s, Number(numeroIniziale)) : setScelta(s))}
            />
          </li>
        ))}
        {testo.trim() && !trovate.length && <li className="text-sm text-ink-muted">Nessuna serie in collezione con questo titolo.</li>}
      </ul>
    </div>
  );
}

/** Un link che apre la ricerca fra le proprie serie, per quando le proposte non bastano. */
function Altrove({ etichetta, ...resto }) {
  const [aperto, setAperto] = useState(false);

  return aperto ? (
    <CercaSerie {...resto} />
  ) : (
    <button type="button" onClick={() => setAperto(true)} className="bersaglio mt-3 block text-sm font-medium text-ciano underline underline-offset-4">
      {etichetta}
    </button>
  );
}

function Correzione({ aperta, onApri, collegato, onDimentica, occupato, ...resto }) {
  if (!aperta) {
    return (
      <button type="button" onClick={onApri} className="bersaglio mt-3 block text-sm font-medium text-ink-muted underline underline-offset-4">
        Non è questo volume?
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-hairline pt-3">
      <p className="text-sm font-semibold text-ink-bright">Che volume è, allora?</p>
      <CercaSerie occupato={occupato} chiediNumero {...resto} />
      {collegato && (
        <button type="button" onClick={onDimentica} disabled={occupato} className="bersaglio mt-3 block text-sm font-medium text-ember underline underline-offset-4 disabled:opacity-50">
          Dimentica questo codice
        </button>
      )}
    </div>
  );
}

const ETICHETTE = {
  ce_l_hai: { testo: "ce l'hai", stile: "bg-jade/15 text-jade" },
  ti_manca: { testo: "ti manca", stile: "bg-brass-400/15 text-brass-300" },
  comprato: { testo: "comprato", stile: "bg-jade/15 text-jade" }
};

/** Quello che è passato sotto la fotocamera in questa visita: per controllare una pila senza tenere il conto a mente. */
function Visti({ righe }) {
  const mancano = righe.filter((r) => r.stato === "ti_manca").length;

  return (
    <section className="mt-7" aria-label="Volumi scansionati adesso">
      <h2 className="flex items-baseline justify-between px-1 text-sm font-semibold text-ink-bright">
        Scansionati adesso
        <span className="font-normal text-ink-muted">
          {righe.length} {righe.length === 1 ? "volume" : "volumi"}
          {mancano > 0 ? `, ${mancano} da prendere` : ""}
        </span>
      </h2>
      <ul className="mt-2 divide-y divide-hairline rounded-card bg-alcove px-3.5">
        {righe.map((r) => (
          <li key={r.chiave} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1 truncate text-ink-bright">
              {r.titolo} <span className="font-numeric">{r.numero}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ETICHETTE[r.stato]?.stile || "bg-glass-2 text-ink-muted"}`}>
              {ETICHETTE[r.stato]?.testo || r.stato}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
