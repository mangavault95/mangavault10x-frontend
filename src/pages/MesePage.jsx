import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { coloreLettore } from "../dati/lettori";
import { euro } from "../dati/serie";
import { dopoIlRipiego, getMese, urlCopertina } from "../services/api";

/**
 * IL VOSTRO MESE (04/10/2026).
 *
 * Il riassunto di un mese di casa: quanti volumi sono entrati e quanto
 * sono costati, la serie che vi ha preso di più, quanto ha letto e
 * guardato ciascuno. I numeri li fa il server (`routes/mese.js`); qui si
 * mettono in fila, grandi, uno per riquadro — è una cosa da guardare a
 * inizio mese, non da consultare.
 *
 * Il mese sta nell'indirizzo (`?m=2026-09`); senza, vale quello scorso.
 * Le frecce in cima vanno avanti e indietro, mai oltre il mese in corso.
 */

const NOME_MESE = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

function spostaMese(mese, di) {
  const [anno, numero] = mese.split("-").map(Number);
  return new Date(Date.UTC(anno, numero - 1 + di, 1)).toISOString().slice(0, 7);
}

export default function MesePage() {
  const [parametri, setParametri] = useSearchParams();
  const richiesto = parametri.get("m");

  const { dati, errore, inCorso } = useRisorsa(() => getMese(richiesto));

  const mese = dati?.mese || richiesto;
  const [meseCorrente] = useState(() => new Date().toISOString().slice(0, 7));

  const vai = (di) => setParametri({ m: spostaMese(mese, di) });

  const titolo = mese ? NOME_MESE.format(new Date(`${mese}-01T00:00:00Z`)) : "";
  const massimoLetti = Math.max(1, ...(dati?.letti || []).map((l) => l.volumi));
  const massimoPuntate = Math.max(1, ...(dati?.puntate || []).map((p) => p.puntate));

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

      {dati && dati.acquisti.volumi > 0 && (
        <section className="mt-8">
          <p className="font-display text-[5rem] font-extrabold leading-[0.85] text-ink-bright">{dati.acquisti.volumi}</p>
          <p className="font-display text-2xl font-bold text-ink-bright">{dati.acquisti.volumi === 1 ? "volume comprato" : "volumi comprati"}</p>
          <p className="mt-2 text-[0.95rem] text-ink">
            per <span className="font-numeric font-semibold text-ink-bright">{euro(dati.acquisti.spesa)}</span>
          </p>

          {dati.acquisti.serie && (
            <Link
              to={`/serie/${dati.acquisti.serie.id}`}
              className="mt-6 flex items-center gap-4 rounded-3xl bg-alcove p-4"
            >
              <Copertina src={dati.acquisti.serie.copertina} />
              <div className="min-w-0">
                <p className="text-xs text-brass-300">La serie che vi ha preso</p>
                <p className="font-display text-lg font-bold leading-tight text-ink-bright">{dati.acquisti.serie.titolo}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {dati.acquisti.serie.volumi} {dati.acquisti.serie.volumi === 1 ? "volume" : "volumi"} in un mese
                </p>
              </div>
            </Link>
          )}
        </section>
      )}

      {dati?.letti?.length > 0 && (
        <Barre titolo="Volumi letti" righe={dati.letti.map((l) => ({ ...l, valore: l.volumi }))} massimo={massimoLetti} />
      )}

      {dati?.puntate?.length > 0 && (
        <>
          <Barre titolo="Puntate viste" righe={dati.puntate.map((p) => ({ ...p, valore: p.puntate }))} massimo={massimoPuntate} />

          {dati.anime && (
            <Link to={`/videoteca/${dati.anime.id}`} className="mt-4 flex items-center gap-4 rounded-3xl bg-alcove p-4">
              <Copertina src={dati.anime.copertina} />
              <div className="min-w-0">
                <p className="text-xs text-brass-300">La serie più guardata</p>
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

function Copertina({ src }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 256);

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" onError={dopoIlRipiego(() => setRotta(true))} className="h-24 w-[68px] shrink-0 rounded-xl object-cover" />
  ) : (
    <span aria-hidden="true" className="h-24 w-[68px] shrink-0 rounded-xl bg-glass-2" />
  );
}
