import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Il bibliotecario: un personaggio vero, non un piedistallo — è la
 * differenza fra "un pulsante a forma di stanza" e un punta-e-clicca
 * vero. Caricato da un modello invece che costruito a primitive: le
 * proporzioni di un umano si notano subito se sono sbagliate, ed è
 * l'unico oggetto della stanza dove conta davvero.
 *
 * Fonte: "Ultimate Modular Men Pack" di Quaternius (quaternius.com),
 * licenza Public Domain (CC0) — nessuna attribuzione dovuta, citata
 * qui solo per tracciarne la provenienza (come già in `copertine.js`
 * per le copertine).
 */

// Quanto deve essere alto in scena, in unità-libro (vedi `scena.js`).
export const ALTEZZA_BIBLIOTECARIO = 3.35;

// Il completo arriva in tinte da ufficio (blu/nero, cravatta a caso):
// li scaldo verso la stessa palette ottone/legno del resto del sito,
// altrimenti sembra un impiegato capitato per sbaglio in biblioteca
// invece che chi ci lavora davvero.
const RICOLORAZIONE = {
  Suit: 0x3c2f28,
  Tie: 0xb8842f
};

/**
 * Carica e prepara il modello. Restituisce un gruppo già in scala e
 * posizionato, più `aggiorna(dt)` per l'animazione idle e `smonta()`
 * per liberare la memoria video — le stesse forme che il resto della
 * scena si aspetta da qualunque cosa viva nel ciclo di animazione.
 */
export async function caricaBibliotecario({ url, posizione }) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  const modello = gltf.scene;

  modello.traverse((oggetto) => {
    if (!oggetto.isMesh) return;

    oggetto.castShadow = true;
    oggetto.receiveShadow = true;

    const nome = oggetto.material?.name;
    if (nome && RICOLORAZIONE[nome] !== undefined) {
      // Clonato: il materiale originale potrebbe essere condiviso fra
      // più mesh del modello, e non voglio ricolorare più del dovuto.
      oggetto.material = oggetto.material.clone();
      oggetto.material.color.set(RICOLORAZIONE[nome]);
    }
  });

  // Il modello arriva alto quanto è modellato (i pacchetti di questo
  // tipo sono di solito in metri, quindi ~1.8 unità). Lo riporto
  // all'altezza che serve misurando il suo stesso ingombro invece di
  // indovinare un fattore fisso che dipenderebbe dal pacchetto scelto.
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

  gruppo.position.set(posizione.x, posizione.y, posizione.z);
  gruppo.rotation.y = posizione.rotazioneY ?? 0;

  let mixer = null;

  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(modello);

    // Un'attesa ferma sarebbe più inerte di un piedistallo: si cerca
    // la clip "idle" più neutra disponibile, e si accontenta della
    // prima animazione del pacchetto solo se proprio non c'è.
    const clip =
      gltf.animations.find((a) => /idle_neutral/i.test(a.name)) ||
      gltf.animations.find((a) => /^idle$|\|idle$/i.test(a.name)) ||
      gltf.animations[0];

    mixer.clipAction(clip).play();
  }

  return {
    gruppo,
    aggiorna: (dt) => mixer?.update(dt),
    smonta() {
      modello.traverse((oggetto) => {
        if (!oggetto.isMesh) return;

        oggetto.geometry?.dispose();

        const materiali = Array.isArray(oggetto.material) ? oggetto.material : [oggetto.material];

        for (const materiale of materiali) {
          materiale?.map?.dispose();
          materiale?.dispose();
        }
      });
    }
  };
}
