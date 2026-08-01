import * as THREE from "three";
import { metri } from "./modelli";

/**
 * L'angolo lettura, in mezzo alla stanza.
 *
 * Esisteva già ma non si leggeva come arredo: tappeto, poltroncina e
 * pianta erano posati con fattori di scala scelti a occhio, e il
 * risultato era una poltrona alta mezza unità accanto a una persona
 * alta due e sei — mobili da casa delle bambole. Qui le misure sono
 * quelle vere (una poltrona è alta ottanta centimetri) e se le sbriga
 * `preleva`.
 *
 * Riempie il tratto fra gli scaffali e il banco, che altrimenti si
 * legge come vuoto invece che come profondità. Una cosa sola è
 * cliccabile: il tavolino col volume aperto sopra, che porta a In
 * lettura. Prima ci si arrivava dai libri posati sul banco, e non aveva
 * senso — il posto dove si legge è dove ci si siede.
 */
export async function costruisciAngoloLettura({
  magazzino,
  url,
  pavimentoY,
  centroX,
  centroZ
}) {
  const gruppo = new THREE.Group();

  const posa = async (chiave, misura, { x, z, ry = 0 }) => {
    const oggetto = await magazzino.preleva(url[chiave], misura);
    if (!oggetto) return null;

    oggetto.position.set(centroX + x, pavimentoY, centroZ + z);
    oggetto.rotation.y = ry;
    gruppo.add(oggetto);

    return oggetto;
  };

  // Il tappeto va posato per primo e sollevato di un pelo: due piani
  // complanari sul pavimento litigano per lo stesso pixel e il tappeto
  // si riempie di chiazze.
  const tappeto = await posa("tappeto", { largo: 2.6 }, { x: 0, z: 0 });
  if (tappeto) tappeto.position.y += 0.012;

  // Due poltroncine una di fronte all'altra, non una sola girata verso
  // il nulla: due sedie che si guardano dicono "qui ci si siede a
  // leggere" senza bisogno di nessun'altra spiegazione.
  await posa("poltrona", { alto: 0.76 }, { x: -metri(0.72), z: metri(0.12), ry: 1.15 });
  await posa("poltrona", { alto: 0.76 }, { x: metri(0.72), z: -metri(0.08), ry: -1.9 });

  const tavolino = await posa("tavolino", { largo: 0.8 }, { x: 0, z: metri(0.05), ry: 0.12 });

  // Il tavolino è il punto di In lettura: si contorna lui col volume che
  // ci sta sopra, e si clicca tutto insieme.
  let bersaglio = null;
  let evidenza = null;

  if (tavolino) {
    const libro = await magazzino.preleva(url.libroAperto, { alto: 0.05 });

    if (libro) {
      libro.position.set(
        centroX + metri(0.02),
        pavimentoY + tavolino.userData.misure.y,
        centroZ + metri(0.05)
      );
      libro.rotation.y = 0.7;
      gruppo.add(libro);
    }

    // Una scatola attorno al tavolo intero, non attorno al solo libro:
    // le gambe di un tavolino basso sono sottili e da sette metri di
    // distanza un bersaglio grande quanto un volume aperto è un
    // francobollo da centrare col mouse.
    const misure = tavolino.userData.misure;
    const altezza = misure.y + metri(0.14); // il piano più quello che ci sta sopra

    bersaglio = new THREE.Mesh(
      new THREE.BoxGeometry(misure.x * 1.12, altezza, misure.z * 1.12),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    bersaglio.position.set(
      tavolino.position.x,
      pavimentoY + altezza / 2,
      tavolino.position.z
    );
    bersaglio.userData = { punto: "tavolino" };
    gruppo.add(bersaglio);

    evidenza = [tavolino, libro].filter(Boolean);
  }

  const lampada = await posa("lampadaTerra", { alto: 1.5 }, {
    x: -metri(1.2),
    z: -metri(0.7)
  });

  if (lampada) {
    // Una luce dentro il paralume, non solo un paralume acceso: è lei a
    // dare all'angolo un centro invece di lasciarlo illuminato di
    // rimbalzo come tutto il resto.
    const alone = new THREE.PointLight(0xffcf99, 6, metri(3.4), 2);
    alone.position.set(
      centroX - metri(1.2),
      pavimentoY + metri(1.42),
      centroZ - metri(0.7)
    );
    gruppo.add(alone);
  }

  // Le piante si misurano in altezza, ma questo modello è più largo che
  // alto: chiedergliene una da un metro e venti ne fa un cespuglio da un
  // metro e sessanta di diametro, che è come sono diventate alberi in
  // mezzo alla stanza. Basse, e defilate.
  await posa("pianta", { alto: 0.72 }, { x: metri(1.75), z: -metri(0.5) });
  await posa("pianta", { alto: 0.6 }, { x: -metri(1.9), z: metri(0.8), ry: 1.4 });

  return { gruppo, bersaglio, evidenza };
}
