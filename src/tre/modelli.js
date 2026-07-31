import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Il magazzino dei modelli scaricati.
 *
 *
 * PERCHÉ UNA MISURA IN METRI
 *
 * Ogni pacchetto misura i suoi modelli come gli pare: il registratore di
 * cassa arriva alto dodici unità, la poltroncina zero virgola quattro,
 * la libreria tre e mezzo. Tararli uno per uno a occhio è esattamente il
 * modo in cui la prima versione della stanza si è ritrovata una poltrona
 * da casa delle bambole accanto a una persona alta due metri e mezzo.
 *
 * Qui invece si chiede una misura vera — `alto: 2.4` sono due metri e
 * quaranta — e la scala la ricava il codice dall'ingombro effettivo del
 * modello. Il cambio fra metri e unità di scena esce dal bibliotecario,
 * che è alto 2.6 unità e rappresenta una persona di un metro e settanta.
 *
 *
 * PERCHÉ UN MAGAZZINO E NON UNA CACHE GLOBALE
 *
 * Una cache a livello di modulo sopravvivrebbe allo smontaggio della
 * scena, e siccome le copie condividono geometrie e materiali con
 * l'originale, la prima `distruggi()` lascerebbe in cache un modello con
 * i buffer già liberati: al rimontaggio (React in modalità rigorosa
 * monta, smonta e rimonta) si vedrebbe una stanza vuota senza un solo
 * errore in console. Il magazzino invece nasce e muore con la scena, e
 * dentro una singola vita evita comunque di scaricare otto volte la
 * stessa libreria.
 */

export const UNITA_PER_METRO = 2.6 / 1.7;

export const metri = (quanti) => quanti * UNITA_PER_METRO;

export class Magazzino {
  #promesse = new Map();
  #originali = [];

  vivo = true;

  /** Il modello grezzo, scaricato una volta sola per URL. */
  #carica(url) {
    if (!this.#promesse.has(url)) {
      const promessa = new GLTFLoader()
        .loadAsync(url)
        .then((gltf) => {
          this.#originali.push(gltf.scene);
          return gltf.scene;
        });

      this.#promesse.set(url, promessa);
    }

    return this.#promesse.get(url);
  }

  /**
   * Una copia pronta da posare.
   *
   * @param url        il modello
   * @param alto       altezza voluta in metri (in alternativa `largo`)
   * @param largo      larghezza voluta in metri
   * @param ancora     dove sta l'origine del gruppo restituito:
   *                   "piedi" (posalo sul pavimento), "cima" (appendilo
   *                   al soffitto) o "centro"
   *
   * Restituisce un gruppo, non la mesh: così l'origine è sempre nel
   * punto che serve a chi lo posa, qualunque sia il punto di riferimento
   * scelto da chi ha modellato. `misure` nel `userData` riporta
   * l'ingombro finale, che serve per allineare più copie in fila senza
   * doverlo ricalcolare ogni volta.
   */
  async preleva(url, { alto, largo, ancora = "piedi", ombra = true } = {}) {
    const originale = await this.#carica(url);

    if (!this.vivo) return null;

    const modello = originale.clone(true);

    const ingombro = new THREE.Box3()
      .setFromObject(modello)
      .getSize(new THREE.Vector3());

    const scala = alto
      ? metri(alto) / (ingombro.y || 1)
      : largo
        ? metri(largo) / (ingombro.x || 1)
        : 1;

    modello.scale.setScalar(scala);

    const box = new THREE.Box3().setFromObject(modello);

    modello.position.x -= (box.min.x + box.max.x) / 2;
    modello.position.z -= (box.min.z + box.max.z) / 2;

    if (ancora === "piedi") modello.position.y -= box.min.y;
    else if (ancora === "cima") modello.position.y -= box.max.y;
    else modello.position.y -= (box.min.y + box.max.y) / 2;

    modello.traverse((oggetto) => {
      if (!oggetto.isMesh) return;

      // Geometrie e materiali sono condivisi con l'originale: li
      // smaltisce il magazzino, una volta sola. Senza questo segno la
      // pulizia della scena li libererebbe una copia per volta, e la
      // seconda copia lavorerebbe su buffer già chiusi.
      oggetto.userData.daModello = true;

      if (!ombra) return;
      oggetto.castShadow = true;
      oggetto.receiveShadow = true;
    });

    const gruppo = new THREE.Group();
    gruppo.add(modello);

    gruppo.userData.misure = new THREE.Box3()
      .setFromObject(modello)
      .getSize(new THREE.Vector3());

    return gruppo;
  }

  /**
   * Nasconde le parti di un modello scegliendole dal nome del materiale.
   *
   * Serve per la libreria, che arriva già piena dei suoi libri finti:
   * negli scaffali in vetrina quei libri vanno via per far posto alle
   * copertine vere, in quelli sullo sfondo restano. È l'unico modo per
   * avere mobili identici fra loro — la richiesta di partenza — senza
   * rinunciare alle copertine della collezione.
   *
   * La copia ha materiali condivisi con l'originale, quindi si tocca la
   * visibilità della mesh, mai il materiale.
   */
  static nascondiPerMateriale(gruppo, espressione) {
    gruppo.traverse((oggetto) => {
      if (!oggetto.isMesh) return;
      if (espressione.test(oggetto.material?.name ?? "")) oggetto.visible = false;
    });
  }

  smaltisci() {
    this.vivo = false;

    for (const originale of this.#originali) {
      originale.traverse((oggetto) => {
        if (!oggetto.isMesh) return;

        oggetto.geometry?.dispose();

        const materiali = Array.isArray(oggetto.material)
          ? oggetto.material
          : [oggetto.material];

        for (const materiale of materiali) {
          if (!materiale) continue;

          materiale.map?.dispose();
          materiale.normalMap?.dispose();
          materiale.roughnessMap?.dispose();
          materiale.metalnessMap?.dispose();
          materiale.emissiveMap?.dispose();
          materiale.aoMap?.dispose();
          materiale.dispose();
        }
      });
    }

    this.#originali = [];
    this.#promesse.clear();
  }
}
