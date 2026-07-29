/**
 * Cosa si vede quando non c'è ancora niente da vedere.
 *
 * Tre situazioni che prima finivano tutte nello stesso schermo vuoto:
 * sto caricando, non c'è nulla, qualcosa è andato storto. Distinguerle
 * è la differenza fra "aspetta un attimo" e "riprova", e un errore di
 * rete non deve più sembrare una collezione vuota.
 */

/** Scheletro con la forma della griglia: il layout non salta al termine. */
export function CaricamentoGriglia({ quante = 18 }) {
  return (
    <div
      role="status"
      aria-label="Caricamento in corso"
      className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8"
    >
      {Array.from({ length: quante }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-cover w-full rounded-card border border-hairline bg-glass-1" />
          <div className="h-3 w-4/5 rounded bg-glass-1" />
          <div className="h-3 w-2/5 rounded bg-glass-1" />
        </div>
      ))}

      <span className="sr-only">Caricamento in corso</span>
    </div>
  );
}

/** Righe grigie per gli elenchi (lettura, desideri). */
export function CaricamentoElenco({ quante = 5 }) {
  return (
    <div role="status" aria-label="Caricamento in corso" className="space-y-3">
      {Array.from({ length: quante }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-panel border border-hairline bg-glass-1"
        />
      ))}
      <span className="sr-only">Caricamento in corso</span>
    </div>
  );
}

export function Vuoto({ titolo, testo, azione }) {
  return (
    <div className="rounded-panel border border-dashed border-soft bg-glass-1 px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink-bright">{titolo}</p>

      {testo && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{testo}</p>
      )}

      {azione && <div className="mt-6 flex justify-center">{azione}</div>}
    </div>
  );
}

/**
 * L'errore dice cosa è successo e offre il modo di rimediare.
 * Il messaggio tecnico resta visibile ma in secondo piano: serve a
 * te quando qualcosa si rompe, non deve spaventare chi legge.
 */
export function Errore({ errore, riprova }) {
  const messaggio =
    errore?.status === 0
      ? "Il server non risponde. Può essere la connessione, oppure Render che si sta risvegliando: il primo caricamento dopo un periodo di inattività richiede qualche secondo."
      : "Non sono riuscito a caricare questi dati.";

  return (
    <div className="rounded-panel border border-ember/20 bg-ember/[0.06] px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink-bright">
        Qualcosa non ha funzionato
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{messaggio}</p>

      {errore?.message && (
        <p className="mt-3 font-numeric text-xs text-ink-faint">{errore.message}</p>
      )}

      {riprova && (
        <button
          onClick={riprova}
          className="mt-6 rounded-card bg-brass-400 px-5 py-2.5 text-sm font-semibold text-void transition-transform duration-quick ease-spring hover:brightness-110 active:scale-95"
        >
          Riprova
        </button>
      )}
    </div>
  );
}
