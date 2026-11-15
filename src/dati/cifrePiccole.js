/**
 * Le cifre piccole accanto al codice a barre (15/11/2026).
 *
 * Un codice da edicola (977…) è lo stesso per tutti i numeri di una collana:
 * il numero sta nelle 2 o 5 cifre piccole stampate a destra, l'«aggiunta».
 * ZXing le sa cercare, ma nella versione JavaScript (0.23.0) non le ha mai
 * lette, per due difetti suoi:
 *
 *   1. le tabelle per decodificare una cifra stanno su `UPCEANReader`, e chi
 *      legge l'aggiunta le cerca su `AbstractUPCEANReader`, dove non ci sono:
 *      la lettura muore con un errore che viene inghiottito in silenzio;
 *   2. tolto il primo, le cifre vengono decodificate e controllate bene ma
 *      scritte in una stringa passata per valore (in Java era un
 *      `StringBuilder`): fuori dalla funzione arriva vuota.
 *
 * Qui si rimedia da fuori, senza toccare la libreria:
 *
 *   1. le tabelle si mettono dove vengono cercate;
 *   2. mentre la libreria decodifica l'aggiunta si ascolta ogni cifra che
 *      trova, e a lettura riuscita (controlli suoi compresi) il risultato si
 *      ricostruisce con quelle cifre.
 *
 * Non si riscrive nessun pezzo della decodifica: se una versione futura la
 * cambia, questo ascolta soltanto. Se invece cambiano i nomi dei pezzi su cui
 * ci si appoggia, `rimedia` lo dice (restituisce false) e la pagina va avanti
 * come prima, senza cifre piccole. Le due librerie sono fissate in
 * `package.json` alla versione esatta, e `scripts/controlla-cifre-piccole.mjs`
 * (dentro `npm run controlla`) fa fallire la build se il rimedio non regge più.
 *
 * `rimedia` riceve le classi invece di importarle: così la stessa funzione
 * serve al sito (moduli ESM, caricati solo sulla pagina della scansione) e al
 * controllo che gira in Node (moduli CommonJS).
 */
export function rimedia({ Astratto, Cinque, Due, Result, BarcodeFormat }) {
  if (
    typeof Astratto?.decodeDigit !== "function" ||
    !Array.isArray(Astratto.L_PATTERNS) ||
    [Cinque, Due].some((c) => typeof c?.prototype?.decodeRow !== "function" || typeof c.prototype.decodeMiddle !== "function")
  ) {
    return false;
  }

  if (Astratto.__cifrePiccole) return true;

  // 1. Le tabelle: le dieci forme «L» e, rovesciate, le dieci «G».
  if (!Astratto.L_AND_G_PATTERNS) {
    const elle = Astratto.L_PATTERNS.map((larghezze) => Int32Array.from(larghezze));

    Astratto.L_AND_G_PATTERNS = [...elle, ...elle.map((larghezze) => Int32Array.from(larghezze).reverse())];
  }

  // 2. Le cifre: si ascoltano mentre la libreria le decodifica.
  for (const Classe of [Cinque, Due]) {
    const mezzo = Classe.prototype.decodeMiddle;
    const riga = Classe.prototype.decodeRow;

    Classe.prototype.decodeMiddle = function (...argomenti) {
      const cifre = [];
      const vera = Astratto.decodeDigit;

      Astratto.decodeDigit = function (...a) {
        const trovata = vera.apply(this, a);

        cifre.push(trovata % 10);

        return trovata;
      };

      try {
        // Se i controlli della libreria falliscono (cifra di controllo, lunghezza) qui parte
        // un'eccezione e le cifre ascoltate si buttano: valgono solo a lettura riuscita.
        const fine = mezzo.apply(this, argomenti);

        this.__cifre = cifre.join("");

        return fine;
      } finally {
        Astratto.decodeDigit = vera;
      }
    };

    Classe.prototype.decodeRow = function (numeroRiga, bit, inizio) {
      this.__cifre = "";

      const vuoto = riga.call(this, numeroRiga, bit, inizio);

      // La libreria ha già il testo giusto (una versione corretta): non si tocca.
      if (vuoto.getText()) return vuoto;

      return new Result(this.__cifre, null, 0, vuoto.getResultPoints(), BarcodeFormat.UPC_EAN_EXTENSION, Date.now());
    };
  }

  Astratto.__cifrePiccole = true;

  return true;
}

/**
 * Delle cifre piccole ci si fida solo se sono CINQUE.
 *
 * L'aggiunta a 5 cifre ha una cifra di controllo vera. Quella a 2 quasi no, e soprattutto
 * la libreria, quando un'aggiunta a 5 non le torna (un riflesso, il bordo dell'inquadratura),
 * ripiega e ne legge le prime due come se fossero un'aggiunta a 2: una volta su quattro il
 * controllo debole passa. Fidarsene vorrebbe dire collegare un volume alla chiave sbagliata, e
 * la volta dopo rispondere «ce l'hai» per un altro numero. Meglio non sapere il numero (e
 * chiederlo) che saperlo sbagliato.
 */
export const aggiuntaFidata = (testo) => (/^\d{5}$/.test(String(testo ?? "")) ? String(testo) : null);

/** Per il sito: carica i pezzi interni di ZXing (solo sulla pagina della scansione) e applica il rimedio. */
export async function rimediaZxing() {
  try {
    const [astratto, cinque, due, libreria] = await Promise.all([
      import("@zxing/library/esm/core/oned/AbstractUPCEANReader"),
      import("@zxing/library/esm/core/oned/UPCEANExtension5Support"),
      import("@zxing/library/esm/core/oned/UPCEANExtension2Support"),
      import("@zxing/library")
    ]);

    return rimedia({
      Astratto: astratto.default,
      Cinque: cinque.default,
      Due: due.default,
      Result: libreria.Result,
      BarcodeFormat: libreria.BarcodeFormat
    });
  } catch {
    // Senza rimedio si legge comunque il codice: mancano solo le cifre piccole.
    return false;
  }
}
