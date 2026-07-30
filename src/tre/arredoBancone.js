import * as THREE from "three";

/**
 * Tutto quello che sta intorno al banco vero e proprio (il piano, il
 * fronte e la lampada restano in `scena.js`, condividono il legno con
 * lo scaffale): la parete di fondo, la cassa, i fumetti sparsi e la
 * lista dei desideri appesa. Un modulo a sé per lo stesso motivo di
 * `copertine.js`/`libroVetrina.js` — tiene `scena.js` leggibile invece
 * di fargli costruire ogni singola vite del bancone.
 *
 * Non conosce il raycaster né `oggettiStanza`: restituisce mesh e le
 * loro azioni, è `scena.js` a registrarle e a mettere i segni a terra
 * (li possiede lui, non questo modulo).
 */

const COLORE_MURO = 0x33262a; // intonaco caldo: distingue la nicchia del banco dal legno dello scaffale
const COLORE_OTTONE = 0xc9a24b;

const PALETTE_FUMETTI = [0x8a3b3b, 0x3b5c8a, 0x3b8a5c, 0x8a7a3b];

export function costruisciArredoBancone({ materialeCarta, geometriaLibro, x, z }) {
  const gruppo = new THREE.Group();
  const bersagli = [];

  /* ---------- Parete di fondo ----------
     Oggi assente: senza di lei poster e lista desideri non avrebbero
     a cosa appendersi, e la nicchia del banco si perde nel buio dietro
     come tutto il resto della stanza. */
  const muro = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshStandardMaterial({ color: COLORE_MURO, roughness: 0.92 })
  );

  muro.position.set(x, -0.4, z - 1.6);
  muro.receiveShadow = true;
  gruppo.add(muro);

  /* ---------- Cassa ----------
     Distinta dal piano del banco, non un semplice bersaglio invisibile
     appoggiato al legno: deve leggersi come "questo è un oggetto",
     altrimenti cliccare lì sembra un caso anche quando funziona. */
  const materialeCassa = new THREE.MeshStandardMaterial({
    color: 0x232025,
    roughness: 0.4,
    metalness: 0.4
  });

  const corpoCassa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.34), materialeCassa);
  corpoCassa.position.set(x - 0.78, 1.12, z);
  corpoCassa.castShadow = true;
  corpoCassa.receiveShadow = true;
  gruppo.add(corpoCassa);

  const schermoCassa = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.18, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x1a2e22,
      emissive: 0x2f6b46,
      emissiveIntensity: 0.5,
      roughness: 0.3
    })
  );

  schermoCassa.position.set(x - 0.78, 1.32, z + 0.15);
  schermoCassa.rotation.x = -0.4;
  gruppo.add(schermoCassa);

  for (const dx of [-0.08, 0, 0.08]) {
    const tasto = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8),
      materialeCassa
    );
    tasto.position.set(x - 0.78 + dx, 1.29, z - 0.05);
    gruppo.add(tasto);
  }

  const bersaglioCassa = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.75, 0.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglioCassa.position.set(x - 0.78, 0.97, z);
  bersaglioCassa.userData = { azione: { tipo: "naviga", percorso: "/statistiche" } };
  gruppo.add(bersaglioCassa);

  bersagli.push({ mesh: bersaglioCassa, segno: { x: x - 0.78, z: z + 0.55 } });

  /* ---------- Fumetti sparsi ----------
     Stessa geometria e materiale carta dello scaffale: sono la stessa
     "cosa", solo appoggiata invece che in piedi — non un asset nuovo. */
  const fumetti = new THREE.Group();

  const disposizione = [
    { x: -0.16, y: 0, z: -0.04, ry: 0.5 },
    { x: 0.06, y: 0.09, z: 0.05, ry: -0.3 },
    { x: 0.22, y: 0.18, z: -0.02, ry: 0.15 },
    { x: 0.02, y: 0.27, z: 0.09, ry: -0.75, rz: 0.22 }
  ];

  disposizione.forEach(({ x: dx, y: dy, z: dz, ry, rz = 0 }, i) => {
    const copertina = new THREE.MeshStandardMaterial({
      color: PALETTE_FUMETTI[i % PALETTE_FUMETTI.length],
      roughness: 0.6
    });

    const materiali = [materialeCarta, materialeCarta, materialeCarta, materialeCarta, copertina, materialeCarta];
    const libro = new THREE.Mesh(geometriaLibro, materiali);

    // In piano sul banco, non in piedi come sullo scaffale: ruotato a
    // terra sull'asse X, con lo spessore che diventa l'altezza della pila.
    libro.scale.set(0.6, 0.9, 0.42);
    libro.position.set(x + 0.85 + dx, 0.97 + dy, z + dz);
    libro.rotation.set(-Math.PI / 2, ry, rz);
    libro.castShadow = true;
    libro.receiveShadow = true;
    fumetti.add(libro);
  });

  gruppo.add(fumetti);

  const bersaglioFumetti = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.65, 0.7),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglioFumetti.position.set(x + 0.95, 1.08, z);
  bersaglioFumetti.userData = { azione: { tipo: "naviga", percorso: "/lettura" } };
  gruppo.add(bersaglioFumetti);

  bersagli.push({ mesh: bersaglioFumetti, segno: { x: x + 0.95, z: z + 0.55 } });

  /* ---------- Poster ----------
     Le cornici sono ottone finto (stesso accento del sito); il
     contenuto lo riempie `scena.js` più tardi con copertine vere già
     scaricate — qui restano di un colore neutro di ripiego. */
  const poster = [-1.55, 1.55].map((offsetX) => {
    const cornice = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 1.16),
      new THREE.MeshStandardMaterial({ color: COLORE_OTTONE, roughness: 0.4, metalness: 0.6 })
    );
    cornice.position.set(x + offsetX, -0.05, z - 1.58);
    gruppo.add(cornice);

    const quadro = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.8 })
    );
    quadro.position.set(x + offsetX, -0.05, z - 1.57);
    gruppo.add(quadro);

    return quadro;
  });

  /* ---------- Lista desideri appesa ---------- */
  const laccio = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: COLORE_OTTONE, roughness: 0.5, metalness: 0.5 })
  );
  laccio.position.set(x, 1.75, z - 1.57);
  gruppo.add(laccio);

  const listaMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.82),
    new THREE.MeshStandardMaterial({
      map: creaTexturaPergamena(),
      roughness: 0.88,
      side: THREE.DoubleSide
    })
  );
  listaMesh.position.set(x, 1.24, z - 1.56);
  listaMesh.rotation.z = 0.03;
  listaMesh.castShadow = true;
  gruppo.add(listaMesh);

  const bersaglioLista = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.95, 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );

  bersaglioLista.position.set(x, 1.24, z - 1.35);
  bersaglioLista.userData = { azione: { tipo: "naviga", percorso: "/wishlist" } };
  gruppo.add(bersaglioLista);

  // Appesa in alto: un segno a terra proprio sotto sarebbe fuori
  // portata visiva da dove ci si trova alla soglia, il cartellino al
  // passaggio del mouse basta.
  bersagli.push({ mesh: bersaglioLista, segno: null });

  return { gruppo, bersagli, poster };
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
