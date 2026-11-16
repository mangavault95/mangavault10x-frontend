import { useState } from "react";
import { Link } from "react-router";
import { Bottone } from "../ui/Controlli";
import { resetPassword } from "../services/api";

/**
 * Scegliere una nuova password con il link ricevuto dal proprietario.
 *
 * Il segreto sta nel frammento dell'indirizzo (`#…`): il browser non lo
 * manda a nessun server e non finisce nei log. Una volta letto lo si
 * toglie dalla barra.
 */
export default function ResetPasswordPage() {
  const [token] = useState(() => {
    const t = window.location.hash.replace(/^#/, "");

    if (t) window.history.replaceState(null, "", window.location.pathname);

    return t;
  });
  const [password, setPassword] = useState("");
  const [ripeti, setRipeti] = useState("");
  const [errore, setErrore] = useState(null);
  const [fatto, setFatto] = useState(false);
  const [inCorso, setInCorso] = useState(false);

  async function invia(e) {
    e.preventDefault();
    setErrore(null);

    if (password !== ripeti) return setErrore("Le due password non coincidono.");

    setInCorso(true);

    try {
      await resetPassword(token, password);
      setFatto(true);
    } catch (err) {
      setErrore(err?.message || "Non sono riuscito a cambiare la password.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="grid min-h-[70dvh] place-items-center px-5">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl font-semibold text-ink-bright">Nuova password</h1>

        {fatto ? (
          <>
            <p className="text-sm text-jade">Fatto: la password è cambiata. Adesso puoi entrare.</p>
            <Link to="/">
              <Bottone>Vai al sito</Bottone>
            </Link>
          </>
        ) : !token ? (
          <p className="text-sm text-ink-muted">
            Manca il link. Chiedi al proprietario di generarne uno nuovo.
          </p>
        ) : (
          <form onSubmit={invia} className="space-y-4">
            <label className="block text-sm text-ink-muted">
              Nuova password (almeno 8 caratteri)
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-card border border-hairline bg-glass-1 px-3 py-2.5 text-ink-bright"
              />
            </label>

            <label className="block text-sm text-ink-muted">
              Ripetila
              <input
                type="password"
                autoComplete="new-password"
                value={ripeti}
                onChange={(e) => setRipeti(e.target.value)}
                className="mt-1 w-full rounded-card border border-hairline bg-glass-1 px-3 py-2.5 text-ink-bright"
              />
            </label>

            {errore && (
              <p role="alert" className="text-sm text-ember">
                {errore}
              </p>
            )}

            <Bottone type="submit" disabled={inCorso || !password}>
              {inCorso ? "Un attimo…" : "Cambia password"}
            </Bottone>
          </form>
        )}
      </div>
    </div>
  );
}
