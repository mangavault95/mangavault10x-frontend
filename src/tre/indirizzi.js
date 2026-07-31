/**
 * Dove stanno i modelli, e come farli partire in anticipo.
 *
 * Questo file non importa three ed è il motivo per cui esiste: gli
 * indirizzi servono anche a `main.jsx`, che deve poter far partire lo
 * scaricamento dei modelli pesanti senza tirarsi dietro seicento
 * chilobyte di libreria 3D per farlo.
 *
 *
 * PERCHÉ ANTICIPARE
 *
 * I modelli sono l'ultima cosa della catena: il browser scarica il
 * JavaScript, lo esegue, React monta la pagina, la pagina costruisce la
 * scena, e *solo allora* la scena chiede i suoi `.glb`. Un megabyte e
 * mezzo che parte quando il resto è già finito, e la stanza non c'è
 * finché non è arrivato.
 *
 * Chiedendoli subito, il viaggio si sovrappone a tutto il resto. A
 * priorità bassa, però: sono grossi, e non devono rubare la corsia al
 * JavaScript, che è quello che disegna la pagina intorno.
 *
 * Non è un doppio scaricamento: chi poi vuole il modello ritira i byte
 * già arrivati e li dà direttamente al lettore (vedi `modelli.js`),
 * invece di rifare la richiesta e sperare nella cache del browser.
 */

const arredo = (nome) => new URL(`./assets/arredo/${nome}.glb`, import.meta.url).href;

export const MODELLI = {
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

export const BIBLIOTECARIO = new URL("./assets/bibliotecario.glb", import.meta.url).href;

// Solo i tre grossi. Gli altri dodici messi insieme non arrivano al
// peso di uno di questi, e una fila di richieste minute mentre parte la
// pagina costa più di quello che fa risparmiare.
const PESANTI = [MODELLI.libreria, BIBLIOTECARIO, MODELLI.cassa];

const anticipati = new Map();

export function anticipaModelli() {
  for (const indirizzo of PESANTI) {
    if (anticipati.has(indirizzo)) continue;

    anticipati.set(
      indirizzo,
      fetch(indirizzo, { priority: "low" })
        .then((risposta) => (risposta.ok ? risposta.arrayBuffer() : null))
        // Una rete che fa i capricci qui non deve rompere niente: chi
        // ritira riceve `null` e se lo scarica per conto suo.
        .catch(() => null)
    );
  }
}

/**
 * I byte di un modello anticipato, se erano stati chiesti. Una volta
 * sola: consegnati, non servono più a nessuno e tenerli in memoria
 * vorrebbe dire tenersi in casa un megabyte di doppioni.
 */
export function ritiraModello(indirizzo) {
  const arrivo = anticipati.get(indirizzo);

  if (!arrivo) return null;

  anticipati.delete(indirizzo);

  return arrivo;
}
