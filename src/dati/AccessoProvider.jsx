import { useCallback, useRef, useState } from "react";
import { getToken, login as accedi } from "../services/api";
import { ContestoAccesso } from "./accesso";
import useChiusuraVelo from "../ui/useChiusuraVelo";

/**
 * Rende possibile scrivere sulla collezione da qualunque punto del
 * sito, senza passare dalla pagina Gestione.
 *
 * Il sito resta a un solo utente con scrittura protetta — questo non
 * cambia. Cambia dove si fa l'accesso: prima l'unica porta era la
 * pagina `/admin`, ora è un modulo compatto che si apre proprio sopra
 * il bottone che hai premuto, e sparisce da solo appena hai finito.
 *
 * Se il token è scaduto (il server risponde 401/403 a metà lavoro),
 * l'azione viene rifatta da sola dopo il nuovo accesso: chi ha premuto
 * "+1 volume" non deve accorgersi che la sessione era scaduta.
 */
export function AccessoProvider({ children }) {
  const [richiesta, setRichiesta] = useState(null);

  // La richiesta di login pendente vive in un ref oltre che nello
  // stato: lo stato serve a disegnare il modulo, il ref a risolverlo
  // subito quando arriva la password, senza aspettare un altro render.
  const pendente = useRef(null);

  const chiediAccesso = useCallback(
    () =>
      new Promise((risolvi, rifiuta) => {
        pendente.current = { risolvi, rifiuta };
        setRichiesta({});
      }),
    []
  );

  const chiudi = useCallback((errore) => {
    pendente.current?.rifiuta(errore || Object.assign(new Error("Annullato"), { annullato: true }));
    pendente.current = null;
    setRichiesta(null);
  }, []);

  const alSuccesso = useCallback(() => {
    pendente.current?.risolvi();
    pendente.current = null;
    setRichiesta(null);
  }, []);

  const eseguiProtetto = useCallback(
    async (azione) => {
      if (!getToken()) await chiediAccesso();

      try {
        return await azione();
      } catch (e) {
        // Il token c'era ma il server non lo accetta più: quasi
        // sempre è scaduto. Si richiede l'accesso e si riprova UNA
        // sola volta — se fallisce ancora, l'errore risale a chi ha
        // chiamato invece di aprire un accesso all'infinito.
        if (e?.status === 401 || e?.status === 403) {
          await chiediAccesso();

          return await azione();
        }

        throw e;
      }
    },
    [chiediAccesso]
  );

  return (
    <ContestoAccesso.Provider value={eseguiProtetto}>
      {children}

      {richiesta && <ModuloAccesso onRiuscito={alSuccesso} onAnnulla={() => chiudi()} />}
    </ContestoAccesso.Provider>
  );
}

/* ==================================================
   IL MODULO
   ================================================== */

function ModuloAccesso({ onRiuscito, onAnnulla }) {
  const [utente, setUtente] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(false);
  const velo = useChiusuraVelo(onAnnulla);

  async function invia(e) {
    e.preventDefault();

    setInCorso(true);
    setErrore(null);

    try {
      const esito = await accedi(utente, password);

      if (esito?.token) {
        onRiuscito();
      } else {
        setErrore("Credenziali non valide.");
      }
    } catch (e2) {
      setErrore(e2?.status === 401 ? "Credenziali non valide." : "Il server non risponde.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-5 backdrop-blur-sm animate-rise-in"
      {...velo}
    >
      <form
        onSubmit={invia}
        className="w-full max-w-sm space-y-4 rounded-panel border border-hairline bg-glass-3 p-6 shadow-float backdrop-blur-2xl"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-bright">
            Serve l'accesso
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Per salvare questa modifica.</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Utente
          </span>

          <input
            value={utente}
            onChange={(e) => setUtente(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Password
          </span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        {errore && (
          <p role="alert" className="text-sm text-ember">
            {errore}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={inCorso}
            className="flex-1 rounded-card bg-brass-400 px-4 py-2.5 text-sm font-semibold text-void transition-all duration-quick ease-settle hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            {inCorso ? "Verifico…" : "Entra"}
          </button>

          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
