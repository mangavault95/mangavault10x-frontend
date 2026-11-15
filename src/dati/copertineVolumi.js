import { useEffect, useSyncExternalStore } from "react";
import { getCopertineVolumi, urlCopertina } from "../services/api";

/*
 * LA COPERTINA DI OGNI VOLUME (14/11/2026)
 *
 * Di ogni serie c'era una copertina sola, di solito il volume 1. Il backend
 * ora tiene anche quella di ogni volume (`copertine_volumi`, lette da
 * AnimeClick poche serie al giorno), e qui si chiedono tutte insieme, una
 * volta per visita: `{ base, copertine: { [idSerie]: { [numero]: percorso } } }`.
 *
 * Chi mostra «il volume a cui sei arrivato» o «il prossimo da comprare» usa
 * `useCopertinaVolume(idSerie, numero, ripiego)`: se quella del volume non c'è
 * (serie non ancora letta, volume senza immagine) o non si carica, torna il
 * ripiego, cioè la copertina della serie. Non c'è mai un riquadro vuoto in più
 * rispetto a prima.
 */

let dati = { base: "", copertine: {} };
let versione = 0;
let richiesta = null;

const ascoltatori = new Set();
// Indirizzi che non si sono caricati, e quelli già messi alla prova.
const rotte = new Set();
const provate = new Set();

function avvisa() {
  versione += 1;
  ascoltatori.forEach((f) => f());
}

function ascolta(f) {
  ascoltatori.add(f);

  return () => ascoltatori.delete(f);
}

function carica() {
  if (richiesta) return;

  richiesta = getCopertineVolumi()
    .then((risposta) => {
      if (risposta && typeof risposta.copertine === "object" && risposta.copertine) {
        dati = { base: String(risposta.base || ""), copertine: risposta.copertine };
        avvisa();
      }
    })
    .catch(() => {
      // Senza, il sito mostra le copertine delle serie come ha sempre fatto.
      // Si riprova alla prossima pagina che ne ha bisogno, non in un ciclo.
      richiesta = null;
    });
}

/** Rilegge tutte le copertine dal backend, dopo una correzione a mano dalla Gestione. */
export function ricaricaCopertineVolumi() {
  richiesta = null;
  carica();
}

/** L'indirizzo della copertina di quel volume, o null. Pura: si prova senza rete. */
export function indirizzoVolume(fonte, idSerie, numero) {
  const percorso = fonte?.copertine?.[String(idSerie)]?.[String(Number(numero))];

  if (!percorso || !Number.isInteger(Number(numero)) || Number(numero) <= 0) return null;

  return percorso.startsWith("/") ? `${fonte.base || ""}${percorso}` : percorso;
}

/**
 * La copertina del volume `numero` di una serie, o `ripiego`.
 * `larghezza` è la stessa che userà chi la disegna (vedi `urlCopertina`): la
 * prova di caricamento chiede così lo stesso file, e il browser lo scarica una volta.
 */
export function useCopertinaVolume(idSerie, numero, ripiego = null, larghezza = 384) {
  useSyncExternalStore(ascolta, () => versione);

  useEffect(carica, []);

  const candidata = indirizzoVolume(dati, idSerie, numero);

  useEffect(() => {
    if (!candidata || provate.has(candidata)) return;

    provate.add(candidata);

    const immagine = new Image();

    immagine.onerror = () => {
      rotte.add(candidata);
      avvisa();
    };
    immagine.src = urlCopertina(candidata, larghezza);
  }, [candidata, larghezza]);

  return candidata && !rotte.has(candidata) ? candidata : ripiego;
}
