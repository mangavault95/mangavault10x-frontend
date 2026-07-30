import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { copertinaLocale } from "./copertine";
import { caricaBibliotecario, ALTEZZA_BIBLIOTECARIO } from "./libraio";
import { costruisciArredoBancone, caricaFumetti } from "./arredoBancone";

const legnoDiffuseUrl = new URL("./assets/legno/legno_diffuse.jpg", import.meta.url).href;
const legnoRuviditaUrl = new URL("./assets/legno/legno_ruvidita.jpg", import.meta.url).href;
const legnoNormaliUrl = new URL("./assets/legno/legno_normali.jpg", import.meta.url).href;
const bibliotecarioGlbUrl = new URL("./assets/bibliotecario.glb", import.meta.url).href;

// Questi due non sono un .glb solo (binario, autosufficiente) ma una
// terna .gltf+.bin+texture con riferimenti relativi fra loro: Vite li
// scoprirebbe solo in sviluppo, non in build (non segue gli URI dentro
// un JSON), quindi vivono in `public/` — copiati così come sono,
// percorsi relativi intatti — invece che fra gli asset importati.
const spellbookChiusoUrl = "/modelli3d/spellbook_closed.gltf";
const spellbookApertoUrl = "/modelli3d/spellbook_open.gltf";

const bookcaseUrl = new URL("./assets/arredo/bookcaseOpen.glb", import.meta.url).href;
const pottedPlantUrl = new URL("./assets/arredo/pottedPlant.glb", import.meta.url).href;
const rugRoundUrl = new URL("./assets/arredo/rugRound.glb", import.meta.url).href;
const loungeChairUrl = new URL("./assets/arredo/loungeChair.glb", import.meta.url).href;

/**
 * La biblioteca in tre dimensioni.
 *
 * Questo file non sa niente di React ed è voluto: una scena WebGL ha
 * un ciclo di vita tutto suo — si costruisce una volta, vive nel suo
 * loop di animazione, e si smonta liberando memoria della scheda
 * video. Mescolarla al ciclo di render di React significherebbe
 * ricostruire lo scaffale a ogni cambio di stato.
 *
 * React qui fa solo tre cose: consegna il canvas, consegna le serie,
 * e riceve indietro cosa sta guardando il mouse.
 *
 *
 * COME CI SI MUOVE
 *
 * Non si cammina: la telecamera scivola fra postazioni fisse, una per
 * sezione di scaffale. È una scelta, non una scorciatoia — il
 * movimento libero su un sito dà la nausea a parecchia gente, non
 * funziona col dito su un telefono e non si usa da tastiera. Con le
 * postazioni si conserva la sensazione di attraversare una stanza e
 * si perde solo la possibilità di sbattere contro un muro.
 *
 *
 * LE COPERTINE
 *
 * 188 immagini remote non si scaricano tutte insieme. Si carica la
 * sezione davanti agli occhi, si prepara la successiva mentre guardi,
 * e le sezioni lontane vengono liberate. Finché l'immagine non è
 * arrivata il libro non è vuoto: ha una copertina di carta colorata
 * ricavata dal titolo, così lo scaffale è già pieno al primo istante.
 */

/* ==================================================
   MISURE
   Tutto in unità dove 1 = l'altezza di un tankobon.
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
 * stare tutti, e lo scaffale diventava un francobollo in mezzo al
 * buio. Meno colonne e più ripiani riempiono lo schermo alto invece
 * di combatterlo — le sezioni diventano di più, ma spostarsi costa un
 * tasto.
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

// Inclinazione di riposo: di taglio si vedrebbe solo la copertina e
// lo spessore sparirebbe. Un filo di rotazione lo rimette in mostra.
const ROTAZIONE_RIPOSO = -0.16;

// Palette rifatta da capo: bianco, legno, beige, dorato — una
// libreria luminosa, non più una stanza al crepuscolo. Il legno resta
// legno (lo veste comunque la texture vera in `#vestiMaterialeLegno`),
// ma il colore di ripiego prima del suo arrivo non deve più leggersi
// come "quasi nero".
const COLORE_LEGNO = 0x5a4130;
const COLORE_FONDO_ALTO = 0xfdfbf4; // l'orlo superiore del gradiente: bianco caldo, come un lucernario
const COLORE_FONDO_BASSO = 0xe9dbc0; // l'orlo inferiore: beige, non più buio
const COLORE_FOG = 0xf1e6cf; // il tono medio del gradiente: la nebbia si confonde con lo sfondo invece di tagliarlo

/* ==================================================
   LA STANZA D'INGRESSO
   Una sola postazione fissa, la "soglia" (sezione -1 nello stesso
   sistema che già muove la telecamera fra le sezioni dello scaffale),
   inquadra l'imboccatura dello scaffale a sinistra e il bancone a
   destra. Le misure sono costanti, non derivate da `larghezzaSezione`:
   a differenza dello scaffale la stanza si costruisce una volta sola
   nel costruttore, prima che la collezione sia arrivata.
   ================================================== */
const SOGLIA_X = 0.6; // dove guarda la telecamera alla soglia
const SOGLIA_SEMI_LARGHEZZA = 6.6;
const SOGLIA_SEMI_ALTEZZA = 3;
const PAVIMENTO_Y = -2.6;

// Vetrina e bancone più vicini fra loro che nella prima versione: un
// corridoio troppo largo fra i due si legge come stanza vuota, non
// come profondità. Quel che resta in mezzo lo riempie
// `#creaAngoloLettura`, non il vuoto.
const BANCONE_X = 4.6;
const BANCONE_Z = 0.8;

/**
 * La vetrina d'ingresso: un mobile fisso, non lo scaffale vero — quello
 * ha le sue sezioni e vive in `gruppoLibri`/`gruppoScaffale`, nascosto
 * finché non si entra (vedi `vaiA`). Righe e colonne più fitte di un
 * vero scaffale (passo più stretto): deve leggersi come un muro pieno
 * di copertine, non come quattro libri isolati.
 */
const VETRINA_COLONNE = 6;
const VETRINA_RIGHE = 4;
const VETRINA_PASSO_X = 0.62;
const VETRINA_PASSO_Y = 1.2;
const VETRINA_X = -3.6;
const VETRINA_Z = 0.6;

// Libri più piccoli di quelli dello scaffale vero: con un passo così
// stretto, le dimensioni normali si accavallerebbero fra loro.
const VETRINA_LIBRO_LARGHEZZA = 0.52;
const VETRINA_LIBRO_ALTEZZA = 0.73;

// Quante volte si ripete la texture del legno lungo un ripiano: senza
// ripetizione l'immagine si stirerebbe su tutta la larghezza di un
// mobile e la venatura sparirebbe.
const LEGNO_RIPETI_X = 3;
const LEGNO_RIPETI_Y = 1.5;

// L'apertura della porta è un velo sopra il canvas (`HomePage.jsx`),
// non geometria 3D: una porta a cardine vista da una telecamera quasi
// frontale non si "apre" mai davvero, resta un pannello ruotato in
// mezzo all'inquadratura. Un velo 2D si toglie di torno per intero.

// Ogni punto cliccabile ha un disco luminoso sul pavimento, sempre
// visibile e non solo al passaggio del mouse: senza, un piedistallo
// color legno su un fondo scuro è invisibile quanto un libro qualsiasi.
const SEGNO_RAGGIO = 0.55;
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

  // Saturazione bassa e luminosità bassa: sono dorsi di carta in una
  // stanza buia, non caramelle.
  colore.setHSL(h / 360, 0.34, 0.28);

  return colore;
}

// Più volumi possiedi, più il libro è grosso. È l'informazione che in
// una griglia piatta non si vede mai, e qui si legge senza leggere.
function spessoreDaVolumi(volumi) {
  const n = Math.max(1, volumi || 1);

  // Radice quadrata invece che lineare: con 109 volumi di One Piece
  // una scala diretta produrrebbe un mattone alto quanto il ripiano.
  const t = Math.min(1, Math.sqrt(n) / Math.sqrt(40));

  return SPESSORE_MIN + t * (SPESSORE_MAX - SPESSORE_MIN);
}

const passoDolce = (t) => t * t * (3 - 2 * t);

/* ==================================================
   LA SCENA
   ================================================== */

export default class Biblioteca {
  /**
   * @param contenitore  l'elemento che ospiterà la scena. Il canvas lo
   *   crea e lo distrugge questa classe, non React: in modalità
   *   rigorosa React monta, smonta e rimonta ogni effetto per stanare
   *   le pulizie mancanti, e un canvas riusato dopo che gli è stato
   *   tolto il contesto WebGL non ne ottiene mai un altro. Con un
   *   canvas nuovo a ogni montaggio il problema non esiste.
   */
  constructor(
    contenitore,
    { alMirare, alScegliere, alCambiareSezione, alAzione, alMirareOggetto, menoMovimento = false }
  ) {
    this.contenitore = contenitore;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "block h-full w-full";
    contenitore.appendChild(this.canvas);

    this.alMirare = alMirare;
    this.alScegliere = alScegliere;
    this.alCambiareSezione = alCambiareSezione;
    // La stanza d'ingresso ha i suoi callback: un bancone o una
    // postazione non sono una serie, e mescolarli nella stessa forma
    // costringerebbe chi ascolta a indovinare cosa gli è arrivato.
    this.alAzione = alAzione;
    this.alMirareOggetto = alMirareOggetto;
    this.menoMovimento = menoMovimento;

    this.libri = [];
    this.sezioni = 0;
    // -1 è la soglia: si parte sempre da lì, mai dentro lo scaffale.
    this.sezioneCorrente = -1;

    this.mirato = null;
    this.puntatore = new THREE.Vector2(-10, -10);
    this.raggio = new THREE.Raycaster();

    this.oggettiStanza = []; // vetrina, bancone e tutto il suo arredo, cliccabili dalla soglia

    this.viaggio = null; // { da, a, guardaDa, guardaA, inizio, durata }
    this.orologio = new THREE.Clock();
    this.fotogramma = 0;
    this.vivo = true;

    this.testureInUso = new Map(); // sezione → Set<Texture>
    this.caricamenti = new Set();

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
    this.renderer.toneMappingExposure = 1.15;

    // Ombre morbide: senza, legno e libri galleggiano nella luce piatta
    // invece di posarsi sul pavimento — è una delle cose che più fa
    // sembrare la stanza "vera" invece che un rendering di prova.
    this.renderer.shadowMap.enabled = true;
    // `PCFSoftShadowMap` è deprecato in tre 0.185: `PCFShadowMap` è
    // già morbido di suo, non serve più scegliere la variante soft.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  #creaScena() {
    this.scena = new THREE.Scene();

    // Uno sfondo piatto quasi nero è quello che rendeva la stanza "una
    // caverna": un gradiente verticale, anche tenue, dà l'idea di una
    // finestra o di una luce che arriva da qualche parte invece di un
    // vuoto uniforme. La nebbia usa il tono medio dello stesso
    // gradiente, così la dissolvenza in lontananza non sembra un muro
    // di un colore diverso dal cielo dietro di lei.
    this.scena.background = this.#creaSfondoGradiente();
    this.scena.fog = new THREE.Fog(COLORE_FOG, 10, 32);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    // Un valore di partenza: se il contenitore non ha ancora una
    // misura (capita al primo montaggio) `ridimensiona` rinuncia, e
    // senza questo la telecamera finirebbe a coordinata NaN. Si parte
    // già inquadrando la soglia, non lo scaffale: è il primo posto in
    // cui ci si trova.
    this.distanza = 9;
    this.distanzaSoglia = 11;
    this.camera.position.set(SOGLIA_X, 0.6, this.distanzaSoglia);

    this.bersaglioSguardo = new THREE.Vector3(SOGLIA_X, 0.3, 0);

    /* ---- Luci ----
       Una calda dall'alto (la lampada della stanza, con ombra vera),
       una fredda radente da destra che stacca i bordi dei libri dal
       fondo, e un cielo/pavimento invece di un ambiente piatto — è
       quello che dà alla luce un verso, non solo un'intensità. */

    // Un ambiente uniforme è la ragione per cui la stanza sembrava una
    // caverna: una HemisphereLight sfuma invece fra un cielo chiaro (da
    // sopra, come un lucernario) e un rimbalzo caldo da terra — bianco
    // e beige, non più il grigio-blu della versione a lume di candela.
    this.scena.add(new THREE.HemisphereLight(0xfff8ea, 0xd9c7a0, 1.5));

    // Luce frontale morbida: non crea atmosfera, ma garantisce che
    // ogni copertina sia leggibile ovunque si trovi lungo lo scaffale.
    const frontale = new THREE.DirectionalLight(0xfff4e0, 1.1);
    frontale.position.set(0, 2, 10);
    this.scena.add(frontale);

    // La luce principale della stanza: è lei a proiettare le ombre, le
    // altre restano solo di riempimento (due luci con ombra vera
    // costerebbero il doppio per un guadagno che non si vede).
    const lampada = new THREE.DirectionalLight(0xffd9a0, 1.7);
    lampada.position.set(-3, 6, 6);
    lampada.castShadow = true;
    lampada.shadow.mapSize.set(1024, 1024);
    lampada.shadow.camera.left = -14;
    lampada.shadow.camera.right = 14;
    lampada.shadow.camera.top = 10;
    lampada.shadow.camera.bottom = -10;
    lampada.shadow.camera.near = 1;
    lampada.shadow.camera.far = 24;
    lampada.shadow.bias = -0.0015;
    this.scena.add(lampada);
    this.scena.add(lampada.target);

    const radente = new THREE.DirectionalLight(0x8fa6ff, 0.75);
    radente.position.set(7, 1, 2);
    this.scena.add(radente);

    // Un alone caldo dietro lo scaffale: è quello che fa sembrare la
    // stanza illuminata invece che semplicemente grigia. Segue la
    // sezione inquadrata invece di restare fisso all'origine, così
    // non lascia al buio le sezioni successive.
    this.alone = new THREE.PointLight(0xfacc15, 26, 34, 2);
    this.alone.position.set(0, 0.6, -2.4);
    this.scena.add(this.alone);

    this.gruppoLibri = new THREE.Group();
    // Lo scaffale vero si vede solo entrando (`vaiA`): alla soglia
    // c'è la vetrina, più piccola e senza sezioni da sbagliare a
    // mostrare.
    this.gruppoLibri.visible = false;
    this.scena.add(this.gruppoLibri);

    this.gruppoScaffale = new THREE.Group();
    this.gruppoScaffale.visible = false;
    this.scena.add(this.gruppoScaffale);

    // Geometria condivisa da tutti i libri: una sola volta in memoria,
    // le differenze di formato le fa la scala di ogni mesh.
    this.geometriaLibro = new THREE.BoxGeometry(1, 1, 1);

    // Le cinque facce che non sono la copertina: carta e cartone.
    this.materialeCarta = new THREE.MeshStandardMaterial({
      color: 0xe8e2d4,
      roughness: 0.92,
      metalness: 0
    });

    // Un materiale solo per tutto il legno della stanza: scaffale,
    // porta, bancone e vetrina. Creato qui (e non dentro
    // `#creaScaffale`, come prima) perché la stanza d'ingresso nasce
    // nel costruttore, prima che la collezione — e quindi lo scaffale
    // — esista.
    this.materialeLegno = new THREE.MeshStandardMaterial({
      color: COLORE_LEGNO,
      roughness: 0.85,
      metalness: 0.06
    });

    this.#vestiMaterialeLegno();
  }

  /**
   * Il colore piatto di `materialeLegno` è un punto di partenza, non
   * il risultato finale: appena arrivano le texture (venatura, ruvidità,
   * normali — CC0 di Poly Haven) si applicano sopra. Il legno resta
   * comunque legno anche prima che arrivino, quindi non c'è bisogno di
   * aspettarle per costruire il resto della stanza.
   */
  #vestiMaterialeLegno() {
    const caricatore = new THREE.TextureLoader();

    const applica = (url, chiave, { srgb = false } = {}) => {
      caricatore.load(url, (texture) => {
        if (!this.vivo) {
          texture.dispose();
          return;
        }

        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(LEGNO_RIPETI_X, LEGNO_RIPETI_Y);
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;

        this.materialeLegno[chiave] = texture;
        this.materialeLegno.needsUpdate = true;
      });
    };

    applica(legnoDiffuseUrl, "map", { srgb: true });
    applica(legnoRuviditaUrl, "roughnessMap");
    applica(legnoNormaliUrl, "normalMap");
  }

  /**
   * Lo sfondo: un gradiente verticale disegnato su un canvas 1×256,
   * non un colore piatto. È l'intera differenza fra "una stanza al
   * crepuscolo" e "una caverna" — e costa una sola texture minuscola,
   * non luci in più.
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
    // ricostruire, e ricostruire va fatto solo quando la finestra
    // cambia forma davvero (vedi `ridimensiona`).
    const layout = layoutPerAspetto(this.camera.aspect);

    this.colonne = layout.colonne;
    this.righe = layout.righe;
    this.perSezione = layout.colonne * layout.righe;
    this.larghezzaSezione = layout.colonne * PASSO_X;
    this.layoutAttivo = `${layout.colonne}x${layout.righe}`;

    this.sezioni = Math.max(1, Math.ceil(serie.length / this.perSezione));

    serie.forEach((s, indice) => this.#creaLibro(s, indice));

    this.#creaScaffale();
    this.#vestiVetrina();
    this.#vestiPosterBancone();

    this.distanza = this.#distanzaPerInquadrare();

    // Dopo una ricostruzione si torna davanti alla stessa serie, non
    // all'inizio: cambiare la finestra non deve farti perdere il posto.
    // Il primo caricamento invece atterra alla soglia (-1), non nella
    // prima sezione: è il posto in cui ci si trova entrando, non un
    // punto di passaggio verso lo scaffale.
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
   * I ripiani di legno.
   *
   * Non sono decorazione: senza un piano sotto, i libri sembrano
   * galleggiare e tutta l'illusione dello scaffale sparisce.
   */
  #creaScaffale() {
    // Il materiale del legno è condiviso con la stanza d'ingresso
    // (porta, bancone), creato una volta sola in `#creaScena`.
    const legno = this.materialeLegno;

    // I ripiani devono coprire esattamente lo spazio dove stanno i
    // libri. Il calcolo precedente partiva dalla larghezza complessiva
    // divisa a metà, ma i libri della prima sezione sono centrati su
    // zero, non allineati a sinistra: il risultato era un ripiano
    // spostato a destra di mezza libreria, con la prima sezione fuori
    // dal legno e al buio.
    //
    // Ricavo gli estremi reali dalla stessa formula che posiziona i
    // libri, così i due non possono più divergere.
    const passoSezione = this.larghezzaSezione + PASSO_X;

    // Una libreria per sezione, non un ripiano unico che scorre.
    //
    // Il legno continuo faceva sembrare le sezioni pezzi arbitrari di
    // un nastro infinito: passando alla successiva non si capiva di
    // essere arrivati da qualche parte. Ogni sezione ora è un mobile
    // a sé, con i suoi montanti laterali — spostarsi è entrare in una
    // libreria diversa, non scorrere la stessa.
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

      // I due montanti che chiudono il mobile ai lati. Sono loro a
      // dire "questa libreria finisce qui".
      for (const lato of [-1, 1]) {
        const montante = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, altezzaMobile, 1.1),
          legno
        );

        montante.position.set(
          centroSezione + (lato * larghezzaMobile) / 2,
          -0.06,
          -0.1
        );
        montante.castShadow = true;
        montante.receiveShadow = true;

        this.gruppoScaffale.add(montante);
      }
    }

    // Il fondo dello scaffale: una parete scura dietro i libri, che
    // impedisce di vedere "attraverso" la libreria. Copre l'intera fila
    // di sezioni, dalla prima all'ultima libreria.
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
   * La vetrina d'ingresso, il bancone e tutto quello che c'è sopra e
   * intorno: costruiti una volta sola qui nel costruttore, a
   * differenza dello scaffale vero non dipendono dalla collezione e
   * non hanno motivo di essere ricostruiti quando arriva o cambia.
   *
   * L'apertura della porta è un velo sopra il canvas, non geometria
   * qui dentro — vedi `HomePage.jsx`.
   */
  #creaStanza() {
    this.gruppoStanza = new THREE.Group();
    this.scena.add(this.gruppoStanza);

    // Un piano sotto ai piedi: senza, la stanza sembra sospesa nel
    // buio. Non copre tutto lo scaffale (che si estende quanto serve,
    // sezione dopo sezione) — oltre la soglia ci pensa la nebbia già
    // usata per le sezioni lontane.
    const pavimento = new THREE.Mesh(
      new THREE.PlaneGeometry(SOGLIA_SEMI_LARGHEZZA * 2.2, 9),
      this.materialeLegno
    );

    pavimento.rotation.x = -Math.PI / 2;
    pavimento.position.set(SOGLIA_X, PAVIMENTO_Y, 2);
    pavimento.receiveShadow = true;

    this.gruppoStanza.add(pavimento);

    this.#creaVetrinaIngresso();
    this.#creaBancone();
    this.#creaAngoloLettura();
    this.#creaCorridoiScaffali();
  }

  /**
   * Altre librerie dietro la vetrina, sfalsate come se si intravedesse
   * l'imbocco di più corridoi: bastano due modelli veri (Kenney
   * "Furniture Kit", CC0) clonati, non serve costruire ogni volta
   * ripiani e montanti come per lo scaffale vero. Sono decorazione allo
   * stato puro — più lontane sono, più la nebbia le vela, ed è proprio
   * quell'effetto a suggerire la profondità.
   */
  #creaCorridoiScaffali() {
    const ALTEZZA_BERSAGLIO = 5.2;

    this.#caricaModello(bookcaseUrl)
      .then((originale) => {
        if (!this.vivo) return;

        const altezzaNativa =
          new THREE.Box3().setFromObject(originale).getSize(new THREE.Vector3()).y || 1;
        const scala = ALTEZZA_BERSAGLIO / altezzaNativa;

        const posizioni = [
          { x: VETRINA_X - 1.3, z: VETRINA_Z - 1.5, ry: 0.12 },
          { x: VETRINA_X + 0.9, z: VETRINA_Z - 2.3, ry: -0.15 }
        ];

        for (const { x, z, ry } of posizioni) {
          const copia = originale.clone(true);
          copia.scale.setScalar(scala);

          const minY = new THREE.Box3().setFromObject(copia).min.y;
          copia.position.set(x, PAVIMENTO_Y - minY, z);
          copia.rotation.y = ry;

          this.gruppoStanza.add(copia);
        }
      })
      .catch((errore) => console.error("I corridoi di scaffali non sono arrivati:", errore));
  }

  /**
   * Il tratto di pavimento fra la vetrina e il bancone non è un
   * corridoio da attraversare, è una stanza: senza niente in mezzo si
   * legge come vuoto invece che come profondità. Un tappeto, una
   * poltroncina e una pianta bastano a dirlo — modelli veri (Kenney
   * "Furniture Kit", CC0), non più forme disegnate a mano. Nessuno dei
   * tre è cliccabile, sono arredo e basta.
   */
  #creaAngoloLettura() {
    const cx = 0.4;
    const cz = 1.7;

    this.#caricaModello(rugRoundUrl)
      .then((tappeto) => {
        if (!this.vivo) return;
        tappeto.scale.setScalar(1.3);
        tappeto.position.set(cx, PAVIMENTO_Y + 0.01, cz);
        this.gruppoStanza.add(tappeto);
      })
      .catch((errore) => console.error("Il tappeto non è arrivato:", errore));

    this.#caricaModello(loungeChairUrl)
      .then((poltrona) => {
        if (!this.vivo) return;
        poltrona.scale.setScalar(1.05);
        poltrona.position.set(cx - 0.3, PAVIMENTO_Y, cz + 0.25);
        poltrona.rotation.y = -0.5;
        this.gruppoStanza.add(poltrona);
      })
      .catch((errore) => console.error("La poltroncina non è arrivata:", errore));

    this.#caricaModello(pottedPlantUrl)
      .then((pianta) => {
        if (!this.vivo) return;
        pianta.scale.setScalar(0.85);
        pianta.position.set(cx + 0.85, PAVIMENTO_Y, cz - 0.3);
        this.gruppoStanza.add(pianta);
      })
      .catch((errore) => console.error("La pianta non è arrivata:", errore));
  }

  /**
   * Un caricatore minimo per l'arredo puramente decorativo (tappeto,
   * poltroncina, pianta, corridoi di scaffali): restituisce solo la
   * scena già pronta per `castShadow`/`receiveShadow` — chi chiama
   * pensa a scala, posizione e al controllo `this.vivo`.
   */
  async #caricaModello(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);

    gltf.scene.traverse((oggetto) => {
      if (!oggetto.isMesh) return;
      oggetto.castShadow = true;
      oggetto.receiveShadow = true;
    });

    return gltf.scene;
  }

  /**
   * Un disco luminoso sul pavimento, sempre acceso e non solo al
   * passaggio del mouse.
   *
   * Un piedistallo color legno su un fondo scuro è pressoché invisibile
   * — la stanza non ha abbastanza luce perché un oggetto normale dica
   * da solo "sono cliccabile". Un materiale non illuminato (Basic, non
   * Standard) fa sì che il segno si veda uguale ovunque nella stanza,
   * indipendentemente da quanto arriva delle luci vere.
   */
  #creaSegno(x, z, raggio = SEGNO_RAGGIO) {
    const segno = new THREE.Mesh(
      new THREE.CircleGeometry(raggio, 28),
      new THREE.MeshBasicMaterial({
        color: SEGNO_COLORE,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      })
    );

    segno.rotation.x = -Math.PI / 2;
    segno.position.set(x, PAVIMENTO_Y + 0.02, z);
    this.gruppoStanza.add(segno);

    return segno;
  }

  /**
   * La vetrina d'ingresso: un mobile a sé, fisso (mai una sezione
   * dello scaffale vero), che parte con dorsi a tinta piatta e prende
   * un campione di copertine vere appena arrivano le serie (vedi
   * `#vestiVetrina`). Vive nel proprio gruppo perché — come lo
   * scaffale vero, ma al contrario — deve sparire non appena si entra
   * nel flythrough: i due non condividono mai lo spazio davanti alla
   * telecamera, altrimenti si sovrapporrebbero.
   */
  #creaVetrinaIngresso() {
    this.gruppoVetrina = new THREE.Group();
    this.gruppoStanza.add(this.gruppoVetrina);

    // Le copertine vere di un campione della collezione arrivano dopo
    // (`#vestiVetrina`, chiamato da `impostaSerie`): qui si tiene solo
    // il materiale a cui applicarle, un elenco piatto in ordine di
    // costruzione.
    this.vetrinaCoperture = [];

    const legno = this.materialeLegno;
    const larghezza = VETRINA_COLONNE * VETRINA_PASSO_X;
    const larghezzaMobile = larghezza + VETRINA_LIBRO_LARGHEZZA * 0.6;
    const altezzaMobile = VETRINA_PASSO_Y * VETRINA_RIGHE + 0.5;

    // Il mobile poggia sul pavimento vero, non su un centro a
    // indovinare: con righe più fitte del solito la vecchia costante
    // fissa avrebbe affondato la vetrina sotto il pavimento.
    const centroY = PAVIMENTO_Y + altezzaMobile / 2;

    for (let riga = 0; riga < VETRINA_RIGHE; riga++) {
      const y = centroY + ((VETRINA_RIGHE - 1) / 2 - riga) * VETRINA_PASSO_Y;

      const piano = new THREE.Mesh(new THREE.BoxGeometry(larghezzaMobile, 0.06, 1.1), legno);
      piano.position.set(VETRINA_X, y - VETRINA_LIBRO_ALTEZZA / 2 - 0.03, VETRINA_Z - 0.1);
      piano.castShadow = true;
      piano.receiveShadow = true;
      this.gruppoVetrina.add(piano);

      for (let colonna = 0; colonna < VETRINA_COLONNE; colonna++) {
        const indice = riga * VETRINA_COLONNE + colonna;

        // Uno spessore diverso libro per libro, solo per non sembrare
        // una fila di scatole identiche: non rappresenta nessun dato.
        const passo = ((indice * 37) % 100) / 100;
        const spessore = (SPESSORE_MIN + passo * (SPESSORE_MAX - SPESSORE_MIN)) * 0.85;

        const copertina = new THREE.MeshStandardMaterial({
          color: tintaDaTitolo(`vetrina-${indice}`),
          roughness: 0.62
        });

        const materiali = [
          this.materialeCarta,
          this.materialeCarta,
          this.materialeCarta,
          this.materialeCarta,
          copertina,
          this.materialeCarta
        ];

        const libro = new THREE.Mesh(this.geometriaLibro, materiali);
        libro.scale.set(VETRINA_LIBRO_LARGHEZZA, VETRINA_LIBRO_ALTEZZA, spessore);

        const x = VETRINA_X + colonna * VETRINA_PASSO_X - (larghezza - VETRINA_PASSO_X) / 2;
        libro.position.set(x, y, VETRINA_Z);
        libro.rotation.y = ROTAZIONE_RIPOSO;
        libro.castShadow = true;
        libro.receiveShadow = true;

        this.gruppoVetrina.add(libro);
        this.vetrinaCoperture.push(copertina);
      }
    }

    for (const lato of [-1, 1]) {
      const montante = new THREE.Mesh(new THREE.BoxGeometry(0.1, altezzaMobile, 1.1), legno);
      montante.position.set(VETRINA_X + (lato * larghezzaMobile) / 2, centroY, VETRINA_Z - 0.1);
      montante.castShadow = true;
      montante.receiveShadow = true;
      this.gruppoVetrina.add(montante);
    }

    const fondo = new THREE.Mesh(new THREE.BoxGeometry(larghezzaMobile, altezzaMobile, 0.08), legno);
    fondo.position.set(VETRINA_X, centroY, VETRINA_Z - 0.62);
    fondo.receiveShadow = true;
    this.gruppoVetrina.add(fondo);

    // Il segno a terra e il bersaglio invisibile: cliccare la vetrina
    // porta dentro il vero scaffale, con tutte le sue sezioni.
    const segno = this.#creaSegno(VETRINA_X, VETRINA_Z + 1.3, 1.1);
    this.gruppoVetrina.add(segno);

    const ingresso = new THREE.Mesh(
      new THREE.PlaneGeometry(larghezzaMobile + 0.6, altezzaMobile + 0.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    ingresso.position.set(VETRINA_X, centroY, VETRINA_Z + 0.3);
    ingresso.userData = { azione: { tipo: "scaffale" } };
    this.gruppoVetrina.add(ingresso);
    this.oggettiStanza.push(ingresso);
  }

  /**
   * Le copertine vere sulla vetrina: un campione della collezione (fino
   * a un dorso per slot), caricato una volta sola quando arrivano le
   * prime serie. Non è lo stesso meccanismo a sezioni di
   * `#caricaCoperturePerSezione` — qui i libri non cambiano mai, quindi
   * non serve nemmeno liberare la memoria più tardi.
   */
  #vestiVetrina() {
    if (this.vetrinaVestita || !this.vetrinaCoperture?.length) return;
    this.vetrinaVestita = true;

    const scelte = this.serie.filter((s) => copertinaLocale(s.copertina)).slice(0, this.vetrinaCoperture.length);

    const caricatore = new THREE.TextureLoader();

    scelte.forEach(async (s, indice) => {
      const copertina = this.vetrinaCoperture[indice];

      try {
        const testura = await caricatore.loadAsync(copertinaLocale(s.copertina));

        if (!this.vivo) {
          testura.dispose();
          return;
        }

        testura.colorSpace = THREE.SRGBColorSpace;
        copertina.map = testura;
        copertina.color.set(0xffffff);
        copertina.needsUpdate = true;
      } catch {
        // Resta il dorso a tinta piatta: meglio di una richiesta a un
        // indirizzo che potrebbe non rispondere mai.
      }
    });
  }

  /**
   * Il banco: un piano, un fronte, una lampada calda — più tutto
   * quello che ci sta intorno (parete, targa col logo, cassa, lista
   * dei desideri appesa) costruito da `arredoBancone.js`, il
   * bibliotecario caricato da `libraio.js` e i fumetti sparsi
   * caricati anche loro da `arredoBancone.js`. È lui (il bibliotecario)
   * il bersaglio di "parla col bibliotecario", non più il banco stesso.
   *
   * L'altezza del piano non è un numero a caso: è una frazione
   * dell'altezza del bibliotecario, così il banco gli arriva alla vita
   * (basso apposta, perché resti "più in vista" invece di sparire
   * dietro un bancone alto) invece di coprirgli la testa.
   */
  #creaBancone() {
    const legno = this.materialeLegno;

    const pianoY = PAVIMENTO_Y + ALTEZZA_BIBLIOTECARIO * 0.4;
    const testaY = PAVIMENTO_Y + ALTEZZA_BIBLIOTECARIO;
    const altezzaFronte = pianoY - PAVIMENTO_Y;

    const piano = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1), legno);
    piano.position.set(BANCONE_X, pianoY, BANCONE_Z);
    piano.castShadow = true;
    piano.receiveShadow = true;
    this.gruppoStanza.add(piano);

    const fronte = new THREE.Mesh(new THREE.BoxGeometry(2.2, altezzaFronte, 0.1), legno);
    fronte.position.set(BANCONE_X, PAVIMENTO_Y + altezzaFronte / 2, BANCONE_Z - 0.45);
    fronte.castShadow = true;
    fronte.receiveShadow = true;
    this.gruppoStanza.add(fronte);

    const lampada = new THREE.PointLight(0xffb454, 6, 6, 2);
    lampada.position.set(BANCONE_X, pianoY + 0.55, BANCONE_Z);
    this.gruppoStanza.add(lampada);

    const paralume = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.24, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xf5c778,
        roughness: 0.5,
        emissive: 0x442200,
        emissiveIntensity: 0.6
      })
    );

    paralume.position.set(BANCONE_X, pianoY + 0.55, BANCONE_Z);
    this.gruppoStanza.add(paralume);

    const arredo = costruisciArredoBancone({
      x: BANCONE_X,
      z: BANCONE_Z,
      pavimentoY: PAVIMENTO_Y,
      pianoY,
      testaY
    });

    this.gruppoStanza.add(arredo.gruppo);
    // Vestiti con le copertine vere appena arrivano le serie — vedi
    // `#vestiPosterBancone`, chiamato da `impostaSerie`.
    this.posterBancone = arredo.poster;

    for (const { mesh, segno } of arredo.bersagli) {
      this.oggettiStanza.push(mesh);
      if (segno) this.#creaSegno(segno.x, segno.z);
    }

    /* ---------- Il bibliotecario e i fumetti sparsi ----------
       Modelli veri, quindi in rete: entrambi asincroni, entrambi
       guardati da `this.vivo` per il caso in cui la scena sia già
       stata smontata (React in modalità rigorosa monta e smonta ogni
       effetto) mentre erano ancora in viaggio. */
    const zLibraio = BANCONE_Z - 0.75;

    caricaBibliotecario({ url: bibliotecarioGlbUrl, x: BANCONE_X, y: PAVIMENTO_Y, z: zLibraio })
      .then((bibliotecario) => {
        if (!this.vivo) return;

        this.bibliotecario = bibliotecario;
        this.gruppoStanza.add(bibliotecario.gruppo);

        const bersaglioLibraio = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, ALTEZZA_BIBLIOTECARIO + 0.2, 1),
          new THREE.MeshBasicMaterial({ visible: false })
        );

        bersaglioLibraio.position.set(BANCONE_X, PAVIMENTO_Y + (ALTEZZA_BIBLIOTECARIO + 0.2) / 2, zLibraio);
        bersaglioLibraio.userData = { azione: { tipo: "bibliotecario" } };
        this.gruppoStanza.add(bersaglioLibraio);
        this.oggettiStanza.push(bersaglioLibraio);

        this.#creaSegno(BANCONE_X, BANCONE_Z + 0.15);
      })
      .catch((errore) => console.error("Il bibliotecario non è arrivato:", errore));

    caricaFumetti({
      x: BANCONE_X + 0.95,
      z: BANCONE_Z,
      pianoY,
      urlChiuso: spellbookChiusoUrl,
      urlAperto: spellbookApertoUrl
    })
      .then(({ gruppo, bersaglio, segno }) => {
        if (!this.vivo) return;

        this.gruppoStanza.add(gruppo);
        this.oggettiStanza.push(bersaglio);
        this.#creaSegno(segno.x, segno.z);
      })
      .catch((errore) => console.error("I fumetti sul banco non sono arrivati:", errore));
  }

  /**
   * Le copertine vere sui poster dietro al banco: non un asset in più,
   * le stesse immagini che il sito ha già scaricato per la propria
   * collezione. Una volta sola, alle prime serie disponibili — non
   * cambiano più dopo, quindi non serve rifarlo a ogni aggiornamento.
   */
  #vestiPosterBancone() {
    if (this.posterVestiti || !this.posterBancone?.length) return;
    this.posterVestiti = true;

    const scelte = this.serie
      .filter((s) => copertinaLocale(s.copertina))
      .slice(0, this.posterBancone.length);

    const caricatore = new THREE.TextureLoader();

    scelte.forEach(async (s, indice) => {
      const mesh = this.posterBancone[indice];
      if (!mesh) return;

      try {
        const testura = await caricatore.loadAsync(copertinaLocale(s.copertina));

        if (!this.vivo) {
          testura.dispose();
          return;
        }

        testura.colorSpace = THREE.SRGBColorSpace;
        mesh.material.map = testura;
        mesh.material.color.set(0xffffff);
        mesh.material.needsUpdate = true;
      } catch {
        // Resta il colore neutro di ripiego: meglio di una richiesta a
        // un indirizzo che potrebbe non rispondere mai.
      }
    });
  }

  /* -------------------- Copertine -------------------- */

  /**
   * Scarica le copertine di una sezione, poche per volta.
   *
   * Senza un limite il browser aprirebbe 188 connessioni insieme e le
   * metterebbe tutte in coda: le prime immagini comparirebbero più
   * tardi di quanto compaiano caricandone sei alla volta.
   */
  async #caricaCoperturePerSezione(sezione) {
    if (sezione < 0 || sezione >= this.sezioni) return;
    if (this.testureInUso.has(sezione)) return;

    const set = new Set();
    this.testureInUso.set(sezione, set);

    const daFare = this.libri
      .filter((l) => l.userData.sezione === sezione)
      .map((l) => ({ libro: l, url: copertinaLocale(l.userData.serie.copertina) }))
      .filter((v) => v.url);

    const caricatore = new THREE.TextureLoader();

    const MAX_INSIEME = 6;

    let prossimo = 0;

    const lavoratore = async () => {
      while (prossimo < daFare.length && this.vivo) {
        const { libro, url } = daFare[prossimo++];

        try {
          const testura = await caricatore.loadAsync(url);

          if (!this.vivo) {
            testura.dispose();
            return;
          }

          testura.colorSpace = THREE.SRGBColorSpace;
          testura.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

          libro.userData.copertina.map = testura;
          // Con una texture applicata il colore va portato a bianco,
          // altrimenti la tinta di ripiego moltiplica l'immagine e la
          // copertina esce sporca di verde o di viola.
          libro.userData.copertina.color.set(0xffffff);
          libro.userData.copertina.needsUpdate = true;

          set.add(testura);
        } catch {
          // Copertina irraggiungibile: resta la carta colorata, che è
          // esattamente il motivo per cui esiste.
        }
      }
    };

    const lavoro = Promise.all(
      Array.from({ length: MAX_INSIEME }, () => lavoratore())
    );

    this.caricamenti.add(lavoro);

    await lavoro;

    this.caricamenti.delete(lavoro);
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
    // bersagli alla soglia, il bancone non lo è dentro lo scaffale.
    // Senza azzerare qui, l'etichetta dell'ultimo oggetto mirato
    // resterebbe a schermo anche dopo il cambio.
    const cambiaModo = (nuova === -1) !== (this.sezioneCorrente === -1);

    this.sezioneCorrente = nuova;

    // Solo una libreria alla volta è visibile: la vetrina alla soglia,
    // lo scaffale vero (con tutte le sue sezioni) una volta entrati.
    // Farle convivere nello stesso spazio è esattamente il bug che le
    // rendeva entrambe illeggibili — non è un dettaglio estetico, è
    // l'unico modo per non farle mai sovrapporre.
    const dentroScaffale = nuova !== -1;
    this.gruppoLibri.visible = dentroScaffale;
    this.gruppoScaffale.visible = dentroScaffale;
    if (this.gruppoVetrina) this.gruppoVetrina.visible = !dentroScaffale;

    if (cambiaModo && this.mirato) {
      this.mirato = null;
      this.canvas.style.cursor = "default";
      this.alMirare?.(null);
      this.alMirareOggetto?.(null);
    }

    let destinazione, sguardo, aloneX, aloneZ;

    if (nuova === -1) {
      destinazione = new THREE.Vector3(SOGLIA_X, 0.6, this.distanzaSoglia);
      sguardo = new THREE.Vector3(SOGLIA_X, 0.3, 0);
      aloneX = SOGLIA_X;
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

    this.alCambiareSezione?.(nuova, this.sezioni);

    // La sezione accanto si prepara mentre guardi questa: quando ci
    // arrivi le copertine ci sono già. Alla soglia (-1) non si carica
    // niente: la vetrina non ha copertine vere, quindi non c'è motivo
    // di anticipare il download della sezione 0 prima di essere
    // davvero entrati.
    if (dentroScaffale) {
      this.#caricaCoperturePerSezione(nuova);
      this.#caricaCoperturePerSezione(nuova + 1);
      this.#caricaCoperturePerSezione(nuova - 1);
    }
    this.#liberaSezioniLontane();
  }

  avanti() {
    this.vaiA(this.sezioneCorrente + 1);
  }

  // Il minimo è 0, non -1: la freccia sinistra alla prima sezione non
  // deve far uscire dallo scaffale, quel gesto è riservato a Escape
  // (`tornaAllaSoglia`). Cambiare questa semantica cambierebbe anche
  // quella già in uso per chi naviga da tastiera fra le sezioni.
  indietro() {
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

  /** Torna alla soglia: vetrina e bancone tornano cliccabili. */
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

      // Un libro ha `serie`, un oggetto della stanza ha `azione`: le
      // due forme non si mescolano, così chi ascolta sa sempre cosa
      // gli è arrivato senza doverlo dedurre.
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

    // Se la finestra ha cambiato forma abbastanza da meritare un'altra
    // griglia, si ricostruisce. Il confronto è sulla griglia scelta,
    // non sulle proporzioni: così un ridimensionamento continuo (una
    // finestra trascinata) ricostruisce una volta sola, al passaggio
    // di soglia, invece che a ogni pixel.
    const desiderato = layoutPerAspetto(this.camera.aspect);
    const chiave = `${desiderato.colonne}x${desiderato.righe}`;

    if (this.serie && this.layoutAttivo && chiave !== this.layoutAttivo) {
      const primaSerie = this.sezioneCorrente * this.perSezione;

      this.impostaSerie(this.serie, { mantieni: primaSerie });

      return;
    }

    this.distanza = this.#distanzaPerInquadrare();
    this.distanzaSoglia = this.#distanzaPerInquadrare(SOGLIA_SEMI_LARGHEZZA, SOGLIA_SEMI_ALTEZZA);

    // Il ridimensionamento può arrivare durante un viaggio: la meta va
    // corretta, altrimenti la telecamera arriva alla distanza vecchia.
    // Quale distanza dipende da dove ci si trova: alla soglia o dentro
    // lo scaffale.
    const distanzaAttuale = this.sezioneCorrente === -1 ? this.distanzaSoglia : this.distanza;

    if (this.viaggio) this.viaggio.a.z = distanzaAttuale;
    else this.camera.position.z = distanzaAttuale;
  }

  /**
   * A che distanza mettersi perché l'inquadratura ci stia tutta.
   *
   * Prima questa distanza era un numero fisso con una correzione a
   * occhio per gli schermi stretti, e il risultato era che su un
   * monitor largo i due libri agli estremi restavano tagliati a metà
   * dal bordo. Calcolarla toglie il problema a qualunque proporzione:
   * si prende la distanza che serve in larghezza, quella che serve in
   * altezza, e si sta alla più lontana delle due.
   *
   * Senza argomenti inquadra una sezione di scaffale; passando le
   * semi-misure della soglia inquadra la stanza d'ingresso invece.
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

    // Alla soglia si mira la vetrina e tutto il bancone; dentro lo
    // scaffale, solo i libri della sezione davanti — passarli tutti e
    // 188 al raycaster a ogni fotogramma sarebbe lavoro buttato, e i
    // due mondi non si sovrappongono mai in vista.
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
   * Ogni libro insegue la propria posizione di riposo o di sporgenza.
   *
   * L'inseguimento è esponenziale e legato al tempo trascorso, non ai
   * fotogrammi: così il movimento dura lo stesso su uno schermo a 60
   * e su uno a 144, invece di essere il doppio più veloce.
   */
  #aggiornaLibri(dt) {
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

    // `traverse` invece di un elenco piatto: il bancone, la cassa, i
    // fumetti sparsi, i poster, la vetrina e il bibliotecario hanno
    // ciascuno la propria geometria e (spesso) più di un materiale —
    // alcuni sono array (gli stessi libri della vetrina/del banco usano
    // le sei facce di `#creaLibro`), quindi non basta un `.dispose()`
    // diretto sul singolo materiale. Il legno e la carta, condivisi, si
    // smaltiscono una volta sola più sotto, non qui dentro.
    this.gruppoStanza?.traverse((oggetto) => {
      if (!oggetto.isMesh) return;

      oggetto.geometry?.dispose();

      const materiali = Array.isArray(oggetto.material) ? oggetto.material : [oggetto.material];

      for (const materiale of materiali) {
        if (!materiale || materiale === this.materialeLegno || materiale === this.materialeCarta) {
          continue;
        }

        // I modelli scaricati (bibliotecario, arredo) portano più
        // mappe di quante ne usasse la sola scena disegnata a mano:
        // meglio elencarle tutte qui una volta che riscoprirle una
        // per una a ogni nuovo asset.
        materiale.map?.dispose();
        materiale.roughnessMap?.dispose();
        materiale.normalMap?.dispose();
        materiale.metalnessMap?.dispose();
        materiale.emissiveMap?.dispose();
        materiale.aoMap?.dispose();
        materiale.gradientMap?.dispose();
        materiale.dispose();
      }
    });

    this.geometriaLibro.dispose();
    this.materialeCarta.dispose();
    this.materialeLegno?.map?.dispose();
    this.materialeLegno?.roughnessMap?.dispose();
    this.materialeLegno?.normalMap?.dispose();
    this.materialeLegno?.dispose();
    this.scena.background?.dispose?.();

    // Senza questo il contesto WebGL resta appeso: dopo qualche
    // apertura e chiusura il browser smette di concederne di nuovi.
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.canvas.remove();
  }
}

