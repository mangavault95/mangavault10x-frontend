import { useEffect, useRef } from "react";

/**
 * Il bibliotecario, in carne e poligoni.
 *
 * È lo stesso modello che sta dietro il banco nella stanza — non un
 * disegno che gli somiglia, proprio lui, stesso file e stessa posa (vedi
 * `tre/libraio.js`). Era l'unica scelta possibile: si arriva qui dopo
 * che la telecamera si è fermata a mezzo metro dalla sua faccia, e
 * trovare un ritratto diverso da quella faccia romperebbe tutto quello
 * che l'avvicinamento aveva appena costruito.
 *
 *
 * PERCHÉ UNA SCENA SUA E NON UN FOTOGRAMMA RUBATO ALLA STANZA
 *
 * Perché la stanza è già morta quando questa pagina nasce: uscendo, il
 * suo contesto WebGL viene rilasciato apposta (un browser ne concede
 * pochi, e non restituirli significa ritrovarsi la stanza nera dopo
 * cinque giri). Ci sarebbe stato modo di catturare un'immagine
 * dell'ultimo fotogramma prima di andarsene, ma sarebbe stata
 * un'immagine ferma, e qui il personaggio deve respirare mentre parla.
 *
 * Il modello è già nella cache del browser — è stato scaricato dalla
 * stanza pochi secondi fa — quindi il costo vero è il contesto WebGL, e
 * uno solo alla volta è vivo.
 *
 *
 * COSA FA E COSA NON FA
 *
 * Respira, e si gira appena verso chi parla. Non ha espressioni e non
 * muove la bocca: il pacchetto tiene le animazioni in un file a parte
 * pensato per un rig condiviso, e trascinarsi dietro il retargeting per
 * far dire «sì» a un chibi non vale il peso. Quello che serve — che sia
 * vivo — lo fa l'oscillazione.
 */

const ALTEZZA = 2.6;

// Quanto della figura si inquadra. 1.05 tiene tutta la persona con un
// filo d'aria sopra la testa: è la stessa figura intera che si vedeva
// dietro il banco, non un mezzobusto — di un chibi il mezzobusto è
// quasi tutta testa.
const INQUADRATURA = 1.05;

export default function Ritratto({ pensando = false, className = "" }) {
  const contenitore = useRef(null);

  useEffect(() => {
    const nodo = contenitore.current;

    if (!nodo) return undefined;

    let vivo = true;
    let smonta = null;

    // Tutto quanto serve arriva a richiesta: three pesa più di tutto il
    // resto del sito, e chi non apre mai il banco non deve scaricarlo.
    // (La home lo fa comunque, ma da qui ci si può arrivare anche
    // scrivendo l'indirizzo.)
    Promise.all([
      import("three"),
      import("./../tre/libraio"),
      import("./../tre/indirizzi")
    ])
      .then(async ([THREE, { caricaBibliotecario }, { BIBLIOTECARIO }]) => {
        if (!vivo) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.domElement.className = "block h-full w-full";

        nodo.appendChild(renderer.domElement);

        const scena = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);

        // Le stesse luci della stanza, nelle stesse proporzioni: la
        // calda che viene da sinistra e domina, una frontale che tiene
        // leggibile la faccia, e un accenno freddo di rimbalzo. Cambiare
        // qui vuol dire che il bibliotecario ha un altro colore da questa
        // parte della porta.
        scena.add(new THREE.HemisphereLight(0xfff6e8, 0xa78a63, 1.5));

        const calda = new THREE.DirectionalLight(0xffe6bd, 2.1);
        calda.position.set(-2.4, 3, 3);
        scena.add(calda);

        const frontale = new THREE.DirectionalLight(0xfff4e0, 0.7);
        frontale.position.set(0.6, 1, 4);
        scena.add(frontale);

        const fredda = new THREE.DirectionalLight(0x9fb4ff, 0.55);
        fredda.position.set(3, 1.5, -2);
        scena.add(fredda);

        const libraio = await caricaBibliotecario({
          url: BIBLIOTECARIO,
          x: 0,
          y: -ALTEZZA / 2,
          z: 0
        });

        if (!vivo) {
          renderer.dispose();
          renderer.forceContextLoss();
          return;
        }

        scena.add(libraio.gruppo);

        const ridimensiona = () => {
          const larghezza = nodo.clientWidth;
          const altezza = nodo.clientHeight;

          if (!larghezza || !altezza) return;

          renderer.setSize(larghezza, altezza, false);
          camera.aspect = larghezza / altezza;

          // La distanza si calcola, non si sceglie: il riquadro è alto e
          // stretto su un telefono e basso e largo su un monitor, e un
          // numero fisso taglierebbe la testa in un caso o farebbe un
          // francobollo nell'altro.
          const mezzoAngolo = (camera.fov * Math.PI) / 360;
          const perAltezza = (ALTEZZA / 2) * INQUADRATURA / Math.tan(mezzoAngolo);
          const perLarghezza =
            (ALTEZZA / 2.9) * INQUADRATURA / (Math.tan(mezzoAngolo) * camera.aspect);

          camera.position.set(0, 0, Math.max(perAltezza, perLarghezza));
          camera.lookAt(0, 0, 0);
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
          osservatore.disconnect();

          scena.traverse((oggetto) => {
            if (!oggetto.isMesh) return;

            oggetto.geometry?.dispose();

            for (const materiale of [oggetto.material].flat()) {
              materiale?.map?.dispose();
              materiale?.dispose();
            }
          });

          // Senza questo il contesto resta appeso, e dopo qualche
          // apertura il browser smette di concederne di nuovi — cioè la
          // stanza smette di disegnarsi.
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      })
      .catch((e) => {
        // Un ritratto che non arriva non è un guasto: la conversazione
        // funziona lo stesso, e sotto resta la sagoma disegnata.
        console.error("Il bibliotecario non si è presentato:", e);
      });

    return () => {
      vivo = false;
      smonta?.();
    };
  }, []);

  return (
    <div
      className={`relative ${className}`}
      // Il personaggio è decorazione: quello che dice sta nel testo
      // accanto, e un lettore di schermo che annunciasse «immagine»
      // interromperebbe la lettura della battuta per niente.
      aria-hidden="true"
    >
      {/* L'alone dietro di lui: lo stacca dal fondo senza bisogno di un
          contorno, e diventa più vivo mentre sta cercando. */}
      <div
        className={`absolute inset-x-0 bottom-0 top-1/4 rounded-full blur-[70px] transition-all duration-slow
                    ${pensando ? "bg-brass-400/25" : "bg-brass-500/12"}`}
      />

      <div ref={contenitore} className="relative h-full w-full" />
    </div>
  );
}
