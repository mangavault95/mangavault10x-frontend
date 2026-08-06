import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ritiraModello } from "./indirizzi";

/**
 * La bibliotecaria: un personaggio vero, scaricato — non disegnato a
 * sfere.
 *
 * Fonte: "Ultimate Animated Character Pack" di **Quaternius**
 * (quaternius.com), licenza Public Domain (CC0). Prima era il mago del
 * pacchetto Adventurers di KayKit, bocciato perché *plasticoso e un po'
 * stonato col resto*. Il file è stato sfoltito prima di entrare nel
 * repository: delle quattordici clip d'animazione ne restano due, e
 * l'ascia che aveva in mano è stata tolta del tutto (671 kB → 481 kB).
 *
 *
 * DA COSA VENIVA LA PLASTICA
 *
 * Non dal modello: dal **materiale**. Una superficie a ruvidità 0,5 con
 * quattro luci addosso — la calda da sinistra, la frontale, la radente
 * fredda, più il rimbalzo dell'emisferica — prende quattro riflessi
 * speculari, e quattro riflessi su una faccia piatta sono esattamente
 * quello che l'occhio legge come plastica lucida. Il pacchetto nuovo è
 * anche peggio del vecchio se lo si usa com'è (metallicità 0,4 e
 * ruvidità 0,27), quindi la prima cosa che si fa aprendolo è spegnere il
 * metallo e portare la ruvidità dove sta la stoffa. Vale per qualunque
 * personaggio ci si metta al posto suo: è la riga `#opacizza`, non il
 * `.glb`, a decidere se sembra una persona o un giocattolo.
 *
 *
 * ADESSO RESPIRA PER DAVVERO
 *
 * Il modello vecchio non aveva animazioni — il pacchetto le teneva in un
 * file a parte, pensato per un rig condiviso — e al suo posto c'era un
 * seno che gli alzava e abbassava i piedi. Si vedeva: un personaggio che
 * trasla in verticale tutto intero non respira, galleggia. Questo porta
 * con sé le clip vere, quindi il respiro è quello di chi l'ha animato:
 * il petto si muove, le spalle no, i piedi restano per terra.
 *
 * E ne porta una seconda che al banco vale più della prima: **saluta con
 * la mano**. Le si passa sopra il puntatore e alza la mano. È il gesto
 * di chi sta dietro a un bancone e ti ha visto entrare, e non costa
 * niente — la clip è già nel file.
 */

export const ALTEZZA_BIBLIOTECARIO = 2.6;

// Le due clip rimaste nel file, e quanto ci mette una a sfumare
// nell'altra. Un quarto di secondo: sotto si vede lo scatto, sopra il
// saluto comincia quando è già finito.
const RIPOSO = "Idle";
const SALUTO = "Wave";
const SFUMATURA = 0.28;

// Quanto va rallentato il respiro.
//
// La clip è animata per un gioco d'azione, dove "fermo" vuol dire fermo
// per due secondi prima di rimettersi a correre: a velocità piena
// sembrava in affanno dietro al banco. A poco più di metà velocità
// diventa il respiro di chi sta lì da un'ora. Il saluto invece resta a
// velocità sua — un cenno rallentato non è calmo, è impacciato.
const RITMO_RIPOSO = 0.55;

/**
 * Materiali di stoffa, non di plastica.
 *
 * `metalness` a zero perché nessuno è vestito di metallo, e `roughness`
 * alta perché la luce su un maglione si spalma invece di rimbalzare. La
 * texture resta quella che era: qui si tocca come reagisce alla luce,
 * non di che colore è.
 */
function opacizza(modello) {
  for (const materiale of raccogliMateriali(modello)) {
    materiale.metalness = 0;
    materiale.roughness = 0.88;
    materiale.needsUpdate = true;
  }
}

function raccogliMateriali(modello) {
  const trovati = new Set();

  modello.traverse((oggetto) => {
    if (!oggetto.isMesh) return;

    for (const materiale of [oggetto.material].flat()) {
      if (materiale) trovati.add(materiale);
    }
  });

  return trovati;
}

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
    if (!oggetto.isMesh) return;

    oggetto.castShadow = true;
    oggetto.receiveShadow = true;
    // Un personaggio legato alle ossa cambia sagoma a ogni fotogramma, e
    // il volume che three si è calcolato al caricamento è quello della
    // posa di riposo: senza questo, alzando la mano il braccio può
    // uscire dal volume e sparire proprio mentre saluta.
    oggetto.frustumCulled = false;
  });

  opacizza(modello);

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

  /* -------------------- Il respiro e il saluto -------------------- */

  const mixer = new THREE.AnimationMixer(modello);

  const clip = (nome) => THREE.AnimationClip.findByName(gltf.animations, nome);

  const riposo = clip(RIPOSO) ? mixer.clipAction(clip(RIPOSO)) : null;
  const saluto = clip(SALUTO) ? mixer.clipAction(clip(SALUTO)) : null;

  riposo?.setEffectiveTimeScale(RITMO_RIPOSO);
  riposo?.play();

  if (saluto) {
    saluto.setLoop(THREE.LoopOnce, 1);
    // Finita, la clip resta sull'ultimo fotogramma invece di scattare al
    // primo: è da lì che deve ripartire la sfumatura verso il riposo.
    saluto.clampWhenFinished = true;

    mixer.addEventListener("finished", ({ action }) => {
      if (action !== saluto || !riposo) return;

      riposo.reset().play();
      saluto.crossFadeTo(riposo, SFUMATURA, false);
    });
  }

  return {
    gruppo,

    aggiorna(dt) {
      mixer.update(dt);
    },

    /**
     * Alza la mano. Chiamarla mentre sta già salutando non fa niente:
     * un saluto interrotto e ricominciato a ogni scarto del puntatore
     * sarebbe un tic, non un saluto.
     */
    saluta() {
      if (!saluto || !riposo || saluto.isRunning()) return;

      saluto.reset().play();
      riposo.crossFadeTo(saluto, SFUMATURA, false);
    },

    smaltisci() {
      mixer.stopAllAction();
      mixer.uncacheRoot(modello);
    }
  };
}
