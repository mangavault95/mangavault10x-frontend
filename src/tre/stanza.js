import * as THREE from "three";
import { metri } from "./modelli";

/**
 * Il guscio della stanza: pavimento, pareti, soffitto, travi.
 *
 * Prima non esisteva. C'erano un rettangolo di pavimento e un pannello
 * di intonaco alto poco più del bancone, sospeso a mezz'aria dietro al
 * bibliotecario: da lì l'impressione — giusta — di una stanza "fatta a
 * metà". Il resto era sfondo sfumato, e nessun mobile per quanto bello
 * può sembrare arredamento se sta in mezzo al nulla.
 *
 * Questo è l'unico pezzo della stanza costruito con la geometria invece
 * che con modelli scaricati, ed è voluto: l'architettura non è un
 * oggetto d'arredo. Un pacchetto di pareti modulari andrebbe ripetuto a
 * blocchi di misura fissa, con i giunti in vista e uno stile che non
 * c'entra niente con il legno vero delle texture — mentre una parete è
 * quattro piani e due texture, e viene meglio così.
 *
 * Le altezze sono in metri veri (vedi `modelli.js`), non in numeri
 * scelti a occhio: una boiserie arriva al metro e dieci perché è lì che
 * arriva una boiserie.
 */

const BOISERIE_ALTEZZA = 1.15; // metri
const ZOCCOLINO_ALTEZZA = 0.16;
const CORNICE_ALTEZZA = 0.28;

/**
 * Una parete completa: intonaco sopra, boiserie di legno sotto, con
 * zoccolino a terra, listello di separazione e cornice al soffitto.
 *
 * Tutto viene costruito nel piano XY con il centro in basso a sinistra
 * su (−larghezza/2, 0): chi chiama la ruota e la sposta dove serve, così
 * la stessa funzione fa il fondo e i due fianchi.
 */
export function costruisciParete({ larghezza, altezza, intonaco, legno, ottone }) {
  const parete = new THREE.Group();

  const yBoiserie = metri(BOISERIE_ALTEZZA);
  const yZoccolino = metri(ZOCCOLINO_ALTEZZA);
  const yCornice = metri(CORNICE_ALTEZZA);

  const intonacata = new THREE.Mesh(
    new THREE.PlaneGeometry(larghezza, altezza - yBoiserie),
    intonaco
  );
  intonacata.position.set(0, yBoiserie + (altezza - yBoiserie) / 2, 0);
  intonacata.receiveShadow = true;
  parete.add(intonacata);

  const boiserie = new THREE.Mesh(new THREE.BoxGeometry(larghezza, yBoiserie, 0.1), legno);
  boiserie.position.set(0, yBoiserie / 2, 0.05);
  boiserie.receiveShadow = true;
  parete.add(boiserie);

  // I due listelli che chiudono la boiserie sopra e sotto. Sono la
  // ragione per cui una parete di legno si legge come falegnameria
  // invece che come un rettangolo marrone incollato al muro.
  const zoccolino = new THREE.Mesh(new THREE.BoxGeometry(larghezza, yZoccolino, 0.16), legno);
  zoccolino.position.set(0, yZoccolino / 2, 0.08);
  zoccolino.castShadow = true;
  zoccolino.receiveShadow = true;
  parete.add(zoccolino);

  const listello = new THREE.Mesh(new THREE.BoxGeometry(larghezza, 0.1, 0.16), legno);
  listello.position.set(0, yBoiserie, 0.08);
  listello.castShadow = true;
  listello.receiveShadow = true;
  parete.add(listello);

  // La cornice al soffitto: un profilo di legno più un filo d'ottone.
  // Costa due scatole e chiude la stanza in alto, che è la metà che
  // mancava del tutto.
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(larghezza, yCornice, 0.2), legno);
  cornice.position.set(0, altezza - yCornice / 2, 0.1);
  cornice.receiveShadow = true;
  parete.add(cornice);

  const filo = new THREE.Mesh(new THREE.BoxGeometry(larghezza, 0.05, 0.22), ottone);
  filo.position.set(0, altezza - yCornice - 0.02, 0.11);
  parete.add(filo);

  return parete;
}

/**
 * @returns { gruppo, soffittoY, agganciLampadari }
 *   `agganciLampadari` sono i punti sul soffitto dove appendere le
 *   lampade: li decide la posizione delle travi, non chi arreda.
 */
export function costruisciGuscio({
  pavimentoY,
  altezza,
  larghezza,
  fondoZ,
  davantiZ,
  traviFinoZ = davantiZ,
  intonaco,
  legno,
  legnoPavimento,
  ottone
}) {
  const gruppo = new THREE.Group();
  const soffittoY = pavimentoY + altezza;
  const profondita = davantiZ - fondoZ;

  /* ---------- Pavimento ---------- */

  const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(larghezza, profondita),
    legnoPavimento
  );
  pavimento.rotation.x = -Math.PI / 2;
  pavimento.position.set(0, pavimentoY, fondoZ + profondita / 2);
  pavimento.receiveShadow = true;
  gruppo.add(pavimento);

  /* ---------- Pareti ---------- */

  const fondo = costruisciParete({ larghezza, altezza, intonaco, legno, ottone });
  fondo.position.set(0, pavimentoY, fondoZ);
  gruppo.add(fondo);

  for (const lato of [-1, 1]) {
    const fianco = costruisciParete({
      larghezza: profondita,
      altezza,
      intonaco,
      legno,
      ottone
    });

    fianco.position.set((lato * larghezza) / 2, pavimentoY, fondoZ + profondita / 2);
    fianco.rotation.y = lato * -Math.PI / 2;
    gruppo.add(fianco);
  }

  /* ---------- Soffitto e travi ---------- */

  const soffitto = new THREE.Mesh(new THREE.PlaneGeometry(larghezza, profondita), intonaco);
  soffitto.rotation.x = Math.PI / 2;
  soffitto.position.set(0, soffittoY, fondoZ + profondita / 2);
  soffitto.receiveShadow = true;
  gruppo.add(soffitto);

  // Travi di legno da parete a parete. Non sono decorazione: sono
  // quello che dà una misura all'altezza: un soffitto liscio a cinque
  // metri e uno a tre si assomigliano, uno con le travi no.
  const agganciLampadari = [];
  const passoTravi = metri(2.2);
  const quante = Math.floor(profondita / passoTravi);

  for (let i = 0; i < quante; i++) {
    const z = fondoZ + passoTravi * (i + 0.7);

    if (z > traviFinoZ) break;

    const trave = new THREE.Mesh(new THREE.BoxGeometry(larghezza, 0.34, 0.28), legno);
    trave.position.set(0, soffittoY - 0.17, z);
    trave.castShadow = true;
    trave.receiveShadow = true;
    gruppo.add(trave);

    agganciLampadari.push(z);
  }

  return { gruppo, soffittoY, agganciLampadari };
}
