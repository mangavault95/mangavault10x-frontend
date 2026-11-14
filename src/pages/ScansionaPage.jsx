import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useCollezione } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { ossoDelTitolo } from "../dati/identita";
import { vibra } from "../dati/tatto";
import { annullaAcquisti, collegaIsbn, dopoIlRipiego, getIsbn, registraAcquisto, urlCopertina } from "../services/api";

/**
 * SCANSIONA — «ce l'ho già?» col codice a barre (14/11/2026).
 *
 * In fumetteria si inquadra il retro del volume e la pagina dice «ce l'hai»,
 * «ti manca» o «non è in collezione», con un tocco per registrare l'acquisto.
 * Il codice (ISBN) lo riconosce il backend (`routes/isbn.js`): prima fra i codici
 * già collegati a mano, poi su Google Books. Se non lo conosce nessuno dei due,
 * si dice a mano quale serie e quale volume è, e il collegamento si ricorda: la
 * volta dopo la risposta è immediata.
 *
 * La lettura usa ZXing, caricato solo qui (è pesante: non deve entrare nell'avvio
 * del sito). Safari su iPhone non ha un lettore di codici suo, per questo una
 * libreria. La fotocamera chiede il permesso la prima volta, e vuole https.
 * Se non c'è o è negata, resta la casella per scrivere il codice a mano.
 */

export default function ScansionaPage() {
  const { serie: collezione, ricarica: ricaricaCollezione } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();

  const video = useRef(null);
  const lettore = useRef(null);
  const ultimo = useRef({ codice: null, quando: 0 });

  const [fotocamera, setFotocamera] = useState("avvio"); // avvio | ok | negata | assente
  const [esito, setEsito] = useState(null); // la risposta del server per il codice in mano
  const [occupato, setOccupato] = useState(false);
  const [problema, setProblema] = useState(null);
  const [registrato, setRegistrato] = useState(null);
  const [scritto, setScritto] = useState("");

  const ferma = useCallback(() => {
    try {
      lettore.current?.stop?.();
    } catch {
      /* già fermo */
    }

    lettore.current = null;
  }, []);

  const chiedi = useCallback(
    async (codice) => {
      setOccupato(true);
      setProblema(null);
      setRegistrato(null);

      try {
        setEsito(await getIsbn(codice));
      } catch (e) {
        setProblema(e?.message || "Non riesco a chiedere il codice adesso.");
      } finally {
        setOccupato(false);
      }
    },
    []
  );

  // La fotocamera. ZXing arriva solo adesso, con un import dinamico.
  useEffect(() => {
    let vivo = true;

    async function avvia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setFotocamera("assente");
        return;
      }

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library")
        ]);

        if (!vivo) return;

        // Solo i codici dei libri: EAN-13 (ISBN-13) ed EAN-8 non servono, UPC non c'è sul retro di un volume.
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]);
        const lettoreZxing = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

        lettore.current = await lettoreZxing.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video.current,
          (risultato) => {
            if (!risultato || !vivo) return;

            const codice = risultato.getText();
            const adesso = Date.now();

            // Lo stesso codice inquadrato per due secondi non si chiede dieci volte.
            if (codice === ultimo.current.codice && adesso - ultimo.current.quando < 4000) return;

            ultimo.current = { codice, quando: adesso };
            vibra();
            chiedi(codice);
          }
        );

        if (vivo) setFotocamera("ok");
      } catch (e) {
        if (vivo) setFotocamera(e?.name === "NotAllowedError" ? "negata" : "assente");
      }
    }

    avvia();

    return () => {
      vivo = false;
      ferma();
    };
  }, [chiedi, ferma]);

  async function registra() {
    setOccupato(true);
    setProblema(null);

    try {
      const fatto = await eseguiProtetto(() => registraAcquisto(esito.serie.id, { volumi: [esito.numero] }));

      setRegistrato(fatto);
      ricaricaCollezione();
    } catch (e) {
      if (!e?.annullato) setProblema(e?.message || "L'acquisto non è stato registrato.");
    } finally {
      setOccupato(false);
    }
  }

  async function annulla() {
    setOccupato(true);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      ricaricaCollezione();
      setEsito((e) => ({ ...e, stato: "ti_manca" }));
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    } finally {
      setOccupato(false);
    }
  }

  async function collega(serie, numero) {
    setOccupato(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => collegaIsbn({ isbn: esito.isbn, mangaId: serie.id, numero }));
      await chiedi(esito.isbn);
    } catch (e) {
      if (!e?.annullato) setProblema(e?.message || "Non sono riuscito a ricordare il codice.");
      setOccupato(false);
    }
  }

  function dopo() {
    setEsito(null);
    setRegistrato(null);
    setProblema(null);
    ultimo.current = { codice: null, quando: 0 };
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-bright">Scansiona</h1>
        <Link to="/cerca" className="bersaglio text-sm font-medium text-ciano hover:underline">
          Cerca a mano
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Inquadra il codice a barre sul retro del volume.</p>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-panel bg-alcove">
        <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Fotocamera" />
        {fotocamera === "ok" && !esito && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-card border-2 border-brass-400/80" />
        )}
        {fotocamera !== "ok" && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-muted">
            {fotocamera === "avvio" && "Accendo la fotocamera…"}
            {fotocamera === "negata" && "Il permesso alla fotocamera è negato. Puoi riattivarlo dalle impostazioni del browser, oppure scrivere il codice qui sotto."}
            {fotocamera === "assente" && "La fotocamera non è disponibile qui. Scrivi il codice qui sotto."}
          </p>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (scritto.trim()) chiedi(scritto.trim());
        }}
      >
        <input
          value={scritto}
          onChange={(e) => setScritto(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Oppure scrivi il codice (ISBN)"
          aria-label="Codice ISBN"
          className="h-11 min-w-0 flex-1 rounded-card bg-alcove px-3 text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <button type="submit" disabled={occupato} className="h-11 rounded-card bg-glass-2 px-4 font-semibold text-ink-bright disabled:opacity-50">
          Cerca
        </button>
      </form>

      {problema && <p role="alert" className="mt-4 rounded-card bg-ember/10 px-3.5 py-2.5 text-sm text-ember">{problema}</p>}
      {occupato && !esito && <p className="mt-4 text-sm text-ink-muted">Cerco il volume…</p>}

      {esito && (
        <Risposta
          esito={esito}
          collezione={collezione}
          occupato={occupato}
          registrato={registrato}
          onRegistra={registra}
          onAnnulla={annulla}
          onCollega={collega}
          onDopo={dopo}
        />
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

function Risposta({ esito, collezione, occupato, registrato, onRegistra, onAnnulla, onCollega, onDopo }) {
  const { stato, serie, numero } = esito;
  const nome = serie ? `${serie.titolo}${numero ? ` ${numero}` : ""}` : esito.titolo;

  const tono = {
    ce_l_hai: "border-ok/40 bg-ok/10",
    ti_manca: "border-brass-400/40 bg-brass-400/10",
    non_in_collezione: "border-hairline bg-alcove",
    scegli: "border-hairline bg-alcove",
    non_riconosciuto: "border-hairline bg-alcove",
    codice_non_valido: "border-ember/40 bg-ember/10"
  }[stato];

  return (
    <section className={`mt-5 rounded-panel border p-4 ${tono}`} aria-live="polite">
      {(serie || esito.copertina) && (
        <div className="flex gap-3">
          <Copertina src={serie?.copertina || esito.copertina} />
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-ink-bright">{nome}</p>
            {esito.editore && <p className="mt-1 text-sm text-ink-muted">{esito.editore}</p>}
          </div>
        </div>
      )}

      {stato === "ce_l_hai" && <p className="mt-3 text-lg font-semibold text-ok">Ce l&apos;hai già ✓</p>}

      {stato === "ti_manca" && !registrato && (
        <>
          <p className="mt-3 text-lg font-semibold text-brass-300">Ti manca</p>
          {esito.mancanti > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              {esito.mancanti === 1
                ? "Prima di questo ne manca un altro della serie."
                : `Prima di questo ne mancano altri ${esito.mancanti} della serie.`}
            </p>
          )}
          <button type="button" onClick={onRegistra} disabled={occupato} className="mt-3 h-12 w-full rounded-card bg-brass-400 font-semibold text-void disabled:opacity-50">
            Registra come comprato
          </button>
        </>
      )}

      {registrato && (
        <>
          <p className="mt-3 text-lg font-semibold text-ok">Registrato ✓</p>
          <button type="button" onClick={onAnnulla} disabled={occupato} className="mt-2 text-sm font-medium text-ciano underline underline-offset-4 disabled:opacity-50">
            Annulla
          </button>
        </>
      )}

      {stato === "non_in_collezione" && (
        <>
          <p className="mt-3 text-lg font-semibold text-ink-bright">Non è in collezione</p>
          <p className="mt-1 text-sm text-ink-muted">Google lo conosce, ma nessuna delle vostre serie ha questo titolo.</p>
          <Link to={`/cerca?q=${encodeURIComponent(esito.titolo || "")}`} className="mt-3 inline-flex h-11 items-center rounded-card bg-glass-2 px-4 font-semibold text-ink-bright">
            Aggiungila
          </Link>
        </>
      )}

      {stato === "scegli" && (
        <Scegli
          titolo="Quale serie è?"
          candidate={esito.candidate}
          numeroIniziale={esito.numero}
          occupato={occupato}
          onScelta={onCollega}
        />
      )}

      {stato === "non_riconosciuto" && (
        <>
          <p className="mt-1 text-lg font-semibold text-ink-bright">Non conosco questo codice</p>
          <p className="mt-1 text-sm text-ink-muted">
            {esito.motivo ? "Google adesso non risponde. " : "Google non ha questo volume. "}
            Dimmi tu che volume è: me lo ricordo per la prossima volta.
          </p>
          <ScegliLibera collezione={collezione} occupato={occupato} onScelta={onCollega} />
        </>
      )}

      {stato === "codice_non_valido" && <p className="mt-1 text-lg font-semibold text-ember">Questo non sembra un codice di un libro. Riprova.</p>}

      <button type="button" onClick={onDopo} className="mt-4 h-11 w-full rounded-card bg-glass-2 font-semibold text-ink-bright">
        Scansiona un altro
      </button>
    </section>
  );
}

function CampoNumero({ valore, onChange }) {
  return (
    <input
      value={valore}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
      inputMode="numeric"
      placeholder="N."
      aria-label="Numero del volume"
      className="h-11 w-16 rounded-card bg-void/40 px-2 text-center text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
    />
  );
}

/** Le serie fra cui scegliere (più edizioni con lo stesso titolo) + il numero. */
function Scegli({ titolo, candidate, numeroIniziale, occupato, onScelta }) {
  const [numero, setNumero] = useState(numeroIniziale ? String(numeroIniziale) : "");

  return (
    <div className="mt-2">
      <p className="text-lg font-semibold text-ink-bright">{titolo}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-sm text-ink-muted">Volume</span>
        <CampoNumero valore={numero} onChange={setNumero} />
      </div>
      <ul className="mt-3 space-y-2">
        {candidate.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              disabled={occupato || !numero}
              onClick={() => onScelta(s, Number(numero))}
              className="flex min-h-12 w-full items-center gap-3 rounded-card bg-glass-2 px-3 text-left disabled:opacity-50"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-bright">{s.titolo}</span>
              <span className="text-xs text-ink-muted">{[s.edizione, s.editore].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cerca fra tutte le serie in collezione, per quando il codice non lo conosce nessuno. */
function ScegliLibera({ collezione, occupato, onScelta }) {
  const [testo, setTesto] = useState("");
  const [numero, setNumero] = useState("");

  const trovate = useMemo(() => {
    const parole = ossoDelTitolo(testo).split(" ").filter(Boolean);

    if (!parole.length) return [];

    return collezione.filter((s) => parole.every((p) => ossoDelTitolo(s.titolo).includes(p))).slice(0, 6);
  }, [testo, collezione]);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Titolo della serie"
          aria-label="Titolo della serie"
          className="h-11 min-w-0 flex-1 rounded-card bg-void/40 px-3 text-base text-ink-bright placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brass-400"
        />
        <CampoNumero valore={numero} onChange={setNumero} />
      </div>
      <ul className="mt-2 space-y-2">
        {trovate.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              disabled={occupato || !numero}
              onClick={() => onScelta(s, Number(numero))}
              className="flex min-h-12 w-full items-center gap-3 rounded-card bg-glass-2 px-3 text-left disabled:opacity-50"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-bright">{s.titolo}</span>
              <span className="text-xs text-ink-muted">{s.edizione || ""}</span>
            </button>
          </li>
        ))}
        {testo && !trovate.length && <li className="text-sm text-ink-muted">Nessuna serie con questo titolo.</li>}
      </ul>
      {!numero && trovate.length > 0 && <p className="mt-2 text-xs text-ink-muted">Scrivi anche il numero del volume.</p>}
    </div>
  );
}
