import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ritiraModello } from "./indirizzi";

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

/* Cosa conta come foglia, in tinta.
   --------------------------------------------------------------------
   Le piante arrivano tutte dallo stesso pacchetto e sono tutte dello
   stesso verde: cinque copie in giro per la stanza si riconoscono come
   cinque copie. Girare la tinta di un pelo le rende cinque piante
   diverse — ma solo il fogliame, o il vaso di cotto diventa giallo.
   Verde è tutto quello che sta fra il giallo-oliva e il ciano: fuori di
   lì c'è il cotto da una parte e niente dall'altra. */
const VERDE_DA = 0.16;
const VERDE_A = 0.48;

export class Magazzino {
  #promesse = new Map();
  #originali = [];
  // I materiali nati qui dentro con `tinta`: non stanno in nessun
  // modello originale, quindi nessun altro li libererebbe.
  #tinti = [];

  vivo = true;

  /**
   * Il modello grezzo, scaricato una volta sola per URL.
   *
   * Se i byte erano già stati chiesti in anticipo (vedi `indirizzi.js`)
   * si interpretano quelli invece di rifare la richiesta: il `.glb` si
   * porta dentro tutto, texture comprese, quindi al lettore non serve
   * sapere da che cartella veniva.
   */
  #carica(url) {
    if (!this.#promesse.has(url)) {
      const lettore = new GLTFLoader();

      const anticipati = ritiraModello(url);

      const arrivo = anticipati
        ? anticipati.then((byte) =>
            byte ? lettore.parseAsync(byte, "") : lettore.loadAsync(url)
          )
        : lettore.loadAsync(url);

      const promessa = arrivo.then((gltf) => {
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
   * @param tinta      `{ foglia, chiaro }`: di quanto girare la tinta
   *                   del fogliame e di quanto schiarirlo. Serve alle
   *                   piante, che sono tre modelli sparsi in otto punti.
   *
   * Restituisce un gruppo, non la mesh: così l'origine è sempre nel
   * punto che serve a chi lo posa, qualunque sia il punto di riferimento
   * scelto da chi ha modellato. `misure` nel `userData` riporta
   * l'ingombro finale, che serve per allineare più copie in fila senza
   * doverlo ricalcolare ogni volta.
   */
  async preleva(url, { alto, largo, ancora = "piedi", ombra = true, tinta } = {}) {
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

    if (tinta) this.#tingi(modello, tinta);

    const gruppo = new THREE.Group();
    gruppo.add(modello);

    gruppo.userData.misure = new THREE.Box3()
      .setFromObject(modello)
      .getSize(new THREE.Vector3());

    return gruppo;
  }

  /**
   * Gira la tinta di una copia senza toccare l'originale.
   *
   * I materiali arrivano condivisi con il modello di partenza — è tutto
   * il punto del magazzino — quindi scriverci dentro cambierebbe il
   * colore di *tutte* le copie già in scena. Qui se ne fa una copia per
   * materiale, e la mappa `fatti` fa sì che due mesh che condividevano
   * lo stesso materiale continuino a condividerlo anche dopo.
   *
   * Le immagini restano quelle dell'originale: una copia di materiale
   * punta alla stessa texture, e liberarla qui la toglierebbe da sotto i
   * piedi a chi la usa ancora. Le smaltisce `smaltisci`, una volta sola.
   */
  #tingi(modello, { foglia = 0, chiaro = 0 }) {
    const fatti = new Map();

    const copiaDi = (materiale) => {
      if (fatti.has(materiale)) return fatti.get(materiale);

      const copia = materiale.clone();
      const hsl = {};
      copia.color.getHSL(hsl);

      const foglie = hsl.h >= VERDE_DA && hsl.h <= VERDE_A;

      copia.color.setHSL(
        foglie ? (hsl.h + foglia + 1) % 1 : hsl.h,
        hsl.s,
        // Il vaso si schiarisce con la pianta, ma della metà: due
        // piante identiche in due vasi identici restano due copie, due
        // piante diverse in vasi appena diversi sono due piante.
        Math.min(0.94, Math.max(0.03, hsl.l * (1 + (foglie ? chiaro : chiaro / 2))))
      );

      this.#tinti.push(copia);
      fatti.set(materiale, copia);

      return copia;
    };

    modello.traverse((oggetto) => {
      if (!oggetto.isMesh || !oggetto.material) return;

      oggetto.material = Array.isArray(oggetto.material)
        ? oggetto.material.map(copiaDi)
        : copiaDi(oggetto.material);
    });
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

    // Prima le copie tinte, e solo il materiale: le immagini che ci
    // stanno attaccate sono quelle degli originali, e li si smaltisce
    // qui sotto.
    for (const materiale of this.#tinti) materiale.dispose();
    this.#tinti = [];

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
