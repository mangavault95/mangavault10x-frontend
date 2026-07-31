import * as THREE from "three";
import { copertinaLocale } from "./copertine";
import { caricaBibliotecario, ALTEZZA_BIBLIOTECARIO } from "./libraio";
import { Magazzino, metri } from "./modelli";
import { costruisciGuscio } from "./stanza";
import { costruisciLibrerie } from "./scaffali";
import { costruisciBancone } from "./bancone";
import { costruisciAngoloLettura } from "./angolo";

const legnoDiffuseUrl = new URL("./assets/legno/legno_diffuse.jpg", import.meta.url).href;
const legnoRuviditaUrl = new URL("./assets/legno/legno_ruvidita.jpg", import.meta.url).href;
const legnoNormaliUrl = new URL("./assets/legno/legno_normali.jpg", import.meta.url).href;
const intonacoDiffuseUrl = new URL("./assets/intonaco/intonaco_diffuse.jpg", import.meta.url).href;
const bibliotecarioGlbUrl = new URL("./assets/bibliotecario.glb", import.meta.url).href;

// Un indirizzo costruito con una variabile dentro `new URL(…,
// import.meta.url)`: Vite lo riconosce e in build copia tutti i `.glb`
// della cartella con il nome corretto. Vale a dire che quello che sta in
// `assets/arredo/` finisce nel pacchetto anche se qui sotto non è
// elencato — un modello che non serve più va cancellato, non solo tolto
// da `MODELLI`.
//
// Autori e licenze di ogni modello stanno in `assets/CREDITI.md`.
const arredo = (nome) => new URL(`./assets/arredo/${nome}.glb`, import.meta.url).href;

const MODELLI = {
  libreria: arredo("libreria"),
  scala: arredo("scala"),
  banconeTesta: arredo("banconeTesta"),
  banconeDritto: arredo("banconeDritto"),
  cassa: arredo("cassa"),
  libri: arredo("libri"),
  libroAperto: arredo("libroAperto"),
  lampadaTavolo: arredo("lampadaTavolo"),
  lampadaTerra: arredo("lampadaTerra"),
  lampadario: arredo("lampadario"),
  poltrona: arredo("poltrona"),
  tavolino: arredo("tavolino"),
  tappeto: arredo("tappeto"),
  pianta: arredo("pianta")
};

/**
 * La biblioteca in tre dimensioni.
 *
 * Questo file non sa niente di React ed è voluto: una scena WebGL ha un
 * ciclo di vita tutto suo — si costruisce una volta, vive nel suo loop
 * di animazione, e si smonta liberando memoria della scheda video.
 * Mescolarla al ciclo di render di React significherebbe ricostruire lo
 * scaffale a ogni cambio di stato.
 *
 * React qui fa solo tre cose: consegna il canvas, consegna le serie, e
 * riceve indietro cosa sta guardando il mouse.
 *
 *
 * DUE LUOGHI, NON UNO
 *
 * **La soglia** (sezione −1) è una stanza vera: pavimento, quattro
 * pareti, soffitto con travi, e dentro mobili scaricati — le librerie a
 * sinistra, il banco a destra, l'angolo lettura in mezzo. Ci si arriva
 * entrando e ci si torna con Escape. Il guscio della stanza sta in
 * `stanza.js`, i suoi tre arredi in `scaffali.js`, `bancone.js`,
 * `angolo.js`: qui resta l'orchestrazione, cioè dove va cosa.
 *
 * **Lo scaffale** (sezioni 0…n) è invece un'astrazione: una fila di
 * mobili larghi quanto lo schermo, con un volume gigante per serie e le
 * copertine leggibili. Non è la stessa stanza vista da vicino, e non
 * deve esserlo: le due misure non c'entrano niente l'una con l'altra —
 * lì un libro è alto un'unità, qui una persona ne è alta 2,6.
 *
 * Per questo la stanza si spegne appena si entra nello scaffale e
 * viceversa (vedi `vaiA`). Farle convivere significava, letteralmente,
 * vedere il bibliotecario spuntare da dietro il terzo ripiano.
 *
 *
 * COME CI SI MUOVE
 *
 * Non si cammina: la telecamera scivola fra postazioni fisse, una per
 * sezione di scaffale. È una scelta, non una scorciatoia — il movimento
 * libero su un sito dà la nausea a parecchia gente, non funziona col
 * dito su un telefono e non si usa da tastiera.
 *
 *
 * LE COPERTINE
 *
 * 188 immagini remote non si scaricano tutte insieme. Si carica la
 * sezione davanti agli occhi, si prepara la successiva mentre guardi, e
 * le sezioni lontane vengono liberate. Finché l'immagine non è arrivata
 * il libro non è vuoto: ha una copertina di carta colorata ricavata dal
 * titolo, così lo scaffale è già pieno al primo istante.
 */

/* ==================================================
   MISURE DELLO SCAFFALE
   Qui 1 = l'altezza di un tankobon.
   ================================================== */

const LIBRO_ALTEZZA = 1;
const LIBRO_LARGHEZZA = 0.71; // il rapporto reale di un tankobon
const SPESSORE_MIN = 0.07;
const SPESSORE_MAX = 0.42;

const PASSO_X = 0.86; // distanza fra un libro e l'altro
const PASSO_Y = 1.62; // distanza fra un ripiano e l'altro

/**
 * Quanti libri per ripiano, e quanti ripiani.
 *
 * Non è una costante: dipende dalla forma della finestra. Con una
 * griglia fissa di dodici colonne, su uno schermo verticale la
 * telecamera doveva indietreggiare fino a diciotto unità per farceli
 * stare tutti, e lo scaffale diventava un francobollo in mezzo al buio.
 */
const LAYOUT = [
  { minAspetto: 1.3, colonne: 12, righe: 3 }, // monitor
  { minAspetto: 0.85, colonne: 7, righe: 3 }, // finestra stretta, tablet
  { minAspetto: 0, colonne: 4, righe: 4 } // telefono in verticale
];

const layoutPerAspetto = (aspetto) =>
  LAYOUT.find((l) => aspetto >= l.minAspetto) || LAYOUT[LAYOUT.length - 1];

// Quanto il libro esce dallo scaffale quando lo guardi
const SPORGENZA = 0.32;

// Inclinazione di riposo: di taglio si vedrebbe solo la copertina e lo
// spessore sparirebbe. Un filo di rotazione lo rimette in mostra.
const ROTAZIONE_RIPOSO = -0.16;

const COLORE_LEGNO = 0x6b4b32;
const COLORE_INTONACO = 0xefe3cd;
const COLORE_FONDO_ALTO = 0xfdfbf4;
const COLORE_FONDO_BASSO = 0xe9dbc0;
const COLORE_FOG = 0xe8dcc4;
const COLORE_OTTONE = 0xc9a24b;

/* ==================================================
   MISURE DELLA STANZA
   Qui invece si ragiona in metri (vedi `modelli.js`): il bibliotecario
   è alto 2.6 unità e vale una persona di 1,70 m.
   ================================================== */

const PAVIMENTO_Y = -2.6;
const ALTEZZA_STANZA = metri(4.4);
const LARGHEZZA_STANZA = metri(13);
const FONDO_Z = -6.4;

// Il pavimento non finisce davanti alla telecamera ma le passa sotto: la
// soglia sta a quattordici unità dal centro della stanza, e un pavimento
// che si fermava a sette lasciava il vuoto nella metà bassa
// dell'inquadratura. Le travi invece si fermano prima (vedi
// `traviFinoZ`): una trave a mezzo metro dall'obiettivo è una sbarra
// nera in cima allo schermo, non profondità.
const DAVANTI_Z = 17;
const TRAVI_FINO_Z = 3;

const DESTRA_X = LARGHEZZA_STANZA / 2;
const SINISTRA_X = -LARGHEZZA_STANZA / 2;

/**
 * Dove sta la telecamera alla soglia, e quanto deve starci dentro.
 *
 * L'altezza è quella di una persona in piedi appena entrata, non una
 * vista dall'alto: da due metri e venti si vedeva mezza inquadratura di
 * pavimento vuoto, perché più in alto sta l'obiettivo più il pavimento
 * si apre a ventaglio davanti a lui. All'altezza degli occhi il
 * pavimento si accorcia da solo e lo spazio va agli scaffali.
 */
const SOGLIA_Y = -0.2;
const CAMERA_SOGLIA_Y = -0.1;
const SOGLIA_SEMI_LARGHEZZA = 8.6;
const SOGLIA_SEMI_ALTEZZA = 4;

/**
 * Dove si sta, alla soglia.
 *
 * Su uno schermo largo la stanza ci sta tutta in un colpo: una
 * postazione sola, al centro. Su un telefono in verticale no, e nessuna
 * distanza la fa entrare (vedi `DISTANZA_SOGLIA_MAX`) — quindi le
 * postazioni diventano due, una davanti alle librerie e una davanti al
 * banco, e ci si sposta con le stesse frecce che dentro lo scaffale
 * cambiano sezione. È la stessa idea del resto della scena: non si
 * cammina, si va da un punto all'altro.
 */
const POSTI_SOGLIA_LARGO = [0];
const POSTI_SOGLIA_STRETTO = [-4.6, 5.2];

/**
 * Il tetto alla distanza della telecamera.
 *
 * Su un telefono in verticale la formula dell'inquadratura chiederebbe
 * di indietreggiare fino a quaranta unità per far stare in larghezza una
 * stanza larga venti: la stanza finirebbe in fondo a un corridoio, alta
 * un ottavo dello schermo, con sopra e sotto solo soffitto e pavimento.
 *
 * Quello che segue è un ripiego dichiarato, non un progetto per il
 * telefono: la decisione in vigore (vedi `ROADMAP.md`) è di rifinire la
 * vista da schermo largo e affrontare il mobile in un giro dedicato.
 *
 * Fermandosi qui succede il contrario: in verticale l'inquadratura la
 * decide l'altezza — dal pavimento al soffitto ci sta tutto — e in
 * larghezza si vede la fetta centrale, con le librerie che entrano da
 * sinistra e il banco da destra. Non si vede tutta la stanza, ma quello
 * che si vede è una stanza. Ai punti che restano fuori si arriva
 * dall'elenco (vedi `HomePage.jsx`).
 */
const DISTANZA_SOGLIA_MAX = 15.5;

const LIBRERIE_CENTRO_X = -5;
const LIBRERIE_Z = -0.7;

const BANCO_CENTRO_X = 5.4;
const BANCO_Z = 0.6;
const MURO_BANCO_Z = -2.2;
// Dove comincia la parete del retrobanco. La sa anche `bancone.js`, che
// la ricava dalla stessa sottrazione: da qui in poi la stanza è divisa
// in due, e le librerie in fondo devono fermarsi prima.
const MURO_BANCO_SINISTRA_X = BANCO_CENTRO_X - metri(2.5);

const ANGOLO_X = 0;
const ANGOLO_Z = 2.4;

// Ogni punto cliccabile ha un alone sul pavimento, sempre acceso e non
// solo al passaggio del mouse: senza, un oggetto d'arredo in mezzo ad
// altro arredo non dice in nessun modo di essere cliccabile.
const SEGNO_RAGGIO = 0.62;
const SEGNO_COLORE = 0xfacc15; // brass-400, lo stesso accento del resto del sito

/* ==================================================
   UTILITÀ
   ================================================== */

// Una tinta stabile ricavata dal titolo: la stessa serie ha sempre lo
// stesso colore di carta, così lo scaffale non cambia aspetto a ogni
// ricarica mentre le immagini arrivano.
function tintaDaTitolo(titolo) {
  let h = 0;

  for (let i = 0; i < titolo.length; i++) {
    h = (h * 31 + titolo.charCodeAt(i)) % 360;
  }

  const colore = new THREE.Color();

  colore.setHSL(h / 360, 0.34, 0.34);

  return colore;
}

// Più volumi possiedi, più il libro è grosso. È l'informazione che in
// una griglia piatta non si vede mai, e qui si legge senza leggere.
function spessoreDaVolumi(volumi) {
  const n = Math.max(1, volumi || 1);

  // Radice quadrata invece che lineare: con 109 volumi di One Piece una
  // scala diretta produrrebbe un mattone alto quanto il ripiano.
  const t = Math.min(1, Math.sqrt(n) / Math.sqrt(40));

  return SPESSORE_MIN + t * (SPESSORE_MAX - SPESSORE_MIN);
}

const passoDolce = (t) => t * t * (3 - 2 * t);

/**
 * Il segno a terra sotto i punti cliccabili: un anello con dentro un
 * alone, non un disco pieno.
 *
 * Due versioni buttate prima di questa. Un `CircleGeometry` a tinta
 * unita si leggeva per quello che era, una macchia gialla sul parquet.
 * Un alone sfumato in additiva spariva del tutto: la stanza adesso è
 * chiara, e sommare luce a un pavimento già chiaro non produce niente.
 * L'anello invece ha un bordo, e un bordo si vede anche sul chiaro.
 */
function creaTexturaAlone() {
  const lato = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lato;

  const ctx = canvas.getContext("2d");
  const centro = lato / 2;

  const alone = ctx.createRadialGradient(centro, centro, 8, centro, centro, centro);
  alone.addColorStop(0, "rgba(255,255,255,0.34)");
  alone.addColorStop(0.62, "rgba(255,255,255,0.2)");
  alone.addColorStop(0.92, "rgba(255,255,255,0)");
  ctx.fillStyle = alone;
  ctx.fillRect(0, 0, lato, lato);

  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = lato * 0.035;
  ctx.beginPath();
  ctx.arc(centro, centro, centro * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = lato * 0.014;
  ctx.beginPath();
  ctx.arc(centro, centro, centro * 0.58, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

/* ==================================================
   LA SCENA
   ================================================== */

export default class Biblioteca {
  /**
   * @param contenitore  l'elemento che ospiterà la scena. Il canvas lo
   *   crea e lo distrugge questa classe, non React: in modalità
   *   rigorosa React monta, smonta e rimonta ogni effetto per stanare le
   *   pulizie mancanti, e un canvas riusato dopo che gli è stato tolto
   *   il contesto WebGL non ne ottiene mai un altro.
   */
  constructor(
    contenitore,
    {
      alMirare,
      alScegliere,
      alCambiareSezione,
      alAzione,
      alMirareOggetto,
      alPronta,
      menoMovimento = false
    }
  ) {
    this.contenitore = contenitore;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "block h-full w-full";
    contenitore.appendChild(this.canvas);

    this.alMirare = alMirare;
    this.alScegliere = alScegliere;
    this.alCambiareSezione = alCambiareSezione;
    // La stanza d'ingresso ha i suoi callback: un banco o una locandina
    // non sono una serie, e mescolarli nella stessa forma costringerebbe
    // chi ascolta a indovinare cosa gli è arrivato.
    this.alAzione = alAzione;
    this.alMirareOggetto = alMirareOggetto;
    this.alPronta = alPronta;
    this.menoMovimento = menoMovimento;

    this.libri = [];
    this.sezioni = 0;
    // -1 è la soglia: si parte sempre da lì, mai dentro lo scaffale.
    this.sezioneCorrente = -1;

    this.postoSoglia = 0;

    this.mirato = null;
    this.puntatore = new THREE.Vector2(-10, -10);
    this.raggio = new THREE.Raycaster();

    this.oggettiStanza = []; // tutto il cliccabile della soglia
    this.segni = [];
    this.copertineStanza = []; // i materiali delle vetrine, in attesa delle immagini
    this.posterBancone = [];

    this.viaggio = null; // { da, a, guardaDa, guardaA, inizio, durata }
    this.orologio = new THREE.Clock();
    this.fotogramma = 0;
    this.vivo = true;

    this.testureInUso = new Map(); // sezione → Set<Texture>
    this.caricamenti = new Set();

    this.magazzino = new Magazzino();

    this.#creaRenderer();
    this.#creaScena();
    this.#creaStanza();
    this.#collegaEventi();

    this.#disegna();
  }

  /* -------------------- Costruzione -------------------- */

  #creaRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });

    // Oltre 2 il guadagno visivo è nullo e il costo raddoppia: su uno
    // schermo retina si disegnerebbero quattro volte i pixel serviti.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.renderer.shadowMap.enabled = true;
    // `PCFSoftShadowMap` è deprecato in tre 0.185: `PCFShadowMap` è già
    // morbido di suo, non serve più scegliere la variante soft.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  #creaScena() {
    this.scena = new THREE.Scene();

    this.scena.background = this.#creaSfondoGradiente();
    // Poca: adesso la profondità la danno le pareti vere. Serve solo a
    // staccare le librerie in fondo da quelle davanti.
    this.scena.fog = new THREE.Fog(COLORE_FOG, 16, 46);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

    // Un valore di partenza: se il contenitore non ha ancora una misura
    // (capita al primo montaggio) `ridimensiona` rinuncia, e senza
    // questo la telecamera finirebbe a coordinata NaN.
    this.distanza = 9;
    this.distanzaSoglia = 12;
    this.camera.position.set(0, CAMERA_SOGLIA_Y, this.distanzaSoglia);

    this.bersaglioSguardo = new THREE.Vector3(0, SOGLIA_Y, 0);

    /* ---- Luci ----
       Una stanza chiusa si illumina diversamente da un fondale: il
       rimbalzo fra le pareti fa quasi tutto, e le direzionali servono
       solo a dare un verso alla luce e a staccare i volumi. */

    this.scena.add(new THREE.HemisphereLight(0xfff6e8, 0xa78a63, 1.15));

    // La luce principale: è lei a proiettare le ombre, le altre restano
    // di riempimento (due luci con ombra vera costerebbero il doppio per
    // un guadagno che non si vede).
    const lampada = new THREE.DirectionalLight(0xffe6bd, 1.55);
    lampada.position.set(-5, 9, 9);
    lampada.castShadow = true;
    lampada.shadow.mapSize.set(2048, 2048);
    lampada.shadow.camera.left = -16;
    lampada.shadow.camera.right = 16;
    lampada.shadow.camera.top = 12;
    lampada.shadow.camera.bottom = -12;
    lampada.shadow.camera.near = 1;
    lampada.shadow.camera.far = 42;
    lampada.shadow.bias = -0.0012;
    this.scena.add(lampada);
    this.scena.add(lampada.target);

    // Luce frontale morbida: non crea atmosfera, ma garantisce che ogni
    // copertina sia leggibile ovunque si trovi lungo lo scaffale.
    const frontale = new THREE.DirectionalLight(0xfff4e0, 0.55);
    frontale.position.set(0, 2, 12);
    this.scena.add(frontale);

    const radente = new THREE.DirectionalLight(0xa8bcff, 0.3);
    radente.position.set(9, 2, -3);
    this.scena.add(radente);

    // Un alone caldo dietro lo scaffale: è quello che fa sembrare la
    // stanza illuminata invece che semplicemente grigia. Segue la
    // sezione inquadrata invece di restare fisso all'origine, così non
    // lascia al buio le sezioni successive.
    this.alone = new THREE.PointLight(0xfacc15, 22, 34, 2);
    this.alone.position.set(0, 0.6, -2.4);
    this.scena.add(this.alone);

    this.gruppoLibri = new THREE.Group();
    // Lo scaffale vero si vede solo entrando (`vaiA`).
    this.gruppoLibri.visible = false;
    this.scena.add(this.gruppoLibri);

    this.gruppoScaffale = new THREE.Group();
    this.gruppoScaffale.visible = false;
    this.scena.add(this.gruppoScaffale);

    // Geometria condivisa da tutti i libri: una sola volta in memoria,
    // le differenze di formato le fa la scala di ogni mesh.
    this.geometriaLibro = new THREE.BoxGeometry(1, 1, 1);

    // La stessa scatola, ma con le facce raggruppate in tre invece che
    // in sei. Una `BoxGeometry` normale dichiara un gruppo per faccia, e
    // three disegna una chiamata per gruppo: con i quasi cinquanta
    // volumi delle vetrine facevano trecento chiamate solo di libri, per
    // cinque facce su sei che sono tutte dello stesso materiale di
    // carta. Riunire le facce contigue ne toglie la metà senza cambiare
    // di un pixel il risultato.
    this.geometriaCopertina = new THREE.BoxGeometry(1, 1, 1);
    this.geometriaCopertina.clearGroups();
    this.geometriaCopertina.addGroup(0, 24, 0); // +X, −X, +Y, −Y: carta
    this.geometriaCopertina.addGroup(24, 6, 1); // +Z: la copertina
    this.geometriaCopertina.addGroup(30, 6, 0); // −Z: carta

    // Le cinque facce che non sono la copertina: carta e cartone.
    this.materialeCarta = new THREE.MeshStandardMaterial({
      color: 0xe8e2d4,
      roughness: 0.92,
      metalness: 0
    });

    this.#creaMateriali();
  }

  /**
   * I materiali condivisi della stanza.
   *
   * Il legno è uno solo come *immagine* ma tre come materiale, e non è
   * uno spreco: la stessa texture stirata su un pavimento di dodici
   * metri e su un montante di venti centimetri produce una venatura
   * grande come una mano nel primo caso e invisibile nel secondo. Il
   * numero di ripetizioni è l'unica differenza fra i tre.
   */
  #creaMateriali() {
    const legno = () =>
      new THREE.MeshStandardMaterial({
        color: COLORE_LEGNO,
        roughness: 0.85,
        metalness: 0.05
      });

    this.materialeLegno = legno(); // scaffale, boiserie, travi
    this.materialeLegnoPavimento = legno();

    this.materialeIntonaco = new THREE.MeshStandardMaterial({
      color: COLORE_INTONACO,
      roughness: 0.96,
      metalness: 0
    });

    this.materialeOttone = new THREE.MeshStandardMaterial({
      color: COLORE_OTTONE,
      roughness: 0.32,
      metalness: 0.75
    });

    this.#vestiMateriali();
  }

  /**
   * Le texture vere (CC0 di Poly Haven) arrivano dopo: i colori piatti
   * qui sopra sono un punto di partenza, non un ripiego sbagliato — il
   * legno resta legno anche prima che arrivino, quindi non c'è bisogno
   * di aspettarle per costruire il resto della stanza.
   */
  #vestiMateriali() {
    const caricatore = new THREE.TextureLoader();

    const applica = (url, destinazioni) => {
      caricatore.load(url, (texture) => {
        if (!this.vivo) {
          texture.dispose();
          return;
        }

        for (const { materiale, chiave, ripeti, srgb } of destinazioni) {
          // Una copia per destinazione: `repeat` vive sulla texture, non
          // sul materiale, e condividerla vorrebbe dire che l'ultimo a
          // scrivere decide per tutti.
          const copia = texture.clone();

          copia.wrapS = copia.wrapT = THREE.RepeatWrapping;
          copia.repeat.set(ripeti[0], ripeti[1]);
          if (srgb) copia.colorSpace = THREE.SRGBColorSpace;
          copia.needsUpdate = true;

          materiale[chiave] = copia;
          materiale.color.set(0xffffff);
          materiale.needsUpdate = true;
        }

        texture.dispose();
      });
    };

    applica(legnoDiffuseUrl, [
      { materiale: this.materialeLegno, chiave: "map", ripeti: [4, 2], srgb: true },
      { materiale: this.materialeLegnoPavimento, chiave: "map", ripeti: [9, 7], srgb: true }
    ]);

    applica(legnoRuviditaUrl, [
      { materiale: this.materialeLegno, chiave: "roughnessMap", ripeti: [4, 2] },
      { materiale: this.materialeLegnoPavimento, chiave: "roughnessMap", ripeti: [9, 7] }
    ]);

    applica(legnoNormaliUrl, [
      { materiale: this.materialeLegno, chiave: "normalMap", ripeti: [4, 2] },
      { materiale: this.materialeLegnoPavimento, chiave: "normalMap", ripeti: [9, 7] }
    ]);

    applica(intonacoDiffuseUrl, [
      { materiale: this.materialeIntonaco, chiave: "map", ripeti: [9, 4], srgb: true }
    ]);
  }

  /**
   * Lo sfondo: un gradiente verticale disegnato su un canvas 1×256, non
   * un colore piatto. Con la stanza chiusa si vede solo dentro lo
   * scaffale, ma è proprio lì che serve.
   */
  #creaSfondoGradiente() {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");
    const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);

    gradiente.addColorStop(0, `#${COLORE_FONDO_ALTO.toString(16).padStart(6, "0")}`);
    gradiente.addColorStop(1, `#${COLORE_FONDO_BASSO.toString(16).padStart(6, "0")}`);

    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
  }

  /* -------------------- Le serie -------------------- */

  impostaSerie(serie, { mantieni } = {}) {
    this.#svuotaLibri();

    this.serie = serie;

    // La griglia si fissa qui: cambiarla a metà strada significa
    // ricostruire, e ricostruire va fatto solo quando la finestra cambia
    // forma davvero (vedi `ridimensiona`).
    const layout = layoutPerAspetto(this.camera.aspect);

    this.colonne = layout.colonne;
    this.righe = layout.righe;
    this.perSezione = layout.colonne * layout.righe;
    this.larghezzaSezione = layout.colonne * PASSO_X;
    this.layoutAttivo = `${layout.colonne}x${layout.righe}`;

    this.sezioni = Math.max(1, Math.ceil(serie.length / this.perSezione));

    serie.forEach((s, indice) => this.#creaLibro(s, indice));

    this.#creaScaffale();
    this.#vestiStanza();

    this.distanza = this.#distanzaPerInquadrare();

    // Dopo una ricostruzione si torna davanti alla stessa serie, non
    // all'inizio: cambiare la finestra non deve farti perdere il posto.
    // Il primo caricamento invece atterra alla soglia (-1).
    const partenza =
      mantieni !== undefined
        ? Math.min(this.sezioni - 1, Math.floor(mantieni / this.perSezione))
        : -1;

    this.vaiA(partenza, { immediato: true });
  }

  #creaLibro(serie, indice) {
    const sezione = Math.floor(indice / this.perSezione);
    const dentro = indice % this.perSezione;
    const riga = Math.floor(dentro / this.colonne);
    const colonna = dentro % this.colonne;

    const spessore = spessoreDaVolumi(serie.posseduti);

    const copertina = new THREE.MeshStandardMaterial({
      color: tintaDaTitolo(serie.titolo),
      roughness: 0.62,
      metalness: 0.04
    });

    // L'ordine delle facce di un BoxGeometry è +X, −X, +Y, −Y, +Z, −Z:
    // la quinta è quella rivolta a chi guarda, e lì va la copertina.
    const materiali = [
      this.materialeCarta,
      this.materialeCarta,
      this.materialeCarta,
      this.materialeCarta,
      copertina,
      this.materialeCarta
    ];

    const libro = new THREE.Mesh(this.geometriaLibro, materiali);

    libro.scale.set(LIBRO_LARGHEZZA, LIBRO_ALTEZZA, spessore);

    const x =
      sezione * (this.larghezzaSezione + PASSO_X) +
      colonna * PASSO_X -
      (this.larghezzaSezione - PASSO_X) / 2;

    // Le righe vengono centrate attorno a zero: così l'occhio della
    // telecamera sta sempre a metà scaffale, con tre ripiani o con
    // quattro.
    const y = ((this.righe - 1) / 2 - riga) * PASSO_Y;

    libro.position.set(x, y, 0);
    libro.rotation.y = ROTAZIONE_RIPOSO;
    libro.castShadow = true;
    libro.receiveShadow = true;

    libro.userData = {
      serie,
      sezione,
      copertina,
      riposoZ: 0,
      sporgenza: 0
    };

    this.libri.push(libro);
    this.gruppoLibri.add(libro);
  }

  /**
   * I ripiani di legno dello scaffale.
   *
   * Non sono decorazione: senza un piano sotto, i libri sembrano
   * galleggiare e tutta l'illusione dello scaffale sparisce.
   */
  #creaScaffale() {
    const legno = this.materialeLegno;

    const passoSezione = this.larghezzaSezione + PASSO_X;

    // Una libreria per sezione, non un ripiano unico che scorre. Il
    // legno continuo faceva sembrare le sezioni pezzi arbitrari di un
    // nastro infinito: passando alla successiva non si capiva di essere
    // arrivati da qualche parte.
    const larghezzaMobile = this.larghezzaSezione + LIBRO_LARGHEZZA * 0.6;
    const altezzaMobile = PASSO_Y * this.righe + 0.5;

    for (let sezione = 0; sezione < this.sezioni; sezione++) {
      const centroSezione = sezione * passoSezione;

      for (let riga = 0; riga < this.righe; riga++) {
        const y = ((this.righe - 1) / 2 - riga) * PASSO_Y;

        const piano = new THREE.Mesh(
          new THREE.BoxGeometry(larghezzaMobile, 0.08, 1.1),
          legno
        );

        // Mezzo libro più in basso: il ripiano sta sotto i volumi.
        piano.position.set(centroSezione, y - LIBRO_ALTEZZA / 2 - 0.04, -0.1);
        piano.castShadow = true;
        piano.receiveShadow = true;

        this.gruppoScaffale.add(piano);
      }

      // I due montanti che chiudono il mobile ai lati. Sono loro a dire
      // "questa libreria finisce qui".
      for (const lato of [-1, 1]) {
        const montante = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, altezzaMobile, 1.1),
          legno
        );

        montante.position.set(centroSezione + (lato * larghezzaMobile) / 2, -0.06, -0.1);
        montante.castShadow = true;
        montante.receiveShadow = true;

        this.gruppoScaffale.add(montante);
      }
    }

    // Il fondo dello scaffale: una parete dietro i libri, che impedisce
    // di vedere "attraverso" la libreria.
    const centroX = ((this.sezioni - 1) * passoSezione) / 2;
    const larghezzaTotale = (this.sezioni - 1) * passoSezione + larghezzaMobile;

    const fondo = new THREE.Mesh(
      new THREE.BoxGeometry(larghezzaTotale, PASSO_Y * this.righe + 0.6, 0.08),
      legno
    );

    fondo.position.set(centroX, 0, -0.62);
    fondo.receiveShadow = true;

    this.gruppoScaffale.add(fondo);
  }

  /* -------------------- La stanza d'ingresso -------------------- */

  /**
   * La stanza: prima il guscio (sincrono, così non c'è mai un istante di
   * vuoto), poi gli arredi man mano che i modelli arrivano.
   *
   * Non dipende dalla collezione e non viene mai ricostruita: le
   * copertine che ci finiscono sopra arrivano dopo, per conto loro
   * (`#vestiStanza`).
   */
  #creaStanza() {
    this.gruppoStanza = new THREE.Group();
    this.scena.add(this.gruppoStanza);

    const { gruppo, soffittoY, agganciLampadari } = costruisciGuscio({
      pavimentoY: PAVIMENTO_Y,
      altezza: ALTEZZA_STANZA,
      larghezza: LARGHEZZA_STANZA,
      fondoZ: FONDO_Z,
      davantiZ: DAVANTI_Z,
      traviFinoZ: TRAVI_FINO_Z,
      intonaco: this.materialeIntonaco,
      legno: this.materialeLegno,
      legnoPavimento: this.materialeLegnoPavimento,
      ottone: this.materialeOttone
    });

    this.gruppoStanza.add(gruppo);
    this.soffittoY = soffittoY;

    this.#arreda(agganciLampadari).catch((errore) =>
      console.error("La stanza non si è arredata:", errore)
    );
  }

  /**
   * Tutto quello che va aspettato: i modelli arrivano dalla rete, e
   * ognuno di questi pezzi può fallire per conto suo senza portarsi
   * dietro gli altri — una stanza senza pianta è meglio di una stanza
   * senza niente.
   */
  async #arreda(agganciLampadari) {
    await Promise.all([
      this.#appendiLampadari(agganciLampadari),
      this.#costruisciLibrerie(),
      this.#costruisciBanco(),
      this.#costruisciAngolo()
    ]);

    if (!this.vivo) return;

    this.#vestiStanza();
    this.alPronta?.();
  }

  async #appendiLampadari(quote) {
    const colonne = [-metri(3.6), metri(0.2), metri(4)];

    await Promise.all(
      quote.slice(0, 2).flatMap((z) =>
        colonne.map(async (x) => {
          const lampada = await this.magazzino.preleva(MODELLI.lampadario, {
            alto: 1.35,
            ancora: "cima"
          });

          if (!lampada || !this.vivo) return;

          lampada.position.set(x, this.soffittoY - 0.34, z);
          this.gruppoStanza.add(lampada);

          const luce = new THREE.PointLight(0xffdcae, 6, metri(7), 2);
          luce.position.set(x, this.soffittoY - metri(1.5), z);
          this.gruppoStanza.add(luce);
        })
      )
    );
  }

  async #costruisciLibrerie() {
    const librerie = await costruisciLibrerie({
      magazzino: this.magazzino,
      urlLibreria: MODELLI.libreria,
      urlScala: MODELLI.scala,
      pavimentoY: PAVIMENTO_Y,
      fondoZ: FONDO_Z,
      sinistraX: SINISTRA_X,
      centroX: LIBRERIE_CENTRO_X,
      frontZ: LIBRERIE_Z,
      // Fin sotto il pilastro del retrobanco: la parete di fondo va
      // coperta tutta, altrimenti resta una campata di intonaco vuoto
      // proprio al centro dell'inquadratura.
      fondoFinoA: MURO_BANCO_SINISTRA_X,
      geometriaLibro: this.geometriaCopertina,
      materialeCarta: this.materialeCarta,
      tinta: tintaDaTitolo
    });

    if (!librerie || !this.vivo) return;

    this.gruppoStanza.add(librerie.gruppo);
    this.copertineStanza = librerie.coperture;

    this.#registraBersaglio(librerie.bersaglio, librerie.segno);
  }

  async #costruisciBanco() {
    const banco = await costruisciBancone({
      magazzino: this.magazzino,
      url: {
        testa: MODELLI.banconeTesta,
        dritto: MODELLI.banconeDritto,
        cassa: MODELLI.cassa,
        libri: MODELLI.libri,
        libroAperto: MODELLI.libroAperto,
        lampada: MODELLI.lampadaTavolo
      },
      pavimentoY: PAVIMENTO_Y,
      soffittoY: this.soffittoY,
      centroX: BANCO_CENTRO_X,
      bancoZ: BANCO_Z,
      muroZ: MURO_BANCO_Z,
      muroSinistraX: MURO_BANCO_SINISTRA_X,
      destraX: DESTRA_X,
      intonaco: this.materialeIntonaco,
      legno: this.materialeLegno,
      ottone: this.materialeOttone
    });

    if (!banco || !this.vivo) return;

    this.gruppoStanza.add(banco.gruppo);
    this.posterBancone = banco.poster;

    for (const { mesh, segno } of banco.bersagli) {
      this.#registraBersaglio(mesh, segno);
    }

    await this.#mettiIlBibliotecario(banco.postoLibraio);
  }

  async #mettiIlBibliotecario({ x, y, z }) {
    const bibliotecario = await caricaBibliotecario({ url: bibliotecarioGlbUrl, x, y, z });

    if (!this.vivo) return;

    this.bibliotecario = bibliotecario;
    this.gruppoStanza.add(bibliotecario.gruppo);

    // Stretto intorno a lei, non allargato fin sopra il banco: cassa e
    // volumi stanno sul piano, e un bersaglio che li scavalca in
    // profondità se li mangerebbe tutti e due — il raggio prende il
    // primo che incontra, non il più piccolo.
    const bersaglio = new THREE.Mesh(
      new THREE.BoxGeometry(metri(1.1), ALTEZZA_BIBLIOTECARIO, metri(0.8)),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    bersaglio.position.set(x, y + ALTEZZA_BIBLIOTECARIO / 2, z);
    bersaglio.userData = { azione: { tipo: "bibliotecario" } };
    this.gruppoStanza.add(bersaglio);

    this.#registraBersaglio(bersaglio, { x, z: z + metri(2.1) });
  }

  async #costruisciAngolo() {
    const angolo = await costruisciAngoloLettura({
      magazzino: this.magazzino,
      url: {
        tappeto: MODELLI.tappeto,
        poltrona: MODELLI.poltrona,
        tavolino: MODELLI.tavolino,
        libroAperto: MODELLI.libroAperto,
        lampadaTerra: MODELLI.lampadaTerra,
        pianta: MODELLI.pianta
      },
      pavimentoY: PAVIMENTO_Y,
      centroX: ANGOLO_X,
      centroZ: ANGOLO_Z
    });

    if (!angolo || !this.vivo) return;

    this.gruppoStanza.add(angolo.gruppo);
  }

  /** Un oggetto cliccabile della soglia, con il suo alone a terra. */
  #registraBersaglio(mesh, segno) {
    this.oggettiStanza.push(mesh);

    if (!segno) return;

    mesh.userData.alone = this.#creaSegno(segno.x, segno.z, segno.raggio);
  }

  /**
   * L'alone a terra sotto un punto cliccabile.
   *
   * Un materiale non illuminato (Basic, non Standard) fa sì che il segno
   * si veda uguale ovunque nella stanza, indipendentemente da quanta
   * luce vera gli arriva addosso.
   */
  #creaSegno(x, z, raggio = SEGNO_RAGGIO) {
    if (!this.texturaAlone) this.texturaAlone = creaTexturaAlone();

    const segno = new THREE.Mesh(
      new THREE.PlaneGeometry(raggio * 2, raggio * 2),
      new THREE.MeshBasicMaterial({
        color: SEGNO_COLORE,
        map: this.texturaAlone,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
      })
    );

    segno.rotation.x = -Math.PI / 2;
    segno.position.set(x, PAVIMENTO_Y + 0.03, z);
    segno.renderOrder = 2;

    this.gruppoStanza.add(segno);
    this.segni.push(segno);

    return segno;
  }

  /**
   * Le copertine vere sulle vetrine e sulle locandine dietro al banco.
   *
   * Non è un asset in più: sono le stesse immagini che il sito scarica
   * già per la propria collezione. Si può arrivare qui da due parti — le
   * serie che arrivano dopo la stanza, o la stanza che finisce di
   * costruirsi dopo le serie — quindi la funzione controlla da sola se
   * ha entrambe le cose e non fa niente due volte.
   */
  #vestiStanza() {
    if (this.stanzaVestita) return;
    if (!this.serie?.length) return;
    if (!this.copertineStanza.length && !this.posterBancone.length) return;

    this.stanzaVestita = true;

    const conCopertina = this.serie.filter((s) => copertinaLocale(s.copertina));

    const destinazioni = [
      ...this.copertineStanza.map((materiale) => ({ materiale })),
      ...this.posterBancone.map((mesh) => ({ materiale: mesh.material }))
    ];

    const daFare = destinazioni
      .map((destinazione, indice) => ({
        ...destinazione,
        url: copertinaLocale(conCopertina[indice % conCopertina.length]?.copertina)
      }))
      .filter((v) => v.url);

    this.testureStanza = new Set();

    this.#scaricaAFlusso(daFare, ({ materiale }, testura) => {
      materiale.map = testura;
      // Con una texture applicata il colore va portato a bianco,
      // altrimenti la tinta di ripiego moltiplica l'immagine e la
      // copertina esce sporca di verde o di viola.
      materiale.color.set(0xffffff);
      materiale.needsUpdate = true;

      this.testureStanza.add(testura);
    });
  }

  /* -------------------- Copertine -------------------- */

  /**
   * Scarica un elenco di immagini poche per volta.
   *
   * Senza un limite il browser aprirebbe centottantotto connessioni
   * insieme e le metterebbe tutte in coda: le prime immagini
   * comparirebbero più tardi di quanto compaiano caricandone sei alla
   * volta.
   */
  async #scaricaAFlusso(daFare, applica) {
    const caricatore = new THREE.TextureLoader();
    const MAX_INSIEME = 6;

    let prossimo = 0;

    const lavoratore = async () => {
      while (prossimo < daFare.length && this.vivo) {
        const voce = daFare[prossimo++];

        try {
          const testura = await caricatore.loadAsync(voce.url);

          if (!this.vivo) {
            testura.dispose();
            return;
          }

          testura.colorSpace = THREE.SRGBColorSpace;
          testura.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

          applica(voce, testura);
        } catch {
          // Copertina irraggiungibile: resta la carta colorata, che è
          // esattamente il motivo per cui esiste.
        }
      }
    };

    const lavoro = Promise.all(Array.from({ length: MAX_INSIEME }, () => lavoratore()));

    this.caricamenti.add(lavoro);

    await lavoro;

    this.caricamenti.delete(lavoro);
  }

  async #caricaCoperturePerSezione(sezione) {
    if (sezione < 0 || sezione >= this.sezioni) return;
    if (this.testureInUso.has(sezione)) return;

    const set = new Set();
    this.testureInUso.set(sezione, set);

    const daFare = this.libri
      .filter((l) => l.userData.sezione === sezione)
      .map((l) => ({ libro: l, url: copertinaLocale(l.userData.serie.copertina) }))
      .filter((v) => v.url);

    await this.#scaricaAFlusso(daFare, ({ libro }, testura) => {
      libro.userData.copertina.map = testura;
      libro.userData.copertina.color.set(0xffffff);
      libro.userData.copertina.needsUpdate = true;

      set.add(testura);
    });
  }

  /** Libera la memoria video delle sezioni ormai lontane. */
  #liberaSezioniLontane() {
    for (const [sezione, set] of this.testureInUso) {
      if (Math.abs(sezione - this.sezioneCorrente) <= 2) continue;

      for (const testura of set) testura.dispose();

      for (const libro of this.libri) {
        if (libro.userData.sezione !== sezione) continue;

        libro.userData.copertina.map = null;
        libro.userData.copertina.color.copy(tintaDaTitolo(libro.userData.serie.titolo));
        libro.userData.copertina.needsUpdate = true;
      }

      this.testureInUso.delete(sezione);
    }
  }

  /* -------------------- Postazioni -------------------- */

  vaiA(sezione, { immediato = false } = {}) {
    const nuova = Math.max(-1, Math.min(this.sezioni - 1, sezione));

    // Si passa da un mondo cliccabile all'altro: i libri non sono
    // bersagli alla soglia, il banco non lo è dentro lo scaffale. Senza
    // azzerare qui, l'etichetta dell'ultimo oggetto mirato resterebbe a
    // schermo anche dopo il cambio.
    const cambiaModo = (nuova === -1) !== (this.sezioneCorrente === -1);

    this.sezioneCorrente = nuova;

    // Un solo luogo alla volta. La stanza e lo scaffale occupano lo
    // stesso spazio e sono disegnati a due scale diverse: farli
    // convivere vuol dire vedere il bibliotecario spuntare da dietro un
    // ripiano, ed è esattamente quello che succedeva.
    const dentroScaffale = nuova !== -1;
    this.gruppoLibri.visible = dentroScaffale;
    this.gruppoScaffale.visible = dentroScaffale;
    this.gruppoStanza.visible = !dentroScaffale;

    if (cambiaModo && this.mirato) {
      this.mirato = null;
      this.canvas.style.cursor = "default";
      this.alMirare?.(null);
      this.alMirareOggetto?.(null);
    }

    let destinazione, sguardo, aloneX, aloneZ;

    if (nuova === -1) {
      const posti = this.#postiSoglia();

      this.postoSoglia = Math.max(0, Math.min(posti.length - 1, this.postoSoglia));

      const x = posti[this.postoSoglia];

      destinazione = new THREE.Vector3(x, CAMERA_SOGLIA_Y, this.distanzaSoglia);
      sguardo = new THREE.Vector3(x, SOGLIA_Y, 0);
      aloneX = x;
      aloneZ = 1;
    } else {
      const x = nuova * (this.larghezzaSezione + PASSO_X);

      destinazione = new THREE.Vector3(x, 0.1, this.distanza);
      sguardo = new THREE.Vector3(x, 0, 0);
      aloneX = x;
      aloneZ = -2.4;
    }

    // L'alone caldo accompagna lo sguardo: restando all'origine
    // illuminava solo la prima sezione e lasciava le altre spente.
    this.alone?.position.set(aloneX, 0.6, aloneZ);
    this.alone.visible = dentroScaffale;

    if (immediato || this.menoMovimento) {
      this.camera.position.copy(destinazione);
      this.bersaglioSguardo.copy(sguardo);
      this.camera.lookAt(this.bersaglioSguardo);
      this.viaggio = null;
    } else {
      this.viaggio = {
        da: this.camera.position.clone(),
        a: destinazione,
        guardaDa: this.bersaglioSguardo.clone(),
        guardaA: sguardo,
        inizio: performance.now(),
        durata: 900
      };
    }

    this.alCambiareSezione?.(nuova, this.sezioni, {
      indice: this.postoSoglia,
      totali: this.#postiSoglia().length
    });

    // La sezione accanto si prepara mentre guardi questa: quando ci
    // arrivi le copertine ci sono già. Alla soglia (-1) non si carica
    // niente: quelle della stanza sono già a posto.
    if (dentroScaffale) {
      this.#caricaCoperturePerSezione(nuova);
      this.#caricaCoperturePerSezione(nuova + 1);
      this.#caricaCoperturePerSezione(nuova - 1);
    }

    this.#liberaSezioniLontane();
  }

  #postiSoglia() {
    return this.camera.aspect < 1 ? POSTI_SOGLIA_STRETTO : POSTI_SOGLIA_LARGO;
  }

  /**
   * Le frecce, alla soglia, spostano fra le postazioni della stanza
   * invece che fra le sezioni dello scaffale; su schermo largo di
   * postazioni ce n'è una sola e non fanno niente.
   */
  avanti() {
    if (this.sezioneCorrente === -1) return this.#giraSoglia(1);

    this.vaiA(this.sezioneCorrente + 1);
  }

  #giraSoglia(passo) {
    const posti = this.#postiSoglia();
    const nuovo = Math.max(0, Math.min(posti.length - 1, this.postoSoglia + passo));

    if (nuovo === this.postoSoglia) return;

    this.postoSoglia = nuovo;
    this.vaiA(-1);
  }

  // Il minimo è 0, non -1: la freccia sinistra alla prima sezione non
  // deve far uscire dallo scaffale, quel gesto è riservato a Escape
  // (`tornaAllaSoglia`).
  indietro() {
    if (this.sezioneCorrente === -1) return this.#giraSoglia(-1);

    this.vaiA(Math.max(0, this.sezioneCorrente - 1));
  }

  /** Porta la telecamera alla sezione che contiene una certa serie. */
  vaiAllaSerie(id) {
    const indice = this.libri.findIndex((l) => String(l.userData.serie.id) === String(id));

    if (indice >= 0) this.vaiA(this.libri[indice].userData.sezione);
  }

  /** Entra nel flythrough dello scaffale, dalla prima sezione. */
  entraNelloScaffale() {
    this.vaiA(0);
  }

  /**
   * Accende il segno a terra di un punto senza che il mouse ci sia
   * passato sopra: lo usa l'elenco dei punti in `HomePage.jsx` quando ci
   * si passa sopra o ci si arriva col Tab. Un'azione, non una mesh —
   * chi chiama non conosce la scena, conosce solo dove porta.
   */
  evidenzia(azione) {
    if (!azione) {
      this.evidenziato = null;
      return;
    }

    this.evidenziato =
      this.oggettiStanza.find(
        (o) =>
          o.userData.azione?.tipo === azione.tipo &&
          o.userData.azione?.percorso === azione.percorso
      ) ?? null;
  }

  /** Torna alla soglia: la stanza torna cliccabile. */
  tornaAllaSoglia() {
    this.vaiA(-1);
  }

  /* -------------------- Eventi -------------------- */

  #collegaEventi() {
    this.alMuovere = (e) => {
      const r = this.canvas.getBoundingClientRect();

      this.puntatore.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.puntatore.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    this.alUscire = () => {
      this.puntatore.set(-10, -10);
    };

    this.alClick = () => {
      if (!this.mirato) return;

      const d = this.mirato.userData;

      // Un libro ha `serie`, un oggetto della stanza ha `azione`: le due
      // forme non si mescolano, così chi ascolta sa sempre cosa gli è
      // arrivato senza doverlo dedurre.
      if (d.serie) this.alScegliere?.(d.serie);
      else if (d.azione) this.alAzione?.(d.azione);
    };

    this.canvas.addEventListener("pointermove", this.alMuovere);
    this.canvas.addEventListener("pointerleave", this.alUscire);
    this.canvas.addEventListener("click", this.alClick);

    this.osservatore = new ResizeObserver(() => this.ridimensiona());
    this.osservatore.observe(this.contenitore);

    this.ridimensiona();
  }

  ridimensiona() {
    const larghezza = this.contenitore.clientWidth;
    const altezza = this.contenitore.clientHeight;

    if (!larghezza || !altezza) return;

    this.renderer.setSize(larghezza, altezza, false);
    this.camera.aspect = larghezza / altezza;
    this.camera.updateProjectionMatrix();

    // La distanza della soglia si aggiorna sempre, anche quando qui
    // sotto si finisce per ricostruire tutto: non dipende dalla griglia
    // dei libri, e lasciarla al giro dopo significava ritrovarsi la
    // stanza inquadrata da dove stava la telecamera prima che la
    // finestra cambiasse forma.
    this.distanzaSoglia = Math.min(
      this.#distanzaPerInquadrare(SOGLIA_SEMI_LARGHEZZA, SOGLIA_SEMI_ALTEZZA),
      DISTANZA_SOGLIA_MAX
    );

    // Se la finestra ha cambiato forma abbastanza da meritare un'altra
    // griglia, si ricostruisce. Il confronto è sulla griglia scelta, non
    // sulle proporzioni: così un ridimensionamento continuo (una
    // finestra trascinata) ricostruisce una volta sola, al passaggio di
    // soglia, invece che a ogni pixel.
    const desiderato = layoutPerAspetto(this.camera.aspect);
    const chiave = `${desiderato.colonne}x${desiderato.righe}`;

    if (this.serie && this.layoutAttivo && chiave !== this.layoutAttivo) {
      const primaSerie = this.sezioneCorrente * this.perSezione;

      this.impostaSerie(this.serie, { mantieni: primaSerie });

      return;
    }

    this.distanza = this.#distanzaPerInquadrare();

    // Alla soglia si rifà il piazzamento per intero, non solo la
    // distanza: girando il telefono cambia anche il numero di postazioni
    // (vedi `#postiSoglia`), e correggere la sola z lascerebbe la
    // telecamera davanti a una postazione che non esiste più.
    if (this.sezioneCorrente === -1) {
      this.vaiA(-1, { immediato: true });
      return;
    }

    // Il ridimensionamento può arrivare durante un viaggio: la meta va
    // corretta, altrimenti la telecamera arriva alla distanza vecchia.
    if (this.viaggio) this.viaggio.a.z = this.distanza;
    else this.camera.position.z = this.distanza;
  }

  /**
   * A che distanza mettersi perché l'inquadratura ci stia tutta.
   *
   * Prima questa distanza era un numero fisso con una correzione a
   * occhio per gli schermi stretti, e il risultato era che su un monitor
   * largo i due libri agli estremi restavano tagliati a metà dal bordo.
   * Calcolarla toglie il problema a qualunque proporzione: si prende la
   * distanza che serve in larghezza, quella che serve in altezza, e si
   * sta alla più lontana delle due.
   */
  #distanzaPerInquadrare(
    semiLarghezza = (this.larghezzaSezione ?? PASSO_X * 12) / 2 + LIBRO_LARGHEZZA / 2 + 0.45,
    semiAltezza = ((this.righe ?? 3) * PASSO_Y) / 2 + 0.3
  ) {
    const mezzoAngolo = (this.camera.fov * Math.PI) / 360;

    const perLarghezza = semiLarghezza / (Math.tan(mezzoAngolo) * this.camera.aspect);
    const perAltezza = semiAltezza / Math.tan(mezzoAngolo);

    return Math.max(perLarghezza, perAltezza);
  }

  /* -------------------- Il ciclo -------------------- */

  #disegna = () => {
    if (!this.vivo) return;

    this.fotogramma = requestAnimationFrame(this.#disegna);

    const dt = Math.min(this.orologio.getDelta(), 0.1);

    this.#aggiornaViaggio();
    this.#aggiornaMira();
    this.#aggiornaLibri(dt);
    this.#aggiornaSegni();
    this.bibliotecario?.aggiorna(dt);

    this.renderer.render(this.scena, this.camera);
  };

  #aggiornaViaggio() {
    if (!this.viaggio) return;

    const t = Math.min(1, (performance.now() - this.viaggio.inizio) / this.viaggio.durata);
    const e = passoDolce(t);

    this.camera.position.lerpVectors(this.viaggio.da, this.viaggio.a, e);

    this.bersaglioSguardo.lerpVectors(this.viaggio.guardaDa, this.viaggio.guardaA, e);
    this.camera.lookAt(this.bersaglioSguardo);

    if (t >= 1) this.viaggio = null;
  }

  #aggiornaMira() {
    this.raggio.setFromCamera(this.puntatore, this.camera);

    // Alla soglia si mirano gli oggetti della stanza; dentro lo
    // scaffale, solo i libri della sezione davanti — passarli tutti e
    // 188 al raycaster a ogni fotogramma sarebbe lavoro buttato.
    const allaSoglia = this.sezioneCorrente === -1;

    const candidati = allaSoglia
      ? this.oggettiStanza
      : this.libri.filter((l) => Math.abs(l.userData.sezione - this.sezioneCorrente) <= 1);

    const colpiti = this.raggio.intersectObjects(candidati, false);
    const nuovo = colpiti.length ? colpiti[0].object : null;

    if (nuovo === this.mirato) return;

    this.mirato = nuovo;

    this.canvas.style.cursor = nuovo ? "pointer" : "default";

    if (allaSoglia) this.alMirareOggetto?.(nuovo ? nuovo.userData.azione : null);
    else this.alMirare?.(nuovo ? nuovo.userData.serie : null);
  }

  /**
   * Gli aloni respirano piano, e quello sotto l'oggetto guardato si
   * accende. È il modo più economico di rispondere al puntatore: gli
   * arredi sono modelli con materiali condivisi fra le copie, e
   * illuminare *quello* vorrebbe dire illuminare tutte le librerie
   * insieme.
   */
  #aggiornaSegni() {
    if (!this.segni.length || !this.gruppoStanza.visible) return;

    const t = performance.now() / 1000;
    // Il mouse vince sull'elenco: se stai già guardando qualcosa nella
    // stanza, non è il momento di accenderti un altro punto altrove.
    const acceso = (this.mirato ?? this.evidenziato)?.userData.alone;

    for (const segno of this.segni) {
      const base = segno === acceso ? 1 : 0.62;
      const respiro = segno === acceso ? 0.05 : 0.13;

      segno.material.opacity = base + Math.sin(t * 1.6) * respiro;
      segno.scale.setScalar(segno === acceso ? 1.14 : 1);
    }
  }

  /**
   * Ogni libro insegue la propria posizione di riposo o di sporgenza.
   *
   * L'inseguimento è esponenziale e legato al tempo trascorso, non ai
   * fotogrammi: così il movimento dura lo stesso su uno schermo a 60 e
   * su uno a 144, invece di essere il doppio più veloce.
   */
  #aggiornaLibri(dt) {
    if (this.sezioneCorrente === -1) return;

    const velocita = 1 - Math.exp(-11 * dt);

    for (const libro of this.libri) {
      const d = libro.userData;
      const obiettivo = libro === this.mirato ? SPORGENZA : 0;

      d.sporgenza += (obiettivo - d.sporgenza) * velocita;

      if (Math.abs(d.sporgenza) < 0.0005 && obiettivo === 0) {
        d.sporgenza = 0;
      }

      libro.position.z = d.riposoZ + d.sporgenza;

      // Uscendo il libro si raddrizza verso chi guarda: è il gesto di
      // chi tira fuori un volume dallo scaffale per guardarlo meglio.
      const quota = d.sporgenza / SPORGENZA;

      libro.rotation.y = ROTAZIONE_RIPOSO * (1 - quota * 0.85);
    }
  }

  /* -------------------- Smontaggio -------------------- */

  #svuotaLibri() {
    for (const libro of this.libri) {
      this.gruppoLibri.remove(libro);

      // La geometria è condivisa e non va toccata; i materiali della
      // copertina sono uno per libro e vanno liberati a mano.
      libro.userData.copertina.map?.dispose();
      libro.userData.copertina.dispose();
    }

    this.libri = [];
    this.testureInUso.clear();

    while (this.gruppoScaffale.children.length) {
      const pezzo = this.gruppoScaffale.children.pop();
      pezzo.geometry?.dispose();
    }
  }

  distruggi() {
    this.vivo = false;

    cancelAnimationFrame(this.fotogramma);

    this.canvas.removeEventListener("pointermove", this.alMuovere);
    this.canvas.removeEventListener("pointerleave", this.alUscire);
    this.canvas.removeEventListener("click", this.alClick);

    this.osservatore?.disconnect();

    this.#svuotaLibri();

    // I modelli scaricati li smaltisce il magazzino, una volta sola:
    // geometrie e materiali sono condivisi fra tutte le copie (otto
    // librerie, una geometria), e liberarli copia per copia
    // significherebbe lavorare su buffer già chiusi. Qui restano solo i
    // pezzi costruiti a mano — pareti, copertine, aloni.
    this.gruppoStanza?.traverse((oggetto) => {
      if (!oggetto.isMesh || oggetto.userData.daModello) return;

      oggetto.geometry?.dispose();

      const materiali = Array.isArray(oggetto.material)
        ? oggetto.material
        : [oggetto.material];

      for (const materiale of materiali) {
        if (!materiale || this.#materialeCondiviso(materiale)) continue;

        materiale.map?.dispose();
        materiale.dispose();
      }
    });

    this.magazzino.smaltisci();

    this.texturaAlone?.dispose();
    this.geometriaLibro.dispose();
    this.geometriaCopertina.dispose();
    this.materialeCarta.dispose();

    for (const materiale of [
      this.materialeLegno,
      this.materialeLegnoPavimento,
      this.materialeIntonaco,
      this.materialeOttone
    ]) {
      materiale?.map?.dispose();
      materiale?.roughnessMap?.dispose();
      materiale?.normalMap?.dispose();
      materiale?.dispose();
    }

    this.scena.background?.dispose?.();

    // Senza questo il contesto WebGL resta appeso: dopo qualche apertura
    // e chiusura il browser smette di concederne di nuovi.
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.canvas.remove();
  }

  #materialeCondiviso(materiale) {
    return (
      materiale === this.materialeLegno ||
      materiale === this.materialeLegnoPavimento ||
      materiale === this.materialeIntonaco ||
      materiale === this.materialeOttone ||
      materiale === this.materialeCarta
    );
  }
}
