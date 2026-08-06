import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { metri } from "./modelli";

/**
 * La finestra sul mare.
 *
 * Fino a ieri la stanza era una scatola chiusa: quattro pareti, nessuna
 * apertura, e da nessuna parte si capiva che *fuori* esistesse qualcosa.
 * Una biblioteca senza finestre è una cantina — e le pareti sembravano
 * vuote proprio per questo, non perché mancassero quadri.
 *
 * Quello che si vede è una collina che scende sul mare, e il mare si
 * muove.
 *
 *
 * COME È FATTA LA VEDUTA — e perché non è un'immagine sola
 *
 * Tre piani sovrapposti a profondità diverse, non un unico disegno:
 *
 * 1. **il cielo**, dipinto una volta e mai più toccato;
 * 2. **il mare**, che è l'unico pezzo che si muove — una texture di onde
 *    che si ripete e a cui si sposta l'`offset` di un pelo per fotogramma.
 *    Costa una moltiplicazione, non un ridisegno;
 * 3. **le colline**, con l'alfa sopra la linea del crinale, così il mare
 *    e il cielo si vedono dietro.
 *
 * Un disegno solo, ridipinto ogni fotogramma su un canvas, costerebbe
 * un'immagine da caricare sulla scheda video sessanta volte al secondo
 * per far ondeggiare venti pixel d'acqua. Tre piani costano tre disegni
 * e basta.
 *
 * Il mare in realtà sono **due** piani, non uno: due file d'onde che
 * scorrono a velocità diverse. Una sola si legge come una texture che
 * scivola; due che si sfasano diventano acqua, perché è lo scarto fra i
 * due movimenti a non ripetersi mai sott'occhio.
 *
 *
 * PERCHÉ L'ARCO È FATTO DI CONCI E NON DI UN BUCO
 *
 * La strada breve sarebbe un piano di pietra con dentro un foro a
 * ogiva. Ma un piano di pietra è spesso zero, e una finestra spessa zero
 * è un adesivo: manca lo strombo, cioè la parte che dice che il muro ha
 * un mezzo metro di spessore. Qui invece stipiti, davanzale e conci
 * dell'arco sono scatole vere, saldate in un'unica geometria — un
 * disegno solo, ma con lo spessore.
 *
 *
 * E PERCHÉ IL MURO DIETRO NON VIENE BUCATO
 *
 * Perché non serve, ed è la scoperta che ha semplificato tutto. La
 * veduta sta **appoggiata alla parete**, e l'imbotte di pietra sporge in
 * avanti, *dentro* la stanza. Guardandola da qui dentro si vede una
 * strombatura profonda con in fondo il paesaggio — che è esattamente
 * quello che si vede affacciandosi a una finestra scavata in un muro
 * spesso mezzo metro.
 *
 * Bucare la parete avrebbe voluto dire spezzare il piano di pietra in
 * pezzi attorno a un foro ad arco: o una `Shape` con un buco (e allora
 * le UV diventano coordinate grezze e la muratura si stira), o venti
 * strisce orizzontali tagliate sulla curva. Il muro intero resta un
 * piano solo, e non si vede perché la veduta è più larga della luce e
 * gli stipiti le coprono i bordi.
 */

// Quanti conci fanno l'arco. Sette: con meno si vede la spezzata, con
// più si vede una curva liscia, che è il contrario di un arco di pietra.
const CONCI = 7;

/* I due strati d'onde.
   --------------------------------------------------------------------
   `corrente` è quanto scorrono al secondo, in giri di texture; `giri`
   quante volte la stessa immagine ci sta dentro la larghezza della
   veduta. I due numeri di `giri` sono diversi apposta: due strati alla
   stessa scala si leggono come un'immagine sola sdoppiata, a scale
   diverse diventano il mareggio grosso e il luccichìo sopra. */
const STRATI = [
  { corrente: 0.011, giri: 2 },
  { corrente: -0.018, giri: 3 }
];

/**
 * @param larghezza  la luce della finestra, in unità di scena
 * @param altezza    fino all'imposta dell'arco (l'arco ci sta sopra)
 * @param spessore   quanto è profondo il muro
 * @param pietra     il materiale della muratura, condiviso con le pareti
 * @param legno      per la crociera
 *
 * @returns { gruppo, aggiorna(dt) }
 */
export function costruisciFinestra({ larghezza, altezza, spessore, pietra, legno }) {
  const gruppo = new THREE.Group();
  const raggio = larghezza / 2;

  /* ==================================================
     LA VEDUTA
     Appoggiata alla parete (z ≈ 0). Tutto il resto le sta davanti.
     ================================================== */

  const zVeduta = 0.02;

  // Più grande della luce in tutte le direzioni, così i suoi bordi
  // restano coperti dagli stipiti e dall'arco anche guardando di sbieco.
  const altaVeduta = (altezza + raggio) * 1.16;
  const largaVeduta = larghezza * 1.4;

  const piano = (texture, y, alta, z, trasparente) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(largaVeduta, alta),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: trasparente,
        depthWrite: !trasparente,
        // La veduta è *fuori*: la nebbia della stanza non la tocca, e il
        // buio della stanza nemmeno. Per questo è un materiale base e non
        // uno standard — quello che si vede da una finestra è illuminato
        // dal sole, non dalle lampade di qua dentro.
        fog: false
      })
    );

    mesh.position.set(0, y, z);
    gruppo.add(mesh);

    return mesh;
  };

  piano(disegnaCielo(), altaVeduta / 2, altaVeduta, zVeduta, false);

  // Il mare occupa la fascia bassa, fin sotto l'orizzonte. Il 54% è la
  // stessa quota a cui `disegnaCielo` e `disegnaColline` mettono la
  // linea dell'acqua: se i tre disegni non concordano, le onde
  // scorrono per aria o spariscono sotto la costa.
  const altoMare = altaVeduta * 0.54;

  const onde = STRATI.map(({ corrente, giri }, i) => {
    const texture = disegnaOnde(i, giri);
    piano(texture, altoMare / 2, altoMare, zVeduta + 0.02 + i * 0.01, true);
    return { texture, velocita: corrente };
  });

  piano(disegnaColline(), altaVeduta / 2, altaVeduta, zVeduta + 0.06, true);

  /* ==================================================
     LA MURATURA
     Stipiti, davanzale, arco. Tutto in una geometria sola.
     ================================================== */

  const pezzi = [];

  const scatola = (lx, ly, lz, x, y, z, giraZ = 0) => {
    const g = new THREE.BoxGeometry(lx, ly, lz);
    vestiDiPietra(g, lx, ly, lz, x, y);
    if (giraZ) g.rotateZ(giraZ);
    g.translate(x, y, z);
    pezzi.push(g);
  };

  const stipite = spessore * 0.62;
  // Tutta la muratura sta fra la parete e la stanza: da z=0 a z=spessore.
  const zMuro = spessore / 2;

  // I due stipiti, per tutta l'altezza compreso il fianco dell'arco:
  // sono loro a coprire i bordi laterali della veduta.
  const altoStipite = altezza + raggio + stipite;

  for (const lato of [-1, 1]) {
    scatola(
      stipite,
      altoStipite,
      spessore,
      lato * (raggio + stipite / 2),
      altoStipite / 2,
      zMuro
    );
  }

  // Il davanzale: sporge più degli stipiti, ed è la parte su cui batte
  // la luce che entra. Senza, la finestra comincia dal nulla.
  scatola(
    larghezza + stipite * 2.6,
    spessore * 0.36,
    spessore * 1.6,
    0,
    -spessore * 0.18,
    zMuro + spessore * 0.3
  );

  // L'arco: i conci, ognuno ruotato lungo la curva.
  for (let i = 0; i < CONCI; i++) {
    const angolo = Math.PI * ((i + 0.5) / CONCI);
    const largoConcio = (Math.PI * (raggio + stipite / 2)) / CONCI;

    scatola(
      largoConcio * 1.1,
      stipite,
      spessore,
      Math.cos(angolo) * (raggio + stipite / 2),
      altezza + Math.sin(angolo) * (raggio + stipite / 2),
      zMuro,
      angolo - Math.PI / 2
    );
  }

  // I pennacchi: i due pieni fra l'estradosso dell'arco e i vertici del
  // rettangolo. Sono quello che chiude il disegno in alto — un arco che
  // finisce nel vuoto è un ferro di cavallo appeso al muro.
  for (const lato of [-1, 1]) {
    scatola(
      raggio * 0.5,
      raggio * 0.5,
      spessore,
      lato * (raggio + stipite / 2 - raggio * 0.25),
      altezza + raggio + stipite / 2 - raggio * 0.25,
      zMuro
    );
  }

  // L'architrave che chiude sopra, da stipite a stipite.
  scatola(
    larghezza + stipite * 2.4,
    stipite * 0.7,
    spessore * 1.15,
    0,
    altezza + raggio + stipite * 0.85,
    zMuro + spessore * 0.08
  );

  const muratura = new THREE.Mesh(mergeGeometries(pezzi, false), pietra);
  muratura.castShadow = true;
  muratura.receiveShadow = true;
  gruppo.add(muratura);

  /* ==================================================
     LA CROCIERA
     Due traversine di legno. Non servono a niente strutturalmente, e
     sono la cosa che più di ogni altra dice «finestra» invece che
     «buco»: un'apertura senza infisso è una breccia.
     ================================================== */

  const sezione = spessore * 0.16;

  const zCroce = spessore * 0.72;

  const croce = mergeGeometries(
    [
      new THREE.BoxGeometry(sezione, altezza + raggio, sezione).translate(
        0,
        (altezza + raggio) / 2,
        zCroce
      ),
      new THREE.BoxGeometry(larghezza, sezione, sezione).translate(
        0,
        altezza * 0.52,
        zCroce
      )
    ],
    false
  );

  const infisso = new THREE.Mesh(croce, legno);
  infisso.castShadow = true;
  gruppo.add(infisso);

  /* ==================================================
     LA LUCE CHE ENTRA
     Una finestra che non illumina niente è un poster. Questa è fredda
     rispetto alle lampade della stanza — è luce di cielo, non di
     lampadina — ed è la ragione per cui il pulviscolo davanti alla
     finestra si vede più che altrove.
     ================================================== */

  const sole = new THREE.PointLight(0xcfe4ff, 9, metri(9), 2);
  sole.position.set(0, altezza * 0.7, metri(0.9));
  gruppo.add(sole);

  return {
    gruppo,

    /* Il piano del davanzale, in coordinate del gruppo.
       ----------------------------------------------------------------
       Il davanzale sporge dentro la stanza per un mezzo metro di muro, e
       un mezzo metro di pietra all'altezza del petto è **una mensola**:
       lasciarla vuota è l'unico posto della stanza in cui si vede che
       nessuno ci abita. Ci vanno due piante — vedi `scena.js`, che è chi
       arreda — e stanno controluce, che è il posto in cui una foglia si
       vede meglio.

       Le quote escono da qui invece che da un conto rifatto fuori: il
       piano è a zero perché il davanzale è mezzo sopra e mezzo sotto
       l'origine, e nessuno se lo deve ricordare. */
    davanzale: {
      y: 0,
      z: spessore * 0.92,
      // La luce fra gli stipiti: oltre, una pianta finirebbe dentro il
      // muro.
      larga: larghezza
    },

    aggiorna(dt) {
      for (const { texture, velocita } of onde) {
        texture.offset.x = (texture.offset.x + velocita * dt) % 1;
      }
    }
  };
}

/* ==================================================
   LA PIETRA SULLE SCATOLE
   ================================================== */

/* Quanto misura, in unità di scena, un giro intero della texture di
   pietra così com'è messa sulle pareti.
   --------------------------------------------------------------------
   Non sono numeri liberi: le pareti applicano la stessa immagine con
   `repeat` 11×5 su una parete larga tredici metri e alta quattro e
   quaranta (vedi `#vestiMateriali` in `scena.js`), e questi due sono il
   risultato di quella divisione. Cambiare lì e non qui vuol dire conci
   di due misure diverse sullo stesso muro. */
const PIETRA_U = 19.9;
const PIETRA_V = 5;

/**
 * Rifà le UV di una scatola perché la pietra le venga sopra della stessa
 * misura che ha sul muro.
 *
 *
 * PERCHÉ SERVE
 *
 * Perché `BoxGeometry` dà a ogni faccia le stesse UV da 0 a 1,
 * qualunque sia la sua misura. Con una texture di conci sopra, questo
 * vuol dire che **ogni faccia mostra la texture intera schiacciata nel
 * proprio riquadro**: sullo stipite, che è alto quattro metri e largo
 * trenta centimetri, i conci venivano stirati in verticale fino a
 * diventare rigature — e infatti l'imbotte della finestra sembrava di
 * plastica scanalata accanto a un muro di pietra vera.
 *
 * Qui invece ogni faccia riceve una fetta di texture **proporzionale
 * alla propria misura in metri**, e con uno scostamento preso dalla
 * posizione della scatola: così due pezzi accostati non ripartono
 * tutti e due dallo stesso angolo del concio, che è l'altro modo in cui
 * si vede che una muratura è finta.
 */
function vestiDiPietra(geometria, lx, ly, lz, x, y) {
  const uv = geometria.attributes.uv;

  // L'ordine delle facce in `BoxGeometry`: +X, −X, +Y, −Y, +Z, −Z,
  // quattro vertici l'una. Per ognuna, quale misura corre in orizzontale
  // e quale in verticale.
  const facce = [
    [lz, ly], [lz, ly],
    [lx, lz], [lx, lz],
    [lx, ly], [lx, ly]
  ];

  const scostaU = x / PIETRA_U;
  const scostaV = y / PIETRA_V;

  for (let faccia = 0; faccia < 6; faccia++) {
    const [largo, alto] = facce[faccia];

    for (let v = 0; v < 4; v++) {
      const i = faccia * 4 + v;

      uv.setXY(
        i,
        uv.getX(i) * (largo / PIETRA_U) + scostaU,
        uv.getY(i) * (alto / PIETRA_V) + scostaV
      );
    }
  }

  uv.needsUpdate = true;
}

/* ==================================================
   I TRE DISEGNI
   ================================================== */

function tela(larghezza, altezza) {
  const canvas = document.createElement("canvas");
  canvas.width = larghezza;
  canvas.height = altezza;
  return canvas;
}

function daCanvas(canvas, { ripeti = 0 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  if (ripeti) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = ripeti;
  }

  return texture;
}

/**
 * Cielo e mare di fondo.
 *
 * I colori sono più carichi di quanto sembri guardando il canvas da
 * solo, e non è un errore: il fotogramma passa per il tone mapping
 * filmico del renderer, che comprime le luci e sbianca tutto quello che
 * è già chiaro. Un azzurro tenue dipinto qui arriva a schermo bianco —
 * ed era esattamente il difetto della prima versione, che sembrava un
 * vetro smerigliato invece che una veduta.
 */
function disegnaCielo() {
  const canvas = tela(256, 512);
  const ctx = canvas.getContext("2d");

  const ORIZZONTE = 0.46;
  const yOrizzonte = canvas.height * ORIZZONTE;

  const cielo = ctx.createLinearGradient(0, 0, 0, yOrizzonte);
  cielo.addColorStop(0, "#1f6ba8");
  cielo.addColorStop(0.5, "#5ba3cf");
  cielo.addColorStop(0.86, "#a9cfdf");
  cielo.addColorStop(1, "#e4d9b8");
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, canvas.width, yOrizzonte);

  // Le nuvole: tondi sovrapposti, non una forma disegnata. È così che
  // sono fatte le nuvole nei fondali dipinti, ed è il motivo per cui
  // funzionano anche grandi come un'unghia. Piatte sotto e gonfie sopra,
  // che è come stanno i cumuli in una giornata di sole.
  const nuvola = (cx, cy, scala, opacita) => {
    ctx.fillStyle = `rgba(255,253,247,${opacita})`;
    for (const [dx, dy, r] of [[-26, 4, 15], [-8, -6, 21], [12, 0, 17], [28, 6, 12]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * scala, cy + dy * scala, r * scala, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(cx - 30 * scala, cy, 60 * scala, 8 * scala);
  };

  nuvola(70, 96, 1, 0.95);
  nuvola(196, 52, 0.7, 0.85);
  nuvola(140, 158, 0.5, 0.6);

  /* ---- Il mare ----
     Chiaro all'orizzonte e via via più cupo verso il basso: è la
     prospettiva dell'acqua, che a distanza riflette il cielo e da vicino
     lascia vedere il fondo. Senza questa scala il mare è una campitura
     blu, e una campitura blu non è mai sembrata acqua a nessuno.

     I passaggi sono sette e non quattro. Con quattro, il salto fra il
     chiaro dell'orizzonte e il blu pieno si consumava in un decimo
     d'altezza, e quel decimo si vedeva: una fascia netta appena sotto la
     linea dell'acqua, cioè uno dei gradini di cui si lamentava la
     versione di prima. Sotto quella fascia il colore cambiava troppo
     poco per fare profondità e troppo di scatto per non farsi notare. */
  const mare = ctx.createLinearGradient(0, yOrizzonte, 0, canvas.height);
  mare.addColorStop(0, "#71aec2");
  mare.addColorStop(0.06, "#4e93ae");
  mare.addColorStop(0.16, "#357f9d");
  mare.addColorStop(0.32, "#256e8d");
  mare.addColorStop(0.55, "#1b5f7d");
  mare.addColorStop(0.8, "#15526d");
  mare.addColorStop(1, "#0f435a");
  ctx.fillStyle = mare;
  ctx.fillRect(0, yOrizzonte - 1, canvas.width, canvas.height - yOrizzonte + 1);

  /* Il pulviscolo sull'acqua.
     ------------------------------------------------------------------
     Un gradiente su otto bit, ingrandito su mezza finestra e passato per
     il tone mapping, si separa in fasce piatte: sono i gradini che si
     vedono anche dove non c'è disegnato niente. Mezzo punto di rumore
     rompe la fascia senza che si veda il rumore — è lo stesso trucco del
     dithering, e costa un ciclo su un canvas che si disegna una volta. */
  for (let y = yOrizzonte; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 2) {
      const grana = ((x * 7 + y * 13) % 5) - 2;
      ctx.fillStyle = `rgba(${grana > 0 ? "255,255,255" : "0,0,0"},0.028)`;
      ctx.fillRect(x + (y % 2), y, 2, 1);
    }
  }

  // La foschia sulla linea dell'orizzonte. È il singolo tratto che più
  // di ogni altro dà distanza: senza, cielo e mare si toccano con un
  // bordo netto e la veduta diventa due rettangoli sovrapposti.
  //
  // Meno carica di prima e più stretta. A 0,85 di bianco su una fascia
  // di quaranta pixel, passata per il tone mapping del renderer, non era
  // più foschia: era una lama di luce che sbiancava tutto il terzo alto
  // dell'acqua, e con l'acqua sbiancata il mare diventava una nuvola.
  const foschia = ctx.createLinearGradient(0, yOrizzonte - 18, 0, yOrizzonte + 10);
  foschia.addColorStop(0, "rgba(238,232,210,0)");
  foschia.addColorStop(0.6, "rgba(242,236,216,0.46)");
  foschia.addColorStop(1, "rgba(238,232,210,0)");
  ctx.fillStyle = foschia;
  ctx.fillRect(0, yOrizzonte - 18, canvas.width, 28);

  // La strada del sole: il riverbero che scende verso chi guarda,
  // stretto in fondo e largo davanti. Appena accennata, con i fianchi
  // sfumati invece che tagliati: a mezzo bianco e con i bordi netti si
  // vedeva il triangolo, e un triangolo chiaro sull'acqua non è un
  // riverbero, è un faro puntato.
  // Tre cunei uno dentro l'altro invece di uno solo: il bordo sfuma
  // perché ogni strato è più stretto e più chiaro del precedente, e tre
  // gradini di trasparenza da lontano sono una sfumatura. Costa due
  // riempimenti in più e evita di ritagliare una maschera.
  for (const [stretta, opaca] of [[1, 0.05], [0.8, 0.05], [0.6, 0.05], [0.4, 0.05], [0.2, 0.06]]) {
    const luce = ctx.createLinearGradient(0, yOrizzonte, 0, canvas.height);
    luce.addColorStop(0, `rgba(255,240,205,${opaca})`);
    luce.addColorStop(0.6, `rgba(255,232,180,${opaca * 0.45})`);
    luce.addColorStop(1, "rgba(255,225,160,0)");

    const centro = canvas.width * 0.51;
    const suOrizzonte = canvas.width * 0.09 * stretta;
    const suFondo = canvas.width * 0.35 * stretta;

    ctx.fillStyle = luce;
    ctx.beginPath();
    ctx.moveTo(centro - suOrizzonte, yOrizzonte);
    ctx.lineTo(centro + suOrizzonte, yOrizzonte);
    ctx.lineTo(centro + suFondo, canvas.height);
    ctx.lineTo(centro - suFondo, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  return daCanvas(canvas);
}

/**
 * Uno strato d'onde: creste chiare su fondo trasparente.
 *
 *
 * PERCHÉ PRIMA SEMBRAVA UNA SCALINATA
 *
 * Perché lo era. Le onde nascevano **per righe** — ventisei quote fisse,
 * e su ognuna una fila di trattini tutti alla stessa altezza — e le
 * quote erano distribuite in modo che vicino a chi guarda ce ne fossero
 * pochissime e lontanissime fra loro. Il risultato, in fondo alla
 * fascia d'acqua, erano quattro o cinque striscioni orizzontali netti
 * con in mezzo il vuoto: che è il disegno di una scala, non di un mare.
 * Ed erano trattini rettangoli, con gli spigoli, tutti della stessa
 * opacità dentro la stessa riga: cinque righe di mattoncini bianchi.
 *
 * La correzione è togliere le righe. Qui ogni cresta ha la sua quota,
 * pescata **uniformemente sull'altezza della fascia** invece che da un
 * elenco: quante ne capitano vicino a chi guarda e quante lontano lo
 * decide la densità sullo schermo, non un contatore. Da lì in poi tutto
 * il resto — lunghezza, spessore, opacità, piega — scala con la
 * distanza, che è la sola cosa che la versione di prima faceva bene.
 *
 * E non sono più rettangoli: sono tratti con una piega in mezzo e i capi
 * tondi, ognuno con sotto l'ombra del proprio cavo. Cresta chiara più
 * cavo scuro è tutto quello che serve perché una riga bianca diventi
 * rilievo — senza l'ombra è un graffio sul vetro.
 *
 * `seme` cambia la disposizione fra i due strati, e `giri` quanto è
 * fitta la trama: lo strato largo fa il mareggio, quello fitto il
 * luccichìo.
 */
function disegnaOnde(seme, giri) {
  const canvas = tela(512, 256);
  const ctx = canvas.getContext("2d");

  // Un conto stabile, non un sorteggio: la veduta non deve cambiare fra
  // un rimontaggio e l'altro.
  let n = 7919 + seme * 104729;
  const prossimo = () => {
    n = (n * 1103515245 + 12345) % 2147483648;
    return (n >> 7) / 16777216;
  };

  /* Quante creste, e quanto minute.
     ------------------------------------------------------------------
     Il primo tentativo ne metteva 460 e 700, ed era troppo di un ordine
     di grandezza: sommate fra i due strati facevano più di mille segni
     bianchi su mezzo migliaio di pixel d'acqua, e il mare veniva fuori
     coperto di schiuma da cima a fondo — non un mare mosso, un campo di
     neve. L'errore era di ragionare su quante onde ci sono in mare
     invece che su **quanto poco bianco** ci vuole perché una superficie
     blu si legga come acqua: pochissimo, e solo dove la luce ci batte.

     Lo strato fitto ne ha di più e più corte: è la stessa acqua
     guardata con l'occhio invece che con la mano. */
  const QUANTE = seme === 0 ? 150 : 230;
  const finezza = seme === 0 ? 1 : 0.62;

  ctx.lineCap = "round";

  for (let i = 0; i < QUANTE; i++) {
    // La quota, pescata sull'altezza vera della fascia. È questa riga la
    // differenza fra un mare e una scala.
    const v = prossimo();
    const y = canvas.height * (0.015 + v * 0.985);

    // Quanto è lontana quell'acqua: 0 all'orizzonte, 1 sotto la
    // finestra. È l'inverso della quota, con la curva della prospettiva.
    const q = Math.sqrt(v);

    const largo = (5 + q * 52 * finezza) * (0.6 + prossimo() * 0.8);
    const spesso = (0.7 + q * 2.6) * finezza;
    // Trasparenti quasi ovunque: le poche che si vedono davvero sono
    // quelle vicine, ed è giusto così — a mezzo chilometro un'onda non
    // si distingue, si vede solo che l'acqua non è liscia.
    const opaco = (0.03 + q * 0.2) * (0.5 + prossimo() * 0.7);

    const x = prossimo() * canvas.width;
    // La piega: una cresta è una curva, e il verso cambia da un'onda
    // all'altra perché cambia il vento sotto.
    const piega = (prossimo() - 0.5) * (1.4 + q * 6);

    // Il cavo, appena sotto: senza, la cresta non ha spessore.
    const tratto = (dx, colore, dy) => {
      ctx.strokeStyle = colore;
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.quadraticCurveTo(x + dx + largo / 2, y + dy + piega, x + dx + largo, y + dy);
      ctx.stroke();
    };

    // La stessa onda ripetuta oltre il bordo destro: è ciò che rende la
    // texture ripetibile senza una cucitura visibile.
    for (const dx of x + largo > canvas.width ? [0, -canvas.width] : [0]) {
      if (q > 0.3) {
        ctx.lineWidth = spesso * 1.15;
        tratto(dx, `rgba(9,42,64,${opaco * 0.5})`, spesso * 1.5);
      }

      ctx.lineWidth = spesso;
      tratto(dx, `rgba(255,255,255,${opaco})`, 0);
    }
  }

  return daCanvas(canvas, { ripeti: giri });
}

/**
 * I promontori, ai due lati.
 *
 * LA CORREZIONE CHE HA SALVATO LA VEDUTA
 *
 * Prima erano due creste che attraversavano tutta la larghezza, e il
 * risultato è che **coprivano il mare**: dalla finestra si vedeva una
 * fascia di cielo bianco sopra una gobba verde, e di acqua nemmeno un
 * pixel. Da lì il giudizio — «anche il panorama fuori sembra finto» —
 * che era esatto: quello non era un panorama, era una collina appoggiata
 * al vetro.
 *
 * Adesso la terra sta **solo ai bordi** e sprofonda sotto la linea
 * dell'orizzonte al centro. In mezzo resta il mare aperto, che è la cosa
 * che si vuole vedere da una finestra sul mare, e i due promontori
 * diventano quello che devono essere: le quinte che gli danno distanza.
 *
 * Le tinte scalano con la lontananza — la cresta lontana è slavata
 * d'azzurro, quella vicina è verde pieno. È prospettiva aerea, e senza
 * di quella due colline verdi si leggono come una macchia sola.
 */
function disegnaColline() {
  const canvas = tela(256, 512);
  const ctx = canvas.getContext("2d");

  const ORIZZONTE = canvas.height * 0.46;

  /**
   * Un promontorio che entra da un lato e scende in mare.
   *
   * `versoDestra` dice da che bordo entra; `presa` quanta larghezza
   * occupa; `cima` quanto sale sopra l'orizzonte; `battigia` di quanto
   * il suo piede scende sotto la linea dell'acqua.
   *
   *
   * PERCHÉ IL PIEDE NON ARRIVA PIÙ IN FONDO
   *
   * Perché prima ci arrivava, e si vedeva. La sagoma veniva chiusa sul
   * **bordo basso della veduta**, cioè il promontorio non era una costa
   * lontana: era una lastra di terra che dall'orizzonte scendeva fino
   * sotto il davanzale, coprendo tutta l'acqua alla sua sinistra. Dalla
   * stanza si leggeva per quello che era — una striscia verde verticale
   * incollata al fianco della finestra — ed era la cosa più finta di
   * tutta la veduta.
   *
   * Una costa vista dall'alto di una collina non fa così. Incontra
   * l'acqua e finisce lì, poco sotto la linea dell'orizzonte, e da quel
   * punto in giù c'è mare fino ai piedi di chi guarda. `battigia` è
   * quanto poco: una decina di pixel per quella lontana, il doppio per
   * quella vicina, perché più una riva è vicina più il suo piede sta in
   * basso nell'inquadratura.
   */
  const promontorio = (versoDestra, presa, cima, battigia, tinta) => {
    const piede = ORIZZONTE + battigia;

    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.moveTo(versoDestra ? canvas.width : 0, piede);

    for (let p = 0; p <= 1.001; p += 0.02) {
      const x = versoDestra ? canvas.width - p * presa : p * presa;
      // Alta al bordo, giù fino all'orizzonte alla fine della presa: un
      // coseno, più un'increspatura che le toglie l'aria di curva.
      const scende = (Math.cos(p * Math.PI) + 1) / 2;
      const y =
        ORIZZONTE - cima * scende + Math.sin(p * Math.PI * 5) * cima * 0.07 * scende;

      ctx.lineTo(x, y);
    }

    // Il piede segue la costa invece di tagliare dritto: la riva si
    // allontana man mano che il rilievo si abbassa.
    for (let p = 1; p >= -0.001; p -= 0.05) {
      const x = versoDestra ? canvas.width - p * presa : p * presa;
      const scende = (Math.cos(p * Math.PI) + 1) / 2;
      ctx.lineTo(x, ORIZZONTE + battigia * (0.25 + scende * 0.75));
    }

    ctx.closePath();
    ctx.fill();
  };

  /* Quanto stringono, in frazione di larghezza.
     ------------------------------------------------------------------
     Misurato, non scelto: sulla riga dell'orizzonte deve restare libera
     **almeno metà** della finestra, o si torna al difetto di prima — la
     terra che si mangia il mare. Con 0,26 a sinistra e 0,20 a destra
     resta scoperto il 54%, ed è il mare aperto in mezzo alle due
     quinte. */
  promontorio(false, canvas.width * 0.26, 52, 9, "#93b0b6");
  promontorio(true, canvas.width * 0.2, 38, 7, "#a2bbbf");

  // Quella vicina a sinistra, verde piena, che è dove sta la costa.
  promontorio(false, canvas.width * 0.19, 92, 19, "#4e7346");

  // La riva: il filo di spiaggia dove il verde incontra l'acqua. Senza,
  // la costa galleggia sul mare invece di entrarci.
  ctx.strokeStyle = "rgba(232,222,196,0.6)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let p = 1; p >= 0; p -= 0.05) {
    const scende = (Math.cos(p * Math.PI) + 1) / 2;
    const x = p * canvas.width * 0.19;
    const y = ORIZZONTE + 19 * (0.25 + scende * 0.75);
    if (p === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Gli alberi sul crinale vicino: tondi scuri appoggiati al profilo,
  // niente di più. Da questa distanza un albero è una macchia.
  ctx.fillStyle = "#33512f";
  for (const [x, y, r] of [
    [8, 172, 8], [21, 162, 11], [35, 170, 7], [46, 186, 9]
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Due vele all'orizzonte. Sono sei pixel in tutto e sono la cosa che
  // dà la scala a tutto il resto: senza qualcosa di riconoscibilmente
  // piccolo, un mare dipinto può essere largo dieci metri o dieci
  // chilometri.
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (const [x, y, s] of [[152, ORIZZONTE + 9, 1], [186, ORIZZONTE + 4, 0.7]]) {
    ctx.beginPath();
    ctx.moveTo(x, y - 9 * s);
    ctx.lineTo(x + 5 * s, y);
    ctx.lineTo(x - 5 * s, y);
    ctx.closePath();
    ctx.fill();
  }

  return daCanvas(canvas);
}
