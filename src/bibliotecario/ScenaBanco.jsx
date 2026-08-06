import { useEffect, useRef } from "react";

/**
 * Il banco, ricostruito attorno a chi ci sta dietro.
 *
 * La prima versione metteva il bibliotecario a figura intera su un fondo
 * dipinto in CSS, e non funzionava: un chibi alto un metro e settanta
 * ritagliato in mezzo allo schermo è un pupazzo, non una persona a cui
 * si sta chiedendo una cosa. Quello che mancava era il mobile — è il
 * bancone a dire che lui *lavora* lì, ed è lui a tagliargli le gambe,
 * che è esattamente il motivo per cui nella stanza funzionava.
 *
 * Quindi qui non c'è un ritratto sopra un fondale: c'è il pezzo di
 * biblioteca in cui si sta. Parete con boiserie, insegna accesa, bancone,
 * e lui dietro sulla sua pedana. Le misure sono le stesse della stanza
 * (`tre/bancone.js`), i colori pure (`tre/tinte.js`) e l'insegna è
 * proprio la stessa funzione che la disegna là: se un giorno il legno
 * cambia tono, cambia in tutti e due i posti.
 *
 *
 * PERCHÉ UNA SCENA E NON UN FOTOGRAMMA RUBATO ALLA STANZA
 *
 * Perché la stanza è già morta quando questa pagina nasce: uscendo, il
 * suo contesto WebGL viene rilasciato apposta — un browser ne concede
 * pochi, e non restituirli significa ritrovarsi la stanza nera dopo
 * cinque giri. Si sarebbe potuto catturare l'ultimo fotogramma prima di
 * andarsene, ma sarebbe stata un'immagine ferma, e qui il personaggio
 * deve respirare mentre parla.
 *
 * I modelli sono già nella cache del browser — li ha scaricati la stanza
 * pochi secondi fa — quindi il costo vero è il contesto WebGL, e ne
 * resta vivo uno solo alla volta.
 *
 *
 * L'INQUADRATURA
 *
 * Non è scelta a occhio: è risolta da due vincoli. La testa deve stare
 * al 12% dall'alto, e il piano del bancone al 68% — cioè appena sopra il
 * riquadro di dialogo, così il riquadro sembra posato sul banco invece
 * che incollato sullo schermo. Da lì escono la quota e la distanza della
 * telecamera, e restano giuste a qualunque proporzione di finestra
 * perché è l'altezza a comandare (vedi `ridimensiona`).
 */

/* ==================================================
   LE MISURE, in unità di scena
   Qui una persona è alta 2,6 e vale un metro e settanta: la stessa
   scala della stanza (vedi `tre/modelli.js`).
   ================================================== */

const UNITA_PER_METRO = 2.6 / 1.7;
const metri = (quanti) => quanti * UNITA_PER_METRO;

const ALTEZZA_PERSONA = 2.6;

// Le stesse due misure di `tre/bancone.js`: un banco vero e il gradino
// che ci vuole dietro perché di un chibi non spunti solo la testa.
const ALTEZZA_BANCO = metri(0.88);
const ALTEZZA_PEDANA = metri(0.26);

const PROFONDITA_BANCO = metri(0.62);
const LARGHEZZA_BANCO = 14;

// Quanto sta indietro lui rispetto al banco, e quanto sta indietro la
// parete rispetto a lui.
const Z_BANCO = metri(0.78);
const Z_PARETE = -metri(1.6);

// Dove finiscono in inquadratura i due punti che decidono tutto, in
// frazione di mezzo schermo dal centro: positivo in alto.
const TESTA_IN_ALTO = 0.76; // → 12% dal bordo superiore
const BANCO_IN_BASSO = -0.36; // → 68% dall'alto, appena sopra il dialogo

const CAMPO = 34;

export default function ScenaBanco({ pensando = false, className = "" }) {
  const contenitore = useRef(null);

  useEffect(() => {
    const nodo = contenitore.current;

    if (!nodo) return undefined;

    let vivo = true;
    let smonta = null;

    // Tutto quanto serve arriva a richiesta: three pesa più di tutto il
    // resto del sito, e chi non passa mai dal banco non deve scaricarlo.
    Promise.all([
      import("three"),
      import("../tre/libraio"),
      import("../tre/indirizzi"),
      import("../tre/bancone"),
      import("../tre/tinte")
    ])
      .then(
        async ([
          THREE,
          { caricaBibliotecario },
          { BIBLIOTECARIO },
          { creaTexturaInsegna },
          tinte
        ]) => {
          if (!vivo) return;

          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.12;
          renderer.domElement.className = "block h-full w-full";

          nodo.appendChild(renderer.domElement);

          const scena = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(CAMPO, 1, 0.1, 60);

          const legno = new THREE.MeshStandardMaterial({
            color: tinte.COLORE_LEGNO,
            roughness: 0.82,
            metalness: 0.05
          });

          const intonaco = new THREE.MeshStandardMaterial({
            color: tinte.COLORE_INTONACO,
            roughness: 0.96,
            metalness: 0
          });

          const ottone = new THREE.MeshStandardMaterial({
            color: tinte.COLORE_OTTONE,
            roughness: 0.32,
            metalness: 0.75
          });

          const smaltibili = [legno, intonaco, ottone];

          /* ---- La parete ---- */

          const parete = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), intonaco);
          parete.position.set(0, 8, Z_PARETE);
          parete.receiveShadow = true;
          scena.add(parete);

          // La boiserie: un rivestimento di legno fino all'altezza del
          // banco, come in ogni sala di lettura mai costruita. È anche
          // quello che impedisce alla parete di leggersi come un fondale
          // di carta dietro a un mobile.
          const boiserie = new THREE.Mesh(
            new THREE.BoxGeometry(30, ALTEZZA_BANCO * 1.35, 0.14),
            legno
          );
          boiserie.position.set(0, (ALTEZZA_BANCO * 1.35) / 2, Z_PARETE + 0.08);
          boiserie.receiveShadow = true;
          scena.add(boiserie);

          const listello = new THREE.Mesh(new THREE.BoxGeometry(30, 0.12, 0.24), legno);
          listello.position.set(0, ALTEZZA_BANCO * 1.35, Z_PARETE + 0.14);
          scena.add(listello);

          /* ---- L'insegna, la stessa della stanza ---- */

          const insegnaLarghezza = metri(1.75);
          const insegnaAltezza = metri(0.62);
          const insegnaY = metri(2.55);

          const cornice = new THREE.Mesh(
            new THREE.BoxGeometry(insegnaLarghezza + 0.12, insegnaAltezza + 0.12, 0.06),
            ottone
          );
          cornice.position.set(0, insegnaY, Z_PARETE + 0.1);
          scena.add(cornice);

          const targa = new THREE.MeshBasicMaterial({
            map: creaTexturaInsegna(insegnaLarghezza, insegnaAltezza)
          });

          const insegna = new THREE.Mesh(
            new THREE.PlaneGeometry(insegnaLarghezza, insegnaAltezza),
            targa
          );
          insegna.position.set(0, insegnaY, Z_PARETE + 0.14);
          scena.add(insegna);
          smaltibili.push(targa);

          /* ---- Il bancone ---- */

          const corpo = new THREE.Mesh(
            new THREE.BoxGeometry(LARGHEZZA_BANCO, ALTEZZA_BANCO, PROFONDITA_BANCO),
            legno
          );
          corpo.position.set(0, ALTEZZA_BANCO / 2, Z_BANCO);
          corpo.castShadow = true;
          corpo.receiveShadow = true;
          scena.add(corpo);

          // Il piano, che sporge davanti al corpo: è la sporgenza a far
          // leggere il banco come un banco invece che come un muretto.
          const piano = new THREE.Mesh(
            new THREE.BoxGeometry(LARGHEZZA_BANCO + 0.1, 0.14, PROFONDITA_BANCO + 0.34),
            legno
          );
          piano.position.set(0, ALTEZZA_BANCO + 0.07, Z_BANCO + 0.08);
          piano.castShadow = true;
          scena.add(piano);

          // Il filo d'ottone lungo lo spigolo: prende la luce calda ed è
          // la riga che separa il banco dal buio del riquadro sotto.
          const filo = new THREE.Mesh(
            new THREE.BoxGeometry(LARGHEZZA_BANCO + 0.1, 0.05, 0.05),
            ottone
          );
          filo.position.set(0, ALTEZZA_BANCO + 0.14, Z_BANCO + PROFONDITA_BANCO / 2 + 0.16);
          scena.add(filo);

          const pedana = new THREE.Mesh(
            new THREE.BoxGeometry(LARGHEZZA_BANCO * 0.6, ALTEZZA_PEDANA, metri(1.1)),
            legno
          );
          pedana.position.set(0, ALTEZZA_PEDANA / 2, 0);
          pedana.receiveShadow = true;
          scena.add(pedana);

          /* ---- Le luci ----
             Le stesse della stanza e nelle stesse proporzioni: la calda
             da sinistra che domina, una frontale che tiene leggibile la
             faccia, un accenno freddo di rimbalzo. Cambiarle qui vuol
             dire che il bibliotecario ha un altro colore da questa parte
             della porta. */

          scena.add(new THREE.HemisphereLight(0xfff6e8, 0xa78a63, 1.35));

          const calda = new THREE.DirectionalLight(0xffe6bd, 1.9);
          calda.position.set(-3, 5, 4);
          scena.add(calda);

          const frontale = new THREE.DirectionalLight(0xfff4e0, 0.6);
          frontale.position.set(0.8, 2.4, 6);
          scena.add(frontale);

          const fredda = new THREE.DirectionalLight(0x9fb4ff, 0.5);
          fredda.position.set(4, 2, -2);
          scena.add(fredda);

          // I due faretti sull'insegna, come là: sono loro a farla
          // leggere come accesa invece che come un quadro appeso.
          for (const lato of [-1, 1]) {
            const faretto = new THREE.PointLight(0xffd9a0, 4.5, metri(3.4), 2);
            faretto.position.set(lato * insegnaLarghezza * 0.4, insegnaY + 0.6, Z_PARETE + 1);
            scena.add(faretto);
          }

          // La lampada sul banco: dà un centro caldo al mobile, che
          // altrimenti è una fascia di legno uniforme.
          const lume = new THREE.PointLight(0xffb454, 6, metri(4), 2);
          lume.position.set(-2.4, ALTEZZA_BANCO + 0.9, Z_BANCO);
          scena.add(lume);

          /* ---- Lui ---- */

          const libraio = await caricaBibliotecario({
            url: BIBLIOTECARIO,
            x: 0,
            y: ALTEZZA_PEDANA,
            z: 0
          });

          if (!vivo) {
            renderer.dispose();
            renderer.forceContextLoss();
            return;
          }

          scena.add(libraio.gruppo);

          // Alza la mano appena ci si affaccia. Non subito: mezzo
          // secondo di ritardo perché la pagina si sta ancora
          // accendendo dal nero, e un saluto dato al buio è un saluto
          // sprecato.
          const benvenuto = setTimeout(() => libraio.saluta(), 500);

          /* ---- L'inquadratura ----
             Due vincoli, due incognite: dove sta la telecamera in alto e
             quanto è lontana. Risolti qui invece che tarati a occhio, che
             è come la prima versione si era ritrovata una persona intera
             sospesa in mezzo al niente. */

          const testaY = ALTEZZA_PEDANA + ALTEZZA_PERSONA;
          const bancoY = ALTEZZA_BANCO + 0.14;

          const t = Math.tan((CAMPO * Math.PI) / 360);

          // testaY − cy = TESTA_IN_ALTO · t · (cz − 0)
          // bancoY − cy = BANCO_IN_BASSO · t · (cz − Z_BANCO)
          const a = TESTA_IN_ALTO * t;
          const b = BANCO_IN_BASSO * t;

          const cz = (testaY - bancoY - b * Z_BANCO) / (a - b);
          const cy = testaY - a * cz;

          camera.position.set(0, cy, cz);
          camera.lookAt(0, cy, 0);

          const ridimensiona = () => {
            const larghezza = nodo.clientWidth;
            const altezza = nodo.clientHeight;

            if (!larghezza || !altezza) return;

            renderer.setSize(larghezza, altezza, false);
            camera.aspect = larghezza / altezza;
            camera.updateProjectionMatrix();
          };

          ridimensiona();

          const osservatore = new ResizeObserver(ridimensiona);
          osservatore.observe(nodo);

          const orologio = new THREE.Clock();
          let fotogramma = 0;

          const disegna = () => {
            if (!vivo) return;

            fotogramma = requestAnimationFrame(disegna);

            libraio.aggiorna(Math.min(orologio.getDelta(), 0.1));
            renderer.render(scena, camera);
          };

          disegna();

          smonta = () => {
            cancelAnimationFrame(fotogramma);
            clearTimeout(benvenuto);
            osservatore.disconnect();

            libraio.smaltisci();

            scena.traverse((oggetto) => {
              if (oggetto.isMesh) oggetto.geometry?.dispose();
            });

            for (const materiale of smaltibili) {
              materiale.map?.dispose();
              materiale.dispose();
            }

            // I materiali del modello li ha creati il caricatore e sono
            // suoi: si smaltiscono percorrendolo, non dall'elenco qui
            // sopra, che contiene solo quelli costruiti a mano.
            libraio.gruppo.traverse((oggetto) => {
              if (!oggetto.isMesh) return;

              for (const materiale of [oggetto.material].flat()) {
                materiale?.map?.dispose();
                materiale?.dispose();
              }
            });

            // Senza questo il contesto resta appeso, e dopo qualche
            // apertura il browser smette di concederne di nuovi — cioè
            // la stanza smette di disegnarsi.
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
          };
        }
      )
      .catch((e) => {
        // Un banco che non arriva non è un guasto: la conversazione
        // funziona lo stesso, e sotto resta il fondale dipinto.
        console.error("Il banco non si è alzato:", e);
      });

    return () => {
      vivo = false;
      smonta?.();
    };
  }, []);

  return (
    <div
      // Niente `relative` cucito qui dentro: chi usa questa scena la
      // vuole a tutta pagina, cioè `absolute inset-0`, e le due classi
      // messe insieme non fanno quello che sembra — vince quella che sta
      // più in fondo al foglio di stile generato, non quella scritta per
      // ultima, e per Tailwind `relative` viene dopo `absolute`. Il
      // risultato era una scena in mezzo al flusso, alta quanto capitava.
      className={className}
      // La scena è scenografia: quello che il bibliotecario dice sta nel
      // riquadro accanto, e un lettore di schermo che annunciasse
      // «immagine» interromperebbe la lettura della battuta per niente.
      aria-hidden="true"
    >
      <div ref={contenitore} className="h-full w-full" />

      {/* L'alone che si accende mentre sta cercando. Sopra il canvas e
          non dentro la scena: una luce vera costerebbe un altro passaggio
          di ombre per un effetto che vive due secondi. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-1/4 top-0 blur-[90px] transition-opacity duration-slow
                    ${pensando ? "bg-brass-400/20 opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
