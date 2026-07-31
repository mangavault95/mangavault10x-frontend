import * as THREE from "three";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";

/**
 * L'oggetto guardato prende un contorno d'ottone.
 *
 * Prima ogni punto cliccabile aveva il suo anello luminoso sul
 * pavimento, sempre acceso: cinque bolli gialli in terra che dicevano
 * "qui c'è qualcosa" senza mai dire cosa, e che di fatto erano loro
 * l'interfaccia. Adesso la stanza sta zitta finché non ci passi sopra il
 * puntatore, e a rispondere è l'oggetto.
 *
 * Risponde con un tratto lungo il bordo, non scaldandosi tutto: la prima
 * versione accendeva l'emissiva dell'intero mobile ed era invadente —
 * una libreria che diventa gialla è un'altra libreria, un profilo
 * luminoso è la stessa libreria che dice "sono cliccabile".
 *
 *
 * PERCHÉ UN PASSAGGIO IN POST E NON UN GUSCIO GONFIATO
 *
 * Il modo classico di fare un contorno — ricopiare la mesh, spingerne i
 * vertici lungo le normali e disegnarla al rovescio — qui si rompe due
 * volte. Gli arredi sono modelli low-poly a facce piatte: ogni faccia ha
 * la sua normale, e spingendo lungo quelle il guscio si apre a spicchi
 * agli spigoli, che è il contrario di un contorno continuo. E il
 * bibliotecario è una mesh legata alle ossa: una copia non legata la
 * ridisegnerebbe nella posa in cui è stato modellato, a braccia aperte
 * in mezzo alla stanza.
 *
 * `OutlinePass` lavora invece sull'immagine già disegnata — maschera gli
 * oggetti scelti e ne cerca i bordi — quindi non gli importa né di come
 * sono fatte le normali né di chi muove i vertici. In cambio vuole che
 * il fotogramma passi da un `EffectComposer` (vedi `#creaComposer` in
 * `scena.js`).
 *
 * Il passaggio resta spento finché non c'è niente da contornare: costa
 * due disegni della scena in più, e pagarli mentre nessuno guarda niente
 * sarebbe uno spreco per tutta la durata della visita.
 */

const COLORE = 0xfacc15; // brass-400, lo stesso accento del resto del sito

// Quanto marca il tratto al culmine, e quanto è spesso. Da sette metri
// un contorno da un pixel non si vede: sotto il 2 di spessore, sul
// bancone chiaro, sparisce.
const FORZA = 4.5;
const SPESSORE = 2;

// Quanto in fretta compare e svanisce: legata al tempo trascorso, non ai
// fotogrammi, così dura uguale a 60 e a 144 Hz.
const VELOCITA = 14;

export class Evidenza {
  #mirato = null;
  #forza = 0;

  constructor({ scena, camera, larghezza, altezza }) {
    this.passo = new OutlinePass(new THREE.Vector2(larghezza, altezza), scena, camera);

    this.passo.edgeStrength = 0;
    this.passo.edgeThickness = SPESSORE;
    // Un tratto, non un alone: il bagliore attorno al bordo farebbe di
    // nuovo quello che si voleva togliere, cioè illuminare la roba
    // intorno all'oggetto invece di segnarne il profilo.
    this.passo.edgeGlow = 0;
    // Il respiro lo fa `aggiorna`, insieme alla comparsa: quello di
    // serie muove lo spessore, e uno spessore che pulsa da fermo sembra
    // un difetto di messa a fuoco.
    this.passo.pulsePeriod = 0;

    this.passo.visibleEdgeColor.set(COLORE);
    // Nero, perché il passaggio somma i due colori sull'immagine e il
    // nero non somma niente: le parti dell'oggetto che stanno dietro a
    // qualcos'altro non prendono nessun tratto. È come funziona un
    // contorno vero — la bibliotecaria è profilata dalla vita in su,
    // dove il banco la nasconde il segno si ferma.
    this.passo.hiddenEdgeColor.set(0x000000);

    this.passo.enabled = false;

    this.#correggiProfondita();
  }

  /**
   * Il bersaglio di profondità del passaggio, rifatto a otto bit.
   *
   * Per sapere quali bordi sono in vista e quali stanno dietro a
   * qualcos'altro, `OutlinePass` disegna la profondità della scena
   * *impacchettandola nei quattro canali di colore* — un numero preciso
   * spalmato su rosso, verde, blu e alfa. Poi però se lo salva in una
   * texture a virgola mobile mezza, che quei canali li arrotonda: del
   * numero impacchettato sopravvivono si e no i bit grossi.
   *
   * Con la stanza inquadrata da quindici unità di distanza vuol dire non
   * distinguere più due superfici a dodici centimetri l'una dall'altra —
   * cioè la bacheca dei desideri dal muro a cui è appesa. Risultato: la
   * bacheca risultava nascosta dietro la propria parete e non prendeva
   * nessun contorno, mentre gli altri quattro punti, che hanno mezza
   * stanza dietro, funzionavano.
   *
   * A otto bit per canale l'impacchettamento torna esatto, che è
   * esattamente ciò per cui era stato scritto.
   */
  #correggiProfondita() {
    const vecchio = this.passo.renderTargetDepthBuffer;

    const nuovo = new THREE.WebGLRenderTarget(vecchio.width, vecchio.height);
    nuovo.texture.name = "Evidenza.profondita";
    nuovo.texture.generateMipmaps = false;

    this.passo.renderTargetDepthBuffer = nuovo;
    this.passo.prepareMaskMaterial.uniforms.depthTexture.value = nuovo.texture;

    vecchio.dispose();
  }

  /**
   * Il bersaglio sotto il puntatore, o `null`.
   *
   * La selezione cambia subito, la sua intensità no: passando da un
   * oggetto all'altro il tratto si sposta invece di spegnersi e
   * riaccendersi, che a settanta millesimi di distanza sarebbe solo uno
   * sfarfallio.
   */
  mira(bersaglio) {
    const nuovo = bersaglio?.userData.evidenza?.length ? bersaglio : null;

    if (nuovo === this.#mirato) return;

    this.#mirato = nuovo;

    if (!nuovo) return;

    this.passo.selectedObjects = nuovo.userData.evidenza;
    this.passo.enabled = true;
  }

  aggiorna(dt) {
    if (!this.passo.enabled) return;

    const obiettivo = this.#mirato ? 1 : 0;

    this.#forza += (obiettivo - this.#forza) * (1 - Math.exp(-VELOCITA * dt));

    // Svanito del tutto: si stacca il passaggio, e la scena torna a
    // costare quello che costava prima che il mouse passasse di qui.
    if (!obiettivo && this.#forza < 0.02) {
      this.#forza = 0;
      this.passo.selectedObjects = [];
      this.passo.enabled = false;

      return;
    }

    const respiro = 1 + Math.sin(performance.now() / 420) * 0.1;

    this.passo.edgeStrength = this.#forza * respiro * FORZA;
  }

  smaltisci() {
    this.passo.selectedObjects = [];
    this.passo.dispose();
  }
}
