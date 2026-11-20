import { useEffect, useSyncExternalStore } from "react";
import { getCopertineVolumi, urlCopertina } from "../services/api";
import { ripiegoDelVolume } from "./copertineRipiego";

export { serieConCopertine, ripiegoDelVolume } from "./copertineRipiego";

/*
 * LA COPERTINA DI OGNI VOLUME (14/11/2026)
 *
 * Di ogni serie c'era una copertina sola, di solito il volume 1. Il backend
 * ora tiene anche quella di ogni volume (`copertine_volumi`, lette da
 * AnimeClick poche serie al giorno), e qui si chiedono tutte insieme, una
 * volta per visita: `{ base, copertine: { [idSerie]: { [numero]: percorso } } }`.
 *
 * Chi mostra «il volume a cui sei arrivato» o «il prossimo da comprare» usa
 * `useCopertinaVolume(idSerie, numero, ripiego)`.
 *
 * Se di quella serie non si sa ancora niente (la lettura di AnimeClick non è
 * passata) torna il ripiego, cioè la copertina della serie, come prima.
 *
 * Se invece la serie ha già le copertine dei suoi volumi e quella di QUESTO volume
 * manca (AnimeClick non ha ancora la miniatura di un volume appena uscito, o ha
 * dei buchi: Berserk), non si ripiega: la copertina della serie è quella del volume 1,
 * e mostrarla sul volume 35 di Rent a Girlfriend è un errore, non un ripiego.
 * Torna `null` e chi disegna mostra il segnaposto col titolo.
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
 * Tutte le copertine, come sono arrivate (vuote finché non arrivano), da
 * leggere con `indirizzoVolume`.
 *
 * Serve a chi disegna MOLTI volumi insieme (il carosello della scheda, 110
 * per One Piece): `useCopertinaVolume` per ciascuno farebbe la prova di
 * caricamento di ogni immagine subito, centodieci richieste prima ancora
 * che si veda la prima. Qui la prova non c'è: chi usa questa lettura carica
 * le immagini con `loading="lazy"` e si accorge da solo di quelle rotte.
 */
export function useFonteCopertine() {
  useSyncExternalStore(ascolta, () => versione);

  useEffect(carica, []);

  return dati;
}

/**
 * La copertina del volume `numero` di una serie, o `ripiego` (vedi `ripiegoDelVolume`:
 * per una serie già letta il ripiego non c'è, e torna `null`).
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

  return candidata && !rotte.has(candidata) ? candidata : ripiegoDelVolume(dati, idSerie, ripiego);
}

/**
 * Il ripiego per chi disegna un volume con una copertina sua (`copertina`) e ricade
 * sulla serie solo se manca: la serie vale solo se non ha ancora copertine di volume.
 */
export function useRipiegoSerie(idSerie, ripiego = null) {
  useSyncExternalStore(ascolta, () => versione);

  useEffect(carica, []);

  return ripiegoDelVolume(dati, idSerie, ripiego);
}
