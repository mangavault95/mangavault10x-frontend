import { Component } from "react";

/**
 * Cosa si vede quando il codice di una pagina non arriva mai.
 *
 * Serve da quando il sito si può installare sul telefono. Ogni pagina è
 * un file a sé, scaricato la prima volta che ci si va: senza rete —
 * l'app aperta in metropolitana su una sezione dove non si era ancora
 * passati — quel file non arriva, l'import fallisce, e React senza
 * qualcuno che raccolga l'errore smonta tutto. Lo schermo resta nero e
 * l'app sembra rotta, non offline.
 *
 * Il secondo caso è più comune di quanto sembri e non c'entra il
 * telefono: dopo un deploy i nomi dei file cambiano, e una scheda
 * rimasta aperta da ieri chiede un pezzo che sul server non esiste più.
 * La cura è la stessa — ricaricare — ma bisogna dirlo.
 */
export default class RouteErrore extends Component {
  state = { caduta: false };

  static getDerivedStateFromError() {
    return { caduta: true };
  }

  componentDidCatch(errore) {
    console.error("Pagina non caricata:", errore);
  }

  render() {
    if (!this.state.caduta) return this.props.children;

    const offline = !navigator.onLine;

    return (
      <div className="grid min-h-dvh place-items-center px-6" role="alert">
        <div className="max-w-sm rounded-panel border border-hairline bg-glass-2 px-6 py-7 text-center backdrop-blur-xl">
          <h1 className="font-display text-xl font-semibold text-ink-bright">
            {offline ? "Questa parte non è ancora scesa" : "La pagina non si è caricata"}
          </h1>

          <p className="mt-2 text-sm text-ink-muted">
            {offline
              ? "Senza rete si aprono solo le sezioni già visitate almeno una volta. Le altre arrivano appena torni in linea."
              : "Se il sito è stato aggiornato mentre eri qui, ricaricare basta."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-card bg-brass-400 px-4 py-2 text-sm font-semibold text-void transition-transform duration-tap ease-spring active:scale-95"
          >
            Ricarica
          </button>
        </div>
      </div>
    );
  }
}
