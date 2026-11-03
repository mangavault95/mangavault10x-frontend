import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useAccessoProtetto } from "../dati/accesso";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import { euro } from "../dati/serie";
import { dopoIlRipiego, getUsciteArchivio, registraAcquisto, urlCopertina } from "../services/api";

/**
 * SPESA — la lista per lo «spesone» unico (03/11/2026).
 *
 * Il ciclo va dall'8 di un mese all'8 del successivo: il riepilogo di
 * Telegram arriva l'8 e racconta proprio questo periodo, e la spesa si fa
 * quel giorno. Qui lo stesso elenco è spuntabile: tocchi un volume quando
 * lo metti nel carrello e in fondo vedi quanto spendi; «Registra» scrive
 * gli acquisti spuntati come fa il bot.
 *
 * Le spunte stanno solo in questo telefono (localStorage): servono per il
 * giro in fumetteria, non sono dati da conservare. I volumi non ancora
 * usciti restano fuori dal totale e si contano in fondo.
 */

const CHIAVE = "mv-spesa-spunte";

const oggiInItalia = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

const spostaMese = (mese, di) => {
  const [anno, numero] = mese.split("-").map(Number);

  return new Date(Date.UTC(anno, numero - 1 + di, 1)).toISOString().slice(0, 7);
};

/** L'8 che chiude il ciclo in corso e quello che lo apre. */
function ciclo(oggi) {
  const meseOggi = oggi.slice(0, 7);
  const fineMese = oggi <= `${meseOggi}-08` ? meseOggi : spostaMese(meseOggi, 1);

  return { dopo: `${spostaMese(fineMese, -1)}-08`, fino: `${fineMese}-08`, mesi: [spostaMese(fineMese, -1), fineMese] };
}

function leggiSpunte() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHIAVE) || "[]"));
  } catch {
    return new Set();
  }
}

function salvaSpunte(insieme) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify([...insieme]));
  } catch {
    // Senza memoria del browser la lista funziona lo stesso, solo non si ricorda.
  }
}

export default function SpesaPage() {
  const eseguiProtetto = useAccessoProtetto();
  const [oggi] = useState(oggiInItalia);
  const { dopo, fino, mesi } = useMemo(() => ciclo(oggi), [oggi]);

  const { dati, errore, inCorso, ricarica } = useRisorsa(async () => {
    const risposte = await Promise.all(mesi.map((m) => getUsciteArchivio(m)));

    return risposte.flatMap((r) => r.uscite || []);
  });

  const [spunte, setSpunte] = useState(leggiSpunte);
  const [registrando, setRegistrando] = useState(false);
  const [problema, setProblema] = useState(null);
  const [nota, setNota] = useState(null);

  const chiave = (u) => `${u.serie.id}:${u.numero}`;

  const { daPrendere, inArrivo } = useMemo(() => {
    const nelCiclo = (dati || []).filter((u) => u.data > dopo && u.data <= fino && u.stato !== "gia");

    return {
      daPrendere: nelCiclo.filter((u) => u.data <= oggi),
      inArrivo: nelCiclo.filter((u) => u.data > oggi)
    };
  }, [dati, dopo, fino, oggi]);

  const scelti = daPrendere.filter((u) => spunte.has(chiave(u)));
  const totale = scelti.reduce((somma, u) => somma + (u.serie.prezzo_stimato || 0), 0);

  function alterna(u) {
    setSpunte((prima) => {
      const dopoLaSpunta = new Set(prima);
      const k = chiave(u);

      if (dopoLaSpunta.has(k)) dopoLaSpunta.delete(k);
      else dopoLaSpunta.add(k);

      salvaSpunte(dopoLaSpunta);

      return dopoLaSpunta;
    });
  }

  function tuttiOnessuno() {
    const prossime = scelti.length === daPrendere.length ? new Set() : new Set(daPrendere.map(chiave));

    salvaSpunte(prossime);
    setSpunte(prossime);
  }

  async function registra() {
    setProblema(null);
    setNota(null);
    setRegistrando(true);

    // Uno alla volta e in ordine di numero: se uno fallisce, i precedenti
    // sono già scritti e si sa dove ci si è fermati.
    const fatti = [];

    try {
      for (const u of [...scelti].sort((a, b) => a.serie.id - b.serie.id || a.numero - b.numero)) {
        await eseguiProtetto(() => registraAcquisto(u.serie.id, { volumi: [u.numero] }));
        fatti.push(chiave(u));
      }

      setNota(`${fatti.length} ${fatti.length === 1 ? "volume registrato" : "volumi registrati"}.`);
    } catch (e) {
      if (!e?.annullato) setProblema("Qualcosa non è andato: i volumi già registrati sono tolti dalla lista.");
    } finally {
      const rimaste = new Set([...spunte].filter((k) => !fatti.includes(k)));

      salvaSpunte(rimaste);
      setSpunte(rimaste);
      setRegistrando(false);

      if (fatti.length > 0) ricarica();
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-32 pt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brass-300">Spesone</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink-bright">La spesa</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Usciti dall'{Number(dopo.slice(8))}/{Number(dopo.slice(5, 7))} all'{Number(fino.slice(8))}/{Number(fino.slice(5, 7))}.
        Tocca i volumi che prendi.
      </p>

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

      {dati && daPrendere.length === 0 && (
        <div className="mt-6">
          <Vuoto
            titolo="Sei in pari"
            testo={inArrivo.length > 0 ? `Niente da prendere per ora. Ne escono ancora ${inArrivo.length} prima dell'8.` : "Non c'è niente da prendere in questo ciclo."}
          />
        </div>
      )}

      {daPrendere.length > 0 && (
        <>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-ink-muted">{daPrendere.length} da prendere</p>
            <button type="button" onClick={tuttiOnessuno} className="text-xs font-semibold text-brass-300">
              {scelti.length === daPrendere.length ? "Togli tutti" : "Spunta tutti"}
            </button>
          </div>

          <ul className="mt-2 space-y-2">
            {daPrendere.map((u) => (
              <li key={chiave(u)}>
                <Riga u={u} spuntato={spunte.has(chiave(u))} onToggle={() => alterna(u)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {inArrivo.length > 0 && daPrendere.length > 0 && (
        <p className="mt-6 text-xs text-ink-faint">
          {inArrivo.length} {inArrivo.length === 1 ? "volume esce" : "volumi escono"} ancora prima dell'8: non sono nel totale.{" "}
          <Link to="/uscite" className="text-brass-300">
            Vedi le uscite
          </Link>
        </p>
      )}

      {problema && <p className="mt-4 text-sm text-ember">{problema}</p>}
      {nota && <p className="mt-4 text-sm text-jade">{nota}</p>}

      {scelti.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-alcove/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-ink-bright">{totale > 0 ? euro(totale) : "—"}</p>
              <p className="text-xs text-ink-muted">
                {scelti.length} {scelti.length === 1 ? "volume" : "volumi"} · stima
              </p>
            </div>
            <button
              type="button"
              onClick={registra}
              disabled={registrando}
              className="rounded-full bg-brass-400 px-5 py-2.5 text-sm font-bold text-void disabled:opacity-60"
            >
              {registrando ? "Registro…" : "Presi, registra"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Riga({ u, spuntato, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={spuntato}
      className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors duration-quick ${
        spuntato ? "bg-brass-400/15 ring-1 ring-brass-400/50" : "bg-alcove"
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
          spuntato ? "border-brass-400 bg-brass-400 text-void" : "border-hairline text-transparent"
        }`}
      >
        ✓
      </span>
      <Copertina src={u.copertina || u.serie.copertina} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-bold leading-tight text-ink-bright">
          {u.serie.titolo} {u.numero}
        </p>
        <p className="truncate text-xs text-ink-muted">
          {[u.editore, u.serie.edizione, u.serie.prezzo_stimato ? euro(u.serie.prezzo_stimato) : null].filter(Boolean).join(" · ")}
        </p>
        {u.stato === "manca" && (
          <p className="mt-0.5 text-xs font-semibold text-ember">
            prima te ne {u.mancanti === 1 ? "manca 1" : `mancano ${u.mancanti}`}
          </p>
        )}
      </div>
    </button>
  );
}

function Copertina({ src }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 128);

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" loading="lazy" onError={dopoIlRipiego(() => setRotta(true))} className="h-14 w-10 shrink-0 rounded-lg object-cover" />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-lg bg-glass-2" />
  );
}
