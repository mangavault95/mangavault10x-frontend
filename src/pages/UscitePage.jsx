import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import { euro } from "../dati/serie";
import { useAccessoProtetto } from "../dati/accesso";
import { vibra } from "../dati/tatto";
import { annullaAcquisti, dopoIlRipiego, getUsciteArchivio, registraAcquisto, urlCopertina } from "../services/api";

/**
 * USCITE — i volumi che escono (e sono usciti) delle tue serie (03/11/2026).
 *
 * Un mese per volta, passato o futuro, con le frecce in cima come in «Il
 * vostro mese»; il mese sta nell'indirizzo (`?m=2026-10`) e senza vale
 * quello corrente. I giorni sono in ordine e ognuno dice, per ogni
 * volume, a che punto sei: «ce l'hai», «è il prossimo», «prima te ne
 * mancano N».
 *
 * Le uscite le mette da parte il backend (`uscite_manga`): la ricerca del 7
 * di ogni mese e quella settimanale, entrambe da Fumettologica, per le
 * serie in corso. Per questo ⚠️ un mese vecchio può essere vuoto o
 * incompleto — si riempie solo da quando la raccolta esiste — e un volume
 * futuro compare solo quando la rivista ha pubblicato l'elenco della sua
 * settimana. La data è quella del giovedì: vedi `usciteFumettologica.js`.
 *
 * Filtro «Da prendere»: nasconde i volumi che hai già.
 *
 * Qui c'è anche la spesa (prima era una pagina a parte): ogni volume ha un
 * tondino a destra. Toccarlo chiede conferma e poi segna il volume come
 * comprato (stessa registrazione del bot); i volumi segnati da qui restano
 * annullabili, sempre con conferma. Quelli che avevi già non si toccano.
 */

const NOME_MESE = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const GIORNO_LUNGO = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome"
});

const meseDi = (data) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(data).slice(0, 7);

function spostaMese(mese, di) {
  const [anno, numero] = mese.split("-").map(Number);
  return new Date(Date.UTC(anno, numero - 1 + di, 1)).toISOString().slice(0, 7);
}

/** Il mese sta nell'indirizzo: cambiarlo deve rifare il caricamento, quindi la chiave. */
export default function UscitePage() {
  const [parametri] = useSearchParams();
  const richiesto = /^\d{4}-(0[1-9]|1[0-2])$/.test(parametri.get("m") || "") ? parametri.get("m") : null;

  return <UsciteDelMese key={richiesto || "corrente"} richiesto={richiesto} />;
}

function UsciteDelMese({ richiesto }) {
  const [, setParametri] = useSearchParams();
  const [oggi] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()));
  const mese = richiesto || meseDi(new Date());
  const [soloDaPrendere, setSoloDaPrendere] = useState(false);
  const eseguiProtetto = useAccessoProtetto();
  // Gli acquisti fatti da questa pagina (chiave → id delle righe): servono per annullarli.
  const [fattiOra, setFattiOra] = useState({});
  const [inConferma, setInConferma] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [problema, setProblema] = useState(null);

  const { dati, errore, inCorso, ricarica } = useRisorsa(() => getUsciteArchivio(mese));

  const giorni = useMemo(() => {
    const perGiorno = new Map();

    for (const u of dati?.uscite || []) {
      if (soloDaPrendere && u.stato === "gia") continue;

      if (!perGiorno.has(u.data)) perGiorno.set(u.data, []);

      perGiorno.get(u.data).push(u);
    }

    return [...perGiorno.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [dati, soloDaPrendere]);

  const chiaveDi = (u) => `${u.serie.id}:${u.numero}`;

  async function conferma(u) {
    const k = chiaveDi(u);

    vibra("conferma");

    setProblema(null);
    setOccupato(true);

    try {
      if (fattiOra[k]) {
        await eseguiProtetto(() => annullaAcquisti(fattiOra[k]));
        setFattiOra((prima) => Object.fromEntries(Object.entries(prima).filter(([chiave]) => chiave !== k)));
      } else {
        const esito = await eseguiProtetto(() => registraAcquisto(u.serie.id, { volumi: [u.numero] }));
        setFattiOra((prima) => ({ ...prima, [k]: esito.acquisti }));
      }

      setInConferma(null);
      ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito a salvare. Riprova.");
    } finally {
      setOccupato(false);
    }
  }

  const totale = dati?.uscite?.length || 0;
  const daPrendereElenco = (dati?.uscite || []).filter((u) => u.stato !== "gia");
  const daPrendere = daPrendereElenco.length;
  // La spesa: quanto costa quello che è già uscito e ti manca (prezzo stimato).
  const spesa = daPrendereElenco.filter((u) => u.data <= oggi).reduce((t, u) => t + (u.serie.prezzo_stimato || 0), 0);

  // Nel mese corrente la pagina si apre dove sei: sul primo giorno da oggi in poi.
  const oggiRef = useRef(null);

  useEffect(() => {
    if (mese === oggi.slice(0, 7) && oggiRef.current) oggiRef.current.scrollIntoView({ block: "start" });
  }, [dati, mese, oggi]);

  const primoDaOggi = giorni.find(([data]) => data >= oggi)?.[0];
  const titolo = NOME_MESE.format(new Date(`${mese}-01T00:00:00Z`));
  const vai = (di) => setParametri({ m: spostaMese(mese, di) });

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => vai(-1)}
          aria-label="Mese precedente"
          className="grid h-10 w-10 place-items-center rounded-full bg-alcove text-ink-bright"
        >
          <Freccia verso="sinistra" />
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brass-300">Uscite manga</p>

        <button
          type="button"
          onClick={() => vai(1)}
          aria-label="Mese successivo"
          className="grid h-10 w-10 place-items-center rounded-full bg-alcove text-ink-bright"
        >
          <Freccia verso="destra" />
        </button>
      </div>

      <h1 className="mt-4 font-display text-4xl font-extrabold capitalize tracking-tight text-ink-bright">{titolo}</h1>

      {dati && totale > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink-muted">
            {totale} {totale === 1 ? "volume" : "volumi"} · <span className="text-ink-bright">{daPrendere} da prendere</span>
            {spesa > 0 && <> · {euro(spesa)} già usciti</>}
          </p>

          <button
            type="button"
            onClick={() => setSoloDaPrendere((v) => !v)}
            aria-pressed={soloDaPrendere}
            className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-quick ${
              soloDaPrendere ? "border-brass-400 bg-brass-400/20 text-brass-300" : "border-hairline bg-alcove text-ink-muted"
            }`}
          >
            Solo da prendere
          </button>
        </div>
      )}

      {problema && <p className="mt-4 text-sm text-ember">{problema}</p>}

      {inCorso && !dati && (
        <div className="mt-6">
          <CaricamentoElenco quante={4} />
        </div>
      )}

      {errore && (
        <div className="mt-6">
          <Errore errore={errore} riprova={ricarica} />
        </div>
      )}

      {dati && totale === 0 && (
        <div className="mt-6">
          <Vuoto
            titolo="Niente in questo mese"
            testo="Qui compaiono i volumi delle tue serie in corso. Un mese passato si riempie solo da quando la raccolta esiste; uno futuro, quando la rivista pubblica l'elenco della sua settimana."
          />
        </div>
      )}

      {dati && totale > 0 && giorni.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">Tutto quello che esce in questo mese ce l'hai già.</p>
      )}

      <div className="mt-6 space-y-6">
        {giorni.map(([data, uscite]) => (
          <section key={data} ref={data === primoDaOggi ? oggiRef : null} className="scroll-mt-4">
            <h2 className="mb-2 flex items-baseline gap-2 border-b border-hairline pb-1">
              <span className={`font-display text-base font-semibold capitalize ${data < oggi ? "text-ink-muted" : "text-ink-bright"}`}>
                {GIORNO_LUNGO.format(new Date(`${data}T12:00:00`))}
              </span>
              {data === oggi && <span className="rounded-full bg-brass-400/20 px-2 py-0.5 text-micro font-semibold text-brass-300">oggi</span>}
            </h2>

            <ul className="space-y-2">
              {uscite.map((u) => (
                <li key={`${data}-${u.serie.id}-${u.numero}`}>
                  <Volume
                    u={u}
                    passato={data < oggi}
                    fattoOra={Boolean(fattiOra[chiaveDi(u)])}
                    inConferma={inConferma === chiaveDi(u)}
                    occupato={occupato}
                    chiedi={() => setInConferma(chiaveDi(u))}
                    rinuncia={() => setInConferma(null)}
                    conferma={() => conferma(u)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink-faint">
        Le uscite vengono da Fumettologica, una volta a settimana, e riguardano le serie che stai seguendo. La data è il
        giovedì della settimana di uscita.
      </p>
    </div>
  );
}

/** Un volume: copertina, titolo, editore, a che punto sei, e il tondino «comprato». */
function Volume({ u, passato, fattoOra, inConferma, occupato, chiedi, rinuncia, conferma }) {
  const comprato = u.stato === "gia";
  const nota = comprato
    ? { testo: fattoOra ? "comprato" : "ce l'hai", colore: "text-jade" }
    : u.stato === "prossimo"
      ? { testo: "è il prossimo", colore: "text-brass-300" }
      : { testo: `prima te ne ${u.mancanti === 1 ? "manca 1" : `mancano ${u.mancanti}`}`, colore: "text-ember" };
  const annullabile = comprato && fattoOra;

  return (
    <div
      className={`rounded-card p-2.5 transition-colors duration-quick ${
        comprato ? "bg-jade/10 ring-1 ring-jade/40" : "bg-alcove"
      } ${passato && comprato && !fattoOra ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Link to={`/serie/${u.serie.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Copertina src={u.copertina || u.serie.copertina} />

          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold leading-tight text-ink-bright">
              {u.serie.titolo} {u.numero}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {[u.editore, u.serie.edizione, u.serie.prezzo_stimato ? euro(u.serie.prezzo_stimato) : null].filter(Boolean).join(" · ")}
            </p>
            <p className={`mt-0.5 text-xs font-semibold ${nota.colore}`}>{nota.testo}</p>
          </div>
        </Link>

        {(!comprato || annullabile) && !inConferma && (
          <button
            type="button"
            onClick={chiedi}
            aria-label={comprato ? "Annulla l'acquisto" : "Segna come comprato"}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm ${
              comprato ? "border-jade bg-jade text-void" : "border-hairline text-transparent"
            }`}
          >
            ✓
          </button>
        )}

        {comprato && !annullabile && (
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-jade/30 text-sm text-jade">
            ✓
          </span>
        )}
      </div>

      {inConferma && (
        <div className="mt-2 flex items-center gap-2 border-t border-hairline pt-2">
          <p className="min-w-0 flex-1 text-xs text-ink-bright">
            {comprato ? "Rimetto questo volume da comprare?" : "Segno questo volume come comprato?"}
          </p>
          <button type="button" onClick={rinuncia} disabled={occupato} className="rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-ink-muted">
            No
          </button>
          <button
            type="button"
            onClick={conferma}
            disabled={occupato}
            className="rounded-full bg-brass-400 px-3 py-1 text-xs font-bold text-void disabled:opacity-60"
          >
            {occupato ? "…" : "Sì"}
          </button>
        </div>
      )}
    </div>
  );
}

function Copertina({ src }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 128);

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" loading="lazy" onError={dopoIlRipiego(() => setRotta(true))} className="h-16 w-11 shrink-0 rounded-lg object-cover" />
  ) : (
    <span aria-hidden="true" className="h-16 w-11 shrink-0 rounded-lg bg-glass-2" />
  );
}

function Freccia({ verso }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={verso === "sinistra" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
