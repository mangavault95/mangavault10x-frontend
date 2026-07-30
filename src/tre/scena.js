import * as THREE from "three";
import { copertinaLocale } from "./copertine";

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

const COLORE_LEGNO = 0x1a1410;
const COLORE_FONDO = 0x0b0d14;

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
  constructor(contenitore, { alMirare, alScegliere, alCambiareSezione, menoMovimento = false }) {
    this.contenitore = contenitore;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "block h-full w-full";
    contenitore.appendChild(this.canvas);

    this.alMirare = alMirare;
    this.alScegliere = alScegliere;
    this.alCambiareSezione = alCambiareSezione;
    this.menoMovimento = menoMovimento;

    this.libri = [];
    this.sezioni = 0;
    this.sezioneCorrente = 0;

    this.mirato = null;
    this.puntatore = new THREE.Vector2(-10, -10);
    this.raggio = new THREE.Raycaster();

    this.viaggio = null; // { da, a, guardaDa, guardaA, inizio, durata }
    this.orologio = new THREE.Clock();
    this.fotogramma = 0;
    this.vivo = true;

    this.testureInUso = new Map(); // sezione → Set<Texture>
    this.caricamenti = new Set();

    this.#creaRenderer();
    this.#creaScena();
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
  }

  #creaScena() {
    this.scena = new THREE.Scene();
    this.scena.background = new THREE.Color(COLORE_FONDO);

    // La nebbia fa sparire le sezioni lontane invece di mostrarle
    // minuscole e affollate: dà profondità e alleggerisce il disegno.
    this.scena.fog = new THREE.Fog(COLORE_FONDO, 9, 30);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

    // Un valore di partenza: se il contenitore non ha ancora una
    // misura (capita al primo montaggio) `ridimensiona` rinuncia, e
    // senza questo la telecamera finirebbe a coordinata NaN.
    this.distanza = 9;
    this.camera.position.set(0, 0, this.distanza);

    this.bersaglioSguardo = new THREE.Vector3(0, 0, 0);

    /* ---- Luci ----
       Una calda dall'alto (la lampada della stanza), una fredda
       radente da destra che stacca i bordi dei libri dal fondo, e un
       ambiente fioco perché nulla resti completamente nero. */

    // Le copertine sono il contenuto: devono leggersi, non essere
    // suggerite. L'ambiente sale da 0.55 a 1.15 perché un punto luce
    // singolo illumina bene solo dove punta, e una libreria larga
    // finisce metà al buio — che è esattamente quello che succedeva.
    this.scena.add(new THREE.AmbientLight(0xffffff, 1.15));

    // Luce frontale morbida: non crea atmosfera, ma garantisce che
    // ogni copertina sia leggibile ovunque si trovi lungo lo scaffale.
    const frontale = new THREE.DirectionalLight(0xfff4e0, 1.1);
    frontale.position.set(0, 2, 10);
    this.scena.add(frontale);

    const lampada = new THREE.DirectionalLight(0xffd9a0, 1.7);
    lampada.position.set(-3, 6, 6);
    this.scena.add(lampada);

    const radente = new THREE.DirectionalLight(0x8fa6ff, 0.65);
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
    this.scena.add(this.gruppoLibri);

    this.gruppoScaffale = new THREE.Group();
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

    this.distanza = this.#distanzaPerInquadrare();

    // Dopo una ricostruzione si torna davanti alla stessa serie, non
    // all'inizio: cambiare la finestra non deve farti perdere il posto.
    const partenza =
      mantieni !== undefined
        ? Math.min(this.sezioni - 1, Math.floor(mantieni / this.perSezione))
        : 0;

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
    // Un materiale solo per tutto il mobile: i ripiani e il fondo sono
    // lo stesso legno, e tenerne una copia per pezzo occuperebbe
    // memoria video per niente.
    this.materialeLegno ??= new THREE.MeshStandardMaterial({
      color: COLORE_LEGNO,
      roughness: 0.85,
      metalness: 0.06
    });

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

    this.gruppoScaffale.add(fondo);
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
    const nuova = Math.max(0, Math.min(this.sezioni - 1, sezione));

    this.sezioneCorrente = nuova;

    const x = nuova * (this.larghezzaSezione + PASSO_X);
    const destinazione = new THREE.Vector3(x, 0.1, this.distanza);
    const sguardo = new THREE.Vector3(x, 0, 0);

    // L'alone caldo accompagna lo sguardo: restando all'origine
    // illuminava solo la prima sezione e lasciava le altre spente.
    this.alone?.position.set(x, 0.6, -2.4);

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
    // arrivi le copertine ci sono già.
    this.#caricaCoperturePerSezione(nuova);
    this.#caricaCoperturePerSezione(nuova + 1);
    this.#caricaCoperturePerSezione(nuova - 1);
    this.#liberaSezioniLontane();
  }

  avanti() {
    this.vaiA(this.sezioneCorrente + 1);
  }

  indietro() {
    this.vaiA(this.sezioneCorrente - 1);
  }

  /** Porta la telecamera alla sezione che contiene una certa serie. */
  vaiAllaSerie(id) {
    const indice = this.libri.findIndex((l) => String(l.userData.serie.id) === String(id));

    if (indice >= 0) this.vaiA(this.libri[indice].userData.sezione);
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
      if (this.mirato) this.alScegliere?.(this.mirato.userData.serie);
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

    // Il ridimensionamento può arrivare durante un viaggio: la meta va
    // corretta, altrimenti la telecamera arriva alla distanza vecchia.
    if (this.viaggio) this.viaggio.a.z = this.distanza;
    else this.camera.position.z = this.distanza;
  }

  /**
   * A che distanza mettersi perché la sezione ci stia tutta.
   *
   * Prima questa distanza era un numero fisso con una correzione a
   * occhio per gli schermi stretti, e il risultato era che su un
   * monitor largo i due libri agli estremi restavano tagliati a metà
   * dal bordo. Calcolarla toglie il problema a qualunque proporzione:
   * si prende la distanza che serve in larghezza, quella che serve in
   * altezza, e si sta alla più lontana delle due.
   */
  #distanzaPerInquadrare() {
    const mezzoAngolo = (this.camera.fov * Math.PI) / 360;

    // Metà sezione, più mezzo libro, più un margine di cortesia: un
    // volume appiccicato al bordo dello schermo sembra tagliato anche
    // quando è intero.
    const mezzaLarghezza = (this.larghezzaSezione ?? PASSO_X * 12) / 2 + LIBRO_LARGHEZZA / 2 + 0.45;
    const mezzaAltezza = ((this.righe ?? 3) * PASSO_Y) / 2 + 0.3;

    const perLarghezza = mezzaLarghezza / (Math.tan(mezzoAngolo) * this.camera.aspect);
    const perAltezza = mezzaAltezza / Math.tan(mezzoAngolo);

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

    // Si testano solo i libri della sezione davanti: passare tutti i
    // 188 al raycaster a ogni fotogramma sarebbe lavoro buttato.
    const candidati = this.libri.filter(
      (l) => Math.abs(l.userData.sezione - this.sezioneCorrente) <= 1
    );

    const colpiti = this.raggio.intersectObjects(candidati, false);
    const nuovo = colpiti.length ? colpiti[0].object : null;

    if (nuovo === this.mirato) return;

    this.mirato = nuovo;

    this.canvas.style.cursor = nuovo ? "pointer" : "default";

    this.alMirare?.(nuovo ? nuovo.userData.serie : null);
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

    this.geometriaLibro.dispose();
    this.materialeCarta.dispose();
    this.materialeLegno?.dispose();

    // Senza questo il contesto WebGL resta appeso: dopo qualche
    // apertura e chiusura il browser smette di concederne di nuovi.
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.canvas.remove();
  }
}

