import { annullaPush, getChiavePush, iscriviPush } from "../services/api";

/**
 * Le notifiche push dall'app installata.
 *
 * Il browser dà a ogni dispositivo un indirizzo su un servizio del suo
 * produttore; lo si manda al nostro server (`iscriviPush`) e da lì in poi il
 * server può scrivere a quel dispositivo anche a app chiusa. Qui c'è la parte
 * del browser: che cosa si può fare qui, il permesso, l'iscrizione.
 *
 * ⚠️ CHE COSA SI PUÒ FARE DOVE
 *
 *   iPhone   solo dall'app AGGIUNTA ALLA SCHERMATA HOME (iOS 16.4 o più nuovo):
 *            da Safari normale le notifiche non esistono, e `Notification`
 *            non c'è nemmeno. Per questo c'è lo stato «serve_installazione»:
 *            dire come si fa è meglio di un interruttore che non fa niente.
 *   altrove  da browser e da app installata.
 *   sviluppo il guardiano offline (`public/sw.js`) non si registra, e le
 *            notifiche passano da lui: in sviluppo non funzionano. È voluto.
 *
 * Il permesso si chiede SOLO dal tocco di una persona (`attiva`): Safari lo
 * rifiuta altrimenti, e un permesso chiesto all'apertura è il modo più sicuro
 * di farselo negare per sempre.
 */

export const STATI = {
  /** Il server non ha le chiavi: niente da mostrare. */
  SPENTO: "spento",
  /** Il browser non sa farlo. */
  NON_SUPPORTATO: "non_supportato",
  /** iPhone/iPad fuori dall'app installata. */
  SERVE_INSTALLAZIONE: "serve_installazione",
  /** Il permesso è stato negato: si cambia dalle impostazioni del sistema. */
  NEGATO: "negato",
  DISATTIVO: "disattivo",
  ATTIVO: "attivo"
};

const eIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS si presenta come un Mac con lo schermo tattile.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const installata = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

const sa = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Il guardiano pronto, o un errore dopo qualche secondo: in sviluppo non arriva mai. */
function guardiano() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rifiuta) =>
      setTimeout(() => rifiuta(new Error("Le notifiche funzionano solo nella versione pubblicata del sito.")), 4000)
    )
  ]);
}

/** La chiave VAPID arriva in base64url; il browser la vuole in byte. */
function inByte(base64url) {
  const riempita = base64url + "=".repeat((4 - (base64url.length % 4)) % 4);
  const grezzo = atob(riempita.replace(/-/g, "+").replace(/_/g, "/"));

  return Uint8Array.from(grezzo, (c) => c.charCodeAt(0));
}

/** In che stato è questo dispositivo, adesso. */
export async function statoPush() {
  // Prima la domanda al server: se non ha le chiavi, il resto non conta.
  try {
    await getChiavePush();
  } catch (errore) {
    if (errore?.status === 404) return STATI.SPENTO;

    // Un guasto passeggero non deve far sparire l'interruttore per sempre, ma
    // nemmeno farlo comparire: ci si riprova alla prossima apertura.
    return STATI.SPENTO;
  }

  if (!sa()) return eIOS() && !installata() ? STATI.SERVE_INSTALLAZIONE : STATI.NON_SUPPORTATO;

  if (Notification.permission === "denied") return STATI.NEGATO;

  try {
    const registrazione = await guardiano();
    const sottoscrizione = await registrazione.pushManager.getSubscription();

    return sottoscrizione ? STATI.ATTIVO : STATI.DISATTIVO;
  } catch {
    return STATI.DISATTIVO;
  }
}

/**
 * Chiede il permesso, iscrive il dispositivo e lo dice al server.
 * Da chiamare dal tocco di un bottone, mai da un effetto.
 */
export async function attivaPush() {
  const permesso = await Notification.requestPermission();

  if (permesso !== "granted") {
    throw new Error(
      permesso === "denied"
        ? "Il permesso è stato negato: si cambia dalle impostazioni del dispositivo."
        : "Il permesso non è stato dato."
    );
  }

  const registrazione = await guardiano();
  const { chiave } = await getChiavePush();

  const sottoscrizione =
    (await registrazione.pushManager.getSubscription()) ||
    (await registrazione.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: inByte(chiave)
    }));

  await iscriviPush(sottoscrizione.toJSON());
}

/** Toglie il dispositivo dal server e dal browser. */
export async function disattivaPush() {
  const registrazione = await guardiano();
  const sottoscrizione = await registrazione.pushManager.getSubscription();

  if (!sottoscrizione) return;

  // Prima il server: se la richiesta fallisce, la sottoscrizione resta com'è e
  // il bottone dice ancora «attive», invece di un dispositivo che il server
  // continua a chiamare ma che il browser ha già dimenticato.
  await annullaPush(sottoscrizione.endpoint);
  await sottoscrizione.unsubscribe();
}

