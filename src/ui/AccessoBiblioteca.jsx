import { useEffect, useState } from "react";
import { Bottone } from "./Controlli";
import { useSessione } from "../dati/sessione";
import { getUtenti, impostaAccessoBiblioteca } from "../services/api";
import { coloreLettore } from "../dati/lettori";
import { dataIt } from "../dati/serie";

/**
 * Chi entra in biblioteca.
 *
 * Registrarsi dal sito dà la VIDEOTECA: la propria pagina, le spunte,
 * il Cineforum. La biblioteca no — quella è la collezione di carta di
 * casa, e chi ci ha dentro dei voti e delle letture sue lo decide il
 * proprietario, una persona alla volta, da qui.
 *
 * Non c'è nessun altro modo di entrarci: nessuna registrazione la dà,
 * nessun ruolo la implica, e chi è appena stato accettato non può
 * darla a sé stesso. È l'unico interruttore, e sta in Gestione perché
 * è lì che si va quando si è deciso qualcosa su una persona.
 *
 * Chiudere la porta NON cancella niente: i voti e le letture di quella
 * persona restano dove sono, semplicemente smettono di comparire.
 * Riaprendola tornano tutti. È il motivo per cui questo interruttore
 * si può muovere senza paura.
 */
export default function AccessoBiblioteca() {
  const { utente } = useSessione();

  const [persone, setPersone] = useState(null);
  const [inCorso, setInCorso] = useState(null);
  const [errore, setErrore] = useState(null);

  const proprietario = Boolean(utente?.proprietario);

  useEffect(() => {
    if (!proprietario) return undefined;

    let vivo = true;

    getUtenti()
      .then((elenco) => {
        if (vivo) setPersone(Array.isArray(elenco) ? elenco : []);
      })
      .catch(() => {
        if (vivo) setErrore("Non sono riuscito a leggere l'elenco delle persone.");
      });

    return () => {
      vivo = false;
    };
  }, [proprietario]);

  if (!proprietario) return null;

  // Solo chi è già entrato: a chi aspetta una risposta si risponde
  // sopra, in «Richieste di accesso», e prima di allora non c'è
  // nessuna porta da aprire.
  const attivi = (persone || []).filter((p) => p.stato === "attivo" && !p.proprietario);

  if (persone && attivi.length === 0) return null;

  async function cambia(persona, dentro) {
    setInCorso(persona.id);
    setErrore(null);

    try {
      const { utente: aggiornata } = await impostaAccessoBiblioteca(persona.id, dentro);

      setPersone((precedenti) =>
        (precedenti || []).map((p) => (p.id === aggiornata.id ? aggiornata : p))
      );
    } catch (e) {
      setErrore(
        e?.status === 503
          ? "La migrazione 018 non è ancora stata eseguita su Supabase."
          : "Non sono riuscito a cambiare il permesso."
      );
    } finally {
      setInCorso(null);
    }
  }

  return (
    <section
      aria-label="Chi entra in biblioteca"
      className="mb-8 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl"
    >
      <h2 className="font-display text-lg font-semibold text-ink-bright">
        Chi entra in biblioteca
      </h2>

      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Iscriversi al sito dà la videoteca. La biblioteca la apri tu, a mano:
        chi ce l'ha ha voti, letture e note sue, e può correggere le schede.
        Chi non ce l'ha vede la tua, e non ci scrive niente.
      </p>

      {errore && (
        <p role="alert" className="mt-3 text-sm text-ember">
          {errore}
        </p>
      )}

      {!persone ? (
        <p className="mt-4 text-sm text-ink-faint">Carico le persone…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {attivi.map((p) => {
            const colore = coloreLettore(p.colore);

            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-glass-1 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink-bright">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${colore.pallino}`}
                    />
                    {p.nickname}
                  </p>

                  <p className="text-xs text-ink-muted">
                    {p.biblioteca
                      ? "Biblioteca e videoteca"
                      : "Solo videoteca"}
                    {p.decisoIl ? ` · accettata il ${dataIt(p.decisoIl)}` : ""}
                  </p>
                </div>

                <Bottone
                  variante={p.biblioteca ? "fantasma" : "secondario"}
                  onClick={() => cambia(p, !p.biblioteca)}
                  disabled={inCorso === p.id}
                >
                  {inCorso === p.id
                    ? "Un attimo…"
                    : p.biblioteca
                      ? "Togli la biblioteca"
                      : "Dagli la biblioteca"}
                </Bottone>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
