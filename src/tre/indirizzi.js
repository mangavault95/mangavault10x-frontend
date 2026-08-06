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

/* La scala a pioli non c'è più.
   --------------------------------------------------------------------
   Stava appoggiata alla prima fila di librerie e doveva dire
   "biblioteca" invece che "scaffale"; quello che diceva davvero, in
   mezzo all'inquadratura, era che davanti alle copertine c'era un
   traliccio.

   `scala.glb` resta nella cartella per poterla rimettere, ma **non è
   come il mago**: quello è fuori dalla build perché il suo indirizzo si
   scrive per intero, e Vite emette solo il file che vede nominato. Qui
   sotto l'indirizzo si compone (`arredo(nome)`), e a un `new URL` con
   dentro una variabile Vite risponde emettendo **tutta la cartella** —
   quindi quei venti chilobyte partono comunque, che qualcuno li chieda o
   no. L'unico modo per non spedirli è cancellare il file. */
export const MODELLI = {
  banconeTesta: arredo("banconeTesta"),
  banconeDritto: arredo("banconeDritto"),
  cassa: arredo("cassa"),
  libri: arredo("libri"),
  libroAperto: arredo("libroAperto"),
  lampadaTavolo: arredo("lampadaTavolo"),
  lampadaTerra: arredo("lampadaTerra"),
  poltrona: arredo("poltrona"),
  tavolino: arredo("tavolino"),
  tappeto: arredo("tappeto"),
  // Tre piante diverse e non una ripetuta: la stessa foglia in cinque
  // punti della stanza si riconosce, e una volta riconosciuta si vede
  // solo quella.
  pianta: arredo("pianta"), // la monstera, larga
  piantaAlta: arredo("piantaAlta"), // la sansevieria, stretta e verticale
  piantaRicadente: arredo("piantaRicadente") // il nastrino, che sborda
};

// Cambiare personaggio è cambiare questa riga: `libraio.js` non sa cosa
// sta caricando, gli basta che sia un rig umanoide con una clip che si
// chiami Idle. Il mago KayKit di prima resta accanto nella cartella.
export const BIBLIOTECARIO = new URL("./assets/bibliotecaria.glb", import.meta.url).href;

// Solo i due grossi: la bibliotecaria (492 kB) e il registratore (131).
// La libreria stava in questo elenco quando era un modello scaricato da
// 331 kB; adesso non è più un file — è costruita a mano in
//  — e non c'è più niente da anticipare.
const PESANTI = [BIBLIOTECARIO, MODELLI.cassa];

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
