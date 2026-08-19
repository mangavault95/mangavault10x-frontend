/**
 * L'aggancio al guardiano offline (`public/sw.js`).
 *
 * Sta qui e non dentro `main.jsx` per una ragione sola: la parte
 * interessante e` *quando non* si registra. In sviluppo un service
 * worker che tiene una copia delle risorse combatte con il ricarico a
 * caldo di Vite e fa vedere codice di dieci minuti fa — quindi in
 * sviluppo non solo non si registra, ma si disinstalla quello eventuale
 * lasciato da una prova di `npm run preview` sulla stessa porta.
 */
export function agganciaServizio() {
  if (!("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrazioni) => registrazioni.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  // Il guardiano non vede le variabili di Vite: l'indirizzo dell'API
  // glielo si passa nell'indirizzo del file.
  const api = import.meta.env.VITE_API_URL ?? "";

  // Dopo il carico, non durante: registrarlo subito significa contendere
  // banda alla prima schermata, che e` esattamente quello che il
  // guardiano dovrebbe rendere piu` veloce.
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`/sw.js?api=${encodeURIComponent(api)}`)
      .catch((errore) => console.error("Service worker non registrato:", errore));
  });
}
