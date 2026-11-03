import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Sovrapposizione from "../ui/Sovrapposizione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import useRisorsa from "../dati/useRisorsa";
import { coloreLettore } from "../dati/lettori";
import { euro } from "../dati/serie";
import { dopoIlRipiego, getMese, urlCopertina } from "../services/api";

/**
 * IL VOSTRO MESE (04/10/2026).
 *
 * Il riassunto di un mese di casa: quanti volumi sono entrati e quanto
 * sono costati, quanto ha letto e guardato ciascuno, e la serie più guardata.
 * Cosa è entrato nello specifico (serie per serie, i più numerosi in cima)
 * sta in un popup che si apre dalla pila di copertine. I numeri
 * li fa il server (`routes/mese.js`); qui si mettono in fila, grandi — è
 * una cosa da guardare a inizio mese, non da consultare.
 *
 * (03/11/2026: tolta «la serie che vi ha preso»: i volumi si comprano e
 * basta, non è che una serie «prenda». Al suo posto l'elenco completo.)
 *
 * Il mese sta nell'indirizzo (`?m=2026-09`); senza, vale quello scorso.
 * Le frecce in cima vanno avanti e indietro, mai oltre il mese in corso.
 */

const NOME_MESE = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

function spostaMese(mese, di) {
  const [anno, numero] = mese.split("-").map(Number);
  return new Date(Date.UTC(anno, numero - 1 + di, 1)).toISOString().slice(0, 7);
}

/**
 * Il mese sta nell'indirizzo ma `useRisorsa` carica solo al montaggio, e le
 * rotte si rimontano solo se cambia il percorso, non il `?m=`: senza questa
 * chiave le frecce cambiavano l'indirizzo e lasciavano i dati del mese di prima.
 */
export default function MesePage() {
  const [parametri] = useSearchParams();
  const richiesto = parametri.get("m");

  return <MeseDi key={richiesto || "scorso"} richiesto={richiesto} />;
}

function MeseDi({ richiesto }) {
  const [, setParametri] = useSearchParams();

  const { dati, errore, inCorso } = useRisorsa(() => getMese(richiesto));

  const mese = dati?.mese || richiesto;
  const [meseCorrente] = useState(() => new Date().toISOString().slice(0, 7));

  const vai = (di) => setParametri({ m: spostaMese(mese, di) });

  const titolo = mese ? NOME_MESE.format(new Date(`${mese}-01T00:00:00Z`)) : "";
  const massimoLetti = Math.max(1, ...(dati?.letti || []).map((l) => l.volumi));
  const massimoPuntate = Math.max(1, ...(dati?.puntate || []).map((p) => p.puntate));
  const totaleLetti = (dati?.letti || []).reduce((t, l) => t + l.volumi, 0);
  const totalePuntate = (dati?.puntate || []).reduce((t, p) => t + p.puntate, 0);

  const vuoto =
    dati && !dati.acquisti.volumi && !(dati.letti || []).length && !(dati.puntate || []).length;

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => vai(-1)}
          disabled={!mese}
          aria-label="Mese precedente"
          className="grid h-10 w-10 place-items-center rounded-full bg-alcove text-ink-bright disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brass-300">Il vostro mese</p>

        <button
          type="button"
          onClick={() => vai(1)}
          disabled={!mese || spostaMese(mese, 1) > meseCorrente}
          aria-label="Mese successivo"
          className="grid h-10 w-10 place-items-center rounded-full bg-alcove text-ink-bright disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <h1 className="mt-4 font-display text-4xl font-extrabold capitalize tracking-tight text-ink-bright">{titolo}</h1>

      {errore && <p className="mt-6 text-sm text-ember">Il riassunto non è arrivato. Riprova fra un attimo.</p>}
      {inCorso && !dati && <p className="mt-6 text-sm text-ink-muted">Faccio i conti…</p>}
      {vuoto && <p className="mt-6 text-sm text-ink-muted">Nessun acquisto, nessuna lettura, nessuna puntata segnata in questo mese.</p>}

      {dati && dati.acquisti.volumi > 0 && <Acquisti acquisti={dati.acquisti} />}

      {(totaleLetti > 0 || totalePuntate > 0) && (
        <div className="mt-9 grid grid-cols-2 gap-3">
          <Totale numero={totaleLetti} etichetta={totaleLetti === 1 ? "volume letto" : "volumi letti"} />
          <Totale numero={totalePuntate} etichetta={totalePuntate === 1 ? "puntata vista" : "puntate viste"} />
        </div>
      )}

      {dati?.letti?.length > 0 && (
        <Barre titolo="Volumi letti" righe={dati.letti.map((l) => ({ ...l, valore: l.volumi }))} massimo={massimoLetti} />
      )}

      {dati?.puntate?.length > 0 && (
        <>
          <Barre titolo="Puntate viste" righe={dati.puntate.map((p) => ({ ...p, valore: p.puntate }))} massimo={massimoPuntate} />

          {dati.anime && (
            <Link
              to={`/videoteca/${dati.anime.id}`}
              className="mt-5 flex items-center gap-4 rounded-3xl border border-hairline bg-gradient-to-br from-viola/15 to-alcove p-4"
            >
              <Copertina src={dati.anime.copertina} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brass-300">La serie più guardata</p>
                <p className="font-display text-lg font-bold leading-tight text-ink-bright">{dati.anime.titolo}</p>
                <p className="mt-1 text-sm text-ink-muted">{dati.anime.puntate} puntate</p>
              </div>
            </Link>
          )}
        </>
      )}

      {dati && dati.puntate?.length === 0 && (dati.letti?.length > 0 || dati.acquisti.volumi > 0) && (
        <p className="mt-8 text-sm leading-relaxed text-ink-muted">Nessuna puntata segnata in questo mese.</p>
      )}
    </div>
  );
}

/**
 * Il cuore della pagina: quanti volumi, quanto sono costati, e una pila
 * di copertine: toccandone una qualsiasi si apre il popup con cosa è
 * entrato nello specifico.
 *
 * L'elenco non sta in pagina: lungo com'era, allungava tutto il resto
 * (letture e puntate finivano fuori schermo). Sta in un popup, serie per
 * serie, le più numerose in cima, con i numeri («vol. 3-5, 8»).
 */
function Acquisti({ acquisti }) {
  const elenco = acquisti.elenco || [];
  const [aperto, setAperto] = useState(false);
  const inPila = elenco.slice(0, 6);
  const altre = elenco.length - inPila.length;

  return (
    <section className="mt-7">
      <div className="relative overflow-hidden rounded-[28px] border border-hairline bg-gradient-to-br from-brass-400/25 via-alcove to-alcove p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brass-400/15 blur-3xl" />

        <p className="font-display text-[5rem] font-extrabold leading-[0.85] text-ink-bright">{acquisti.volumi}</p>
        <p className="font-display text-2xl font-bold text-ink-bright">{acquisti.volumi === 1 ? "volume comprato" : "volumi comprati"}</p>

        <p className="mt-3 inline-flex items-center rounded-full bg-void/40 px-3 py-1 text-[0.95rem] text-ink">
          per&nbsp;<span className="font-numeric font-semibold text-ink-bright">{euro(acquisti.spesa)}</span>
          {elenco.length > 1 && <span className="text-ink-muted">&nbsp;· {elenco.length} serie</span>}
        </p>

        {elenco.length > 0 && (
          <button
            type="button"
            onClick={() => setAperto(true)}
            aria-label="Mostra cosa è entrato nel mese"
            aria-haspopup="dialog"
            className="mt-5 flex rounded-2xl text-left transition-opacity duration-quick active:opacity-80"
          >
            <span className="flex -space-x-3">
              {inPila.map((s) => (
                <Copertina key={s.id} src={s.copertina} piccola />
              ))}
              {altre > 0 && (
                <span className="grid h-20 w-14 place-items-center rounded-xl border-2 border-alcove bg-glass-2 font-numeric text-sm font-semibold text-ink-bright">
                  +{altre}
                </span>
              )}
            </span>
          </button>
        )}
      </div>

      {aperto && <DettaglioAcquisti elenco={elenco} volumi={acquisti.volumi} spesa={acquisti.spesa} onChiudi={() => setAperto(false)} />}
    </section>
  );
}

/** Il popup: cosa è entrato, serie per serie, con barra, numeri e spesa. */
function DettaglioAcquisti({ elenco, volumi, spesa, onChiudi }) {
  const velo = useChiusuraVelo(onChiudi);
  const massimo = Math.max(1, ...elenco.map((s) => s.volumi));

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-end overflow-y-auto bg-void/70 p-0 backdrop-blur-sm animate-rise-in sm:place-items-center sm:p-4"
        onKeyDown={(e) => {
          if (e.key === "Escape") onChiudi();
        }}
        {...velo}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cosa è entrato nel mese"
          className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-hairline bg-glass-3 p-5 shadow-float backdrop-blur-2xl sm:rounded-panel sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-ink-bright">Cosa è entrato</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                {volumi} {volumi === 1 ? "volume" : "volumi"} · <span className="font-numeric">{euro(spesa)}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onChiudi}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-alcove text-ink-bright"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <ul className="mt-4 space-y-2.5">
            {elenco.map((s) => (
              <li key={s.id}>
                <Link to={`/serie/${s.id}`} className="flex items-center gap-3.5 rounded-2xl bg-alcove p-3 transition-colors duration-quick active:bg-glass-2">
                  <Copertina src={s.copertina} media />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-bold leading-tight text-ink-bright">{s.titolo}</p>
                    {s.edizione && <p className="truncate text-xs text-ink-muted">{s.edizione}</p>}
                    {s.numeri.length > 0 && <p className="mt-0.5 font-numeric text-[0.8rem] text-ink">vol. {numeriInFila(s.numeri)}</p>}

                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-bright/[0.07]">
                      <span className="block h-full rounded-full bg-brass-400" style={{ width: `${Math.max(8, (s.volumi / massimo) * 100)}%` }} />
                    </span>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-numeric text-2xl font-semibold leading-none text-ink-bright">×{s.volumi}</p>
                    {s.spesa > 0 && <p className="mt-1 font-numeric text-xs text-ambra">{euro(s.spesa)}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sovrapposizione>
  );
}

/** [1,2,3,5,8,9] → «1-3, 5, 8-9». */
function numeriInFila(numeri) {
  const gruppi = [];

  for (const n of numeri) {
    const ultimo = gruppi[gruppi.length - 1];

    if (ultimo && n === ultimo[1] + 1) ultimo[1] = n;
    else gruppi.push([n, n]);
  }

  return gruppi.map(([da, a]) => (da === a ? String(da) : `${da}-${a}`)).join(", ");
}

function Totale({ numero, etichetta }) {
  return (
    <div className="rounded-3xl border border-hairline bg-alcove p-4">
      <p className="font-display text-4xl font-extrabold leading-none text-ink-bright">{numero}</p>
      <p className="mt-1.5 text-sm text-ink-muted">{etichetta}</p>
    </div>
  );
}

function Barre({ titolo, righe, massimo }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-sm font-semibold text-brass-300">{titolo}</h2>
      <ul className="space-y-2.5">
        {righe.map((r) => {
          const colore = coloreLettore(r.colore);

          return (
            <li key={r.id} className="flex items-center gap-3">
              <span className="w-16 shrink-0 truncate text-sm font-medium text-ink-bright">{r.nickname}</span>
              <span className="h-7 flex-1 overflow-hidden rounded-lg bg-ink-bright/[0.07]">
                <span className={`block h-full rounded-lg ${colore.pallino}`} style={{ width: `${Math.max(6, (r.valore / massimo) * 100)}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right font-numeric font-semibold text-ink-bright">{r.valore}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Copertina({ src, piccola = false, media = false }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 256);

  // Piccola: la pila di copertine in cima. Media: le righe dell'elenco.
  const misura = piccola ? "h-20 w-14 border-2 border-alcove" : media ? "h-[84px] w-14" : "h-24 w-[68px]";

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" onError={dopoIlRipiego(() => setRotta(true))} className={`${misura} shrink-0 rounded-xl object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${misura} shrink-0 rounded-xl bg-glass-2`} />
  );
}
