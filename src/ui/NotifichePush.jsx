import { useCallback, useEffect, useState } from "react";
import { STATI, attivaPush, disattivaPush, provaPush, statoPush } from "../dati/push";

/**
 * Le notifiche: un interruttore per questo dispositivo.
 *
 * Sta accanto a `SceltaTema`, negli stessi due posti (il foglio «Tu» del
 * telefono e il menu del proprio nome su schermo largo), e solo per chi è
 * entrato: una notifica ha un destinatario.
 *
 * Non compare affatto se il server non ha le chiavi, o se il browser non sa
 * ricevere notifiche: un interruttore che non può funzionare è peggio di
 * nessun interruttore. Fa eccezione l'iPhone fuori dall'app installata, dove
 * spiega come si fa — è l'unico caso in cui la persona può risolvere da sé.
 */
export default function NotifichePush({ className = "" }) {
  const [stato, setStato] = useState(null);
  const [occupato, setOccupato] = useState(false);
  const [messaggio, setMessaggio] = useState(null);

  const aggiorna = useCallback(() => statoPush().then(setStato), []);

  useEffect(() => {
    let vivo = true;

    statoPush().then((s) => {
      if (vivo) setStato(s);
    });

    return () => {
      vivo = false;
    };
  }, []);

  async function esegui(azione, riuscito) {
    setOccupato(true);
    setMessaggio(null);

    try {
      await azione();
      if (riuscito) setMessaggio({ testo: riuscito });
    } catch (errore) {
      setMessaggio({ testo: errore?.message || "Non è andata: riprova.", errore: true });
    } finally {
      await aggiorna();
      setOccupato(false);
    }
  }

  if (!stato || stato === STATI.SPENTO || stato === STATI.NON_SUPPORTATO) return null;

  const bottone =
    "min-h-11 rounded-card px-3.5 text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400";

  return (
    <div className={className}>
      <p className="mb-1.5 px-1 font-numeric text-micro uppercase tracking-[0.16em] text-ink-muted">Notifiche</p>

      <div className="space-y-2 rounded-card bg-shelf p-3">
        {stato === STATI.SERVE_INSTALLAZIONE && (
          <p className="text-sm text-ink">
            Per ricevere le notifiche su iPhone aggiungi MangaVault alla schermata Home: tocca Condividi, poi «Aggiungi a
            Home», e riaprilo da lì.
          </p>
        )}

        {stato === STATI.NEGATO && (
          <p className="text-sm text-ink">
            Le notifiche sono bloccate per questo sito. Si riaccendono dalle impostazioni del dispositivo.
          </p>
        )}

        {stato === STATI.DISATTIVO && (
          <>
            <p className="text-sm text-ink">
              Ti avviso quando esce una puntata delle serie che stai guardando, e la mattina con quelle di oggi.
            </p>

            <button
              type="button"
              disabled={occupato}
              onClick={() => esegui(attivaPush)}
              className={`${bottone} insegna`}
            >
              {occupato ? "Un momento…" : "Attiva le notifiche"}
            </button>
          </>
        )}

        {stato === STATI.ATTIVO && (
          <>
            <p className="text-sm text-ink">Notifiche attive su questo dispositivo.</p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={occupato}
                onClick={() => esegui(provaPush, "Prova inviata: dovrebbe arrivare fra un attimo.")}
                className={`${bottone} bg-glass-2 text-ink-bright`}
              >
                Invia una prova
              </button>

              <button
                type="button"
                disabled={occupato}
                onClick={() => esegui(disattivaPush, "Notifiche spente su questo dispositivo.")}
                className={`${bottone} border border-hairline text-ink-muted`}
              >
                Disattiva
              </button>
            </div>
          </>
        )}

        {messaggio && (
          <p role={messaggio.errore ? "alert" : "status"} className={`text-xs ${messaggio.errore ? "text-ember" : "text-ink-muted"}`}>
            {messaggio.testo}
          </p>
        )}
      </div>
    </div>
  );
}
