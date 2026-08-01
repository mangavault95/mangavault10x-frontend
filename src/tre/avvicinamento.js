/**
 * Come ci si muove fra la stanza e quello che c'è dentro.
 *
 * Prima era uno stacco: si cliccava un mobile e la pagina cambiava, o —
 * per lo scaffale — la stanza si spegneva e lo scaffale si accendeva
 * nello stesso fotogramma. Un menu travestito da stanza.
 *
 * Qui invece ogni punto della stanza si raggiunge andandoci. La
 * telecamera attraversa lo spazio, arriva addosso all'oggetto, e solo
 * allora succede qualcosa. È la grammatica di un punta e clicca: non si
 * apre una finestra sopra il gioco, ci si sposta dentro al gioco.
 *
 *
 * TRE MOSSE
 *
 * **`attraversa`** — dalla stanza allo scaffale dei volumi e ritorno. È
 * l'unico caso in cui di là c'è un altro luogo in tre dimensioni, e
 * l'unico in tre tempi: ci si avvicina, si sta un istante fermi al buio
 * mentre i due mondi si scambiano, e si riapre sull'altro.
 *
 * **`accosta`** — verso un oggetto che di là ha una pagina: la cassa, la
 * bacheca, il tavolino, il bibliotecario. Un tempo solo, che finisce al
 * buio: la pagina si riaccende da lì, e il buio è la giuntura.
 *
 * **`riemergi`** — il contrario. Si torna nella stanza e non si ricomincia
 * dalla porta: si riapre gli occhi addosso all'oggetto da cui si era
 * usciti e si arretra fino alla soglia. È questa mossa, più di ogni
 * altra, a far sembrare la stanza un posto invece che una schermata:
 * uscire e rientrare non azzera niente.
 *
 *
 * PERCHÉ IL BUIO E NON UNA DISSOLVENZA
 *
 * Per lo scaffale è un obbligo: i due luoghi sono disegnati a due scale
 * diverse e occupano lo stesso spazio (il perché sta in `scena.js`), non
 * possono stare accesi insieme neanche per un fotogramma. Lo scambio è
 * per forza istantaneo, e l'unica cosa che si può scegliere è quando
 * farlo cadere. Lo si fa cadere nel momento in cui i due mondi si
 * somigliano di più — la telecamera a un passo dai libri, sullo schermo
 * solo legno e copertine — e mentre la luce è al minimo.
 *
 * Le misure aiutano più di quanto sembri: inquadrate per intero, le
 * vetrine della stanza e una sezione dello scaffale mostrano un volume
 * alto il 12% e uno il 14% dello schermo. Arrivando allo scambio con la
 * stessa frazione d'inquadratura, il libro che c'era prima e quello che
 * c'è dopo hanno la stessa misura: cambia cosa c'è sulla copertina, non
 * la geometria.
 *
 * Per le pagine il buio serve a un'altra cosa: è l'unico posto in cui il
 * canvas e il DOM possono darsi il cambio senza che si veda. La stanza
 * si spegne, la pagina si accende, e in mezzo non c'è nessun fotogramma
 * in cui si vedano tutte e due.
 *
 *
 * LA LUCE
 *
 * Non è un velo sopra il canvas né un passaggio in più nella catena: è
 * `toneMappingExposure`, un numero solo che `OutputPass` legge dal
 * renderer a ogni fotogramma. Costa zero e scurisce l'immagine com'è
 * giusto che si scurisca — comprimendo le luci, non spalmandoci sopra
 * del nero.
 */

/* ==================================================
   I TEMPI, in millesimi
   ================================================== */

// Il passaggio verso lo scaffale, in tre tempi.
const AVVICINAMENTO = 1150;
const TRAPASSO = 90;
const APERTURA = 1350;

// L'accostata a un oggetto della stanza. Più corta dell'avvicinamento
// allo scaffale perché non deve attraversare mezza stanza — e perché in
// fondo c'è una pagina da leggere, non un panorama da guardare.
const ACCOSTATA = 1000;

// Il rientro. Più lungo dell'accostata: si esce da una pagina, e la
// stanza deve avere il tempo di ricomporsi attorno prima che si
// ricominci a cliccare.
const RIEMERSIONE = 1300;

// Da quanto prima e fino a quando dopo lo scambio si sta in penombra.
// Più larga della sosta, apposta: la luce cala mentre ci si muove
// ancora, così il buio non arriva insieme alla fermata.
const PENOMBRA = 420;

// Quanta luce resta nel punto più fondo di un attraversamento.
const PENOMBRA_FONDO = 0.32;

// Quanto dura lo spegnimento in coda a un'accostata, e quanto ne resta
// alla fine. Non zero: a zero il canvas diventa un buco nero netto,
// mentre un ultimo filo di luce lascia intravedere la sagoma
// dell'oggetto sotto il velo della pagina che sta arrivando.
const SPEGNIMENTO = 560;
const BUIO = 0.05;

// Quanto ci mette la stanza a riaccendersi, rientrando. Più corto del
// movimento: la luce torna mentre si arretra ancora, non dopo.
const RISVEGLIO = 780;

/* ==================================================
   LE CURVE
   ================================================== */

// Parte e arriva ferma: è il movimento di chi si sposta di sua volontà
// da un punto a un altro.
const dolce = (t) => t * t * (3 - 2 * t);

/**
 * Come la precedente, ma con le due code più lunghe.
 *
 * Serve dove il movimento inverte il verso — dopo il trapasso la
 * telecamera *torna indietro*, si è arrivati a un passo dai libri e
 * adesso ci si scosta per vederli tutti. Una curva che parte lanciata
 * trasformerebbe quell'inversione in uno strappo: l'avvicinamento si è
 * appena fermato, e mezzo secondo di sosta seguito da uno scatto
 * all'indietro si sente eccome.
 *
 * Partendo da ferma non si sente niente: sembra un secondo movimento,
 * non il primo che rimbalza. La coda in fondo è quel «piano piano» che
 * fa posare le cose invece di farle arrivare.
 */
const morbida = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const fra = (valore, minimo, massimo) => Math.min(massimo, Math.max(minimo, valore));

/* ==================================================
   LA SEQUENZA
   ================================================== */

export class Avvicinamento {
  #camera;
  #renderer;
  #esposizione;
  #corsa = null;

  constructor({ camera, renderer }) {
    this.#camera = camera;
    this.#renderer = renderer;
    // Quella di riposo, letta una volta: è il valore a cui si torna
    // sempre, tranne quando si esce di scena apposta (vedi `accosta`).
    this.#esposizione = renderer.toneMappingExposure;
  }

  get inCorso() {
    return this.#corsa !== null;
  }

  /** Che mossa è in corso, o `null`. */
  get tipo() {
    return this.#corsa?.tipo ?? null;
  }

  /**
   * Riporta la luce dov'era.
   *
   * Esiste perché due cose in questo file spengono lo schermo e contano
   * su qualcun altro per riaccenderlo: l'accostata, che lo lascia spento
   * apposta (di lì in poi è della pagina), e chi si prepara a una
   * riemersione, che spegne *prima* che la sequenza esista — la stanza
   * ci mette qualche secondo ad arredarsi, e in quei secondi non si deve
   * vedere la soglia.
   *
   * Se poi la riemersione non parte — modelli non arrivati, o movimento
   * ridotto — quel buio non ha più nessuno che lo tolga. Questo lo
   * toglie.
   */
  riaccendi() {
    this.#renderer.toneMappingExposure = this.#esposizione;
  }

  /**
   * Dalla stanza allo scaffale dei volumi, o viceversa.
   *
   * @param sguardo    il vettore dove la scena tiene il punto guardato:
   *                   lo si scrive qui dentro invece di restituirlo, così
   *                   chi disegna non deve ricordarsi di ricopiarlo
   * @param partenza   dov'è la telecamera adesso, `{ posizione, mira }`
   * @param vicino     il primo piano nel mondo da cui si parte
   * @param arrivo     lo stesso primo piano, nel mondo in cui si sbuca
   * @param fine       l'inquadratura in cui ci si ferma
   * @param alTrapasso lo scambio dei due mondi, chiamato una volta sola
   * @param alMuovere  `{ tratta, t }` a ogni fotogramma, con `t` lineare:
   *                   l'attenuazione la mette chi ascolta, che sulla sua
   *                   roba vuole tempi suoi
   * @param alFinire   quando è tutto finito, comunque sia finito
   */
  attraversa({ sguardo, partenza, vicino, arrivo, fine, alTrapasso, alMuovere, alFinire }) {
    this.#avvia({
      tipo: "attraversa",
      durata: AVVICINAMENTO + TRAPASSO + APERTURA,
      sguardo,
      partenza,
      vicino,
      arrivo,
      fine,
      alTrapasso,
      alMuovere,
      alFinire
    });
  }

  /**
   * Verso un oggetto della stanza che di là ha una pagina.
   *
   * Finisce al buio e ci resta: la luce non torna da sola perché di lì
   * in poi lo schermo non è più suo. Se per qualunque motivo si restasse
   * qui — `alArrivare` non porta da nessuna parte, la pagina non si monta
   * — basta una mossa qualunque a riaccendere (vedi `#avvia`).
   */
  accosta({ sguardo, partenza, vicino, alArrivare, alMuovere, alFinire }) {
    this.#avvia({
      tipo: "accosta",
      durata: ACCOSTATA,
      sguardo,
      partenza,
      vicino,
      alTrapasso: alArrivare,
      alMuovere,
      alFinire
    });
  }

  /**
   * Il ritorno: si riapre gli occhi addosso all'oggetto e si arretra.
   *
   * Non c'è una `partenza` perché non si veniva da nessuna parte — la
   * scena è appena nata. Si comincia fermi al buio su `vicino`.
   */
  riemergi({ sguardo, vicino, fine, alMuovere, alFinire }) {
    this.#avvia({
      tipo: "riemergi",
      durata: RIEMERSIONE,
      sguardo,
      partenza: vicino,
      vicino,
      fine,
      alMuovere,
      alFinire
    });
  }

  #avvia(corsa) {
    // Qualunque mossa nuova riaccende: è la rete di sicurezza
    // dell'accostata, che di suo lascia lo schermo spento.
    this.#renderer.toneMappingExposure = this.#esposizione;

    this.#corsa = { ...corsa, tempo: 0, scambiato: false };

    // Un fotogramma di piazzamento subito, senza aspettare il ciclo: chi
    // riemerge deve trovarsi già addosso all'oggetto al primo disegno,
    // non alla soglia per un sedicesimo di secondo.
    this.aggiorna(0);
  }

  aggiorna(dt) {
    const corsa = this.#corsa;

    if (!corsa) return;

    corsa.tempo += dt * 1000;

    if (corsa.tipo === "attraversa") this.#attraversamento(corsa);
    else if (corsa.tipo === "accosta") this.#accostata(corsa);
    else this.#riemersione(corsa);
  }

  /* -------------------- Le tre mosse -------------------- */

  #attraversamento(corsa) {
    const t = corsa.tempo;
    const scambio = AVVICINAMENTO + TRAPASSO / 2;

    // La penombra si calcola prima di tutto il resto: deve valere anche
    // per il fotogramma in cui avviene lo scambio, che è quello che sta
    // nascondendo.
    const fondo = Math.max(0, 1 - Math.abs(t - scambio) / PENOMBRA);

    this.#luce(1 - (1 - PENOMBRA_FONDO) * dolce(fondo));

    if (t >= scambio && !corsa.scambiato) {
      corsa.scambiato = true;
      corsa.alTrapasso?.();
    }

    if (t < AVVICINAMENTO) {
      const q = t / AVVICINAMENTO;

      this.#piazza(corsa.partenza, corsa.vicino, dolce(q));
      corsa.alMuovere?.({ tratta: "avvicinamento", t: q });

      return;
    }

    if (t < AVVICINAMENTO + TRAPASSO) {
      // Fermi: prima nel primo piano di partenza, dopo lo scambio nello
      // stesso primo piano visto dall'altro mondo.
      const dove = corsa.scambiato ? corsa.arrivo : corsa.vicino;

      this.#piazza(dove, dove, 0);
      corsa.alMuovere?.({ tratta: "trapasso", t: 0 });

      return;
    }

    const q = Math.min(1, (t - AVVICINAMENTO - TRAPASSO) / APERTURA);

    this.#piazza(corsa.arrivo, corsa.fine, morbida(q));
    corsa.alMuovere?.({ tratta: "apertura", t: q });

    if (q >= 1) this.#chiudi();
  }

  #accostata(corsa) {
    const t = corsa.tempo;
    const q = Math.min(1, t / ACCOSTATA);

    this.#piazza(corsa.partenza, corsa.vicino, dolce(q));
    corsa.alMuovere?.({ tratta: "accostata", t: q });

    // Lo spegnimento sta tutto in coda, mentre la telecamera rallenta:
    // farlo partire prima vorrebbe dire arrivare al buio senza aver
    // fatto vedere dove si è arrivati.
    const spento = fra((t - (ACCOSTATA - SPEGNIMENTO)) / SPEGNIMENTO, 0, 1);

    this.#luce(1 - (1 - BUIO) * dolce(spento));

    if (q < 1) return;

    corsa.scambiato = true;
    corsa.alTrapasso?.();

    // Senza ripristinare: adesso lo schermo è della pagina, e un
    // fotogramma di stanza riaccesa prima che React smonti si vedrebbe.
    this.#chiudi({ ripristina: false });
  }

  #riemersione(corsa) {
    const q = Math.min(1, corsa.tempo / RIEMERSIONE);

    this.#piazza(corsa.vicino, corsa.fine, morbida(q));
    corsa.alMuovere?.({ tratta: "riemersione", t: q });

    this.#luce(BUIO + (1 - BUIO) * dolce(Math.min(1, corsa.tempo / RISVEGLIO)));

    if (q >= 1) this.#chiudi();
  }

  /**
   * Salta alla fine.
   *
   * Serve a due cose che non c'entrano niente fra loro: a chi clicca di
   * nuovo perché la sequenza l'ha già vista, e a un ridimensionamento
   * della finestra, che cambia sotto i piedi le misure su cui erano
   * state calcolate le inquadrature.
   *
   * In entrambi i casi lo stato d'arrivo va raggiunto per intero — lo
   * scambio dei mondi compreso, se non è ancora caduto — o resterebbe
   * una stanza accesa con dentro la telecamera dello scaffale.
   */
  concludi() {
    const corsa = this.#corsa;

    if (!corsa) return;

    const accostata = corsa.tipo === "accosta";

    if (!corsa.scambiato) {
      corsa.scambiato = true;
      corsa.alTrapasso?.();
    }

    const meta = corsa.fine ?? corsa.vicino;

    this.#piazza(meta, meta, 1);
    corsa.alMuovere?.({ tratta: accostata ? "accostata" : "apertura", t: 1 });

    this.#chiudi({ ripristina: !accostata });
  }

  #chiudi({ ripristina = true } = {}) {
    const corsa = this.#corsa;

    this.#corsa = null;

    if (ripristina) this.#renderer.toneMappingExposure = this.#esposizione;

    corsa.alFinire?.();
  }

  #luce(frazione) {
    this.#renderer.toneMappingExposure = this.#esposizione * frazione;
  }

  #piazza(da, a, q) {
    const sguardo = this.#corsa.sguardo;

    this.#camera.position.lerpVectors(da.posizione, a.posizione, q);

    sguardo.lerpVectors(da.mira, a.mira, q);
    this.#camera.lookAt(sguardo);
  }
}
