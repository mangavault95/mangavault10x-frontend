import { useCallback, useRef, useState } from "react";
import { getToken, login as accedi, registrazione as chiediAccount } from "../services/api";
import { ContestoAccesso } from "./accesso";
import { useSessione } from "./sessione";
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

const CAMPO =
  "w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60";

const ETICHETTA =
  "mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted";

export function ModuloAccesso({
  onRiuscito,
  onAnnulla,
  motivo = "Per salvare questa modifica.",
  modoIniziale = "accesso"
}) {
  // Tre schermate nello stesso riquadro: entra, chiedi di entrare, e
  // "ho chiesto, adesso aspetta". La terza non è un dettaglio: senza,
  // chi si registra resta davanti a un modulo che sembra non aver
  // fatto niente, e riprova.
  const [modo, setModo] = useState(modoIniziale);

  const { entra } = useSessione();
  const [utente, setUtente] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(false);
  const velo = useChiusuraVelo(onAnnulla);

  async function invia(e) {
    e.preventDefault();

    setInCorso(true);
    setErrore(null);

    try {
      if (modo === "registrazione") {
        await chiediAccount({ username: utente, nickname, password });
        setModo("inviata");
        return;
      }

      const esito = await accedi(utente, password);

      if (esito?.token) {
        entra(esito.utente);
        onRiuscito();
      } else {
        setErrore("Credenziali non valide.");
      }
    } catch (e2) {
      setErrore(messaggioDi(e2, modo));
    } finally {
      setInCorso(false);
    }
  }

  if (modo === "inviata") {
    return (
      <div
        className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-5 backdrop-blur-sm animate-rise-in"
        {...velo}
      >
        <div className="w-full max-w-sm space-y-4 rounded-panel border border-hairline bg-glass-3 p-6 shadow-float backdrop-blur-2xl">
          <h2 className="font-display text-lg font-semibold text-ink-bright">
            Richiesta inviata
          </h2>

          <p className="text-sm text-ink-muted">
            Adesso tocca al proprietario della biblioteca accettarti. Quando
            l'avrà fatto potrai entrare con lo stesso nome e la stessa
            password — e avrai i tuoi voti e le tue letture, separate dalle sue.
          </p>

          <button
            type="button"
            onClick={onAnnulla}
            className="w-full rounded-card bg-brass-400 px-4 py-2.5 text-sm font-semibold text-void transition-all duration-quick ease-settle hover:brightness-110 active:scale-95"
          >
            Ho capito
          </button>
        </div>
      </div>
    );
  }

  const registrazione = modo === "registrazione";

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
            {registrazione ? "Chiedi di entrare" : "Serve l'accesso"}
          </h2>

          <p className="mt-1 text-sm text-ink-muted">
            {registrazione
              ? "Scegli un nome e un soprannome: il soprannome è quello che comparirà accanto ai tuoi voti."
              : motivo}
          </p>
        </div>

        <label className="block">
          <span className={ETICHETTA}>Utente</span>

          <input
            value={utente}
            onChange={(e) => setUtente(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            className={CAMPO}
          />
        </label>

        {registrazione && (
          <label className="block">
            <span className={ETICHETTA}>Soprannome</span>

            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoComplete="nickname"
              required
              maxLength={20}
              placeholder="Come vuoi essere chiamata"
              className={CAMPO}
            />
          </label>
        )}

        <label className="block">
          <span className={ETICHETTA}>Password</span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={registrazione ? "new-password" : "current-password"}
            required
            minLength={registrazione ? 8 : undefined}
            className={CAMPO}
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
            {inCorso ? "Un attimo…" : registrazione ? "Invia la richiesta" : "Entra"}
          </button>

          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-card px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
          >
            Annulla
          </button>
        </div>

        {/* La seconda porta. Sta qui e non altrove perché è qui che
            uno scopre di non avere un account: davanti al modulo che
            gli chiede una password che non ha. */}
        <p className="border-t border-hairline pt-3 text-center text-sm text-ink-muted">
          {registrazione ? "Hai già un accesso?" : "Non hai un accesso?"}{" "}
          <button
            type="button"
            onClick={() => {
              setErrore(null);
              setModo(registrazione ? "accesso" : "registrazione");
            }}
            className="font-medium text-brass-400 underline decoration-brass-400/30 underline-offset-2 hover:decoration-brass-400"
          >
            {registrazione ? "Entra" : "Registrati"}
          </button>
        </p>
      </form>
    </div>
  );
}

/**
 * Perché non sei entrato, detto a chi legge.
 *
 * Il caso che conta è il 403 con `motivo: in_attesa`: la password è
 * giusta, manca solo il permesso. Confonderlo con "credenziali errate"
 * manderebbe qualcuno a riscrivere all'infinito una password che va
 * benissimo.
 */
function messaggioDi(errore, modo) {
  if (errore?.status === 401) return "Credenziali non valide.";

  if (errore?.status === 403 || errore?.status === 400 || errore?.status === 429) {
    return errore.message || "Non è stato possibile.";
  }

  return modo === "registrazione"
    ? "Non sono riuscito a mandare la richiesta."
    : "Il server non risponde.";
}
