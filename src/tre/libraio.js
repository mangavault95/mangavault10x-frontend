import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ritiraModello } from "./indirizzi";

/**
 * Il bibliotecario: un personaggio vero, scaricato — non disegnato a
 * sfere. Un mago-bibliotecario chibi che si intona da solo al resto
 * della stanza invece di dover indovinare colori e proporzioni a mano.
 *
 * Fonte: "KayKit – Character Pack: Adventurers" di Kay Lousberg
 * (kaylousberg.com), licenza Public Domain (CC0) — nessuna attribuzione
 * dovuta, citata qui solo per tracciarne la provenienza.
 *
 *
 * DUE CORREZIONI AL MODELLO COSÌ COM'È
 *
 * **Il cappello se ne va.** La falda del cappello da mago è larga il
 * doppio della testa e sporge in avanti di un'unità intera, mentre il
 * viso ne raggiunge appena mezza: da davanti — che è l'unica direzione
 * da cui lo si guarda — il risultato è un'ombra piatta piantata sul
 * naso. Tolto lui, si vede una persona.
 *
 * **Le braccia scendono.** Il pacchetto consegna il personaggio con le
 * braccia aperte a croce, la posa in cui è stato modellato: dietro un
 * bancone diventano due tubi che spuntano dai fianchi. Azzerare la
 * rotazione delle due ossa della spalla le fa cadere lungo il corpo,
 * che è la posa in cui sta chi aspetta al banco.
 */

export const ALTEZZA_BIBLIOTECARIO = 2.6;

const CAPPELLO = "Mage_Hat";
const SPALLE = ["upperarml", "upperarmr"];

export async function caricaBibliotecario({ url, x, y, z, rotazioneY = 0 }) {
  const loader = new GLTFLoader();

  // I byte possono essere già arrivati: la richiesta parte prima che la
  // scena esista (vedi `indirizzi.js`).
  const anticipati = await ritiraModello(url);

  const gltf = anticipati
    ? await loader.parseAsync(anticipati, "")
    : await loader.loadAsync(url);

  const modello = gltf.scene;

  modello.traverse((oggetto) => {
    if (oggetto.name === CAPPELLO) {
      oggetto.visible = false;
      return;
    }

    if (oggetto.isBone && SPALLE.includes(oggetto.name)) {
      oggetto.rotation.set(0, 0, 0);
      return;
    }

    if (!oggetto.isMesh) return;

    oggetto.castShadow = true;
    oggetto.receiveShadow = true;
  });

  // La misura si prende dopo aver spento il cappello, non prima: era lui
  // il punto più alto del modello, e misurarlo avrebbe rimpicciolito la
  // persona di un buon quinto per fare spazio a un cappello che non c'è
  // più.
  const altezzaNativa =
    new THREE.Box3().setFromObject(modello).getSize(new THREE.Vector3()).y || 1;

  modello.scale.setScalar(ALTEZZA_BIBLIOTECARIO / altezzaNativa);

  const gruppo = new THREE.Group();
  gruppo.add(modello);

  // Dopo la scala i piedi (min.y) potrebbero non stare a zero: si
  // solleva il modello perché tocchi terra esattamente all'origine del
  // gruppo, qualunque sia il punto di riferimento del rig originale.
  const minY = new THREE.Box3().setFromObject(modello).min.y;
  modello.position.y -= minY;

  gruppo.position.set(x, y, z);
  gruppo.rotation.y = rotazioneY;

  // Niente clip d'animazione (il pacchetto le tiene in un file a parte,
  // pensato per un rig condiviso fra più personaggi — inutile
  // trascinarsi dietro il retargeting per un'oscillazione da fermo): un
  // respiro leggero sul modello intero basta a non farlo sembrare una
  // statua.
  let tempo = Math.random() * Math.PI * 2;
  const altezzaPiedi = modello.position.y;

  return {
    gruppo,
    aggiorna(dt) {
      tempo += dt;
      modello.position.y = altezzaPiedi + Math.sin(tempo * 1.5) * 0.025;
      // Solo l'oscillazione: la rotazione di base è già su `gruppo`,
      // sommarla di nuovo qui la raddoppierebbe.
      modello.rotation.y = Math.sin(tempo * 0.7) * 0.04;
    }
  };
}
