import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getToken, login as accedi, registrazione as chiediAccount } from "../services/api";
import { ContestoAccesso } from "./accesso";
import { useSessione } from "./sessione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import Sovrapposizione from "../ui/Sovrapposizione";
import { mondoDi } from "../app/navigation";

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
  // L'altra risposta possibile: non «chi sei» ma «questa stanza non è
  // tua». Vive qui e non nelle pagine perché ogni scrittura della
  // biblioteca passa da `eseguiProtetto`: dirlo una volta sola qui
  // significa che nessun bottone può dimenticarsene.
  const [soloVideoteca, setSoloVideoteca] = useState(null);
  // Il modulo si apre dove si stava lavorando, e deve avere i colori
  // di quel posto: su carta chiara un riquadro di vetro scuro sembra
  // un pezzo di un altro sito.
  const { pathname } = useLocation();

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
        // «Sei entrato, ma la biblioteca non è tua.» Non è un accesso
        // scaduto e non va trattato come tale: chiedere di nuovo la
        // password vorrebbe dire mandare qualcuno a riscriverla per
        // ottenere di nuovo lo stesso no.
        if (e?.motivo === "biblioteca") {
          setSoloVideoteca({ messaggio: e.message });

          // L'errore risale comunque, e SENZA `annullato`: chi ha
          // chiamato ha già cambiato lo schermo prima di scrivere (il
          // volume in più, la stella accesa) e su `annullato` non torna
          // indietro. Lasciarglielo credere vorrebbe dire un riquadro
          // che dice «non si scrive» sopra un numero appena cambiato.
          throw e;
        }

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

      {richiesta && (
        <ModuloAccesso
          mondo={mondoDi(pathname)}
          onRiuscito={alSuccesso}
          onAnnulla={() => chiudi()}
        />
      )}

      {soloVideoteca && (
        <SoloVideoteca
          messaggio={soloVideoteca.messaggio}
          onChiudi={() => setSoloVideoteca(null)}
        />
      )}
    </ContestoAccesso.Provider>
  );
}

/* ==================================================
   LA STANZA CHE NON È TUA
   ================================================== */

/**
 * Quello che si vede provando a scrivere in una biblioteca che è di
 * casa d'altri.
 *
 * Dice due cose, e la seconda conta quanto la prima: qui no, ma di là
 * sì. Un divieto senza la porta accanto è solo un muro.
 */
function SoloVideoteca({ messaggio, onChiudi }) {
  const velo = useChiusuraVelo(onChiudi);
  const veste = VESTI.biblioteca;

  return (
    <Sovrapposizione>
      <div
        className={`fixed inset-0 z-toast grid place-items-center p-5 backdrop-blur-sm animate-rise-in ${veste.velo}`}
        {...velo}
      >
        <div
          role="alertdialog"
          aria-label="La biblioteca è di casa"
          className={`w-full max-w-sm space-y-4 rounded-panel border p-6 shadow-float ${veste.riquadro}`}
        >
          <h2 className={veste.titolo}>Qui puoi solo guardare</h2>

          <p className={veste.testo}>
            {messaggio ||
              "La biblioteca è di casa: di qua si guarda, non si scrive."}{" "}
            Quello che vedi — voti, letture, note — è del proprietario.
          </p>

          <div className="flex gap-3">
            <Link
              to="/videoteca"
              onClick={onChiudi}
              className={`flex-1 text-center ${veste.principale}`}
            >
              Vai in videoteca
            </Link>

            <button type="button" onClick={onChiudi} className={veste.secondario}>
              Resto qui
            </button>
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}

/* ==================================================
   IL MODULO
   ================================================== */

/**
 * Il modulo si veste come il mondo in cui compare.
 *
 * Da quando la videoteca ha i suoi colori, lo stesso riquadro può
 * aprirsi su legno scuro o su carta chiara. Le classi stanno scritte
 * per intero e non composte a pezzi: Tailwind legge i sorgenti alla
 * lettera, e una classe formata unendo stringhe non finirebbe mai nel
 * CSS prodotto — è la stessa regola di `app/Shell.jsx`.
 */
const VESTI = {
  biblioteca: {
    velo: "bg-void/70",
    riquadro: "border-hairline bg-glass-3 backdrop-blur-2xl",
    titolo: "font-display text-lg font-semibold text-ink-bright",
    testo: "text-sm text-ink-muted",
    campo:
      "w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60",
    etichetta: "mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted",
    principale:
      "rounded-card bg-brass-400 px-4 py-2.5 text-sm font-semibold text-void transition-all duration-quick ease-settle hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    secondario:
      "rounded-card px-4 py-2.5 text-sm font-medium text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright",
    piede: "border-t border-hairline pt-3 text-center text-sm text-ink-muted",
    collegamento:
      "font-medium text-brass-400 underline decoration-brass-400/30 underline-offset-2 hover:decoration-brass-400",
    errore: "text-sm text-ember"
  },
  videoteca: {
    velo: "bg-quaderno-inchiostro/40",
    riquadro: "border-quaderno-riga bg-quaderno-foglio",
    titolo: "font-display text-lg font-semibold text-quaderno-inchiostro",
    testo: "text-sm text-quaderno-tenue",
    campo:
      "w-full rounded-card border border-quaderno-riga bg-quaderno-carta px-3.5 py-2.5 text-sm text-quaderno-inchiostro outline-none transition-colors duration-quick focus:border-quaderno-blu",
    etichetta: "mb-1.5 block text-xs font-medium uppercase tracking-wider text-quaderno-tenue",
    principale:
      "rounded-card bg-quaderno-blu px-4 py-2.5 text-sm font-semibold text-white transition-all duration-quick ease-settle hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    secondario:
      "rounded-card px-4 py-2.5 text-sm font-medium text-quaderno-tenue transition-colors duration-quick hover:bg-quaderno-carta hover:text-quaderno-inchiostro",
    piede: "border-t border-quaderno-riga pt-3 text-center text-sm text-quaderno-tenue",
    collegamento:
      "font-medium text-quaderno-blu underline decoration-quaderno-blu/30 underline-offset-2 hover:decoration-quaderno-blu",
    errore: "text-sm text-ember"
  }
};

export function ModuloAccesso({
  onRiuscito,
  onAnnulla,
  motivo = "Per salvare questa modifica.",
  modoIniziale = "accesso",
  mondo = "biblioteca"
}) {
  const veste = VESTI[mondo] || VESTI.biblioteca;
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
      <Sovrapposizione>
        <div
          className={`fixed inset-0 z-toast grid place-items-center p-5 backdrop-blur-sm animate-rise-in ${veste.velo}`}
          {...velo}
        >
          <div className={`w-full max-w-sm space-y-4 rounded-panel border p-6 shadow-float ${veste.riquadro}`}>
            <h2 className={veste.titolo}>
              Richiesta inviata
            </h2>

            <p className={veste.testo}>
              Adesso tocca al proprietario accettarti. Quando l'avrà fatto
              potrai entrare con lo stesso nome e la stessa password, e avrai
              una <strong className="font-semibold">videoteca tua</strong>: le
              tue serie, le tue spunte, i tuoi commenti nel Cineforum. La
              biblioteca dei manga resta di casa — la vedrai, com'è adesso,
              senza scriverci niente.
            </p>

            <button
              type="button"
              onClick={onAnnulla}
              className={`w-full ${veste.principale}`}
            >
              Ho capito
            </button>
          </div>
        </div>
      </Sovrapposizione>
    );
  }

  const registrazione = modo === "registrazione";

  return (
    <Sovrapposizione>
      <div
        className={`fixed inset-0 z-toast grid place-items-center p-5 backdrop-blur-sm animate-rise-in ${veste.velo}`}
        {...velo}
      >
        <form
          onSubmit={invia}
          className={`w-full max-w-sm space-y-4 rounded-panel border p-6 shadow-float ${veste.riquadro}`}
        >
          <div>
            <h2 className={veste.titolo}>
              {registrazione ? "Chiedi di entrare" : "Serve l'accesso"}
            </h2>

            <p className={`mt-1 ${veste.testo}`}>
              {registrazione
                ? "Scegli un nome e un soprannome: il soprannome è quello che comparirà accanto ai tuoi voti."
                : motivo}
            </p>
          </div>

          <label className="block">
            <span className={veste.etichetta}>Utente</span>

            <input
              value={utente}
              onChange={(e) => setUtente(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className={veste.campo}
            />
          </label>

          {registrazione && (
            <label className="block">
              <span className={veste.etichetta}>Soprannome</span>

              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoComplete="nickname"
                required
                maxLength={20}
                placeholder="Come vuoi essere chiamata"
                className={veste.campo}
              />
            </label>
          )}

          <label className="block">
            <span className={veste.etichetta}>Password</span>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={registrazione ? "new-password" : "current-password"}
              required
              minLength={registrazione ? 8 : undefined}
              className={veste.campo}
            />
          </label>

          {errore && (
            <p role="alert" className={veste.errore}>
              {errore}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={inCorso}
              className={`flex-1 ${veste.principale}`}
            >
              {inCorso ? "Un attimo…" : registrazione ? "Invia la richiesta" : "Entra"}
            </button>

            <button
              type="button"
              onClick={onAnnulla}
              className={veste.secondario}
            >
              Annulla
            </button>
          </div>

          {/* La seconda porta. Sta qui e non altrove perché è qui che
              uno scopre di non avere un account: davanti al modulo che
              gli chiede una password che non ha. */}
          <p className={veste.piede}>
            {registrazione ? "Hai già un accesso?" : "Non hai un accesso?"}{" "}
            <button
              type="button"
              onClick={() => {
                setErrore(null);
                setModo(registrazione ? "accesso" : "registrazione");
              }}
              className={veste.collegamento}
            >
              {registrazione ? "Entra" : "Registrati"}
            </button>
          </p>
        </form>
      </div>
    </Sovrapposizione>
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
