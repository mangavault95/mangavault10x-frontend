import * as THREE from "three";
import { Magazzino } from "./modelli";

/**
 * Il muro di librerie a sinistra.
 *
 * La versione precedente ne aveva due tipi diversi affiancati — una
 * costruita a mano, ripiano per ripiano, e un'altra scaricata, di un
 * altro legno e di un'altra forma — e si vedeva. Qui il mobile è uno
 * solo, ripetuto: cambia dove sta, non com'è fatto.
 *
 * Gli scaffali in prima fila mostrano le copertine vere della
 * collezione. Il modello arriva già pieno dei suoi libri finti, quindi
 * per quelli davanti i libri finti si spengono (`nascondiPerMateriale`)
 * e al loro posto vanno le copertine; quelli in fondo tengono i propri.
 * È lo stesso mobile in entrambi i casi: era il punto.
 *
 * Fonte del modello: "Bookcase with Books", Quaternius — CC0.
 *
 *
 * DA DOVE ESCONO I NUMERI DEI RIPIANI
 *
 * Misurati sul modello, non scelti a occhio: le quattro file di libri
 * incorporati stanno a queste quote, e occupano questa larghezza. Sono
 * scritti come frazioni dell'altezza nativa del mobile, così restano
 * giusti a qualunque scala lo si porti.
 */

const ALTEZZA_NATIVA = 3.37;

// Quota del piano di ogni ripiano, dai piedi del mobile.
const RIPIANI = [1.27, 1.72, 2.22, 2.72].map((y) => y / ALTEZZA_NATIVA);

// Quanto spazio libero c'è fra un ripiano e quello sopra.
const VANO = 0.46 / ALTEZZA_NATIVA;

// La parte di ripiano dove i libri ci stanno davvero (i montanti
// laterali mangiano il resto).
const LARGHEZZA_UTILE = 1.42 / ALTEZZA_NATIVA;

// Dove finisce il fronte dei libri, rispetto al centro del mobile.
const FRONTE = 0.195 / ALTEZZA_NATIVA;

// I libri finti del modello: si riconoscono dal nome del materiale.
const MATERIALI_LIBRI_FINTI = /^Cover|^Pages/;

const ALTEZZA_MOBILE = 2.5; // metri

/**
 * @param magazzino      da dove arrivano le copie del modello
 * @param urlLibreria    il .glb del mobile
 * @param urlScala       la scala a pioli da appoggiare alla prima fila
 * @param pavimentoY     la quota del pavimento
 * @param fondoZ         la parete di fondo, per la fila che ci si appoggia
 * @param sinistraX      la parete di sinistra
 * @param centroX        dove si centra la prima fila
 * @param frontZ         a che profondità sta la prima fila
 * @param fondoFinoA     fin dove arriva la fila appoggiata alla parete
 * @param geometriaLibro la scatola condivisa con il resto della scena
 * @param materialeCarta le facce che non sono la copertina
 * @param tinta          il colore di ripiego di una copertina non ancora arrivata
 *
 * @returns { gruppo, coperture, bersaglio, evidenza }
 *   `coperture` sono i materiali su cui chi chiama applicherà le
 *   immagini vere, in ordine da sinistra a destra e dall'alto in basso;
 *   `evidenza` sono i mobili che si accendono al passaggio del mouse.
 */
export async function costruisciLibrerie({
  magazzino,
  urlLibreria,
  urlScala,
  pavimentoY,
  fondoZ,
  sinistraX,
  centroX,
  frontZ,
  fondoFinoA,
  geometriaLibro,
  materialeCarta,
  tinta
}) {
  const gruppo = new THREE.Group();
  const coperture = [];

  // Cosa si contorna al passaggio del mouse. Ci va dentro tutto quello
  // che sta *davanti* alla prima fila, non solo i mobili: il contorno si
  // ricava mascherando gli oggetti scelti, e ogni cosa non scelta che ne
  // copre un pezzo gli apre un buco che diventa un altro bordo. Con le
  // sole librerie, ognuna delle duecento copertine si ritrovava il suo
  // profilo giallo.
  const vetrine = [];

  const primo = await magazzino.preleva(urlLibreria, { alto: ALTEZZA_MOBILE });
  if (!primo) return null;

  const { x: larghezza, y: altezza, z: profondita } = primo.userData.misure;

  // Le copie successive escono dallo stesso magazzino: geometrie e
  // materiali sono già in memoria, ne nasce solo un altro nodo di scena.
  const copia = async () => magazzino.preleva(urlLibreria, { alto: ALTEZZA_MOBILE });

  /* ==================================================
     PRIMA FILA — quella con le copertine vere
     ================================================== */

  const VETRINE = 3;
  const passo = larghezza + 0.06;
  const vetrinaZ = frontZ;
  const vetrinaCentroX = centroX;

  for (let i = 0; i < VETRINE; i++) {
    const mobile = i === 0 ? primo : await copia();
    if (!mobile) return null;

    Magazzino.nascondiPerMateriale(mobile, MATERIALI_LIBRI_FINTI);

    const x = vetrinaCentroX + (i - (VETRINE - 1) / 2) * passo;

    mobile.position.set(x, pavimentoY, vetrinaZ);
    gruppo.add(mobile);
    vetrine.push(mobile);

    riempiDiCopertine({
      gruppo,
      x,
      z: vetrinaZ,
      pavimentoY,
      altezza,
      geometriaLibro,
      materialeCarta,
      tinta,
      coperture,
      vetrine
    });
  }

  /* ==================================================
     LE FILE DI SFONDO — stesso mobile, libri suoi
     Servono a far capire che la stanza continua: sono lontane, la
     nebbia le vela, e non costano nessuna immagine da scaricare.
     ================================================== */

  const controFondoZ = fondoZ + profondita / 2 + 0.08;
  const partenzaFondo = sinistraX + profondita + larghezza / 2;
  const quantiInFondo = Math.ceil((fondoFinoA - partenzaFondo) / passo);

  for (let i = 0; i < quantiInFondo; i++) {
    const mobile = await copia();
    if (!mobile) return null;

    mobile.position.set(partenzaFondo + i * passo, pavimentoY, controFondoZ);
    gruppo.add(mobile);
  }

  // Due sul fianco sinistro, girate: bastano a chiudere l'angolo e a
  // togliere l'impressione che la fila di mobili galleggi nel vuoto.
  for (const z of [controFondoZ + larghezza * 0.75, controFondoZ + larghezza * 1.8]) {
    const mobile = await copia();
    if (!mobile) return null;

    mobile.position.set(sinistraX + profondita / 2 + 0.08, pavimentoY, z);
    mobile.rotation.y = Math.PI / 2;
    gruppo.add(mobile);
  }

  /* ==================================================
     LA SCALA A PIOLI
     Appoggiata alla prima fila. È il dettaglio che, più di ogni altro,
     dice "biblioteca" invece di "scaffale": nessuno mette una scala
     davanti a un mobile alto un metro e mezzo.
     ================================================== */

  const scala = await magazzino.preleva(urlScala, { alto: ALTEZZA_MOBILE * 1.15 });

  if (scala) {
    scala.position.set(
      vetrinaCentroX + passo * (VETRINE - 1) / 2 - 0.35,
      pavimentoY,
      vetrinaZ + profondita / 2 + 0.42
    );
    scala.rotation.x = -0.13; // appoggiata, non in piedi da sola
    gruppo.add(scala);
    vetrine.push(scala);
  }

  /* ==================================================
     IL BERSAGLIO
     Un solo rettangolo invisibile davanti a tutta la prima fila: i
     libri qui non si mirano uno per uno (sono piccoli, e la loro scheda
     sta dentro lo scaffale vero), si entra e basta.
     ================================================== */

  const bersaglio = new THREE.Mesh(
    new THREE.PlaneGeometry(passo * VETRINE, altezza),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglio.position.set(vetrinaCentroX, pavimentoY + altezza / 2, vetrinaZ + profondita / 2 + 0.5);
  bersaglio.userData = { azione: { tipo: "scaffale" } };
  gruppo.add(bersaglio);

  return { gruppo, coperture, bersaglio, evidenza: vetrine };
}

/**
 * Le copertine di un singolo mobile: quattro ripiani, quante ne stanno
 * per ripiano. Restano a tinta piatta finché non arrivano le immagini —
 * lo scaffale è già pieno al primo fotogramma, che è tutto il punto.
 */
function riempiDiCopertine({
  gruppo,
  x,
  z,
  pavimentoY,
  altezza,
  geometriaLibro,
  materialeCarta,
  tinta,
  coperture,
  vetrine
}) {
  const utile = LARGHEZZA_UTILE * altezza;
  const altezzaLibro = VANO * altezza * 0.92;
  const larghezzaLibro = altezzaLibro * 0.71; // il rapporto di un tankobon

  const quanti = Math.max(1, Math.floor(utile / (larghezzaLibro * 1.06)));
  const passo = utile / quanti;

  for (const quota of RIPIANI) {
    for (let i = 0; i < quanti; i++) {
      const copertina = new THREE.MeshStandardMaterial({
        color: tinta(`vetrina-${coperture.length}`),
        roughness: 0.6,
        metalness: 0.02
      });

      // Due materiali soli, non sei: la geometria arriva già con le
      // facce di carta raggruppate insieme (vedi `geometriaCopertina` in
      // `scena.js`), e la copertina è la faccia rivolta a chi entra.
      const libro = new THREE.Mesh(geometriaLibro, [materialeCarta, copertina]);

      // Uno spessore diverso libro per libro: non rappresenta nessun
      // dato, serve solo a non farne una fila di scatole identiche.
      const spessore = larghezzaLibro * (0.3 + (((coperture.length * 37) % 100) / 100) * 0.5);

      libro.scale.set(larghezzaLibro, altezzaLibro, spessore);
      libro.position.set(
        x + (i + 0.5) * passo - utile / 2,
        pavimentoY + quota * altezza + altezzaLibro / 2,
        z + FRONTE * altezza - spessore / 2
      );
      // Nessuna ombra proiettata: un volume dentro un mobile chiuso su
      // tre lati non ne getta nessuna che si veda, e ognuno di questi
      // costava un secondo disegno nella mappa delle ombre.
      libro.receiveShadow = true;

      gruppo.add(libro);
      coperture.push(copertina);
      vetrine.push(libro);
    }
  }
}
