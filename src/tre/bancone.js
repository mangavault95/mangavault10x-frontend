import * as THREE from "three";
import { metri } from "./modelli";
import { costruisciParete } from "./stanza";

/**
 * Il banco del bibliotecario e la parete che gli sta dietro.
 *
 * Della versione precedente non resta niente di costruito a mano: il
 * banco era due scatole di legno, il registratore di cassa una terza
 * scatola con tre cilindri per tasti, e la "parete" un pannello di
 * intonaco alto poco più del banco, sospeso in mezzo alla stanza. Adesso
 * il banco è il set modulare "Counter" di Quaternius (CC0), la cassa è
 * un registratore vero, e la parete è una parete: da terra al soffitto,
 * con boiserie e cornice come le altre.
 *
 * La parete non sta in fondo alla stanza ma appena dietro il banco. È il
 * retrobanco di una libreria vera — quello a cui si appendono l'insegna,
 * le locandine e la bacheca — e a due metri dietro le spalle si legge,
 * mentre a sei metri sarebbe uno sfondo lontano qualunque.
 *
 * Restituisce mesh e azioni; a registrarle nel raycaster e a metterci i
 * segni a terra pensa `scena.js`, che è chi li possiede.
 */

const COLORE_TARGA = 0x1c1712;

// Retini e forme da fumetteria per le locandine senza copertina vera:
// generiche, non citano nessuna testata precisa.
const PALETTE_LOCANDINE = [
  { fondo: 0xd9483d, forma: 0xfef3c7 },
  { fondo: 0x2f5f8a, forma: 0xffe27a }
];

const ALTEZZA_BANCO = 0.88; // metri

// La pedana dietro al banco. Non è un vezzo: il personaggio è un chibi
// con le spalle al 58% della propria altezza, e dietro un banco alto
// come un banco vero ne spuntava solo la testa. Un gradino dietro il
// bancone esiste in mezzo mondo — è come fanno i librai bassi a
// guardare in faccia i clienti alti — e restituisce il busto.
const ALTEZZA_PEDANA = 0.26;

export async function costruisciBancone({
  magazzino,
  url,
  pavimentoY,
  soffittoY,
  centroX,
  bancoZ,
  muroZ,
  muroSinistraX,
  destraX,
  intonaco,
  legno,
  ottone
}) {
  const gruppo = new THREE.Group();
  const bersagli = [];
  const altezzaStanza = soffittoY - pavimentoY;

  /* ==================================================
     LA PARETE DIETRO — a tutta altezza, come le altre
     ================================================== */

  const sinistraMuro = muroSinistraX;
  const larghezzaMuro = destraX - sinistraMuro;

  const muro = costruisciParete({
    larghezza: larghezzaMuro,
    altezza: altezzaStanza,
    intonaco,
    legno,
    ottone
  });

  muro.position.set(destraX - larghezzaMuro / 2, pavimentoY, muroZ);
  gruppo.add(muro);

  // Il pilastro che chiude la parete a sinistra. Senza, il muro finisce
  // nel nulla con un bordo di spessore zero e si legge per quello che è
  // — un pannello ritagliato — invece che come il fianco di una stanza
  // che continua.
  const larghezzaPilastro = metri(0.26);

  const pilastro = new THREE.Mesh(
    new THREE.BoxGeometry(larghezzaPilastro, altezzaStanza, metri(0.42)),
    legno
  );
  pilastro.position.set(
    sinistraMuro + larghezzaPilastro / 2,
    pavimentoY + altezzaStanza / 2,
    muroZ + metri(0.12)
  );
  pilastro.castShadow = true;
  pilastro.receiveShadow = true;
  gruppo.add(pilastro);

  // Base e capitello: un parallelepipedo alto quattro metri resta un
  // parallelepipedo, due sporgenze lo fanno leggere come un pilastro.
  for (const [y, altezzaPezzo] of [
    [pavimentoY + metri(0.16), metri(0.32)],
    [pavimentoY + altezzaStanza - metri(0.18), metri(0.36)]
  ]) {
    const pezzo = new THREE.Mesh(
      new THREE.BoxGeometry(larghezzaPilastro * 1.45, altezzaPezzo, metri(0.56)),
      legno
    );
    pezzo.position.set(sinistraMuro + larghezzaPilastro / 2, y, muroZ + metri(0.12));
    pezzo.castShadow = true;
    gruppo.add(pezzo);
  }

  /* ==================================================
     IL BANCO
     Tre moduli in fila: una testata a sinistra e due tratti dritti.
     Le misure non sono scelte, sono quelle che escono dai modelli una
     volta portati all'altezza di un banco vero.
     ================================================== */

  const testata = await magazzino.preleva(url.testa, { alto: ALTEZZA_BANCO });
  if (!testata) return null;

  const larghezzaTestata = testata.userData.misure.x;

  const dritto = await magazzino.preleva(url.dritto, { alto: ALTEZZA_BANCO });
  if (!dritto) return null;

  const larghezzaDritto = dritto.userData.misure.x;
  const profonditaBanco = dritto.userData.misure.z;
  const pianoY = pavimentoY + dritto.userData.misure.y;

  // Si parte dal bordo sinistro e si avanza: così aggiungere o togliere
  // un modulo non obbliga a ricalcolare a mano tutte le posizioni.
  let bordo = centroX - (larghezzaTestata * 2 + larghezzaDritto) / 2;

  const posa = (modulo, larghezza, giraDi = 0) => {
    modulo.position.set(bordo + larghezza / 2, pavimentoY, bancoZ);
    modulo.rotation.y = giraDi;
    gruppo.add(modulo);
    bordo += larghezza;
  };

  // Testata, tratto dritto, testata girata: un banco che finisce con lo
  // stesso pezzo da tutte e due le parti. Tre moduli dritti in fila
  // facevano sette unità di bancone, più lungo del muro che gli sta
  // dietro — un bancone da bar, non da biblioteca.
  posa(testata, larghezzaTestata);
  posa(dritto, larghezzaDritto);

  const altraTestata = await magazzino.preleva(url.testa, { alto: ALTEZZA_BANCO });
  if (!altraTestata) return null;
  posa(altraTestata, larghezzaTestata, Math.PI);

  /* ==================================================
     SOPRA IL BANCO
     ================================================== */

  const sinistraBanco = centroX - (larghezzaTestata * 2 + larghezzaDritto) / 2;
  const destraBanco = bordo;
  const larghezzaBanco = destraBanco - sinistraBanco;

  // La pedana su cui sta il bibliotecario, dietro al banco.
  const altezzaPedana = metri(ALTEZZA_PEDANA);
  const zPedana = bancoZ - profonditaBanco / 2 - metri(0.45);

  const pedana = new THREE.Mesh(
    new THREE.BoxGeometry(larghezzaBanco * 0.92, altezzaPedana, metri(1.1)),
    legno
  );
  pedana.position.set(centroX, pavimentoY + altezzaPedana / 2, zPedana);
  pedana.castShadow = true;
  pedana.receiveShadow = true;
  gruppo.add(pedana);

  // La lampada: un modello vero al posto del cono con dentro una luce.
  const lampada = await magazzino.preleva(url.lampada, { alto: 0.42 });

  if (lampada) {
    lampada.position.set(sinistraBanco + metri(0.5), pianoY, bancoZ + metri(0.1));
    gruppo.add(lampada);

    const fuoco = new THREE.PointLight(0xffb454, 7, metri(4), 2);
    fuoco.position.set(sinistraBanco + metri(0.5), pianoY + metri(0.4), bancoZ + metri(0.1));
    gruppo.add(fuoco);
  }

  // Il registratore di cassa: porta ai Numeri. È l'unico asset della
  // stanza che non sia CC0 — "Cash register" di Poly by Google, CC-BY
  // 3.0, l'attribuzione sta in `assets/CREDITI.md`.
  const cassa = await magazzino.preleva(url.cassa, { alto: 0.46 });

  if (cassa) {
    const x = destraBanco - metri(0.55);

    cassa.position.set(x, pianoY, bancoZ - metri(0.05));
    cassa.rotation.y = -0.22;
    gruppo.add(cassa);

    const bersaglio = new THREE.Mesh(
      new THREE.BoxGeometry(metri(0.7), metri(0.6), metri(0.7)),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    bersaglio.position.set(x, pianoY + metri(0.28), bancoZ - metri(0.05));
    bersaglio.userData = { azione: { tipo: "naviga", percorso: "/statistiche" } };
    gruppo.add(bersaglio);

    bersagli.push({
      mesh: bersaglio,
      segno: { x, z: bancoZ + profonditaBanco / 2 + metri(0.5) }
    });
  }

  // I volumi posati sul banco: portano a In lettura. Uno aperto, come
  // se qualcuno l'avesse lasciato lì a metà, e una pila accanto.
  const aperto = await magazzino.preleva(url.libroAperto, { alto: 0.06 });
  const pila = await magazzino.preleva(url.libri, { alto: 0.22 });

  const xLibri = centroX + metri(0.15);

  if (aperto) {
    aperto.position.set(xLibri, pianoY, bancoZ + metri(0.08));
    aperto.rotation.y = 0.3;
    gruppo.add(aperto);
  }

  if (pila) {
    pila.position.set(xLibri + metri(0.42), pianoY, bancoZ - metri(0.06));
    pila.rotation.y = -0.5;
    gruppo.add(pila);
  }

  if (aperto || pila) {
    const bersaglio = new THREE.Mesh(
      new THREE.BoxGeometry(metri(1), metri(0.4), metri(0.7)),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    bersaglio.position.set(xLibri + metri(0.2), pianoY + metri(0.16), bancoZ);
    bersaglio.userData = { azione: { tipo: "naviga", percorso: "/lettura" } };
    gruppo.add(bersaglio);

    bersagli.push({
      mesh: bersaglio,
      segno: { x: xLibri + metri(0.2), z: bancoZ + profonditaBanco / 2 + metri(0.5) }
    });
  }

  /* ==================================================
     SULLA PARETE
     ================================================== */

  const zParete = muroZ + 0.12;

  // La parete si divide in due: un tratto stretto a sinistra, appena
  // dopo il pilastro, per la bacheca dei desideri, e tutto il resto per
  // insegna e locandine. Le posizioni escono dagli estremi veri della
  // parete invece che da scostamenti attorno al banco: il banco non è
  // centrato sulla parete, e prendere lui come riferimento faceva finire
  // la prima locandina dentro il pilastro.
  const bachecaX = sinistraMuro + metri(0.9);
  const vetrinaMuroSinistra = bachecaX + metri(1);
  const centroMuro = (vetrinaMuroSinistra + destraX - metri(0.4)) / 2;

  // L'insegna, sopra la testa del bibliotecario.
  const insegnaY = pavimentoY + metri(2.55);
  const insegnaLarghezza = metri(1.75);
  const insegnaAltezza = metri(0.62);

  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(insegnaLarghezza + 0.12, insegnaAltezza + 0.12, 0.06),
    ottone
  );
  cornice.position.set(centroMuro, insegnaY, zParete);
  cornice.castShadow = true;
  gruppo.add(cornice);

  const insegna = new THREE.Mesh(
    new THREE.PlaneGeometry(insegnaLarghezza, insegnaAltezza),
    new THREE.MeshBasicMaterial({ map: creaTexturaInsegna(insegnaLarghezza, insegnaAltezza) })
  );
  insegna.position.set(centroMuro, insegnaY, zParete + 0.04);
  gruppo.add(insegna);

  // Due faretti sull'insegna: è quello che la fa leggere come
  // un'insegna accesa invece che come un quadro appeso.
  for (const lato of [-1, 1]) {
    const faretto = new THREE.PointLight(0xffd9a0, 3.2, metri(2.6), 2);
    faretto.position.set(
      centroMuro + lato * insegnaLarghezza * 0.35,
      insegnaY + 0.5,
      zParete + 0.5
    );
    gruppo.add(faretto);
  }

  /* ---------- Le locandine ----------
     Cinque in fila, distribuite su tutta la parete: le tre centrali
     prendono copertine vere della collezione (le riempie `scena.js` più
     tardi), le due esterne restano grafica generata qui. Cinque e non
     quattro perché la parete è larga otto unità, e quattro locandine
     piccole in mezzo a tutto quel beige leggevano come francobolli. */
  const locandinaLarghezza = metri(0.58);
  const locandinaAltezza = locandinaLarghezza / 0.7;
  const locandinaY = pavimentoY + metri(1.78);

  const QUANTE_LOCANDINE = 5;
  const primaLocandina = vetrinaMuroSinistra + metri(0.15);
  const ultimaLocandina = destraX - metri(0.55);
  const passoLocandine = (ultimaLocandina - primaLocandina) / (QUANTE_LOCANDINE - 1);

  const poster = Array.from({ length: QUANTE_LOCANDINE }, (_, indice) => {
    const x = primaLocandina + indice * passoLocandine;

    const bordo = new THREE.Mesh(
      new THREE.BoxGeometry(locandinaLarghezza + 0.09, locandinaAltezza + 0.09, 0.05),
      ottone
    );
    bordo.position.set(x, locandinaY, zParete);
    bordo.castShadow = true;
    gruppo.add(bordo);

    const decorativa = indice === 0 || indice === QUANTE_LOCANDINE - 1;

    const quadro = new THREE.Mesh(
      new THREE.PlaneGeometry(locandinaLarghezza, locandinaAltezza),
      decorativa
        ? new THREE.MeshBasicMaterial({
            map: creaTexturaLocandina(PALETTE_LOCANDINE[indice === 0 ? 0 : 1])
          })
        : new THREE.MeshBasicMaterial({ color: 0x2a2320 })
    );

    quadro.position.set(x, locandinaY, zParete + 0.04);
    gruppo.add(quadro);

    return decorativa ? null : quadro;
  });

  /* ---------- La bacheca dei desideri ----------
     Nel tratto di parete fra il pilastro e le locandine, all'altezza
     degli occhi: una pergamena con sopra un elenco stilizzato. Non è un
     elenco da leggere, è un'insegna che dice "qui si scrive cosa
     manca". */
  const bachecaY = pavimentoY + metri(1.7);
  const bachecaLarghezza = metri(0.68);
  const bachecaAltezza = metri(0.92);

  const corniceBacheca = new THREE.Mesh(
    new THREE.BoxGeometry(bachecaLarghezza + 0.12, bachecaAltezza + 0.12, 0.07),
    legno
  );
  corniceBacheca.position.set(bachecaX, bachecaY, zParete);
  corniceBacheca.castShadow = true;
  gruppo.add(corniceBacheca);

  const bacheca = new THREE.Mesh(
    new THREE.PlaneGeometry(bachecaLarghezza, bachecaAltezza),
    new THREE.MeshStandardMaterial({ map: creaTexturaBacheca(), roughness: 0.9 })
  );
  bacheca.position.set(bachecaX, bachecaY, zParete + 0.05);
  gruppo.add(bacheca);

  const bersaglioBacheca = new THREE.Mesh(
    new THREE.BoxGeometry(bachecaLarghezza + 0.3, bachecaAltezza + 0.3, 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bersaglioBacheca.position.set(bachecaX, bachecaY, zParete + 0.2);
  bersaglioBacheca.userData = { azione: { tipo: "naviga", percorso: "/wishlist" } };
  gruppo.add(bersaglioBacheca);

  // Il segno a terra ci va anche se la bacheca è appesa al muro: è
  // l'unico appiglio che ha l'elenco dei punti in `HomePage.jsx` per far
  // vedere dov'è una cosa quando ci si passa sopra, e senza sarebbe
  // l'unica voce che indica il nulla.
  bersagli.push({
    mesh: bersaglioBacheca,
    segno: {
      x: sinistraBanco + metri(0.2),
      z: bancoZ + profonditaBanco / 2 + metri(0.5),
      raggio: 0.5
    }
  });

  return {
    gruppo,
    bersagli,
    poster: poster.filter(Boolean),
    pianoY,
    profonditaBanco,
    // Dove sta il bibliotecario: dietro il banco e sopra la pedana, non
    // incastrato dentro il legno.
    postoLibraio: {
      x: centroX - metri(0.3),
      y: pavimentoY + altezzaPedana,
      z: zPedana + metri(0.05)
    }
  };
}

/* ==================================================
   LE TEXTURE DISEGNATE
   Quello che è scritto — un logo, un elenco — non può arrivare da un
   pacchetto di modelli: nessuno ha modellato l'insegna di MangaVault.
   ================================================== */

function creaTexturaInsegna(larghezzaMondo, altezzaMondo) {
  const scala = 320;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(larghezzaMondo * scala);
  canvas.height = Math.round(altezzaMondo * scala);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `#${COLORE_TARGA.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = `700 ${canvas.height * 0.4}px Georgia, serif`;
  ctx.fillStyle = "#f5f1e6";
  ctx.fillText("MangaVault", cx, cy - canvas.height * 0.15);

  ctx.font = `800 ${canvas.height * 0.46}px Georgia, serif`;
  ctx.fillStyle = "#facc15";
  ctx.shadowColor = "rgba(250,204,21,0.55)";
  ctx.shadowBlur = canvas.height * 0.08;
  ctx.fillText("10X", cx, cy + canvas.height * 0.24);
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Una locandina da fumetteria senza citare nessuna testata: un retino a
 * puntini — il linguaggio visivo della stampa a fumetti — più una forma
 * a stella dietro un balloon vuoto.
 */
function creaTexturaLocandina({ fondo, forma }) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 366;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `#${fondo.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 6; y < canvas.height; y += 14) {
    for (let x = 6; x < canvas.width; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.42);
  ctx.fillStyle = `#${forma.toString(16).padStart(6, "0")}`;
  ctx.beginPath();

  const punte = 8;

  for (let i = 0; i < punte * 2; i++) {
    const raggio = i % 2 === 0 ? 118 : 58;
    const angolo = (Math.PI / punte) * i - Math.PI / 2;
    const px = Math.cos(angolo) * raggio;
    const py = Math.sin(angolo) * raggio;

    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#fdf6e3";
  rettangoloTondo(ctx, 34, canvas.height - 122, canvas.width - 68, 74, 16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(70, canvas.height - 50);
  ctx.lineTo(96, canvas.height - 50);
  ctx.lineTo(74, canvas.height - 24);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function rettangoloTondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * La bacheca dei desideri.
 *
 * La prima versione era una pergamena con nove righe grigie tutte
 * uguali: da tre metri di distanza — cioè da dove la si guarda — non si
 * distingueva da un foglio bianco incorniciato. Adesso ha una testata
 * scura con la parola scritta sopra, i cartellini spillati e le
 * spuntature in rosso: da lontano si leggono le macchie, ed è
 * esattamente quello che deve succedere.
 */
function creaTexturaBacheca() {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 406;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e5d8b4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vignettatura = ctx.createRadialGradient(150, 200, 70, 150, 200, 280);
  vignettatura.addColorStop(0, "rgba(0,0,0,0)");
  vignettatura.addColorStop(1, "rgba(90,70,40,0.32)");
  ctx.fillStyle = vignettatura;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // La testata: scura e piena, è lei a dare alla bacheca un verso anche
  // quando il testo non si legge più.
  ctx.fillStyle = "#2a2118";
  ctx.fillRect(0, 0, canvas.width, 74);

  ctx.fillStyle = "#facc15";
  ctx.font = "700 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DESIDERI", canvas.width / 2, 39);

  // I cartellini appuntati: rettangoli di carta leggermente storti, con
  // una riga di "titolo" e una spunta rossa su quelli già trovati.
  const cartellini = [
    { y: 100, larghezza: 214, storto: -0.03, spuntato: true },
    { y: 168, larghezza: 232, storto: 0.02, spuntato: false },
    { y: 236, larghezza: 200, storto: -0.02, spuntato: true },
    { y: 304, larghezza: 224, storto: 0.03, spuntato: false }
  ];

  for (const { y, larghezza, storto, spuntato } of cartellini) {
    ctx.save();
    ctx.translate(canvas.width / 2, y + 26);
    ctx.rotate(storto);

    ctx.fillStyle = "rgba(20,14,6,0.22)";
    rettangoloTondo(ctx, -larghezza / 2 + 3, -21, larghezza, 50, 6);
    ctx.fill();

    ctx.fillStyle = "#fbf3df";
    rettangoloTondo(ctx, -larghezza / 2, -24, larghezza, 50, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(60,45,25,0.55)";
    ctx.fillRect(-larghezza / 2 + 40, -12, larghezza - 70, 7);
    ctx.fillStyle = "rgba(60,45,25,0.3)";
    ctx.fillRect(-larghezza / 2 + 40, 6, larghezza * 0.45, 5);

    // La puntina che lo tiene su.
    ctx.fillStyle = spuntato ? "#b23c32" : "#3f6f9a";
    ctx.beginPath();
    ctx.arc(-larghezza / 2 + 22, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    if (spuntato) {
      ctx.strokeStyle = "#b23c32";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(larghezza / 2 - 34, -2);
      ctx.lineTo(larghezza / 2 - 24, 8);
      ctx.lineTo(larghezza / 2 - 8, -14);
      ctx.stroke();
    }

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
