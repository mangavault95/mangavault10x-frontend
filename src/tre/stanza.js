import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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

// Ogni quanti metri di parete va un pilastro di pietra. Tre e mezzo è la
// campata di una sala a volte: più fitti sembrano una staccionata, più
// radi non si leggono come struttura.
const PASSO_LESENE = 3.5;

/**
 * Una parete completa: **pietra** sopra, boiserie di legno sotto, con
 * zoccolino a terra, listello di separazione e cornice al soffitto.
 *
 * Sopra era intonaco, ed è la ragione per cui le pareti sembravano
 * vuote: un piano beige uniforme alto tre metri non ha niente da
 * guardare, e nessun quadro appeso lo salva. La muratura invece ha una
 * trama sua — è la parete a essere interessante, non quello che ci si
 * appende sopra.
 *
 * Legno sotto e pietra sopra non è una scelta grafica, è come sono
 * costruite le sale vere: la pietra è la struttura, il legno è il
 * rivestimento che si mette dove la gente appoggia le spalle.
 *
 * Tutto viene costruito nel piano XY con il centro in basso a sinistra
 * su (−larghezza/2, 0): chi chiama la ruota e la sposta dove serve, così
 * la stessa funzione fa il fondo e i due fianchi.
 */
export function costruisciParete({
  larghezza,
  altezza,
  pietra,
  legno,
  ottone,
  senzaLesene = false,
  saltaDaA = null
}) {
  const parete = new THREE.Group();

  const yBoiserie = metri(BOISERIE_ALTEZZA);
  const yZoccolino = metri(ZOCCOLINO_ALTEZZA);
  const yCornice = metri(CORNICE_ALTEZZA);

  const muratura = new THREE.Mesh(
    new THREE.PlaneGeometry(larghezza, altezza - yBoiserie),
    pietra
  );
  muratura.position.set(0, yBoiserie + (altezza - yBoiserie) / 2, 0);
  muratura.receiveShadow = true;
  parete.add(muratura);

  /* Le lesene: pilastri piatti di pietra che salgono dalla boiserie
     alla cornice.
     ------------------------------------------------------------------
     Sono il pezzo che trasforma un muro in un'architettura. Una parete
     di pietra lunga venti metri senza niente che la scandisca è una
     texture; con le lesene diventa una fila di campate, e l'occhio ha
     qualcosa con cui misurare quant'è grande la stanza. Sono anche
     quello che aggancia visivamente le travi del soffitto: adesso ogni
     trave ha da dove partire. */
  // Il retrobanco le salta: là la parete è già piena di roba appesa —
  // insegna, locandine, bacheca — e una lesena in mezzo finiva davanti
  // al marchio, che è l'unica cosa di quel muro che deve leggersi.
  const quanteLesene = senzaLesene
    ? 0
    : Math.max(2, Math.round(larghezza / metri(PASSO_LESENE)));
  const passo = larghezza / quanteLesene;
  const altaLesena = altezza - yBoiserie - yCornice;
  const larga = metri(0.42);

  for (let i = 0; quanteLesene > 0 && i <= quanteLesene; i++) {
    const x = -larghezza / 2 + i * passo;

    /* Il tratto di parete lasciato libero.
       ----------------------------------------------------------------
       Sulla parete di fondo il passo delle lesene ne faceva capitare una
       esattamente al centro, che è dove sta la finestra: non davanti al
       muro ma **dentro l'apertura**, perché la veduta è appoggiata alla
       parete e la lesena sporge in avanti di otto centimetri. Dalla
       soglia si vedeva un pilastro di pietra piantato in mezzo al mare,
       che tagliava in due l'orizzonte — l'unica riga di tutta la scena
       che non deve avere niente davanti.

       Saltarla e basta è la cosa giusta: le lesene scandiscono le
       campate, e una campata con dentro una finestra è già scandita
       dalla finestra. */
    if (saltaDaA && x + larga / 2 > saltaDaA[0] && x - larga / 2 < saltaDaA[1]) {
      continue;
    }

    const lesena = new THREE.Mesh(
      new THREE.BoxGeometry(larga, altaLesena, metri(0.16)),
      pietra
    );

    lesena.position.set(x, yBoiserie + altaLesena / 2, metri(0.08));
    lesena.castShadow = true;
    lesena.receiveShadow = true;
    parete.add(lesena);
  }

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

/* ==================================================
   IL TAVOLATO DEL PAVIMENTO
   ================================================== */

/**
 * Il pavimento a doghe, disegnato invece che scaricato.
 *
 *
 * PERCHÉ NON LA STESSA TEXTURE DI TUTTO IL RESTO
 *
 * Perché il giudizio era che *il pavimento sembra tutt'uno con il
 * bancone e le mura*, ed era esatto: erano letteralmente la stessa
 * immagine. Il legno di Poly Haven vestiva lo scaffale, la boiserie, le
 * travi e il pavimento, cambiando solo il numero di ripetizioni — e un
 * numero di ripetizioni non è una differenza di materiale. Il risultato
 * è che dalla soglia il marrone partiva dai piedi, saliva lungo la
 * boiserie, passava per il banco e finiva nelle travi senza mai un
 * bordo: una stanza foderata di un colore solo, in cui non si capiva
 * dove finisse una superficie e cominciasse l'altra.
 *
 * Un pavimento vero è diverso dai mobili in tre modi, e sono tutti e tre
 * qui dentro:
 *
 * 1. **ha i giunti**. È fatto di assi lunghe un metro e larghe sedici
 *    centimetri, posate a corsi sfalsati, e le fughe fra una e l'altra
 *    sono righe scure vere — non una venatura. Sono quelle a dare la
 *    misura della stanza, e a dire dove finisce il pavimento e comincia
 *    lo zoccolino;
 * 2. **è più freddo e più scuro**. Il legno da mobile è lucidato e
 *    caldo, un tavolato calpestato per anni va sul bruno-grigio. Due
 *    marroni diversi si staccano l'uno dall'altro, lo stesso marrone
 *    no;
 * 3. **non è tutto dello stesso tono**. Ogni asse viene da un pezzo di
 *    tronco suo, e la sua tinta se la porta dietro.
 *
 * Le assi corrono in profondità, verso il fondo: è il verso che tiene
 * insieme la prospettiva, perché le fughe puntano tutte all'orizzonte —
 * di traverso sarebbero una scala a pioli sotto i piedi.
 *
 * Costa una tela sola, calcolata all'avvio e mai più toccata.
 */
export function creaTexturaPavimento() {
  const canvas = document.createElement("canvas");
  // Un metro in larghezza per due in profondità: sei doghe da sedici
  // centimetri, lunghe un metro e sfalsate a metà.
  canvas.width = 384;
  canvas.height = 768;

  const ctx = canvas.getContext("2d");

  const DOGHE = 6;
  const larga = canvas.width / DOGHE;
  const lunga = canvas.height / 2;

  // La fuga: il fondo su cui poggia tutto, e quello che si vede fra
  // un'asse e l'altra.
  ctx.fillStyle = "#241a12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Un conto stabile invece di un sorteggio: la texture nasce una volta
  // per visita e non deve cambiare fra un rimontaggio e l'altro.
  let n = 20260805;
  const prossimo = () => {
    n = (n * 1103515245 + 12345) % 2147483648;
    return (n >> 7) / 16777216;
  };

  for (let colonna = 0; colonna < DOGHE; colonna++) {
    // I corsi sfalsati: le colonne pari attaccano a metà asse. Un
    // tavolato con tutte le teste allineate è una scacchiera, non un
    // pavimento.
    const scarto = colonna % 2 === 0 ? 0 : lunga / 2;

    for (let corso = -1; corso <= 2; corso++) {
      const x = colonna * larga;
      const y = corso * lunga + scarto;

      // Il tono dell'asse. Bruno freddo, e ognuna col suo scarto: è la
      // differenza fra un pavimento e un piano marrone.
      const tono = prossimo();
      const chiaro = 26 + tono * 15;

      ctx.fillStyle = `hsl(${24 + tono * 8}, ${17 + tono * 9}%, ${chiaro}%)`;
      ctx.fillRect(x + 1.5, y + 2, larga - 3, lunga - 4);

      // Lo smusso: il filo chiaro sul bordo sinistro e l'ombra su
      // quello destro. È quello che fa stare le assi *dentro* il
      // pavimento invece che disegnate sopra.
      ctx.fillStyle = "rgba(255,236,200,0.09)";
      ctx.fillRect(x + 1.5, y + 2, 2, lunga - 4);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(x + larga - 3.5, y + 2, 2, lunga - 4);

      // Le venature: righe lunghe quanto l'asse, appena più scure o più
      // chiare del fondo, con una piega in mezzo. Dritte sarebbero
      // rigature.
      const quante = 3 + Math.floor(prossimo() * 4);

      for (let v = 0; v < quante; v++) {
        const vx = x + 4 + prossimo() * (larga - 9);
        const scuro = prossimo() > 0.45;

        ctx.strokeStyle = scuro
          ? `rgba(28,18,10,${0.1 + prossimo() * 0.18})`
          : `rgba(226,196,152,${0.05 + prossimo() * 0.08})`;
        ctx.lineWidth = 0.8 + prossimo() * 1.4;

        ctx.beginPath();
        ctx.moveTo(vx, y + 3);
        ctx.bezierCurveTo(
          vx + (prossimo() - 0.5) * 9,
          y + lunga * 0.34,
          vx + (prossimo() - 0.5) * 9,
          y + lunga * 0.7,
          vx + (prossimo() - 0.5) * 5,
          y + lunga - 3
        );
        ctx.stroke();
      }

      // I due nodi: non su tutte le assi, o sembra un tronco solo
      // affettato male.
      if (prossimo() > 0.62) {
        const nx = x + 6 + prossimo() * (larga - 12);
        const ny = y + 12 + prossimo() * (lunga - 24);

        for (let anello = 3; anello > 0; anello--) {
          ctx.strokeStyle = `rgba(30,19,10,${0.34 - anello * 0.06})`;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(nx, ny, anello * 1.9, anello * 3.4, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Le assi si guardano di sbieco e da lontano: senza filtro anisotropo
  // le fughe in fondo alla stanza diventano un formicolio.
  texture.anisotropy = 8;

  return texture;
}

/* ==================================================
   IL LAMPADARIO A RUOTA
   ================================================== */

/**
 * Una ruota di legno con sopra le candele, appesa a tre catene.
 *
 * Prima erano globi di vetro, poi un lampadario a bracci: tutti e due
 * bocciati, e il secondo con la motivazione giusta — *«troppo
 * eleganti»*. Un paralume è un oggetto industriale, e in una sala di
 * pietra con le travi a vista non c'è niente che possa reggerlo.
 *
 * Questo è il lampadario più vecchio che esista: un cerchio di legno,
 * qualche candela sopra, tre catene. Non è un modello scaricato per la
 * stessa ragione per cui non lo è la libreria — di rustico vero in CC0
 * non ce n'era, e un cerchio con dei cilindri sopra sono quindici
 * scatole. Costa **tre disegni**: il legno, la cera, le fiamme.
 *
 * Le fiamme sono `MeshBasicMaterial`: non risentono della luce, quindi
 * restano accese anche nell'ombra sotto le travi. È l'unico modo in cui
 * una fiamma si comporta correttamente senza costare una luce vera per
 * ognuna — le luci qui sono una per lampadario, al centro della ruota.
 */
export function creaLampadario({ raggio, legno }) {
  const gruppo = new THREE.Group();

  const CANDELE = 6;
  const sezione = raggio * 0.13;
  const altoCatena = raggio * 1.5;

  /* ---- Il legno: cerchio e catene ---- */

  const pezziLegno = [];

  // Il cerchio, fatto di dodici tratti dritti invece che di una curva.
  // Una ruota di legno è così davvero: sono doghe, e gli spigoli fra una
  // e l'altra sono quello che la fa leggere come costruita a mano.
  const LATI = 12;

  for (let i = 0; i < LATI; i++) {
    const angolo = (Math.PI * 2 * i) / LATI;
    const corda = 2 * raggio * Math.sin(Math.PI / LATI) * 1.06;

    const doga = new THREE.BoxGeometry(corda, sezione, sezione * 1.5);
    doga.rotateY(-angolo);
    doga.translate(Math.cos(angolo) * raggio, 0, -Math.sin(angolo) * raggio);
    pezziLegno.push(doga);
  }

  // Le tre catene. Sottili e leggermente convergenti verso l'alto, come
  // stanno le catene vere: parallele sembrerebbero tubi.
  for (let i = 0; i < 3; i++) {
    const angolo = (Math.PI * 2 * i) / 3 + 0.4;
    const catena = new THREE.BoxGeometry(sezione * 0.32, altoCatena, sezione * 0.32);

    catena.translate(
      (Math.cos(angolo) * raggio) / 2,
      altoCatena / 2,
      (-Math.sin(angolo) * raggio) / 2
    );
    pezziLegno.push(catena);
  }

  gruppo.add(new THREE.Mesh(mergeGeometries(pezziLegno, false), legno));

  /* ---- La cera e le fiamme ---- */

  const pezziCera = [];
  const pezziFiamma = [];

  for (let i = 0; i < CANDELE; i++) {
    const angolo = (Math.PI * 2 * i) / CANDELE + 0.25;
    const x = Math.cos(angolo) * raggio;
    const z = -Math.sin(angolo) * raggio;

    // Non tutte della stessa altezza: sono consumate in modo diverso, ed
    // è il dettaglio che toglie a sei cilindri l'aria di essere sei
    // cilindri.
    const alta = raggio * (0.34 + ((i * 37) % 5) * 0.05);

    pezziCera.push(
      new THREE.CylinderGeometry(sezione * 0.42, sezione * 0.46, alta, 6).translate(
        x,
        sezione / 2 + alta / 2,
        z
      )
    );

    pezziFiamma.push(
      new THREE.ConeGeometry(sezione * 0.24, sezione * 0.9, 5).translate(
        x,
        sezione / 2 + alta + sezione * 0.45,
        z
      )
    );
  }

  const cera = new THREE.MeshStandardMaterial({
    color: 0xf2e7cd,
    roughness: 0.85,
    metalness: 0
  });

  gruppo.add(new THREE.Mesh(mergeGeometries(pezziCera, false), cera));

  const fiamma = new THREE.MeshBasicMaterial({ color: 0xffc061 });
  gruppo.add(new THREE.Mesh(mergeGeometries(pezziFiamma, false), fiamma));

  return { gruppo, altoCatena, smaltibili: [cera, fiamma] };
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
  vuotoFondo = null,
  pietra,
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

  // La parete di fondo è centrata su x=0, quindi il vuoto della finestra
  // arriva in coordinate di mondo e va bene così.
  const fondo = costruisciParete({
    larghezza,
    altezza,
    pietra,
    legno,
    ottone,
    saltaDaA: vuotoFondo
  });
  fondo.position.set(0, pavimentoY, fondoZ);
  gruppo.add(fondo);

  for (const lato of [-1, 1]) {
    const fianco = costruisciParete({
      larghezza: profondita,
      altezza,
      pietra,
      legno,
      ottone
    });

    fianco.position.set((lato * larghezza) / 2, pavimentoY, fondoZ + profondita / 2);
    fianco.rotation.y = lato * -Math.PI / 2;
    gruppo.add(fianco);
  }

  /* ---------- Soffitto e travi ---------- */

  // Tavolato di legno, non pietra: sopra le travi ci va l'assito, ed è
  // quello che rende rustica una sala invece che sepolcrale. La pietra
  // resta sulle pareti, dove è struttura.
  const soffitto = new THREE.Mesh(new THREE.PlaneGeometry(larghezza, profondita), legno);
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
