import { useCallback, useEffect, useMemo, useState } from "react";
import {
  esci as buttaViaLaSessione,
  getLettori,
  getRichiesteAccesso,
  getToken
} from "../services/api";
import {
  ContestoSessione,
  ricordaUtente,
  utenteDalToken,
  utenteRicordato
} from "./sessione";

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
 * E una quarta, arrivata con la 018: `inBiblioteca`, cioè se questa
 * stanza è tua o la stai solo guardando. Registrarsi dà la videoteca;
 * la biblioteca la apre il proprietario a mano.
 *
 * La verità su chi sei sta nel token, che è firmato dal server: qui lo
 * si legge soltanto. Se è scaduto non sei nessuno, e il sito torna a
 * mostrare la biblioteca del proprietario come fa con chiunque passi.
 */
export function SessioneProvider({ children }) {
  // Chi sei lo dice il token, perché è firmato. Ma il token non dice
  // se la biblioteca è tua — quello è un permesso che può cambiare
  // mentre il token è ancora buono — e quel pezzo si recupera da come
  // era all'ultimo accesso, in attesa che il server lo confermi.
  const [utente, setUtente] = useState(() => {
    const daToken = utenteDalToken(getToken());

    if (!daToken) return null;

    const ricordato = utenteRicordato();

    return ricordato?.id === daToken.id
      ? { ...daToken, biblioteca: ricordato.biblioteca }
      : daToken;
  });
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
   * Chi ha una biblioteca sua.
   *
   * Le registrazioni valgono per la videoteca: chi entra da lì, di qua,
   * guarda e basta. Chi invece è di casa lo dice il server nell'elenco
   * dei lettori — NON il token, che dura trenta giorni e direbbe il
   * permesso di un mese fa.
   *
   * Finché l'elenco non è arrivato vale quello che si sapeva
   * all'ultimo accesso (`utente.biblioteca`, che il login mette da
   * parte): è la stessa risposta, solo più vecchia di un istante, e
   * serve a non far lampeggiare i voti di un altro sulla prima
   * schermata.
   */
  const inBiblioteca = useMemo(() => {
    if (!utente?.id) return false;
    if (utente.proprietario) return true;

    const suElenco = lettori.find((l) => l.id === utente.id);

    if (suElenco) return Boolean(suElenco.biblioteca);

    return utente.biblioteca !== false;
  }, [utente, lettori]);

  /**
   * Di chi sono i dati che si stanno guardando.
   *
   * Non è `utente.id`: chi non è entrato vede la biblioteca del
   * proprietario, e quel numero serve a sapere quale voto accendere e
   * quali letture chiedere. Da quando la biblioteca è di casa vale lo
   * stesso per chi è entrato ma di qua sta solo guardando — è la
   * stessa regola del server (`lettoreBiblioteca`), e le due devono
   * dire la stessa cosa o il browser accenderebbe una stella che il
   * server attribuisce a un altro.
   */
  const idVisto = useMemo(() => {
    if (utente?.id && inBiblioteca) return utente.id;

    return lettori.find((l) => l.proprietario)?.id ?? null;
  }, [utente, inBiblioteca, lettori]);

  /**
   * Chi in biblioteca ci ha qualcosa di suo: è chi può comparire
   * accanto a un voto o dentro il filtro «lette da».
   *
   * Gli altri non sono lettori di questa stanza, e mostrarli
   * prometterebbe una colonna che resterebbe vuota per sempre.
   */
  const lettoriBiblioteca = useMemo(
    () => lettori.filter((l) => l.biblioteca !== false),
    [lettori]
  );

  const valore = useMemo(
    () => ({
      utente,
      idVisto,
      inBiblioteca,
      // Il modo in cui la domanda si fa quasi sempre: «devo nascondere
      // i comandi?». Chi non è entrato NON è in sola lettura — per lui
      // il bottone c'è e apre l'accesso, come è sempre stato.
      bibliotecaSolaLettura: Boolean(utente?.id) && !inBiblioteca,
      lettori,
      lettoriBiblioteca,
      richieste,
      ricaricaRichieste,
      entra,
      esci
    }),
    [
      utente,
      idVisto,
      inBiblioteca,
      lettori,
      lettoriBiblioteca,
      richieste,
      ricaricaRichieste,
      entra,
      esci
    ]
  );

  return <ContestoSessione.Provider value={valore}>{children}</ContestoSessione.Provider>;
}
