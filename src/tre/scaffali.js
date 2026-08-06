import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { metri } from "./modelli";

/**
 * Il muro di librerie a sinistra.
 *
 *
 * PERCHÉ IL MOBILE NON È PIÙ UN MODELLO SCARICATO
 *
 * Ne sono stati provati due, e sono stati bocciati tutti e due per il
 * motivo opposto. La *Bookcase with Books* di Quaternius aveva cimasa
 * sagomata, modanature e ante cieche: «sembravano di una casa di una
 * vecchietta». La *Bookcase Open* di Kenney era il contrario — quattro
 * montanti e dei ripiani sospesi in mezzo: «sembrano degli scaffali».
 *
 * Il difetto era lo stesso in tutti e due i casi: **manca il pieno**. Un
 * mobile da biblioteca è una cassa — due fianchi interi, un fondo, una
 * cornice sopra e uno zoccolo sotto — e i libri stanno dentro a quella
 * cassa, non appoggiati su delle assi. Nessun pacchetto CC0 ne ha una
 * fatta così, e continuare a cercarne uno era la strada sbagliata: una
 * cassa di legno sono nove scatole, e saldate insieme costano **un
 * disegno solo**, meno di qualunque modello scaricabile.
 *
 * In più — ed è il vantaggio vero — è fatta del **legno della stanza**.
 * I modelli si portavano dietro il proprio materiale, un pino chiaro che
 * non c'entrava niente col parquet e con le travi; qui la libreria è
 * della stessa quercia del pavimento perché usa letteralmente lo stesso
 * materiale.
 *
 *
 * I LIBRI DELLE FILE DI SFONDO
 *
 * Non uno per uno: sono lontani, velati dalla nebbia e mai a fuoco.
 * Basta un blocco per ripiano con dipinti sopra i dorsi
 * (`creaTexturaDorsi`), e sono quattro disegni per mobile invece di
 * sessanta.
 */

// Le misure del mobile, in metri veri. Una libreria da sala di lettura è
// alta due e mezzo, profonda trentacinque e larga poco più di un metro:
// oltre, il ripiano si inarca.
const ALTEZZA_MOBILE = 2.5;
const LARGHEZZA_MOBILE = 1.16;
const PROFONDITA_MOBILE = 0.36;

const SPESSORE_FIANCO = 0.055;
const SPESSORE_RIPIANO = 0.045;
const ALTEZZA_ZOCCOLO = 0.16;
const ALTEZZA_CORNICE = 0.13;

// Quanti vani. Quattro: con l'altezza utile che resta, ognuno è alto
// mezzo metro scarso, cioè lo spazio in cui una copertina esposta di
// fronte respira invece di essere incastrata.
const VANI = 4;

// Quanto del vano occupa una copertina esposta.
const QUANTO_DEL_VANO = 0.72;

/* ==================================================
   IL MOBILE, costruito a mano
   ================================================== */

/** Le quote, in unità di scena, ricavate una volta sola dalle misure. */
function misureMobile() {
  const altezza = metri(ALTEZZA_MOBILE);
  const larghezza = metri(LARGHEZZA_MOBILE);
  const profondita = metri(PROFONDITA_MOBILE);

  const fianco = metri(SPESSORE_FIANCO);
  const ripiano = metri(SPESSORE_RIPIANO);
  const zoccolo = metri(ALTEZZA_ZOCCOLO);
  const cornice = metri(ALTEZZA_CORNICE);
  const fondo = metri(0.03);

  // Quello che resta fra zoccolo e cornice, diviso in vani uguali.
  const utileY = altezza - zoccolo - cornice;
  const vano = (utileY - (VANI - 1) * ripiano) / VANI;

  return {
    altezza,
    larghezza,
    profondita,
    fianco,
    ripiano,
    zoccolo,
    cornice,
    fondo,
    vano,
    // La luce fra i due fianchi: è lì che stanno i volumi.
    utileX: larghezza - 2 * fianco,
    // Il piano d'appoggio di ogni vano, dai piedi del mobile.
    quote: Array.from({ length: VANI }, (_, k) => zoccolo + k * (vano + ripiano))
  };
}

/**
 * La cassa: nove scatole saldate in una geometria sola.
 *
 * L'origine sta ai piedi, al centro, con il fronte verso +Z — le stesse
 * convenzioni dei modelli che arrivavano dal magazzino, così chi la posa
 * non deve cambiare niente.
 *
 * Zoccolo e cornice sporgono di qualche centimetro oltre i fianchi. Non
 * è un vezzo: è l'unica differenza fra una cassa di legno e un
 * parallelepipedo, ed è quello che l'occhio legge come «mobile».
 */
function creaGeometriaLibreria() {
  const m = misureMobile();
  const pezzi = [];

  const scatola = (lx, ly, lz, x, y, z) =>
    pezzi.push(new THREE.BoxGeometry(lx, ly, lz).translate(x, y, z));

  // I due fianchi, da terra alla cornice.
  for (const lato of [-1, 1]) {
    scatola(
      m.fianco,
      m.altezza,
      m.profondita,
      (lato * (m.larghezza - m.fianco)) / 2,
      m.altezza / 2,
      0
    );
  }

  // Il fondo. È il pezzo che distingue una libreria da uno scaffale: con
  // il fondo i volumi stanno *dentro* qualcosa, senza stanno appoggiati
  // sul niente e si vede il muro attraverso.
  scatola(
    m.larghezza,
    m.altezza - m.zoccolo,
    m.fondo,
    0,
    m.zoccolo + (m.altezza - m.zoccolo) / 2,
    -(m.profondita - m.fondo) / 2
  );

  // Lo zoccolo, che sporge, e la cornice, che sporge di più.
  scatola(m.larghezza + 0.06, m.zoccolo, m.profondita + 0.05, 0, m.zoccolo / 2, 0);
  scatola(
    m.larghezza + 0.14,
    m.cornice,
    m.profondita + 0.11,
    0,
    m.altezza - m.cornice / 2,
    0
  );

  // I ripiani. Il primo poggia sullo zoccolo, gli altri dividono i vani.
  for (const quota of m.quote) {
    scatola(m.utileX, m.ripiano, m.profondita - m.fondo, 0, quota - m.ripiano / 2, m.fondo / 2);
  }

  return mergeGeometries(pezzi, false);
}

/**
 * @param magazzino      da dove arrivano le piante
 * @param urlPiante      { alta, ricadente, larga }: la natura sopra i mobili
 * @param legno          il legno della stanza — lo stesso del pavimento
 * @param pavimentoY     la quota del pavimento
 * @param fondoZ         la parete di fondo, per la fila che ci si appoggia
 * @param sinistraX      la parete di sinistra
 * @param centroX        dove si centra la prima fila
 * @param frontZ         a che profondità sta la prima fila
 * @param fondoFinoA     fin dove arriva la fila appoggiata alla parete
 * @param saltaDaA       [da, a]: il tratto di parete di fondo da lasciare
 *                       libero, perché lì c'è la finestra
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
  urlPiante,
  legno,
  pavimentoY,
  fondoZ,
  sinistraX,
  centroX,
  frontZ,
  fondoFinoA,
  saltaDaA,
  geometriaLibro,
  materialeCarta,
  tinta
}) {
  const gruppo = new THREE.Group();
  const coperture = [];

  const m = misureMobile();
  const { larghezza, altezza, profondita } = m;

  // Una geometria sola per tutti i mobili: nove scatole saldate, e ogni
  // copia in scena è un altro nodo che punta agli stessi buffer.
  const geometria = creaGeometriaLibreria();

  const mobile = () => {
    const mesh = new THREE.Mesh(geometria, legno);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Un materiale solo per tutti i blocchi di dorsi delle file in fondo.
  const dorsi = new THREE.MeshStandardMaterial({
    map: creaTexturaDorsi(),
    roughness: 0.78,
    metalness: 0
  });

  // Cosa si contorna al passaggio del mouse. Ci va dentro tutto quello
  // che sta *davanti* alla prima fila, non solo i mobili: il contorno si
  // ricava mascherando gli oggetti scelti, e ogni cosa non scelta che ne
  // copre un pezzo gli apre un buco che diventa un altro bordo.
  const vetrine = [];

  /* ==================================================
     PRIMA FILA — quella con le copertine vere
     ================================================== */

  const VETRINE = 3;
  const passo = larghezza + 0.05;
  const vetrinaZ = frontZ;

  for (let i = 0; i < VETRINE; i++) {
    const x = centroX + (i - (VETRINE - 1) / 2) * passo;

    const mesh = mobile();
    mesh.position.set(x, pavimentoY, vetrinaZ);
    gruppo.add(mesh);
    vetrine.push(mesh);

    riempiDiCopertine({
      gruppo,
      m,
      x,
      z: vetrinaZ,
      pavimentoY,
      geometriaLibro,
      materialeCarta,
      tinta,
      coperture,
      vetrine
    });
  }

  /* ==================================================
     LE FILE DI SFONDO
     Servono a far capire che la stanza continua. Saltano il tratto
     dove c'è la finestra: una libreria davanti a una finestra è una
     libreria messa da qualcuno che non voleva vedere il mare.
     ================================================== */

  const controFondoZ = fondoZ + profondita / 2 + 0.08;
  const partenzaFondo = sinistraX + profondita + larghezza / 2;
  const quantiInFondo = Math.ceil((fondoFinoA - partenzaFondo) / passo);

  // Dove sono finiti davvero i mobili di fondo. Serve dopo, per il
  // verde: le cime su cui si posa una pianta sono quelle esistenti, e
  // quali esistano lo decide il salto della finestra, non un conto
  // fatto a parte che prima o poi va fuori sincrono.
  const cimeFondo = [];

  for (let i = 0; i < quantiInFondo; i++) {
    const x = partenzaFondo + i * passo;

    if (saltaDaA && x + larghezza / 2 > saltaDaA[0] && x - larghezza / 2 < saltaDaA[1]) {
      continue;
    }

    const mesh = mobile();
    mesh.position.set(x, pavimentoY, controFondoZ);
    gruppo.add(mesh);
    cimeFondo.push({ x, z: controFondoZ });

    riempiDiDorsi({ gruppo, m, mobile: mesh.position, dorsi, seme: i });
  }

  // Due sul fianco sinistro, girate: bastano a chiudere l'angolo e a
  // togliere l'impressione che la fila di mobili galleggi nel vuoto.
  const cimeFianco = [];

  for (const [k, z] of [
    controFondoZ + larghezza * 0.8,
    controFondoZ + larghezza * 1.95
  ].entries()) {
    const x = sinistraX + profondita / 2 + 0.08;

    const mesh = mobile();
    mesh.position.set(x, pavimentoY, z);
    mesh.rotation.y = Math.PI / 2;
    gruppo.add(mesh);
    cimeFianco.push({ x, z });

    riempiDiDorsi({
      gruppo,
      m,
      mobile: mesh.position,
      dorsi,
      seme: quantiInFondo + k,
      giraDi: Math.PI / 2
    });
  }

  /* ==================================================
     LA NATURA, sopra i mobili

     Le foglie che sporgono oltre lo spigolo rompono la riga dritta di
     tutti quei mobili in fila, che è la cosa che più di ogni altra fa
     sembrare finta una parete di scaffali. Ce n'erano due, tutte e due
     sulla prima fila: due piante su undici mobili sono due eccezioni,
     non un'abitudine, e si leggevano come tali.

     Adesso sono otto e stanno su tre piani di profondità — la prima
     fila, i mobili di fondo, i due girati sul fianco — e sono l'unica
     cosa in tutta quella parete che vari in altezza. La regola è una
     sola e vale per tutte: **una pianta sta dove c'è un piano su cui
     posarla**. Sopra un mobile c'è; in mezzo alla stanza no, ed è il
     motivo per cui quelle dell'angolo lettura erano state tolte.

     Non a caso, però: le cime scelte sono alternate, mai due di fila,
     perché una pianta su ogni mobile è una siepe. E ognuna ha la sua
     tinta e la sua misura (vedi `tinta` in `modelli.js`): tre modelli
     ripetuti otto volte con lo stesso verde si riconoscono come tre
     modelli ripetuti otto volte.
     ================================================== */

  if (urlPiante) {
    const cimaY = pavimentoY + altezza;

    const posaPianta = async ({ specie, x, z, alto, giroDi, foglia, chiaro }) => {
      const pianta = await magazzino.preleva(urlPiante[specie], {
        alto,
        tinta: { foglia, chiaro }
      });

      if (!pianta) return null;

      pianta.position.set(x, cimaY, z);
      pianta.rotation.y = giroDi;
      gruppo.add(pianta);

      return pianta;
    };

    /* Sulla prima fila. Le tre che si vedono da vicino, quindi sono le
       tre più diverse fra loro: una che ricade oltre lo spigolo di
       sinistra, una alta al centro, una che ricade dall'altra parte.
       Il verso di rotazione le stacca ancora. */
    const sopraVetrine = [
      { specie: "ricadente", i: 0, scarto: -0.3, alto: 0.38, giroDi: 0.6, foglia: -0.035, chiaro: 0.1 },
      { specie: "alta", i: 1, scarto: 0.24, alto: 0.52, giroDi: 2.1, foglia: 0.045, chiaro: -0.1 },
      { specie: "ricadente", i: 2, scarto: 0.32, alto: 0.31, giroDi: -1.2, foglia: 0.06, chiaro: 0.04 }
    ];

    for (const { i, scarto, ...resto } of sopraVetrine) {
      const pianta = await posaPianta({
        ...resto,
        x: centroX + (i - (VETRINE - 1) / 2) * passo + scarto * larghezza,
        z: vetrinaZ
      });

      // Le piante della prima fila si contornano insieme ai mobili:
      // stanno davanti a loro, e un contorno che le salta si aprirebbe
      // un buco a forma di foglia.
      if (pianta) vetrine.push(pianta);
    }

    /* Sui mobili di fondo, una ogni due. Sono lontane e velate dalla
       nebbia: contano come sagome sopra la riga degli scaffali, e
       infatti sono le più alte. Quella accanto alla finestra prende la
       luce fredda che entra, e si stacca da tutte le altre. */
    const sopraFondo = [
      { specie: "alta", alto: 0.6, giroDi: 0.9, foglia: 0.05, chiaro: -0.12 },
      { specie: "larga", alto: 0.46, giroDi: -0.4, foglia: -0.05, chiaro: 0.07 },
      { specie: "alta", alto: 0.54, giroDi: 2.6, foglia: 0.02, chiaro: 0.14 }
    ];

    // Una sì e una no, sulle cime che esistono davvero. Contare i mobili
    // a priori non funziona: quanti ne restano lo decide il salto della
    // finestra, e con gli indici scritti a mano (1, 3, 5) su tre mobili
    // superstiti se ne serviva **uno solo** — le altre due piante
    // finivano su cime che non c'erano, e sparivano senza un errore.
    for (let i = 0, quale = 0; i < cimeFondo.length; i += 2, quale++) {
      const come = sopraFondo[quale % sopraFondo.length];
      await posaPianta({ ...come, x: cimeFondo[i].x, z: cimeFondo[i].z });
    }

    /* Su quelli girati del fianco sinistro: una sola, sul più vicino.
       Chiude l'angolo di sinistra, che è l'unico punto in cui la fila di
       mobili finisce senza niente sopra. */
    const fianco = cimeFianco[1];

    if (fianco) {
      await posaPianta({
        specie: "ricadente",
        x: fianco.x,
        z: fianco.z,
        alto: 0.42,
        giroDi: -Math.PI / 2 + 0.4,
        foglia: -0.02,
        chiaro: -0.05
      });
    }
  }

  /* ==================================================
     IL BERSAGLIO
     Un solo rettangolo invisibile davanti a tutta la prima fila: i
     libri qui non si mirano uno per uno, si entra e basta.
     ================================================== */

  const bersaglio = new THREE.Mesh(
    new THREE.PlaneGeometry(passo * VETRINE, altezza),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglio.position.set(centroX, pavimentoY + altezza / 2, vetrinaZ + profondita / 2 + 0.5);
  // Il nome del punto e basta: cosa succede cliccandolo e da che parte
  // ci si arriva lo decidono `scena.js` e la pagina.
  bersaglio.userData = { punto: "librerie" };
  gruppo.add(bersaglio);

  return { gruppo, coperture, bersaglio, evidenza: vetrine };
}

/**
 * I libri delle file in fondo: un blocco per ripiano, coi dorsi dipinti
 * sopra.
 *
 * Il mobile nuovo è vuoto, e riempirlo di volumi veri come la prima fila
 * costerebbe sessanta disegni per mobile — moltiplicati per i nove
 * mobili di sfondo fanno più di tutto il resto della stanza messo
 * insieme, per una roba che sta a dodici unità di distanza dietro la
 * nebbia. Tre scatole con sopra una texture fanno esattamente la stessa
 * figura.
 *
 * Lo scorrimento della texture cambia mobile per mobile (`seme`): la
 * stessa immagine ripetuta identica su nove scaffali si legge come una
 * carta da parati, spostata di un pezzo no.
 */
function riempiDiDorsi({ gruppo, m, mobile, dorsi, seme, giraDi = 0 }) {
  const altoBlocco = m.vano * 0.88;
  const spesso = m.profondita * 0.55;
  // I dorsi stanno appoggiati al fondo, non a filo del fronte: è così
  // che sta un libro su un ripiano quando nessuno l'ha tirato fuori.
  const arretra = m.profondita / 2 - spesso / 2 - m.fondo;

  for (const [k, quota] of m.quote.entries()) {
    // Ogni blocco ha la sua fetta di texture: stessa immagine, punto di
    // partenza diverso. La copia costa un oggetto, non un'altra texture.
    const materiale = dorsi.clone();
    materiale.map = dorsi.map.clone();
    materiale.map.offset.x = ((seme * 3 + k) % 7) / 7;
    materiale.map.needsUpdate = true;

    const blocco = new THREE.Mesh(
      new THREE.BoxGeometry(m.utileX, altoBlocco, spesso),
      materiale
    );

    blocco.position.set(
      mobile.x + Math.sin(giraDi) * -arretra,
      mobile.y + quota + altoBlocco / 2,
      mobile.z + Math.cos(giraDi) * -arretra
    );
    blocco.rotation.y = giraDi;
    blocco.receiveShadow = true;

    gruppo.add(blocco);
  }
}

/**
 * Una fila di dorsi, dipinta una volta sola.
 *
 * Larghezze e colori escono da un conto stabile, non da un sorteggio: la
 * texture nasce una volta per visita e non deve cambiare fra un
 * rimontaggio e l'altro. La ripetizione orizzontale la fa `wrapS`.
 */
function creaTexturaDorsi() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#241a12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const TINTE = ["#7d3b32", "#3d5a6c", "#8a6a2f", "#4b5f42", "#6b4a63", "#8a5230", "#3f4550"];

  let x = 0;
  let n = 104729;

  while (x < canvas.width) {
    n = (n * 1103515245 + 12345) % 2147483648;

    const largo = 7 + (n % 13);
    const tinta = TINTE[(n >> 7) % TINTE.length];
    // Non tutti alti uguali, e non tutti dritti fino in cima: un ripiano
    // in cui ogni dorso arriva alla stessa quota è una tastiera.
    const alto = canvas.height * (0.74 + (((n >> 11) % 26) / 100));

    ctx.fillStyle = tinta;
    ctx.fillRect(x, canvas.height - alto, largo, alto);

    // Il filo chiaro del titolo, e l'ombra fra un dorso e l'altro.
    if (largo > 10) {
      ctx.fillStyle = "rgba(240,225,190,0.5)";
      ctx.fillRect(x + 2, canvas.height - alto * 0.72, largo - 4, 3);
    }

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x + largo - 1, canvas.height - alto, 1, alto);

    x += largo;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;

  return texture;
}

/**
 * Le copertine di un singolo mobile: un ripiano dopo l'altro, quante ne
 * stanno per ripiano. Restano a tinta piatta finché non arrivano le
 * immagini — lo scaffale è già pieno al primo fotogramma, che è tutto il
 * punto.
 */
function riempiDiCopertine({
  gruppo,
  m,
  x,
  z,
  pavimentoY,
  geometriaLibro,
  materialeCarta,
  tinta,
  coperture,
  vetrine
}) {
  const utile = m.utileX;
  const altezzaLibro = m.vano * QUANTO_DEL_VANO;
  const larghezzaLibro = altezzaLibro * 0.71; // il rapporto di un tankobon

  const quanti = Math.max(1, Math.floor(utile / (larghezzaLibro * 1.06)));
  const passo = utile / quanti;

  for (const quota of m.quote) {
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
        pavimentoY + quota + altezzaLibro / 2,
        // Esposte di fronte, quasi a filo del ripiano: il volume sporge
        // giusto quel poco che serve a prenderlo.
        z + m.profondita / 2 - spessore / 2 - 0.04
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
