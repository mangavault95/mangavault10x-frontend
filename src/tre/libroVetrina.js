import * as THREE from "three";

/**
 * Un solo libro, in vetrina.
 *
 * Non è un pezzo di `scena.js`: quella è la Biblioteca, fatta per
 * camminarci dentro fra sezioni fisse. Qui serve l'opposto — un oggetto
 * solo, da girare in mano. Ruota da sé finché nessuno lo tocca, e si
 * lascia trascinare quando qualcuno lo fa; un trascinamento troppo
 * piccolo per essere un gesto vero conta come un click.
 */
export default class LibroVetrina {
  constructor(contenitore, { copertina, alClick }) {
    this.contenitore = contenitore;
    this.alClick = alClick;
    this.vivo = true;

    this.canvas = document.createElement("canvas");
    // `touch-pan-y` e non `touch-none`: il libro si gira col dito in
    // orizzontale, ma la pagina sotto deve restare scorribile in
    // verticale. Con `touch-none` un pollice appoggiato sul libro
    // bloccava lo scorrimento della collezione, ed è un vicolo cieco che
    // capita a chiunque scorra tenendo il dito al centro dello schermo.
    this.canvas.className =
      "block h-full w-full cursor-grab touch-pan-y active:cursor-grabbing";
    contenitore.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    this.camera.position.set(0, 0, 4.2);

    this.scena.add(new THREE.AmbientLight(0xffffff, 1.3));

    const lampada = new THREE.DirectionalLight(0xfff4e0, 1.5);
    lampada.position.set(2, 3, 4);
    this.scena.add(lampada);

    const retro = new THREE.DirectionalLight(0x8fa6ff, 0.5);
    retro.position.set(-3, -1, -2);
    this.scena.add(retro);

    const materialeCarta = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.92 });

    this.materialeCopertina = new THREE.MeshStandardMaterial({
      color: 0x3a3226,
      roughness: 0.55,
      metalness: 0.04
    });

    // Stesso ordine facce di `scena.js`: la quinta è quella rivolta a
    // chi guarda a riposo. La sesta (il retro) usa la stessa copertina
    // invece della carta bianca: un libro vero mostra il dorso quando
    // giri le spalle, ma qui non c'è un dorso disegnato a parte, e la
    // pagina bianca vista girando il libro sembrava un pezzo mancante
    // più che un dettaglio realistico.
    const materiali = [
      materialeCarta,
      materialeCarta,
      materialeCarta,
      materialeCarta,
      this.materialeCopertina,
      this.materialeCopertina
    ];

    this.libro = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.24), materiali);
    this.libro.rotation.y = -0.4;
    this.scena.add(this.libro);

    this.rotazioneAutomatica = 0.15; // rad/s a riposo
    this.velocita = 0; // rad/s residua del trascinamento
    this.trascinando = false;
    this.mossoAbbastanza = false;
    this.ultimoX = 0;

    this.orologio = new THREE.Clock();

    if (copertina) this.#caricaCopertina(copertina);

    this.#collegaEventi();
    this.ridimensiona();
    this.#disegna();
  }

  #caricaCopertina(url) {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        if (!this.vivo) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        this.materialeCopertina.map = texture;
        this.materialeCopertina.color.set(0xffffff);
        this.materialeCopertina.needsUpdate = true;
      },
      undefined,
      () => {
        /* copertina irraggiungibile: resta il dorso di carta scura */
      }
    );
  }

  #collegaEventi() {
    this.alGiu = (e) => {
      this.trascinando = true;
      this.mossoAbbastanza = false;
      this.ultimoX = e.clientX;
      this.velocita = 0;
      this.canvas.setPointerCapture?.(e.pointerId);
    };

    this.alMuovi = (e) => {
      if (!this.trascinando) return;

      const dx = e.clientX - this.ultimoX;
      this.ultimoX = e.clientX;

      if (Math.abs(dx) > 2) this.mossoAbbastanza = true;

      this.velocita = dx * 0.014;
      this.libro.rotation.y += this.velocita;
    };

    this.alSu = () => {
      if (!this.trascinando) return;

      this.trascinando = false;

      // Se non si è mosso abbastanza per essere un trascinamento, era
      // un click: apre la scheda della serie.
      if (!this.mossoAbbastanza) this.alClick?.();
    };

    this.canvas.addEventListener("pointerdown", this.alGiu);
    this.canvas.addEventListener("pointermove", this.alMuovi);
    this.canvas.addEventListener("pointerup", this.alSu);
    this.canvas.addEventListener("pointercancel", this.alSu);

    this.osservatore = new ResizeObserver(() => this.ridimensiona());
    this.osservatore.observe(this.contenitore);
  }

  ridimensiona() {
    const larghezza = this.contenitore.clientWidth;
    const altezza = this.contenitore.clientHeight;

    if (!larghezza || !altezza) return;

    this.renderer.setSize(larghezza, altezza, false);
    this.camera.aspect = larghezza / altezza;
    this.camera.updateProjectionMatrix();
  }

  #disegna = () => {
    if (!this.vivo) return;

    this.fotogramma = requestAnimationFrame(this.#disegna);

    const dt = Math.min(this.orologio.getDelta(), 0.1);

    if (!this.trascinando) {
      // L'attrito spegne la spinta del trascinamento; sotto la
      // rotazione riprende da sola, così il libro non si ferma mai.
      this.velocita *= Math.max(0, 1 - dt * 4);
      this.libro.rotation.y += this.rotazioneAutomatica * dt + this.velocita;
    }

    this.renderer.render(this.scena, this.camera);
  };

  distruggi() {
    this.vivo = false;

    cancelAnimationFrame(this.fotogramma);

    this.canvas.removeEventListener("pointerdown", this.alGiu);
    this.canvas.removeEventListener("pointermove", this.alMuovi);
    this.canvas.removeEventListener("pointerup", this.alSu);
    this.canvas.removeEventListener("pointercancel", this.alSu);

    this.osservatore?.disconnect();

    this.libro.geometry.dispose();
    this.materialeCopertina.map?.dispose();
    this.materialeCopertina.dispose();

    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.canvas.remove();
  }
}
