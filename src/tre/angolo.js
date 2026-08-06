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
  //
  // I due angoli non sono a occhio. Questa poltrona ha lo **schienale a
  // +Z**, cioè guarda verso −Z: misurato sul modello (i vertici del
  // quinto più alto stanno tutti a Z positivo). Prima erano girate di
  // mezzo giro, e si vedevano due schienali che si davano le spalle
  // attorno al tavolino. Girata verso il centro vuol dire ±π/2, più uno
  // scarto che le apre verso chi guarda: di tre quarti si vede la seduta,
  // di profilo si vedrebbe solo un fianco.
  const VERSO_IL_CENTRO = Math.PI / 2;
  const APERTURA = 0.36;

  await posa("poltrona", { alto: 0.76 }, {
    x: -metri(0.72),
    z: metri(0.12),
    ry: -VERSO_IL_CENTRO - APERTURA
  });

  await posa("poltrona", { alto: 0.76 }, {
    x: metri(0.72),
    z: -metri(0.08),
    ry: VERSO_IL_CENTRO + APERTURA
  });

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

  /* ---------- Le quinte ----------
     Davanti al tappeto, ai due lati, appena dentro l'inquadratura.

     Sotto il tappeto lo schermo era mezzo pavimento vuoto: una stanza
     inquadrata così è un fondale con davanti del linoleum, perché
     manca il **primo piano**. È il trucco più vecchio della scenografia
     e di ogni punta e clicca disegnato a mano — qualcosa di vicino e
     scuro ai bordi, che l'occhio salta subito ma senza il quale non c'è
     profondità: con solo il fondo e il mezzo, tutto sembra alla stessa
     distanza.

     Sono casse di legno con dei volumi accatastati sopra: roba arrivata
     e non ancora messa a scaffale, che è quello che sta per terra in
     ogni libreria vera. */

  const quinta = async (x, z, ry, altaCassa) => {
    const cassa = await magazzino.preleva(url.libri, { alto: altaCassa });
    if (!cassa) return;

    cassa.position.set(centroX + x, pavimentoY, centroZ + z);
    cassa.rotation.y = ry;
    gruppo.add(cassa);
  };

  await quinta(-metri(2.9), metri(2.6), 0.4, 0.44);
  await quinta(-metri(2.55), metri(3.3), -0.9, 0.28);
  await quinta(metri(2.85), metri(2.9), -0.5, 0.5);

  // Qui non ci vanno piante.
  //
  // Ce n'erano due, a terra ai lati del tappeto, e Carmine le ha fatte
  // togliere perché *sembravano messe a caso*. Erano messe a caso: una
  // pianta in mezzo a una stanza, senza un davanzale, un angolo o un
  // mobile su cui stare, non ha nessuna ragione di stare lì — e il
  // centro della stanza è il posto in cui una pianta è più d'intralcio,
  // perché è dove si cammina.
  //
  // La natura non è sparita, si è spostata dove sta nelle case vere:
  // sopra le librerie (`scaffali.js`) e sul banco (`bancone.js`).

  return { gruppo, bersaglio, evidenza };
}
