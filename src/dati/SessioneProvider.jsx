import { useCallback, useEffect, useMemo, useState } from "react";
import {
  esci as buttaViaLaSessione,
  getLettori,
  getRichiesteAccesso,
  getToken
} from "../services/api";
import { ContestoSessione, ricordaUtente, utenteDalToken } from "./sessione";

/**
 * Chi sta usando il sito, per tutto il sito.
 *
 * Tre cose stanno qui perché sono la stessa cosa vista da tre lati:
 *
 *   `utente`    chi sei (o nessuno, se stai solo guardando)
 *   `lettori`   chi può votare — servono i soprannomi per scrivere
 *               "Voto Nicer" accanto a un voto che è di qualcuno
 *   `richieste` chi ha chiesto di entrare, se sei tu a dover decidere
 *
 * La verità su chi sei sta nel token, che è firmato dal server: qui lo
 * si legge soltanto. Se è scaduto non sei nessuno, e il sito torna a
 * mostrare la biblioteca del proprietario come fa con chiunque passi.
 */
export function SessioneProvider({ children }) {
  const [utente, setUtente] = useState(() => utenteDalToken(getToken()));
  const [lettori, setLettori] = useState([]);
  const [richieste, setRichieste] = useState([]);

  // I soprannomi si chiedono una volta per visita: cambiano quando
  // qualcuno viene approvato, cioè quasi mai.
  useEffect(() => {
    let vivo = true;

    getLettori()
      .then((elenco) => {
        if (vivo) setLettori(Array.isArray(elenco) ? elenco : []);
      })
      .catch(() => {
        // Un elenco di soprannomi che non arriva non è un errore da
        // mostrare: i voti restano, perdono solo il nome accanto.
      });

    return () => {
      vivo = false;
    };
  }, []);

  const ricaricaRichieste = useCallback(() => {
    if (!utente?.proprietario) return Promise.resolve([]);

    return getRichiesteAccesso()
      .then((elenco) => {
        const lista = Array.isArray(elenco) ? elenco : [];
        setRichieste(lista);
        return lista;
      })
      .catch(() => []);
  }, [utente?.proprietario]);

  // La "notifica" è questa: appena il proprietario è riconosciuto, il
  // sito guarda se qualcuno ha bussato. Non serve altro — una
  // richiesta di accesso non è una cosa che arriva ogni minuto, e un
  // controllo a ripetizione sveglierebbe il server addormentato per
  // niente.
  const proprietario = Boolean(utente?.proprietario);

  useEffect(() => {
    if (!proprietario) return undefined;

    let vivo = true;

    getRichiesteAccesso()
      .then((elenco) => {
        if (vivo) setRichieste(Array.isArray(elenco) ? elenco : []);
      })
      .catch(() => {});

    return () => {
      vivo = false;
    };
  }, [proprietario]);

  const entra = useCallback((nuovo) => {
    const identita = nuovo?.id ? nuovo : utenteDalToken(getToken());

    ricordaUtente(identita);
    setUtente(identita);

    return identita;
  }, []);

  const esci = useCallback(() => {
    buttaViaLaSessione();
    setUtente(null);
    setRichieste([]);
  }, []);

  /**
   * Di chi sono i dati che si stanno guardando.
   *
   * Non è `utente.id`: chi non è entrato vede la biblioteca del
   * proprietario, e quel numero serve a sapere quale voto accendere e
   * quali letture chiedere.
   */
  const idVisto = useMemo(() => {
    if (utente?.id) return utente.id;

    return lettori.find((l) => l.proprietario)?.id ?? null;
  }, [utente?.id, lettori]);

  const valore = useMemo(
    () => ({
      utente,
      idVisto,
      lettori,
      richieste,
      ricaricaRichieste,
      entra,
      esci
    }),
    [utente, idVisto, lettori, richieste, ricaricaRichieste, entra, esci]
  );

  return <ContestoSessione.Provider value={valore}>{children}</ContestoSessione.Provider>;
}
