import { useState } from "react";
import { Bottone } from "./Controlli";
import { useSessione } from "../dati/sessione";
import { decidiAccesso } from "../services/api";
import { dataIt } from "../dati/serie";

/**
 * Chi ha bussato.
 *
 * È la notifica di cui parlava la richiesta: qualcuno si è registrato e
 * aspetta il permesso. Non è un avviso che salta addosso — arriva come
 * una pallina sulla voce Gestione e diventa questo riquadro quando ci
 * si entra. Una richiesta di accesso non è urgente; deve solo essere
 * impossibile non vederla.
 *
 * Accettare dà la VIDEOTECA: la propria pagina, le spunte, i voti
 * agli anime, il Cineforum. Non dà la biblioteca — quella si apre a
 * mano, qui sotto, in «Chi entra in biblioteca», ed è una decisione
 * separata perché è di un'altra natura: la videoteca è di chi ce
 * l'ha, la collezione di carta è di chi la compra.
 *
 * Decidere resta del proprietario e solo suo — vedi
 * `requireProprietario` sul server. Per questo il riquadro non
 * compare a chi è stato accettato: non è una schermata che si eredita.
 */
export default function RichiesteAccesso() {
  const { utente, richieste, ricaricaRichieste } = useSessione();
  const [inCorso, setInCorso] = useState(null);
  const [errore, setErrore] = useState(null);
  const [esito, setEsito] = useState(null);

  if (!utente?.proprietario) return null;
  if (!richieste.length && !esito) return null;

  async function decidi(richiesta, approva) {
    setInCorso(richiesta.id);
    setErrore(null);

    try {
      await decidiAccesso(richiesta.id, approva);

      setEsito(
        approva
          ? `${richiesta.nickname} adesso può entrare: ha una videoteca sua, che parte da zero. La biblioteca la vede e basta — se la vuoi aprire anche a ${richiesta.nickname}, il posto è qui sotto.`
          : `Richiesta di ${richiesta.nickname} rifiutata.`
      );

      await ricaricaRichieste();
    } catch {
      setErrore("Non sono riuscito a rispondere alla richiesta.");
    } finally {
      setInCorso(null);
    }
  }

  return (
    <section
      aria-label="Richieste di accesso"
      className="mb-8 rounded-panel border border-brass-400/40 bg-brass-400/[0.07] p-5 backdrop-blur-xl"
    >
      <h2 className="font-display text-lg font-semibold text-ink-bright">
        {richieste.length
          ? `${richieste.length === 1 ? "Una persona" : `${richieste.length} persone`} ${
              richieste.length === 1 ? "ha" : "hanno"
            } chiesto di entrare`
          : "Richieste di accesso"}
      </h2>

      {esito && <p className="mt-2 text-sm text-jade">{esito}</p>}
      {errore && (
        <p role="alert" className="mt-2 text-sm text-ember">
          {errore}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {richieste.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-glass-1 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink-bright">{r.nickname}</p>

              <p className="text-xs text-ink-muted">
                videoteca come <span className="font-numeric">{r.username}</span>
                {r.creatoIl ? ` · ${dataIt(r.creatoIl)}` : ""}
              </p>
            </div>

            <div className="flex gap-2">
              <Bottone
                onClick={() => decidi(r, true)}
                disabled={inCorso === r.id}
              >
                {inCorso === r.id ? "Un attimo…" : "Accetta"}
              </Bottone>

              <Bottone
                variante="fantasma"
                onClick={() => decidi(r, false)}
                disabled={inCorso === r.id}
              >
                Rifiuta
              </Bottone>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
