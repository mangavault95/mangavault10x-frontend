import { createContext, useContext } from "react";

/**
 * Chi sta usando il sito.
 *
 * Prima non era una domanda: c'era una password e serviva solo a
 * salvare. Adesso i lettori sono due, la collezione è una sola ma i
 * voti e le letture no, e "chi sei" decide cosa vedi — non solo cosa
 * puoi toccare.
 *
 * Sta in un file a parte dal provider per la stessa ragione di
 * `collezione.js` e `accesso.js`: un modulo che esporta un componente e
 * delle funzioni insieme spegne l'aggiornamento a caldo di Vite.
 */

export const ContestoSessione = createContext(null);

export function useSessione() {
  const contesto = useContext(ContestoSessione);

  if (!contesto) {
    throw new Error("useSessione va usato dentro <SessioneProvider>");
  }

  return contesto;
}

/* ==================================================
   CHI SONO, PRIMA DI REACT
   ================================================== */

const CHIAVE = "mangavault:utente";

/**
 * L'utente ricordato dall'ultima visita.
 *
 * Serve fuori da React: `anticipo.js` chiede la collezione prima che
 * l'applicazione esista, e deve già sapere di chi chiedere i voti.
 * Il token è la verità (è firmato), questo è la sua carta d'identità
 * leggibile: gli stessi dati, ma senza doverlo decodificare a ogni
 * render.
 */
export function utenteRicordato() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);

    if (!grezzo) return null;

    const utente = JSON.parse(grezzo);

    return utente?.id ? utente : null;
  } catch {
    return null;
  }
}

export function ricordaUtente(utente) {
  try {
    if (utente?.id) {
      localStorage.setItem(CHIAVE, JSON.stringify(utente));
    } else {
      localStorage.removeItem(CHIAVE);
    }
  } catch {
    /* archiviazione non disponibile: la sessione dura quanto la scheda */
  }
}

/**
 * L'utente scritto dentro il token.
 *
 * Il token è firmato dal server: qui lo si legge, non lo si verifica —
 * verificarlo è un lavoro che spetta al server a ogni richiesta. Quello
 * che si guadagna leggendolo è sapere chi sei senza chiederlo, e
 * accorgersi che è scaduto senza aspettare un errore.
 */
export function utenteDalToken(token) {
  if (!token) return null;

  try {
    const parte = token.split(".")[1];

    if (!parte) return null;

    // Il giro da byte a testo serve per i soprannomi con gli accenti:
    // `atob` restituisce byte, e leggerli come caratteri farebbe di
    // "Ilaria è" una parola con dentro un carattere rotto.
    const byte = atob(parte.replace(/-/g, "+").replace(/_/g, "/"));

    const json = decodeURIComponent(
      Array.from(byte, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
    );

    const dati = JSON.parse(json);

    if (dati.exp && dati.exp * 1000 < Date.now()) return null;

    return {
      // Numero, sempre.
      //
      // Postgres consegna i `bigint` come stringhe, e da lì
      // l'identificativo finiva nel token così com'era: `"1"`. Tutto il
      // sito però confronta con `===` — il voto di chi guarda, il tasto
      // "Togli" sulla propria nota — e `"1" === 1` è falso. Effetto:
      // una stella appena cliccata che non si riaccende, e note proprie
      // che sembrano di un altro. Va convertito qui e non solo dove il
      // token si firma, perché i token durano trenta giorni: quelli già
      // in giro portano ancora la stringa.
      id: dati.id == null ? null : Number(dati.id),
      username: dati.user ?? null,
      nickname: dati.nickname || dati.user || "Tu",
      ruolo: dati.role ?? "lettore",
      proprietario: Boolean(dati.proprietario)
    };
  } catch {
    return null;
  }
}
