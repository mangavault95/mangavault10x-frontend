import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Il bibliotecario: un personaggio vero, scaricato — non più disegnato
 * a sfere. Un mago-bibliotecario chibi, con tanto di libro fra gli
 * accessori del suo stesso pacchetto: si intona da solo al resto della
 * stanza invece di dover indovinare colori e proporzioni a mano.
 *
 * Fonte: "KayKit – Character Pack: Adventurers" di Kay Lousberg
 * (kaylousberg.com), licenza Public Domain (CC0) — nessuna attribuzione
 * dovuta, citata qui solo per tracciarne la provenienza.
 */

// Più alto della prima versione disegnata a mano: doveva essere "più
// in vista", non un dettaglio dietro il banco.
export const ALTEZZA_BIBLIOTECARIO = 2.6;

export async function caricaBibliotecario({ url, x, y, z, rotazioneY = 0 }) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  const modello = gltf.scene;

  modello.traverse((oggetto) => {
    if (!oggetto.isMesh) return;
    oggetto.castShadow = true;
    oggetto.receiveShadow = true;
  });

  // Il modello arriva alto quanto è modellato: lo riporto all'altezza
  // che serve misurando il suo stesso ingombro invece di indovinare un
  // fattore di scala fisso che dipenderebbe dal pacchetto scelto.
  const altezzaNativa =
    new THREE.Box3().setFromObject(modello).getSize(new THREE.Vector3()).y || 1;

  modello.scale.setScalar(ALTEZZA_BIBLIOTECARIO / altezzaNativa);

  const gruppo = new THREE.Group();
  gruppo.add(modello);

  // Dopo la scala, i piedi (min.y) potrebbero non stare a zero: si
  // solleva il modello perché tocchi terra esattamente all'origine del
  // gruppo, qualunque sia il punto di riferimento del rig originale.
  const minY = new THREE.Box3().setFromObject(modello).min.y;
  modello.position.y -= minY;

  gruppo.position.set(x, y, z);
  gruppo.rotation.y = rotazioneY;

  // Niente clip d'animazione (il pacchetto le tiene in un file a
  // parte, pensato per un rig condiviso fra più personaggi — inutile
  // trascinarsi dietro il retargeting per un'oscillazione da fermo):
  // un respiro leggero sul modello intero basta a non farlo sembrare
  // una statua.
  let tempo = Math.random() * Math.PI * 2;

  return {
    gruppo,
    aggiorna(dt) {
      tempo += dt;
      modello.position.y = Math.sin(tempo * 1.5) * 0.025;
      // Solo l'oscillazione: la rotazione di base è già su `gruppo`,
      // sommarla di nuovo qui la raddoppierebbe.
      modello.rotation.y = Math.sin(tempo * 0.7) * 0.04;
    }
  };
}
