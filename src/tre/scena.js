import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { copertinaLocale } from "./copertine";
import { caricaBibliotecario, ALTEZZA_BIBLIOTECARIO } from "./libraio";
import { Magazzino, metri } from "./modelli";
import { costruisciGuscio, creaLampadario, creaTexturaPavimento } from "./stanza";
import { costruisciLibrerie } from "./scaffali";
import { costruisciFinestra } from "./finestra";
import { costruisciBancone } from "./bancone";
import { costruisciAngoloLettura } from "./angolo";
import { Evidenza } from "./evidenza";
import { Avvicinamento } from "./avvicinamento";
import { BIBLIOTECARIO, MODELLI } from "./indirizzi";
import {
  COLORE_FOG,
  COLORE_FONDO_ALTO,
  COLORE_FONDO_BASSO,
  COLORE_INTONACO,
  COLORE_PIETRA,
  COLORE_LEGNO,
  COLORE_OTTONE
} from "./tinte";

// In WebP, non nei JPEG originali: erano quattro immagini da mezzo mega
// l'una — due megabyte per quattro superfici che si vedono da lontano e
// ripetute a mattonella. Rifatte pesano centocinquanta chilobyte in
// tutto, con uno scarto di un'unità e mezza su 255 rispetto agli
// originali. Come sono state rifatte sta in `assets/CREDITI.md`.
const legnoDiffuseUrl = new URL("./assets/legno/legno_diffuse.webp", import.meta.url).href;
const legnoRuviditaUrl = new URL("./assets/legno/legno_ruvidita.webp", import.meta.url).href;
const legnoNormaliUrl = new URL("./assets/legno/legno_normali.webp", import.meta.url).href;
const intonacoDiffuseUrl = new URL("./assets/intonaco/intonaco_diffuse.webp", import.meta.url).href;
const pietraDiffuseUrl = new URL("./assets/pietra/pietra_diffuse.webp", import.meta.url).href;
const pietraNormaliUrl = new URL("./assets/pietra/pietra_normali.webp", import.meta.url).href;
// Gli indirizzi dei modelli stanno in un file per conto loro perché
// servono anche fuori di qui: la pagina li fa partire in anticipo, e per
// farlo non deve caricarsi dietro three (vedi `indirizzi.js`).
//
// Un indirizzo costruito con una variabile dentro `new URL(…,
// import.meta.url)`: Vite lo riconosce e in build copia tutti i `.glb`
// della cartella con il nome corretto. Vale a dire che quello che sta in
// `assets/arredo/` finisce nel pacchetto anche se in `MODELLI` non è
// elencato — un modello che non serve più va cancellato, non solo tolto
// dalla tabella.
//
// Autori e licenze di ogni modello stanno in `assets/CREDITI.md`.

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
 * Che lo scambio sia istantaneo non vuol dire che debba *vedersi*: da
 * un luogo all'altro non si taglia, ci si avvicina. La sequenza sta in
 * `avvicinamento.js`, qui restano le inquadrature che le si passano
 * (`AFFACCI`, `#primoPiano`, `#primoPianoScaffale`) e l'ondata con cui i
 * volumi escono dal mobile a cose fatte (`apertura`).
 *
 * Lo stesso vale per gli altri quattro punti — la cassa, la bacheca, il
 * tavolino, il bibliotecario — che invece di un luogo hanno una pagina:
 * ci si accosta e si finisce al buio, e dal buio si riaccende il DOM.
 * Nessuno dei cinque «apre» qualcosa: a tutti e cinque ci si va.
 *
 *
 * COME CI SI MUOVE
 *
 * Non si cammina: la telecamera scivola fra postazioni fisse, una per
 * sezione di scaffale. È una scelta, non una scorciatoia — il movimento
 * libero su un sito dà la nausea a parecchia gente, non funziona col
 * dito su un telefono e non si usa da tastiera.
 *
 * L'unica eccezione è l'entrata: lì la telecamera attraversa davvero la
 * stanza, perché è l'unico momento in cui il movimento dice qualcosa —
 * che i volumi grandi che si stanno per vedere sono quelli piccoli che
 * si vedevano da lontano.
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

/* --------------------------------------------------
   LA STANZA ATTORNO ALLO SCAFFALE
   Pavimento, parete e cornice che tolgono di mezzo il fondo bianco
   (vedi `#creaContorno`). Sempre in unità di scaffale: qui un libro è
   alto 1.
   -------------------------------------------------- */

// Quanto pavimento e parete sporgono oltre l'ultimo mobile, da tutte e
// due le parti. Serve solo a non farli finire dentro l'inquadratura
// mentre la telecamera scorre fra le sezioni.
const MARGINE_CONTORNO = 14;

// Quanto pavimento c'è davanti alla parete. Deve passare sotto la
// telecamera, non fermarsi allo scaffale: nella metà bassa
// dell'inquadratura si vede il pavimento da lì fino ai piedi di chi
// guarda, e uno che finisce a metà lascia una fascia di vuoto.
const PROFONDITA_CONTORNO = 26;

// Quanta parete si vede sopra i mobili. Generosa rispetto al necessario
// (da nove unità di distanza ne avanza si e no una): costa un
// rettangolo, e su uno schermo molto alto sarebbe l'unica cosa a
// separare la biblioteca dal cielo.
const ALTEZZA_SOPRA = 6;

/* --------------------------------------------------
   L'ENTRATA NELLO SCAFFALE
   Come si arriva qui dentro dalla stanza: la sequenza sta in
   `avvicinamento.js`, questi sono i numeri che riguardano lo scaffale.
   -------------------------------------------------- */

// Quanto i volumi stanno rientrati nel mobile prima di uscirne, e di
// quanto sono girati mentre ci stanno dentro. Non è un effetto di
// comparsa: è lo stesso gesto della sporgenza al passaggio del mouse,
// al contrario, e usa lo stesso vocabolario perché è la stessa
// libreria.
const RIENTRO = 0.34;
const ROTAZIONE_RIENTRO = -0.2;

// Quanto è sfalsata l'ondata con cui escono: 0 li fa uscire tutti
// insieme (e allora è uno scatto solo), 1 li mette in fila indiana (e
// allora l'ultimo arriva quando la telecamera si è già fermata).
const SCAGLIONE = 0.55;

// L'alone caldo dietro lo scaffale. È una costante perché durante
// l'apertura si accende insieme ai volumi, e serve sapere a quanto
// deve tornare.
const ALONE_INTENSITA = 22;

/* --------------------------------------------------
   COME CI SI AFFACCIA A OGNI PUNTO
   -------------------------------------------------- */

/**
 * Da che parte ci si arriva, e quanto vicino.
 *
 * Sta qui e non nei moduli che costruiscono i mobili perché è roba di
 * regia, non di falegnameria: `bancone.js` sa quanto è larga la cassa,
 * non da che parte la si guarda. Quelli sanno solo dire come si chiama
 * il proprio bersaglio (`userData.punto`); dove piazzarsi per guardarlo
 * dipende da com'è messa la stanza, e la stanza la mette insieme questo
 * file.
 *
 * - `verso`   da che parte sta la telecamera rispetto all'oggetto. Non
 *             va normalizzato: ci pensa `#primoPiano`.
 * - `stretta` quanto ci si arriva vicino, in frazione della distanza che
 *             inquadra il bersaglio per intero. Sotto 1 si sta addosso,
 *             sopra 1 si lascia aria attorno. I bersagli sono scatole
 *             invisibili tirate larghe per essere cliccabili da lontano,
 *             quindi «per intero» è già più largo dell'oggetto vero: i
 *             numeri sopra 1 non sono generosità, sono correzioni.
 * - `alza`    di quanto spostare in su il punto guardato, in frazione
 *             dell'altezza del bersaglio. Serve dove il centro
 *             geometrico non è il centro d'interesse — di una persona si
 *             guarda la faccia, non la cintura.
 */
const AFFACCI = {
  // Le librerie sono l'unico punto che porta in un altro luogo in tre
  // dimensioni, e la stretta a metà è quella che fa combaciare le due
  // scale nel momento dello scambio: non toccarla senza rileggere
  // `avvicinamento.js`.
  librerie: { verso: [0, 0, 1], stretta: 0.5 },

  // Sul banco, dal lato del cliente e un filo dall'alto: una cassa la si
  // guarda dall'angolo di chi sta pagando.
  cassa: { verso: [0.1, 0.42, 1], stretta: 1.55 },

  // Appesa alla parete dietro il banco. Frontale e basta: è un foglio,
  // e un foglio guardato di sbieco è un foglio storto.
  bacheca: { verso: [0, 0.05, 1], stretta: 1.25 },

  // Il tavolino si guarda da sopra, come chi si è appena seduto e ha
  // davanti il volume che qualcuno ha lasciato aperto.
  tavolino: { verso: [0.12, 0.78, 0.62], stretta: 1.5 },

  // In faccia, dal lato del cliente. La stretta stringe sul busto invece
  // che sulla figura intera, e l'alzata porta lo sguardo dove sta la
  // faccia: è la stessa inquadratura in cui riparte la conversazione di
  // là, e le due si devono somigliare.
  bibliotecario: { verso: [0, 0.06, 1], stretta: 0.82, alza: 0.2 }
};

// I colori dei materiali stanno in un file loro (`tinte.js`): li usa
// anche la scena del banco, che ricostruisce lo stesso mobile fuori di
// qui, e due copie degli stessi esadecimali prima o poi divergono.

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
const SOGLIA_SEMI_LARGHEZZA = 7.1;
const SOGLIA_SEMI_ALTEZZA = 3.35;

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
const DISTANZA_SOGLIA_MAX = 12.6;

const LIBRERIE_CENTRO_X = -5;
const LIBRERIE_Z = -0.7;

const BANCO_CENTRO_X = 5.4;
const BANCO_Z = 0.6;
const MURO_BANCO_Z = -2.2;
// Dove comincia la parete del retrobanco. La sa anche `bancone.js`, che
// la ricava dalla stessa sottrazione: da qui in poi la stanza è divisa
// in due, e le librerie in fondo devono fermarsi prima.
const MURO_BANCO_SINISTRA_X = BANCO_CENTRO_X - metri(2.5);

/* La finestra sulla parete di fondo.
   --------------------------------------------------------------------
   Sta nel tratto di muro che si vede fra l'ultima libreria a sinistra e
   il pilastro del retrobanco: da qualunque altra parte sarebbe dietro un
   mobile. Le file di scaffali di fondo la scansano (`saltaDaA` in
   `scaffali.js`), perché una libreria davanti a una finestra è una
   libreria messa da qualcuno che non voleva vedere il mare. */
const FINESTRA_X = -0.4;
const FINESTRA_LARGA = metri(1.25);
const FINESTRA_ALTA = metri(1.9);
const FINESTRA_DAVANZALE = metri(1.15);
const FINESTRA_SPESSORE = metri(0.5);

const ANGOLO_X = 0;
const ANGOLO_Z = 2.4;

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
      alViaggiare,
      rientroDa = null,
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
    // Mentre si entra o si esce dallo scaffale la pagina si toglie di
    // mezzo: pannelli di vetro fermi sopra una telecamera che vola sono
    // esattamente il genere di cosa che fa sembrare il 3D un fondale.
    this.alViaggiare = alViaggiare;
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
    this.puntiStanza = new Map(); // nome del punto → il suo bersaglio
    this.copertineStanza = []; // i materiali delle vetrine, in attesa delle immagini
    this.posterBancone = [];

    // Da dove si sta rientrando, se si sta rientrando. Non è uno stato
    // che cambia: è una consegna che la pagina fa alla scena una volta
    // sola, e che la scena onora appena ha finito di arredarsi.
    this.rientroDa = rientroDa;

    this.viaggio = null; // { da, a, guardaDa, guardaA, inizio, durata }
    // Quanto i volumi sono usciti dal mobile: 1 è lo stato normale, e
    // finché resta 1 l'ondata non costa niente (vedi `#aggiornaLibri`).
    this.apertura = 1;
    this.orologio = new THREE.Clock();
    this.fotogramma = 0;
    this.vivo = true;

    this.testureInUso = new Map(); // sezione → Set<Texture>
    this.caricamenti = new Set();

    this.magazzino = new Magazzino();

    this.#creaRenderer();
    this.#creaScena();
    this.#creaComposer();

    // Dopo il renderer, che è da lì che legge l'esposizione di riposo.
    this.avvicinamento = new Avvicinamento({
      camera: this.camera,
      renderer: this.renderer
    });

    // Chi rientra da una pagina non deve vedere la soglia neanche per un
    // fotogramma: lo schermo resta spento da adesso fino a quando la
    // stanza è in piedi e la riemersione può cominciare (`#arreda`). Va
    // fatto dopo aver costruito l'avvicinamento, che è chi si è appena
    // segnato l'esposizione di riposo a cui tornare.
    //
    // Non a chi ha chiesto meno movimento: lì non ci sarà nessuna
    // riemersione, quindi non ci sarebbe nessuno a riaccendere. Il velo
    // nero della pagina (`Buio` in `HomePage`) copre l'attesa lo stesso,
    // e si alza appena la stanza è pronta.
    if (this.rientroDa && !menoMovimento) this.renderer.toneMappingExposure = 0.0001;

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

    /* La mappa d'ombra si ridisegna quando gliela chiediamo, non da sé.
       ------------------------------------------------------------------
       È **la** ragione per cui i movimenti di telecamera erano a scatti.
       Di suo three rifà la mappa a ogni fotogramma, e rifarla vuol dire
       ridisegnare la scena una seconda volta dal punto di vista della
       lampada: misurato in questa stanza, 213 chiamate di disegno e
       settantamila triangoli in più sui 472 e 171 mila totali. Quasi
       metà del lavoro di ogni fotogramma, speso per ricalcolare ombre
       che non cambiano — pareti, scaffali e poltrone non si muovono, e
       la lampada nemmeno.

       Quello che cambia lo sappiamo: quando la stanza finisce di
       arredarsi, quando si passa dalla stanza allo scaffale, e quando la
       finestra cambia forma. Lì si chiama `#rinfrescaOmbre`, e sono tre
       fotogrammi in tutta la visita.

       Non si aggiorna per il respiro della bibliotecaria né per l'onda
       dei volumi che escono dal ripiano: sono spostamenti di
       centimetri, dietro un bancone o dentro un mobile, e la loro ombra
       congelata non si distingue da quella viva. */
    this.renderer.shadowMap.autoUpdate = false;
  }

  /**
   * Ridisegna la mappa d'ombra al prossimo fotogramma, una volta sola:
   * three rimette i due `needsUpdate` a falso appena li ha usati.
   *
   * I *due*: three sbarra la strada in due punti, e chi ne alza uno solo
   * ottiene silenziosamente niente. Il primo è sul gestore delle ombre —
   * `renderer.shadowMap.needsUpdate` — e se resta falso la funzione esce
   * prima ancora di guardare le luci. Il secondo è sulla singola ombra,
   * ed è quello che sceglie quali luci rifare fra tutte quelle che
   * proiettano. Qui la luce che proietta è una sola, ma vanno alzati
   * comunque tutti e due.
   */
  #rinfrescaOmbre() {
    if (!this.lampada) return;

    this.renderer.shadowMap.needsUpdate = true;
    this.lampada.shadow.needsUpdate = true;
  }

  /**
   * Il fotogramma non va più dritto sullo schermo.
   *
   * Il contorno dell'oggetto guardato (`evidenza.js`) si disegna
   * sull'immagine già fatta, quindi serve una catena: la scena, il
   * contorno, e in fondo la resa finale.
   *
   * Dentro un bersaglio di rendering three non applica né il tone
   * mapping né la conversione in sRGB — li fa solo quando disegna
   * direttamente sulla tela — ed è esattamente il motivo per cui
   * `OutputPass` esiste e chiude la fila. Senza, la stanza uscirebbe
   * slavata.
   */
  #creaComposer() {
    const dimensione = this.renderer.getDrawingBufferSize(new THREE.Vector2());

    // Il bersaglio se lo fabbricherebbe l'EffectComposer da solo, ma
    // senza multicampionamento: e la stanza è tutta spigoli di legno
    // dritti, dove l'assenza di antialiasing si legge come una scaletta
    // su ogni montante.
    //
    // Quanti campioni dipende però da quanti pixel ci sono già. Su uno
    // schermo a densità doppia il montante è largo due pixel fisici
    // prima ancora di levigarlo, e il quarto campione non si vede: si
    // paga soltanto, ed è banda di memoria — quella che manca proprio
    // mentre la telecamera si muove. Su uno schermo normale invece serve
    // tutto.
    const campioni = this.renderer.getPixelRatio() > 1.5 ? 2 : 4;

    const bersaglio = new THREE.WebGLRenderTarget(dimensione.x, dimensione.y, {
      type: THREE.HalfFloatType,
      samples: campioni
    });

    this.composer = new EffectComposer(this.renderer, bersaglio);

    this.passoScena = new RenderPass(this.scena, this.camera);
    this.composer.addPass(this.passoScena);

    this.evidenza = new Evidenza({
      scena: this.scena,
      camera: this.camera,
      larghezza: dimensione.x,
      altezza: dimensione.y
    });
    this.composer.addPass(this.evidenza.passo);

    this.passoResa = new OutputPass();
    this.composer.addPass(this.passoResa);
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

    /* Il rimbalzo, alzato apposta.
       ------------------------------------------------------------------
       Una stanza di legno chiaro con le lampade accese non ha ombre
       nere: la luce che colpisce il pavimento risale sui mobili, e nei
       film di Ghibli è proprio questo a fare l'atmosfera — le zone in
       ombra restano *lette*, colorate del colore di quello che c'è
       intorno, invece di sprofondare. Da 1,15 a 1,55, e il colore da
       sotto più caldo e più saturo, che è il parquet che rimanda su la
       sua luce. */
    this.scena.add(new THREE.HemisphereLight(0xfff4e0, 0xc39a63, 1.55));

    // La luce principale: è lei a proiettare le ombre, le altre restano
    // di riempimento (due luci con ombra vera costerebbero il doppio per
    // un guadagno che non si vede).
    const lampada = new THREE.DirectionalLight(0xffe6bd, 1.55);
    lampada.position.set(-5, 9, 9);
    lampada.castShadow = true;
    // Tenuta da parte: è l'unica che proietta, quindi è l'unica a cui
    // chiedere di rifare la mappa (vedi `#rinfrescaOmbre`).
    this.lampada = lampada;
    // Duemilaquarantotto non è più un costo per fotogramma ma per
    // rinfrescata, e le rinfrescate sono tre: tanto vale che l'ombra
    // dello scaffale abbia i bordi netti.
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
    this.alone = new THREE.PointLight(0xfacc15, ALONE_INTENSITA, 34, 2);
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

    // Una prima passata subito. Con l'aggiornamento automatico spento,
    // finché nessuno la chiede la mappa d'ombra non viene disegnata
    // *mai*, e la scena leggerebbe una texture di profondità mai
    // riempita — cioè ombre a caso, o tutto in ombra.
    this.#rinfrescaOmbre();

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

    /* Il pavimento della soglia non è più lo stesso legno di tutto il
       resto: è un tavolato a doghe disegnato per conto suo (vedi
       `creaTexturaPavimento` in `stanza.js`).

       La ragione sta lì; qui basta il motivo per cui è un materiale che
       nasce già vestito invece di aspettare le texture di Poly Haven
       come gli altri — perché la sua immagine non arriva dalla rete, e
       quindi non c'è niente da aspettare. È anche l'unico che non prende
       la mappa delle normali del legno: quella descrive una venatura che
       corre in un verso suo, e sotto le doghe disegnate qui
       contraddirebbe le fughe. La ruvidezza gliela dà il disegno. */
    this.materialeLegnoPavimento = new THREE.MeshStandardMaterial({
      map: creaTexturaPavimento(),
      roughness: 0.74,
      metalness: 0.02
    });

    // Tredici ripetizioni in larghezza e otto in profondità: la tela
    // vale un metro per due, e la stanza è tredici metri per sedici.
    // Sbagliare questo numero vuol dire doghe larghe come un tavolo.
    this.materialeLegnoPavimento.map.repeat.set(13, 8);
    // Il parquet sotto lo scaffale. È un terzo materiale e non il
    // pavimento della stanza perché le due scale non c'entrano niente
    // l'una con l'altra: là il pavimento è largo venti unità e qui
    // ottanta, e con le stesse ripetizioni le doghe passerebbero da
    // essere doghe a essere venature.
    this.materialeParquet = legno();

    // La muratura delle pareti. L'intonaco resta perché serve ancora
    // altrove, ma le pareti adesso sono di pietra — sopra erano un beige
    // uniforme, ed è la ragione per cui sembravano vuote: un piano
    // liscio alto tre metri non ha niente da guardare, e nessun quadro
    // appeso lo salva. Vedi `costruisciParete` in `stanza.js`.
    this.materialePietra = new THREE.MeshStandardMaterial({
      color: COLORE_PIETRA,
      roughness: 0.95,
      metalness: 0
    });

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

    // Il parquet dello scaffale è largo un centinaio di unità e profondo
    // ventisei: le ripetizioni seguono quella proporzione, o le doghe
    // escono schiacciate in un verso solo.
    const PARQUET = [30, 9];

    // Il pavimento della soglia non è in nessuno di questi elenchi: ha
    // un tavolato tutto suo, disegnato in `#creaMateriali`.
    applica(legnoDiffuseUrl, [
      { materiale: this.materialeLegno, chiave: "map", ripeti: [4, 2], srgb: true },
      { materiale: this.materialeParquet, chiave: "map", ripeti: PARQUET, srgb: true }
    ]);

    applica(legnoRuviditaUrl, [
      { materiale: this.materialeLegno, chiave: "roughnessMap", ripeti: [4, 2] },
      { materiale: this.materialeParquet, chiave: "roughnessMap", ripeti: PARQUET }
    ]);

    applica(legnoNormaliUrl, [
      { materiale: this.materialeLegno, chiave: "normalMap", ripeti: [4, 2] },
      { materiale: this.materialeParquet, chiave: "normalMap", ripeti: PARQUET }
    ]);

    applica(intonacoDiffuseUrl, [
      { materiale: this.materialeIntonaco, chiave: "map", ripeti: [9, 4], srgb: true }
    ]);

    // La pietra si ripete molto più fitta del vecchio intonaco: un
    // concio è largo trenta centimetri, e con nove ripetizioni su venti
    // metri di parete ognuno sarebbe diventato un masso da due metri.
    const MURATURA = [11, 5];

    applica(pietraDiffuseUrl, [
      { materiale: this.materialePietra, chiave: "map", ripeti: MURATURA, srgb: true }
    ]);

    applica(pietraNormaliUrl, [
      { materiale: this.materialePietra, chiave: "normalMap", ripeti: MURATURA }
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
    // Una collezione che si aggiorna mentre si sta entrando nello
    // scaffale: la sequenza arriva subito, o si ritroverebbe a portare la
    // telecamera dentro volumi che nel frattempo sono stati buttati e
    // rifatti.
    //
    // Una riemersione invece si lascia stare, ed è il caso normale, non
    // un caso limite: rientrando da una pagina la collezione è già in
    // memoria e arriva nello stesso istante in cui la stanza si alza.
    // Interromperla vorrebbe dire che tornare indietro funziona solo la
    // prima volta. Non le serve niente dei libri — le sue due
    // inquadrature stanno tutte e due nella stanza.
    if (this.avvicinamento?.tipo === "attraversa") this.avvicinamento.concludi();

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

    // `guidata` quando c'è una riemersione in corso: la telecamera ha già
    // un padrone, e qui si cambia solo di che mondo è fatta la scena.
    this.vaiA(partenza, {
      immediato: true,
      guidata: Boolean(this.avvicinamento?.inCorso)
    });
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

    // Il posto del libro nell'ondata con cui la sezione si apre: zero al
    // centro dello scaffale, uno ai due montanti. Solo la colonna, non
    // la riga — l'apertura è un allargarsi, e un'ondata che scende
    // dall'alto racconterebbe un'altra cosa.
    const mezzo = (this.colonne - 1) / 2;
    const ritardo = mezzo ? Math.abs(colonna - mezzo) / mezzo : 0;

    libro.userData = {
      serie,
      sezione,
      copertina,
      riposoZ: 0,
      sporgenza: 0,
      ritardo
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

    this.#creaContorno(centroX, larghezzaTotale, altezzaMobile);
  }

  /**
   * La stanza attorno allo scaffale.
   *
   * Prima qui non c'era niente: sopra i mobili e sotto i mobili si vedeva
   * il gradiente di sfondo, cioè una campitura chiara e anonima, e
   * l'effetto era di essere finiti da un'altra parte — un catalogo su
   * fondo bianco invece di uno scaffale in una biblioteca.
   *
   * Adesso c'è la stessa architettura della soglia, con gli stessi
   * materiali: parquet a terra, parete con la cornice sopra i mobili. Non
   * è la stessa stanza — le due scale non c'entrano niente l'una con
   * l'altra, qui un libro è alto un'unità e là una persona ne è alta 2,6
   * (vedi in cima al file) — ma è lo stesso *posto*, e questo si vede.
   *
   * Basta poco perché quello che si vede attorno allo scaffale è poco: da
   * dove sta la telecamera avanzano si e no un'unità sopra il mobile e
   * tre quarti sotto. Era tutto lì il bianco.
   */
  #creaContorno(centroX, larghezzaTotale, altezzaMobile) {
    // Con un margine per parte: passando fra una sezione e l'altra la
    // telecamera scorre, e pavimento e parete non devono mai finire
    // dentro l'inquadratura.
    const larghezza = larghezzaTotale + MARGINE_CONTORNO * 2;

    const bassoMobile = -0.06 - altezzaMobile / 2;
    const altoMobile = -0.06 + altezzaMobile / 2;

    /* ---- Il pavimento ----
       Appena sotto ai piedi dei mobili, non alla loro stessa quota: due
       piani complanari litigano per lo stesso pixel e il parquet si
       riempie di chiazze. Arriva fin sotto la telecamera, perché nella
       metà bassa dell'inquadratura si vede da lì in poi. */
    const pavimento = new THREE.Mesh(
      new THREE.PlaneGeometry(larghezza, PROFONDITA_CONTORNO),
      this.materialeParquet
    );

    pavimento.rotation.x = -Math.PI / 2;
    pavimento.position.set(centroX, bassoMobile - 0.04, PROFONDITA_CONTORNO / 2 - 1);
    pavimento.receiveShadow = true;

    this.gruppoScaffale.add(pavimento);

    /* ---- La parete ----
       Dietro il fondo dello scaffale, e più alta di lui: quello che se ne
       vede è la fascia che avanza sopra i mobili. */
    const altezzaParete = altezzaMobile + ALTEZZA_SOPRA * 2;

    const parete = new THREE.Mesh(
      new THREE.PlaneGeometry(larghezza, altezzaParete),
      this.materialeIntonaco
    );

    parete.position.set(centroX, bassoMobile + altezzaParete / 2, -0.78);
    parete.receiveShadow = true;

    this.gruppoScaffale.add(parete);

    /* ---- La cornice ----
       Il listello di legno che chiude i mobili in alto. È il pezzo che
       fa più lavoro di tutti: senza, la parete comincia dal nulla e i
       mobili sembrano ritagliati e incollati sopra un muro. */
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(larghezza, 0.34, 0.5),
      this.materialeLegno
    );

    cornice.position.set(centroX, altoMobile + 0.17, -0.45);
    cornice.castShadow = true;
    cornice.receiveShadow = true;

    this.gruppoScaffale.add(cornice);

    /* ---- Lo zoccolo ----
       Il basamento su cui poggiano i mobili, davanti e non dietro: un
       battiscopa contro la parete sarebbe nascosto dal fondo dello
       scaffale, che corre per tutta la lunghezza. Qui invece chiude in
       basso i montanti — sotto il ripiano più basso restano sei decimi
       di legno vuoto — e soprattutto nasconde la giuntura fra il mobile
       e il pavimento, che è il punto in cui si vedrebbe che i due sono
       due oggetti appoggiati invece che una libreria in una stanza. */
    const zoccolo = new THREE.Mesh(
      new THREE.BoxGeometry(larghezza, 0.34, 1.2),
      this.materialeLegno
    );

    zoccolo.position.set(centroX, bassoMobile + 0.17, -0.1);
    zoccolo.castShadow = true;
    zoccolo.receiveShadow = true;

    this.gruppoScaffale.add(zoccolo);
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
      // Il tratto di parete di fondo in cui non vanno lesene: è dove sta
      // la finestra, e il passo delle lesene ne faceva capitare una
      // esattamente lì in mezzo (vedi `costruisciParete`).
      vuotoFondo: [
        FINESTRA_X - FINESTRA_LARGA * 0.9,
        FINESTRA_X + FINESTRA_LARGA * 0.9
      ],
      pietra: this.materialePietra,
      legno: this.materialeLegno,
      legnoPavimento: this.materialeLegnoPavimento,
      ottone: this.materialeOttone
    });

    this.gruppoStanza.add(gruppo);
    this.soffittoY = soffittoY;

    // La finestra: appoggiata alla parete di fondo, con l'imbotte che
    // sporge dentro la stanza (il perché sta in `finestra.js`).
    this.finestra = costruisciFinestra({
      larghezza: FINESTRA_LARGA,
      altezza: FINESTRA_ALTA,
      spessore: FINESTRA_SPESSORE,
      pietra: this.materialePietra,
      legno: this.materialeLegno
    });

    this.finestra.gruppo.position.set(FINESTRA_X, PAVIMENTO_Y + FINESTRA_DAVANZALE, FONDO_Z);
    this.gruppoStanza.add(this.finestra.gruppo);

    this.#spargiIlPulviscolo();

    this.#arreda(agganciLampadari).catch((errore) =>
      console.error("La stanza non si è arredata:", errore)
    );
  }

  /**
   * Il pulviscolo che gira nella luce.
   *
   * È il dettaglio più Ghibli che esista e costa **un disegno solo**: un
   * `Points` con quattrocento granelli, un materiale additivo, nessuna
   * ombra e nessuna texture. Non c'è interno di quei film in cui la luce
   * sia vuota — c'è sempre qualcosa che ci galleggia dentro, ed è quello
   * a far sembrare l'aria una cosa invece che il niente fra gli oggetti.
   *
   * Additivo perché la polvere non copre quello che ha dietro, si somma:
   * un granello davanti a una parete chiara sparisce, lo stesso granello
   * davanti al legno scuro si accende. È esattamente come si comporta,
   * e viene gratis dal modo di fondere.
   *
   * Si muovono su tre seni a periodi che non vanno d'accordo. Le rette
   * non esistono in una corrente d'aria, e un ciclo che si chiude si
   * riconosce dopo due giri.
   */
  #spargiIlPulviscolo() {
    const QUANTI = 400;

    const posizioni = new Float32Array(QUANTI * 3);
    // Ogni granello parte da un punto suo del proprio giro, o si
    // muoverebbero tutti insieme come uno stormo.
    this.fasiPulviscolo = new Float32Array(QUANTI * 3);

    const larghezza = LARGHEZZA_STANZA * 0.9;
    const profondita = DAVANTI_Z - FONDO_Z;

    for (let i = 0; i < QUANTI; i++) {
      posizioni[i * 3] = (Math.random() - 0.5) * larghezza;
      // Più fitti in basso, dove la luce delle lampade arriva e dove
      // guarda la telecamera: in alto sotto le travi non li vede nessuno.
      posizioni[i * 3 + 1] = PAVIMENTO_Y + Math.pow(Math.random(), 1.6) * ALTEZZA_STANZA;
      posizioni[i * 3 + 2] = FONDO_Z + Math.random() * profondita * 0.7;

      this.fasiPulviscolo[i * 3] = Math.random() * Math.PI * 2;
      this.fasiPulviscolo[i * 3 + 1] = Math.random() * Math.PI * 2;
      this.fasiPulviscolo[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    this.origineePulviscolo = posizioni.slice();

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.BufferAttribute(posizioni, 3));

    this.pulviscolo = new THREE.Points(
      geometria,
      new THREE.PointsMaterial({
        color: 0xffe9c4,
        size: 0.055,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        // Il pulviscolo non si vela: la nebbia lo spegnerebbe proprio in
        // fondo alla stanza, che è dove si vede meglio contro il buio.
        fog: false
      })
    );

    this.pulviscolo.frustumCulled = false;
    this.gruppoStanza.add(this.pulviscolo);
  }

  #aggiornaPulviscolo(dt) {
    if (!this.pulviscolo) return;

    this.tempoPulviscolo = (this.tempoPulviscolo ?? 0) + dt;

    const t = this.tempoPulviscolo;
    const posizioni = this.pulviscolo.geometry.attributes.position;
    const origine = this.origineePulviscolo;
    const fasi = this.fasiPulviscolo;

    for (let i = 0; i < posizioni.count; i++) {
      const k = i * 3;

      posizioni.array[k] = origine[k] + Math.sin(t * 0.13 + fasi[k]) * 0.42;
      posizioni.array[k + 1] = origine[k + 1] + Math.sin(t * 0.09 + fasi[k + 1]) * 0.3;
      posizioni.array[k + 2] = origine[k + 2] + Math.sin(t * 0.11 + fasi[k + 2]) * 0.34;
    }

    posizioni.needsUpdate = true;
  }

  /**
   * Tutto quello che va aspettato: i modelli arrivano dalla rete, e
   * ognuno di questi pezzi può fallire per conto suo senza portarsi
   * dietro gli altri — una stanza senza pianta è meglio di una stanza
   * senza niente.
   */
  async #arreda(agganciLampadari) {
    this.#appendiLampadari(agganciLampadari);

    await Promise.all([
      this.#costruisciLibrerie(),
      this.#costruisciBanco(),
      this.#costruisciAngolo(),
      this.#riempiIlDavanzale()
    ]);

    if (!this.vivo) return;

    // La stanza è in piedi: da adesso in poi le copertine possono
    // partire. Prima no — sono cinquanta immagini che si contendono la
    // banda con i modelli, e finché i modelli non ci sono la stanza non
    // esiste. Sono decorazione su volumi alti venti pixel: arrivano
    // dopo, e nessuno se ne accorge.
    this.stanzaInPiedi = true;

    // Adesso i mobili ci sono: è il momento di calcolare le loro ombre,
    // ed è la prima delle tre volte in cui succede.
    this.#rinfrescaOmbre();

    this.#vestiStanza();

    // La riemersione prima dell'annuncio, non dopo: `alPronta` fa
    // svanire il velo nero della pagina, e sotto quel velo la telecamera
    // deve già essere addosso all'oggetto giusto. L'ordine inverso
    // mostrerebbe mezzo fotogramma di soglia.
    if (this.rientroDa) {
      this.#riemergiDa(this.rientroDa);
      this.rientroDa = null;
    }

    this.alPronta?.();
  }

  /**
   * I lampadari, e il motivo per cui prima sembravano spenti.
   *
   * La luce c'era già — una `PointLight` sotto ognuno — ma la luce non si
   * vede: si vede quello che illumina. Sopra il banco il suo effetto era
   * evidente perché lì sotto c'è roba a mezzo metro (il piano, la cassa,
   * i libri); a sinistra sotto le lampade non c'è niente più vicino del
   * pavimento a quattro metri, quindi la luce si spargeva senza lasciare
   * traccia e i paralumi restavano oggetti scuri appesi al soffitto.
   *
   * Quello che mancava è **la lampadina**: una sfera che si vede accesa
   * per conto suo. Un materiale base di colore chiaro non risente
   * dell'illuminazione — è sempre alla sua tinta piena, che è
   * esattamente come si comporta una sorgente — e dentro un paralume
   * traslucido basta quella a dire "è accesa".
   *
   * Costa una sfera da quaranta triangoli per lampada, e la geometria è
   * condivisa fra tutte e sei.
   */
  /**
   * I lampadari: ruote di legno con le candele (vedi `creaLampadario` in
   * `stanza.js`).
   *
   * Non sono più un modello scaricato. Ne sono stati provati due — globi
   * di vetro e poi un lampadario a bracci — e il secondo è stato bocciato
   * con la motivazione giusta: *«troppo eleganti»*. In una sala di pietra
   * con le travi a vista un paralume non ci sta, perché è un oggetto
   * industriale in una stanza che finge di essere di trecento anni fa.
   *
   * Le colonne sono due e non tre: la terza stava davanti all'insegna e
   * ne copriva il marchio.
   */
  #appendiLampadari(quote) {
    const colonne = [-metri(4.2), -metri(0.4)];

    for (const z of quote.slice(0, 2)) {
      for (const x of colonne) {
        const { gruppo, altoCatena, smaltibili } = creaLampadario({
          raggio: metri(0.52),
          legno: this.materialeLegno
        });

        gruppo.position.set(x, this.soffittoY - altoCatena, z);
        this.gruppoStanza.add(gruppo);

        this.materialiLampadari = [...(this.materialiLampadari ?? []), ...smaltibili];

        // La luce nasce appena sotto la ruota, non al suo centro: al
        // centro il legno si mangia metà del cono e la stanza sotto
        // resta al buio.
        const luce = new THREE.PointLight(0xffcb8a, 14, metri(10), 2);
        luce.position.set(x, this.soffittoY - altoCatena - metri(0.2), z);
        this.gruppoStanza.add(luce);
      }
    }
  }

  async #costruisciLibrerie() {
    const librerie = await costruisciLibrerie({
      magazzino: this.magazzino,
      legno: this.materialeLegno,
      urlPiante: {
        alta: MODELLI.piantaAlta,
        ricadente: MODELLI.piantaRicadente,
        larga: MODELLI.pianta
      },
      pavimentoY: PAVIMENTO_Y,
      fondoZ: FONDO_Z,
      sinistraX: SINISTRA_X,
      centroX: LIBRERIE_CENTRO_X,
      frontZ: LIBRERIE_Z,
      // Fin sotto il pilastro del retrobanco: la parete di fondo va
      // coperta tutta, altrimenti resta una campata di intonaco vuoto
      // proprio al centro dell'inquadratura.
      fondoFinoA: MURO_BANCO_SINISTRA_X,
      saltaDaA: [FINESTRA_X - FINESTRA_LARGA, FINESTRA_X + FINESTRA_LARGA],
      geometriaLibro: this.geometriaCopertina,
      materialeCarta: this.materialeCarta,
      tinta: tintaDaTitolo
    });

    if (!librerie || !this.vivo) return;

    this.gruppoStanza.add(librerie.gruppo);
    this.copertineStanza = librerie.coperture;

    this.#registraBersaglio(librerie.bersaglio, librerie.evidenza);
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
        lampada: MODELLI.lampadaTavolo,
        pianta: MODELLI.pianta,
        piantaAlta: MODELLI.piantaAlta
      },
      pavimentoY: PAVIMENTO_Y,
      soffittoY: this.soffittoY,
      centroX: BANCO_CENTRO_X,
      bancoZ: BANCO_Z,
      muroZ: MURO_BANCO_Z,
      muroSinistraX: MURO_BANCO_SINISTRA_X,
      destraX: DESTRA_X,
      pietra: this.materialePietra,
      legno: this.materialeLegno,
      ottone: this.materialeOttone
    });

    if (!banco || !this.vivo) return;

    this.gruppoStanza.add(banco.gruppo);
    this.posterBancone = banco.poster;

    for (const { mesh, evidenza } of banco.bersagli) {
      this.#registraBersaglio(mesh, evidenza);
    }

    await this.#mettiIlBibliotecario(banco.postoLibraio);
  }

  async #mettiIlBibliotecario({ x, y, z }) {
    const bibliotecario = await caricaBibliotecario({ url: BIBLIOTECARIO, x, y, z });

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
    bersaglio.userData = { punto: "bibliotecario" };
    this.gruppoStanza.add(bersaglio);

    this.#registraBersaglio(bersaglio, [bibliotecario.gruppo]);
  }

  /**
   * Le due piante sul davanzale della finestra.
   *
   * Il muro della finestra è spesso mezzo metro, quindi il davanzale è
   * una mensola di pietra larga ottanta centimetri all'altezza del
   * petto: l'unico piano della stanza rimasto completamente vuoto, e
   * l'unico posto in cui il vuoto si notava come trascuratezza invece
   * che come spazio.
   *
   * Vanno **ai due lati**, mai al centro. Il centro della finestra è
   * l'orizzonte, che è la cosa che si è appena finito di liberare dalla
   * lesena che ci stava davanti: rimetterci una pianta sarebbe stato lo
   * stesso errore con una foglia al posto della pietra.
   *
   * Diventano due sagome scure contro il mare — una foglia controluce si
   * legge solo per profilo — ed è per questo che sono quelle che ricadono
   * e non quelle diritte: un profilo che sborda oltre il davanzale è
   * riconoscibile, un cilindro verde no.
   */
  async #riempiIlDavanzale() {
    const finestra = this.finestra;
    if (!finestra) return;

    const { y, z, larga } = finestra.davanzale;

    const posti = [
      { x: -larga * 0.34, alto: 0.3, giroDi: 0.8, foglia: -0.04, chiaro: 0.05 },
      { x: larga * 0.33, alto: 0.24, giroDi: -1.9, foglia: 0.05, chiaro: -0.04 }
    ];

    for (const { x, alto, giroDi, foglia, chiaro } of posti) {
      const pianta = await this.magazzino.preleva(MODELLI.piantaRicadente, {
        alto,
        tinta: { foglia, chiaro }
      });

      if (!this.vivo) return;
      // Una che non arriva non si porta dietro l'altra: sono due modelli
      // indipendenti, e mezzo davanzale arredato è meglio di zero.
      if (!pianta) continue;

      pianta.position.set(x, y, z);
      pianta.rotation.y = giroDi;
      // Figlie del gruppo della finestra: se un giorno la finestra si
      // sposta sul muro, il davanzale si porta dietro le sue piante.
      finestra.gruppo.add(pianta);
    }
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
        libri: MODELLI.libri
      },
      pavimentoY: PAVIMENTO_Y,
      centroX: ANGOLO_X,
      centroZ: ANGOLO_Z
    });

    if (!angolo || !this.vivo) return;

    this.gruppoStanza.add(angolo.gruppo);

    if (angolo.bersaglio) {
      this.#registraBersaglio(angolo.bersaglio, angolo.evidenza);
    }
  }

  /**
   * Un oggetto cliccabile della soglia.
   *
   * `evidenza` è cosa si contorna quando ci si passa sopra: non il
   * bersaglio — che è un rettangolo invisibile davanti alla roba vera —
   * ma i modelli che rappresenta. Sono elenchi perché quasi mai è un
   * oggetto solo, e perché il contorno li tratta come una sagoma sola:
   * la bacheca è cornice più filetto più foglio, la vetrina è tre mobili
   * più le copertine e le piante che ci stanno davanti.
   */
  #registraBersaglio(mesh, evidenza) {
    this.oggettiStanza.push(mesh);

    if (evidenza?.length) mesh.userData.evidenza = evidenza;

    // Indicizzati per nome: è così che si ritrova un punto quando lo
    // chiede qualcuno che non ha in mano la mesh — chi ci si vuole
    // avvicinare, e chi ci sta rientrando da una pagina.
    if (mesh.userData.punto) this.puntiStanza.set(mesh.userData.punto, mesh);
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
    if (!this.stanzaInPiedi) return;
    if (!this.serie?.length) return;
    if (!this.copertineStanza.length && !this.posterBancone.length) return;

    const conCopertina = this.serie.filter((s) => copertinaLocale(s.copertina));

    if (!conCopertina.length) return;

    this.stanzaVestita = true;

    // Non una copertina diversa per ogni volume in vetrina. I posti
    // sono quarantotto e ognuno è un'immagine da scaricare: due
    // megabyte e mezzo per figurine alte venti pixel sullo schermo.
    //
    // Ventiquattro bastano, e la ripetizione non si vede: uno scaffale
    // ne mostra sedici, quindi il giro delle copertine e quello dei
    // mobili non vanno mai a tempo — i tre scaffali restano diversi
    // l'uno dall'altro. Quali siano è comunque arbitrario, anche prima
    // erano le prime che capitavano.
    const QUANTE_IN_VETRINA = 24;

    const inVetrina = conCopertina.slice(0, QUANTE_IN_VETRINA);
    // Le locandine dietro al banco prendono le successive: sono grandi
    // e in mezzo all'inquadratura, ritrovarcene una identica a un
    // volume dello scaffale si noterebbe.
    const inLocandina = conCopertina.slice(QUANTE_IN_VETRINA);

    const daFare = [
      ...this.copertineStanza.map((materiale, indice) => ({
        materiale,
        serie: inVetrina[indice % inVetrina.length]
      })),
      ...this.posterBancone.map((mesh, indice) => ({
        materiale: mesh.material,
        serie: inLocandina[indice] ?? inVetrina[indice % inVetrina.length]
      }))
    ]
      .map((destinazione) => ({
        ...destinazione,
        url: copertinaLocale(destinazione.serie?.copertina)
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
    }).then(() => {
      // Finite quelle della stanza, si prepara la prima sezione dello
      // scaffale: nessuno la sta guardando, ma è dove si finisce
      // cliccando le librerie, e l'apertura deve scoprire copertine
      // vere. Adesso e non prima — sono le stesse sei connessioni.
      if (this.vivo && this.sezioneCorrente === -1) {
        this.#caricaCoperturePerSezione(0);
      }
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

          // La texture si consegna alla scheda video adesso, non al
          // primo fotogramma in cui si vede. Di suo three la carica
          // pigramente, e siccome la sezione accanto si scarica in
          // anticipo, quel primo fotogramma è proprio quello in cui la
          // telecamera ci sta arrivando: quaranta copertine caricate
          // tutte insieme mentre si è a metà del movimento. Farlo qui
          // sposta il costo dove non dà fastidio — durante l'attesa,
          // che è già un'attesa.
          this.renderer.initTexture(testura);

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
      // I libri possono essere stati rifatti mentre l'immagine era per
      // strada — una collezione che si aggiorna, la finestra che cambia
      // forma — e allora questa copertina è già stata smaltita: la
      // texture non ha più dove andare e nessuno la libererebbe più.
      // Prima contava poco, adesso la prima sezione si scarica mentre si
      // è ancora nella stanza e la finestra è larga come tutta la visita.
      if (this.testureInUso.get(sezione) !== set) {
        testura.dispose();
        return;
      }

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

  /**
   * Dove sta la telecamera in una certa postazione, e dove guarda.
   *
   * Separata da `vaiA` perché la stessa inquadratura serve a due
   * padroni: a chi ci si sposta e basta, e all'avvicinamento, che ne ha
   * bisogno *prima* di muoversi per sapere dove andrà a finire.
   */
  #posa(sezione) {
    if (sezione === -1) {
      const posti = this.#postiSoglia();
      const x = posti[Math.max(0, Math.min(posti.length - 1, this.postoSoglia))];

      return {
        posizione: new THREE.Vector3(x, CAMERA_SOGLIA_Y, this.distanzaSoglia),
        mira: new THREE.Vector3(x, SOGLIA_Y, 0),
        alone: new THREE.Vector3(x, 0.6, 1)
      };
    }

    const x = sezione * (this.larghezzaSezione + PASSO_X);

    return {
      posizione: new THREE.Vector3(x, 0.1, this.distanza),
      mira: new THREE.Vector3(x, 0, 0),
      alone: new THREE.Vector3(x, 0.6, -2.4)
    };
  }

  /**
   * @param immediato  ci si trova già lì, senza viaggio
   * @param guidata    la telecamera la muove qualcun altro
   *                   (`avvicinamento.js`): qui si cambia solo mondo
   */
  vaiA(sezione, { immediato = false, guidata = false } = {}) {
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

    // Metà della scena si è appena accesa e l'altra metà spenta: la
    // mappa d'ombra congelata è quella dell'altro mondo, e senza questa
    // riga lo scaffale erediterebbe l'ombra delle poltrone.
    this.#rinfrescaOmbre();

    if (cambiaModo && this.mirato) this.#spegniLaMira();

    if (nuova === -1) {
      const posti = this.#postiSoglia();

      this.postoSoglia = Math.max(0, Math.min(posti.length - 1, this.postoSoglia));
    }

    const posa = this.#posa(nuova);

    // L'alone caldo accompagna lo sguardo: restando all'origine
    // illuminava solo la prima sezione e lasciava le altre spente.
    this.alone?.position.copy(posa.alone);
    this.alone.visible = dentroScaffale;

    if (guidata) {
      this.viaggio = null;
    } else if (immediato || this.menoMovimento) {
      this.camera.position.copy(posa.posizione);
      this.bersaglioSguardo.copy(posa.mira);
      this.camera.lookAt(this.bersaglioSguardo);
      this.viaggio = null;
    } else {
      this.viaggio = {
        da: this.camera.position.clone(),
        a: posa.posizione,
        guardaDa: this.bersaglioSguardo.clone(),
        guardaA: posa.mira,
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
    if (this.#saltaAvvicinamento()) return;
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
    if (this.#saltaAvvicinamento()) return;
    if (this.sezioneCorrente === -1) return this.#giraSoglia(-1);

    this.vaiA(Math.max(0, this.sezioneCorrente - 1));
  }

  /**
   * Porta la telecamera alla sezione che contiene una certa serie.
   *
   * Qui la sequenza si conclude ma non assorbe la chiamata: non è un
   * gesto di chi guarda, è qualcuno che chiede di essere portato in un
   * posto preciso, e quel posto lo vuole comunque.
   */
  vaiAllaSerie(id) {
    this.avvicinamento.concludi();

    const indice = this.libri.findIndex((l) => String(l.userData.serie.id) === String(id));

    if (indice >= 0) this.vaiA(this.libri[indice].userData.sezione);
  }

  /**
   * Ci si affaccia a un punto della stanza.
   *
   * È l'unico modo in cui la stanza reagisce a un click, e vale per
   * tutti e cinque i punti: quello che cambia è cosa c'è in fondo. Le
   * librerie portano in un altro luogo in tre dimensioni e si
   * attraversano; gli altri quattro hanno una pagina, e ci si accosta e
   * basta — poi il buio passa la mano al DOM.
   */
  avvicinatiA(punto) {
    if (this.#saltaAvvicinamento()) return;
    if (this.sezioneCorrente !== -1) return;

    if (punto === "librerie") return this.#avvicina(true);

    this.#accosta(punto);
  }

  /** Entra fra i volumi, dalla prima sezione. */
  entraNelloScaffale() {
    if (this.#saltaAvvicinamento()) return;

    // Già dentro: non c'è niente da attraversare, si torna in testa.
    if (this.sezioneCorrente !== -1) return this.vaiA(0);

    this.#avvicina(true);
  }

  /** Torna alla soglia: la stanza torna cliccabile. */
  tornaAllaSoglia() {
    if (this.#saltaAvvicinamento()) return;
    if (this.sezioneCorrente === -1) return;

    this.#avvicina(false);
  }

  /**
   * Un comando arrivato mentre la sequenza è in corso non la interrompe:
   * la finisce. Chi ha già visto l'avvicinamento e clicca di nuovo vuole
   * essere dall'altra parte, non tornare indietro — e chi invece stava
   * solo strisciando il mouse non se ne accorge nemmeno, perché durante
   * la sequenza il puntatore non mira niente.
   *
   * @returns se ha assorbito il comando
   */
  #saltaAvvicinamento() {
    if (!this.avvicinamento.inCorso) return false;

    this.avvicinamento.concludi();

    return true;
  }

  /**
   * L'entrata (e l'uscita) come attraversamento invece che come stacco.
   *
   * Le quattro inquadrature che servono alla sequenza (vedi
   * `avvicinamento.js`) sono sempre le stesse due coppie, prese in un
   * verso o nell'altro: il primo piano delle librerie nella stanza, e il
   * primo piano della sezione dello scaffale. Sono calcolate con la
   * stessa frazione (`AFFACCI.librerie.stretta`) della rispettiva
   * distanza d'inquadratura,
   * ed è quello che fa combaciare i due mondi nel momento in cui si
   * scambiano.
   *
   * Se i modelli della stanza non sono ancora arrivati non c'è niente a
   * cui avvicinarsi: si va e basta, com'era prima. Lo stesso vale per
   * chi ha chiesto meno movimento.
   *
   * @param dentro  true si entra nello scaffale, false si torna in sala
   */
  #avvicina(dentro) {
    const sezione = dentro ? 0 : -1;

    const nellaStanza = this.#primoPiano("librerie");
    const nelloScaffale = this.#primoPianoScaffale(dentro ? 0 : this.sezioneCorrente);

    if (this.menoMovimento || !nellaStanza || !nelloScaffale) {
      this.vaiA(sezione);
      return;
    }

    this.viaggio = null;
    this.#spegniLaMira();
    this.alViaggiare?.(true);

    // Le copertine della sezione che si sta per scoprire partono adesso,
    // non al trapasso: due secondi e mezzo di volo sono esattamente il
    // tempo che ci vuole perché al momento dell'apertura ci siano.
    if (dentro) this.#caricaCoperturePerSezione(0);

    this.apertura = dentro ? 0 : 1;

    this.avvicinamento.attraversa({
      sguardo: this.bersaglioSguardo,
      partenza: {
        posizione: this.camera.position.clone(),
        mira: this.bersaglioSguardo.clone()
      },
      vicino: dentro ? nellaStanza : nelloScaffale,
      arrivo: dentro ? nelloScaffale : nellaStanza,
      fine: this.#posa(sezione),
      alTrapasso: () => this.vaiA(sezione, { guidata: true }),
      alMuovere: ({ tratta, t }) => {
        // Entrando i volumi escono dal mobile mentre lo scaffale si
        // allarga — è l'ultima tratta, quella che si guarda. Uscendo
        // rientrano subito, durante l'avvicinamento: al trapasso il
        // mobile è già chiuso, e dopo non c'è più niente da guardare.
        if (dentro) this.apertura = tratta === "apertura" ? t : 0;
        else this.apertura = tratta === "avvicinamento" ? 1 - t : 0;

        // Lo scaffale si accende insieme ai suoi volumi. Da fermo
        // l'alone è la sola luce che lo stacchi dal fondo, e vederlo
        // salire mentre le copertine escono lo fa leggere come una
        // stanza che si illumina invece che come un fondale acceso.
        if (dentro && this.alone) {
          this.alone.intensity = ALONE_INTENSITA * (0.3 + 0.7 * this.apertura);
        }
      },
      alFinire: () => {
        this.apertura = 1;

        if (this.alone) this.alone.intensity = ALONE_INTENSITA;

        this.alViaggiare?.(false);
      }
    });
  }

  /**
   * L'accostata a un oggetto della stanza, con la pagina in fondo.
   *
   * L'azione non parte cliccando: parte quando si è arrivati. È tutta la
   * differenza fra una stanza e un menu con sopra una fotografia — nel
   * menu il click *è* l'azione, qui il click è il primo passo.
   */
  #accosta(punto) {
    const vicino = this.#primoPiano(punto);

    if (this.menoMovimento || !vicino) {
      this.alAzione?.(punto);
      return;
    }

    this.viaggio = null;
    this.#spegniLaMira();
    this.alViaggiare?.(true);

    this.avvicinamento.accosta({
      sguardo: this.bersaglioSguardo,
      partenza: {
        posizione: this.camera.position.clone(),
        mira: this.bersaglioSguardo.clone()
      },
      vicino,
      alArrivare: () => this.alAzione?.(punto),
      alFinire: () => this.alViaggiare?.(false)
    });
  }

  /**
   * Il rientro da una pagina: si riapre gli occhi addosso all'oggetto da
   * cui si era usciti e si arretra fino alla soglia.
   *
   * Lo chiama `#arreda` e nessun altro: prima che i modelli siano
   * arrivati non c'è nessun oggetto a cui essere addosso.
   */
  #riemergiDa(punto) {
    const vicino = this.#primoPiano(punto);

    if (this.menoMovimento || !vicino) {
      // Lo schermo è spento da quando la scena è nata (vedi il
      // costruttore) e la sequenza che avrebbe dovuto riaccenderlo non
      // parte: senza questa riga la stanza resta nera per sempre, ed è
      // esattamente quello che succedeva a chi ha chiesto meno
      // movimento.
      this.avvicinamento.riaccendi();
      this.vaiA(-1, { immediato: true });

      return;
    }

    this.viaggio = null;
    this.alViaggiare?.(true);

    this.avvicinamento.riemergi({
      sguardo: this.bersaglioSguardo,
      vicino,
      fine: this.#posa(-1),
      alFinire: () => this.alViaggiare?.(false)
    });
  }

  /**
   * L'inquadratura ravvicinata su un punto della stanza.
   *
   * Il bersaglio serve già a due cose — cliccare e contornare — e adesso
   * a una terza: dice quanto è grosso quello che si sta guardando, e
   * quindi da quanto lontano ci sta dentro tutto. Le scatole invisibili
   * sono tirate larghe apposta per essere cliccabili da sette metri, e
   * di questo tiene conto la `stretta` di ogni punto (vedi `AFFACCI`).
   */
  #primoPiano(punto) {
    const bersaglio = this.puntiStanza.get(punto);
    const affaccio = AFFACCI[punto];

    if (!bersaglio || !affaccio) return null;

    // Il bersaglio può non essere mai stato disegnato — si arriva qui
    // anche subito dopo l'arredamento, prima del primo fotogramma — e
    // una scatola calcolata su una matrice vecchia sta nel posto
    // sbagliato.
    bersaglio.updateWorldMatrix(true, false);

    const scatola = new THREE.Box3().setFromObject(bersaglio);
    const centro = scatola.getCenter(new THREE.Vector3());
    const misura = scatola.getSize(new THREE.Vector3());

    centro.y += misura.y * (affaccio.alza ?? 0);

    const distanza =
      this.#distanzaPerInquadrare(
        Math.max(misura.x, misura.z) / 2,
        misura.y / 2
      ) * affaccio.stretta;

    const verso = new THREE.Vector3(...affaccio.verso).normalize();

    return {
      posizione: centro.clone().addScaledVector(verso, distanza),
      mira: centro
    };
  }

  /**
   * Lo stesso primo piano, ma dentro lo scaffale.
   *
   * Usa la stretta delle librerie e non una sua: è tutto il punto —
   * stessa frazione d'inquadratura di qua e di là dello scambio, quindi
   * stessa misura dei volumi sullo schermo.
   */
  #primoPianoScaffale(sezione) {
    if (!this.sezioni) return null;

    const posa = this.#posa(Math.max(0, sezione));

    return {
      posizione: new THREE.Vector3(
        posa.mira.x,
        posa.posizione.y,
        this.distanza * AFFACCI.librerie.stretta
      ),
      mira: posa.mira
    };
  }

  #spegniLaMira() {
    if (!this.mirato) return;

    this.mirato = null;
    this.canvas.style.cursor = "default";
    this.evidenza.mira(null);
    this.alMirare?.(null);
    this.alMirareOggetto?.(null);
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
      // Un click mentre si sta volando salta alla fine: è la stessa
      // cortesia del bottone "Salta" sulla porta d'ingresso, e non serve
      // scriverla da nessuna parte perché è dove il dito è già.
      if (this.#saltaAvvicinamento()) return;

      if (!this.mirato) return;

      const d = this.mirato.userData;

      // Un libro ha `serie`, un oggetto della stanza ha `punto`: le due
      // forme non si mescolano, così chi ascolta sa sempre cosa gli è
      // arrivato senza doverlo dedurre.
      //
      // Il libro si sceglie e basta — è già a mezzo metro dagli occhi.
      // Al punto della stanza invece ci si va: l'azione la fa partire
      // l'arrivo, non il click.
      if (d.serie) this.alScegliere?.(d.serie);
      else if (d.punto) this.avvicinatiA(d.punto);
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

    // Un `ResizeObserver` consegna una prima misura appena gli si dà
    // qualcosa da osservare, e quella misura è la stessa che il
    // costruttore ha già usato. Uscire subito quando non è cambiato
    // niente non è un'ottimizzazione: qui sotto si interrompono le
    // sequenze in corso, e una riemersione che parte mentre la stanza si
    // arreda verrebbe uccisa da un ridimensionamento che non è avvenuto.
    if (larghezza === this.larghezzaVista && altezza === this.altezzaVista) return;

    this.larghezzaVista = larghezza;
    this.altezzaVista = altezza;

    // La sequenza è stata calcolata sulle proporzioni di prima: le
    // distanze d'inquadratura dipendono dall'aspetto, e proseguire
    // porterebbe la telecamera in un posto che non è più quello giusto.
    // Si arriva subito e si riparte dalle misure nuove.
    this.avvicinamento?.concludi();

    this.renderer.setSize(larghezza, altezza, false);
    // In pixel di CSS: il composer si moltiplica da sé per il rapporto
    // di pixel che il renderer aveva quando è nato.
    this.composer.setSize(larghezza, altezza);
    this.camera.aspect = larghezza / altezza;
    this.camera.updateProjectionMatrix();

    // Cambiando la vista cambia il bersaglio su cui l'ombra è disegnata:
    // quella vecchia è di una misura che non esiste più.
    this.#rinfrescaOmbre();

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

    // Durante l'avvicinamento la telecamera ha un padrone solo, e il
    // puntatore non mira niente: mirare vorrebbe dire accendere il
    // contorno di un mobile mentre gli si sta volando addosso, e
    // ritrovarsi con l'etichetta di un oggetto che nel frattempo non
    // esiste più.
    if (this.avvicinamento.inCorso) {
      this.avvicinamento.aggiorna(dt);
    } else {
      this.#aggiornaViaggio();
      this.#aggiornaMira();
    }

    this.#aggiornaLibri(dt);
    this.#aggiornaPulviscolo(dt);
    // Il mare. È l'unica cosa della stanza che si muove sempre, anche
    // quando non si tocca niente — e costa due `offset` di texture.
    this.finestra?.aggiorna(dt);
    this.evidenza.aggiorna(dt);
    this.bibliotecario?.aggiorna(dt);

    this.composer.render(dt);
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

    // Dentro lo scaffale a rispondere al puntatore è il libro, che esce
    // dal ripiano: lì l'evidenza non c'entra e va tenuta spenta.
    this.evidenza.mira(allaSoglia ? nuovo : null);

    // Chi sta dietro a un bancone e ti vede arrivare alza la mano. Il
    // contorno d'ottone dice «questo si clicca»; il saluto dice «c'è
    // qualcuno», che è un'altra cosa e la dice meglio di qualunque
    // etichetta.
    if (allaSoglia && nuovo?.userData.punto === "bibliotecario") {
      this.bibliotecario?.saluta();
    }

    if (allaSoglia) this.alMirareOggetto?.(nuovo ? nuovo.userData.punto : null);
    else this.alMirare?.(nuovo ? nuovo.userData.serie : null);
  }

  /**
   * Ogni libro insegue la propria posizione di riposo o di sporgenza.
   *
   * L'inseguimento è esponenziale e legato al tempo trascorso, non ai
   * fotogrammi: così il movimento dura lo stesso su uno schermo a 60 e
   * su uno a 144, invece di essere il doppio più veloce.
   *
   * Sopra ci sta l'apertura, che è tutt'altra cosa: non insegue niente,
   * la sua posizione gliela detta l'avvicinamento (`this.apertura`), e
   * ogni volume ha il suo ritardo, così la sezione si apre a ventaglio
   * dal centro invece che tutta in un colpo. Ad apertura piena — cioè
   * sempre, tranne durante l'entrata — il conto si salta del tutto.
   */
  #aggiornaLibri(dt) {
    if (this.sezioneCorrente === -1) return;

    const velocita = 1 - Math.exp(-11 * dt);
    const spalancato = this.apertura >= 1;

    for (const libro of this.libri) {
      const d = libro.userData;
      const obiettivo = libro === this.mirato ? SPORGENZA : 0;

      d.sporgenza += (obiettivo - d.sporgenza) * velocita;

      if (Math.abs(d.sporgenza) < 0.0005 && obiettivo === 0) {
        d.sporgenza = 0;
      }

      // Quanto è ancora dentro al mobile. La finestra di ogni volume è
      // lunga `1 - SCAGLIONE` e comincia in ritardo sulla sua distanza
      // dal centro dello scaffale.
      const chiuso = spalancato
        ? 0
        : 1 -
          passoDolce(
            Math.min(
              1,
              Math.max(0, (this.apertura - d.ritardo * SCAGLIONE) / (1 - SCAGLIONE))
            )
          );

      libro.position.z = d.riposoZ + d.sporgenza - RIENTRO * chiuso;

      // Uscendo il libro si raddrizza verso chi guarda: è il gesto di
      // chi tira fuori un volume dallo scaffale per guardarlo meglio.
      // Quello che sta ancora dentro è girato dalla parte opposta, come
      // un volume spinto in fondo al ripiano.
      const quota = d.sporgenza / SPORGENZA;

      libro.rotation.y =
        ROTAZIONE_RIPOSO * (1 - quota * 0.85) + ROTAZIONE_RIENTRO * chiuso;
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

    // Il mixer d'animazione tiene una cache legata alla radice del
    // modello: non è un buffer video, ma sopravvive alla scena e in
    // modalità rigorosa (monta, smonta, rimonta) se ne accumulerebbe una
    // per giro.
    this.bibliotecario?.smaltisci();

    // La catena dei passaggi ha bersagli di rendering suoi, che
    // `renderer.dispose()` non conosce e non libererebbe.
    this.evidenza.smaltisci();
    this.passoScena.dispose();
    this.passoResa.dispose();
    this.composer.dispose();

    this.#svuotaLibri();

    // I modelli scaricati li smaltisce il magazzino, una volta sola:
    // geometrie e materiali sono condivisi fra tutte le copie (otto
    // librerie, una geometria), e liberarli copia per copia
    // significherebbe lavorare su buffer già chiusi. Qui restano solo i
    // pezzi costruiti a mano — pareti, copertine, bersagli.
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

    this.geometriaLibro.dispose();
    this.geometriaCopertina.dispose();
    this.materialeCarta.dispose();

    for (const materiale of [
      this.materialeLegno,
      this.materialeLegnoPavimento,
      this.materialeParquet,
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
      materiale === this.materialeParquet ||
      materiale === this.materialeIntonaco ||
      materiale === this.materialeOttone ||
      materiale === this.materialeCarta
    );
  }
}
