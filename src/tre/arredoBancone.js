import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Tutto quello che sta intorno al banco vero e proprio (il piano, il
 * fronte e la lampada restano in `scena.js`, condividono il legno con
 * lo scaffale): la targa col logo, la parete di fondo, la cassa e la
 * lista dei desideri appesa sono costruite sul posto qui dentro;
 * `caricaFumetti`, esportata a parte, carica invece un modello vero
 * (asincrono, quindi non può stare nella costruzione sincrona del
 * resto). Un modulo a sé per lo stesso motivo di
 * `copertine.js`/`libroVetrina.js` — tiene `scena.js` leggibile invece
 * di fargli costruire ogni singola vite del bancone.
 *
 * Le altezze non sono numeri a caso: arrivano da `pavimentoY` (il
 * pavimento), `pianoY` (la superficie del banco) e `testaY` (la testa
 * del bibliotecario), passati da chi chiama. Scriverle relative a
 * questi punti invece che assolute è l'unico modo perché il bancone
 * resti proporzionato se un giorno cambia altezza il personaggio
 * dietro — la prima versione aveva i numeri fissi ed è per questo che
 * il banco finiva per coprirgli la testa invece del petto.
 *
 * Non conosce il raycaster né `oggettiStanza`: restituisce mesh e le
 * loro azioni, è `scena.js` a registrarle e a mettere i segni a terra
 * (li possiede lui, non questo modulo).
 */

const COLORE_MURO = 0xf1e6d3; // intonaco chiaro: bianco/beige, non più antracite — è la nicchia di una libreria luminosa, non una caverna
const COLORE_OTTONE = 0xc9a24b;
const COLORE_TARGA = 0x1c1712;

// Retini e forme da "roba nerd" per i poster senza copertina vera:
// generici, non citano nessuna testata precisa.
const PALETTE_FUMETTO_POSTER = [
  { fondo: 0xd9483d, forma: 0xfef3c7 },
  { fondo: 0x2f5f8a, forma: 0xffe27a }
];

export function costruisciArredoBancone({ x, z, pavimentoY, pianoY, testaY }) {
  const gruppo = new THREE.Group();
  const bersagli = [];

  const altezzaFronte = pianoY - pavimentoY;
  const centroMuroY = pavimentoY + (pianoY - pavimentoY) * 1.9; // il muro sale ben oltre la testa del bibliotecario
  const altezzaMuro = (centroMuroY - pavimentoY) * 2;

  /* ---------- Parete di fondo e targa col logo ----------
     Oggi assente: senza di lei poster e lista desideri non avrebbero
     a cosa appendersi, e la nicchia del banco si perde nel buio come
     tutto il resto della stanza. */
  const muro = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, altezzaMuro),
    new THREE.MeshStandardMaterial({ color: COLORE_MURO, roughness: 0.92 })
  );

  muro.position.set(x, centroMuroY, z - 1.65);
  muro.receiveShadow = true;
  gruppo.add(muro);

  // La targa: montata sul fronte del banco (fra pavimento e piano),
  // non appesa sopra il piano — altrimenti fluttuerebbe accanto al
  // bibliotecario invece di leggersi come l'insegna di un vero banco.
  const targaLarghezza = 1.7;
  const targaAltezza = 0.62;
  const targaY = pavimentoY + altezzaFronte / 2;
  const targaZ = z - 0.45 - 0.052;

  const corniceTarga = new THREE.Mesh(
    new THREE.PlaneGeometry(targaLarghezza + 0.08, targaAltezza + 0.08),
    new THREE.MeshStandardMaterial({ color: COLORE_OTTONE, roughness: 0.35, metalness: 0.6 })
  );
  corniceTarga.position.set(x, targaY, targaZ - 0.002);
  gruppo.add(corniceTarga);

  const targa = new THREE.Mesh(
    new THREE.PlaneGeometry(targaLarghezza, targaAltezza),
    new THREE.MeshBasicMaterial({ map: creaTexturaLogo(targaLarghezza, targaAltezza) })
  );
  targa.position.set(x, targaY, targaZ);
  gruppo.add(targa);

  /* ---------- Cassa ----------
     Distinta dal piano del banco, non un semplice bersaglio invisibile
     appoggiato al legno: deve leggersi come "questo è un oggetto",
     altrimenti cliccare lì sembra un caso anche quando funziona. */
  const materialeCassa = new THREE.MeshStandardMaterial({
    color: 0x232025,
    roughness: 0.4,
    metalness: 0.4
  });

  const cassaX = x - 0.95;
  const cassaBaseY = pianoY + 0.03;

  const corpoCassa = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.3), materialeCassa);
  corpoCassa.position.set(cassaX, cassaBaseY + 0.13, z);
  corpoCassa.castShadow = true;
  corpoCassa.receiveShadow = true;
  gruppo.add(corpoCassa);

  const schermoCassa = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.15, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x1a2e22,
      emissive: 0x2f6b46,
      emissiveIntensity: 0.5,
      roughness: 0.3
    })
  );

  schermoCassa.position.set(cassaX, cassaBaseY + 0.3, z + 0.13);
  schermoCassa.rotation.x = -0.4;
  gruppo.add(schermoCassa);

  for (const dx of [-0.06, 0, 0.06]) {
    const tasto = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8), materialeCassa);
    tasto.position.set(cassaX + dx, cassaBaseY + 0.27, z - 0.04);
    gruppo.add(tasto);
  }

  const bersaglioCassa = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.65, 0.55),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglioCassa.position.set(cassaX, cassaBaseY + 0.2, z);
  bersaglioCassa.userData = { azione: { tipo: "naviga", percorso: "/statistiche" } };
  gruppo.add(bersaglioCassa);

  bersagli.push({ mesh: bersaglioCassa, segno: { x: cassaX, z: z + 0.55 } });

  // I fumetti sparsi sul banco vivono a parte (`caricaFumetti`, più
  // sotto): sono un modello scaricato, non geometria fatta qui — e un
  // modello si carica in rete, mentre questa funzione deve restare
  // sincrona per tutto il resto della stanza.

  /* ---------- Poster ----------
     Quattro invece di due: due prendono le copertine vere già
     scaricate (le riempie `scena.js` più tardi), gli altri due restano
     grafica generata — un retino a puntini e una forma, "roba nerd"
     senza citare nessuna testata precisa. In altezza stanno sopra il
     banco, non sopra il piano dove sta il bibliotecario: un margine
     fisso sopra `pianoY`, non una frazione di `altezzaFronte` (che è
     piccola e li avrebbe lasciati bassi, quasi dentro il banco). */
  const posterY = pianoY + 0.55;
  const posterOffsets = [-1.85, -0.95, 0.95, 1.85];
  const posterLarghezza = 0.46;
  const posterAltezza = 0.64;

  const poster = posterOffsets.map((offsetX, indice) => {
    const cornice = new THREE.Mesh(
      new THREE.PlaneGeometry(posterLarghezza + 0.08, posterAltezza + 0.08),
      new THREE.MeshStandardMaterial({ color: COLORE_OTTONE, roughness: 0.4, metalness: 0.6 })
    );
    cornice.position.set(x + offsetX, posterY, z - 1.63);
    gruppo.add(cornice);

    // I due esterni sono decorativi e non aspettano nessuna copertina:
    // hanno già la loro grafica, generata qui. I due centrali restano
    // di un colore neutro di ripiego finché `scena.js` non ci mette
    // sopra una copertina vera.
    const decorativo = indice === 0 || indice === posterOffsets.length - 1;

    const materialePoster = decorativo
      ? new THREE.MeshBasicMaterial({ map: creaTexturaPosterFumetto(PALETTE_FUMETTO_POSTER[indice === 0 ? 0 : 1]) })
      : new THREE.MeshBasicMaterial({ color: 0x1c1712 });

    const quadro = new THREE.Mesh(new THREE.PlaneGeometry(posterLarghezza, posterAltezza), materialePoster);
    quadro.position.set(x + offsetX, posterY, z - 1.62);
    gruppo.add(quadro);

    return decorativo ? null : quadro;
  });

  /* ---------- Lista desideri appesa ----------
     Sopra la testa del bibliotecario, non sopra il banco: ancorata a
     `testaY` (non a una frazione di `pianoY`) così resta sopra la
     testa qualunque sia l'altezza del personaggio, invece di doverla
     ritoccare a mano ogni volta che cambia. */
  const listaY = testaY + 0.3;

  const laccio = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: COLORE_OTTONE, roughness: 0.5, metalness: 0.5 })
  );
  laccio.position.set(x, listaY + 0.32, z - 1.62);
  gruppo.add(laccio);

  const listaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.66),
    new THREE.MeshStandardMaterial({
      map: creaTexturaPergamena(),
      roughness: 0.88,
      side: THREE.DoubleSide
    })
  );
  listaMesh.position.set(x, listaY, z - 1.6);
  listaMesh.rotation.z = 0.03;
  listaMesh.castShadow = true;
  gruppo.add(listaMesh);

  const bersaglioLista = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.78, 0.35),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglioLista.position.set(x, listaY, z - 1.4);
  bersaglioLista.userData = { azione: { tipo: "naviga", percorso: "/wishlist" } };
  gruppo.add(bersaglioLista);

  // Appesa in alto: un segno a terra proprio sotto sarebbe fuori
  // portata visiva da dove ci si trova alla soglia, il cartellino al
  // passaggio del mouse basta.
  bersagli.push({ mesh: bersaglioLista, segno: null });

  return { gruppo, bersagli, poster: poster.filter(Boolean) };
}

/**
 * I fumetti sparsi sul banco, veri: un libro chiuso e uno aperto (gli
 * stessi accessori del pacchetto del bibliotecario — "KayKit :
 * Adventurers" di Kay Lousberg, CC0), non più scatole colorate. Un
 * modello si carica in rete: la funzione è asincrona, e chi la chiama
 * (`scena.js`) decide cosa fare se la scena è già stata smontata nel
 * frattempo.
 */
export async function caricaFumetti({ x, z, pianoY, urlChiuso, urlAperto }) {
  const loader = new GLTFLoader();

  const [chiuso, aperto] = await Promise.all([
    loader.loadAsync(urlChiuso),
    loader.loadAsync(urlAperto)
  ]);

  const gruppo = new THREE.Group();

  // Il pacchetto misura i suoi modelli in unità coerenti col
  // personaggio: una scala fissa, tarata a occhio su una pila che
  // stia comoda sul banco, è più semplice (e più prevedibile) che
  // ricavarla da un bounding box per un prop così piccolo.
  const disposizione = [
    { sorgente: chiuso, x: -0.14, y: 0, z: -0.04, ry: 0.4, scala: 0.62 },
    { sorgente: aperto, x: 0.12, y: 0.05, z: 0.06, ry: -0.5, scala: 0.6 },
    { sorgente: chiuso, x: 0.02, y: 0.1, z: -0.08, ry: 1.3, scala: 0.62, rx: -0.2 }
  ];

  disposizione.forEach(({ sorgente, x: dx, y: dy, z: dz, ry, rx = 0, scala }) => {
    const copia = sorgente.scene.clone(true);

    copia.traverse((oggetto) => {
      if (!oggetto.isMesh) return;
      oggetto.castShadow = true;
      oggetto.receiveShadow = true;
    });

    copia.scale.setScalar(scala);
    copia.position.set(x + dx, pianoY + dy, z + dz);
    copia.rotation.set(rx, ry, 0);
    gruppo.add(copia);
  });

  const bersaglio = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.55, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglio.position.set(x, pianoY + 0.15, z);
  bersaglio.userData = { azione: { tipo: "naviga", percorso: "/lettura" } };
  gruppo.add(bersaglio);

  return { gruppo, bersaglio, segno: { x, z: z + 0.55 } };
}

/**
 * La targa col logo: non testo nudo sul legno, una vera insegna con
 * fondo e uno sgorbio dorato, nello stesso spirito di "MangaVault" +
 * "10X" della barra laterale del sito.
 */
function creaTexturaLogo(larghezzaMondo, altezzaMondo) {
  const scala = 300;
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

  ctx.font = `700 ${canvas.height * 0.42}px Georgia, serif`;
  ctx.fillStyle = "#f5f1e6";
  ctx.fillText("MangaVault", cx, cy - canvas.height * 0.14);

  ctx.font = `800 ${canvas.height * 0.5}px Georgia, serif`;
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
 * Un poster "da fumetteria" senza citare nessuna testata: un retino a
 * puntini (mezzatinta, il linguaggio visivo del fumetto stampato) più
 * una forma a stella dietro un fumetto vuoto.
 */
function creaTexturaPosterFumetto({ fondo, forma }) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 356;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = `#${fondo.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Il retino a puntini: il tratto distintivo della stampa a fumetti.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 6; y < canvas.height; y += 14) {
    for (let x = 6; x < canvas.width; x += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Una stella esplosiva dietro, come sfondo di un'azione fumettistica.
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

  // Un fumetto vuoto in basso: suggerisce "fumetto" senza scrivere
  // parole che finirebbero per sembrare un logo inventato.
  ctx.fillStyle = "#fdf6e3";
  roundRect(ctx, 34, canvas.height - 120, canvas.width - 68, 74, 16);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(70, canvas.height - 48);
  ctx.lineTo(96, canvas.height - 48);
  ctx.lineTo(74, canvas.height - 22);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Una pergamena disegnata a canvas: righe stilizzate, non testo vero
 * — è atmosfera, non un elenco da leggere davvero.
 */
function creaTexturaPergamena() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 340;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#e9dfc3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const vignettatura = ctx.createRadialGradient(128, 170, 60, 128, 170, 230);
  vignettatura.addColorStop(0, "rgba(0,0,0,0)");
  vignettatura.addColorStop(1, "rgba(90,70,40,0.28)");
  ctx.fillStyle = vignettatura;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(60,45,25,0.5)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(28, 46);
  ctx.lineTo(150, 46);
  ctx.stroke();

  for (let i = 0; i < 9; i++) {
    const y = 90 + i * 26;
    const lunghezza = 140 + ((i * 37) % 60);

    ctx.strokeStyle = "rgba(60,45,25,0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(30 + lunghezza, y);
    ctx.stroke();

    if (i % 3 === 0) {
      ctx.strokeStyle = "rgba(178,60,50,0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(14, y - 4);
      ctx.lineTo(19, y + 3);
      ctx.lineTo(26, y - 9);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
