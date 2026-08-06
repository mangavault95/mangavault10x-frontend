import legnoUrl from "../tre/assets/legno/legno_diffuse.webp";
import intonacoUrl from "../tre/assets/intonaco/intonaco_diffuse.webp";

/**
 * I materiali della biblioteca, per le pagine fatte di DOM.
 *
 * Le quattro pagine che si raggiungono dalla stanza avevano fondi neutri
 * — nero, un alone caldo, una vignettatura — e il risultato era che
 * uscendo dalla sala si finiva da nessuna parte. Un oggetto della
 * biblioteca su fondo nero non è un oggetto della biblioteca: è
 * un'immagine ritagliata.
 *
 *
 * SONO LE TEXTURE VERE, NON UN'IMITAZIONE
 *
 * Il parquet qui sotto è `legno_diffuse.webp`, lo stesso file che in
 * `tre/scena.js` finisce sul pavimento della sala; l'intonaco è
 * `intonaco_diffuse.webp`, lo stesso delle pareti. Non due gradienti
 * scritti a mano che gli somigliano — quelli divergono al primo ritocco,
 * e sarebbe l'unico posto del sito in cui il legno è di un altro legno.
 *
 * Non costano niente in più: sono centocinquanta chilobyte già scaricati
 * dalla stanza pochi secondi prima, e il browser li ha in cache.
 *
 *
 * COME SI USANO
 *
 * Sono strati, non sfondi. Si impilano dentro il `fondo` di `Approdo`
 * nell'ordine in cui li vedrebbe chi guarda — parete dietro, pavimento
 * davanti, luce sopra tutto — e ognuno accetta le classi di posizione,
 * perché dove comincia il pavimento dipende da cosa ci sta sopra.
 */

/* La grana del legno è fitta: presa a mattonella grande diventa una
   macchia, presa piccola diventa un tessuto. Queste due misure sono
   quelle a cui si legge come una doga. */
const DOGA = "300px";
const MURO = "520px";

/**
 * Il pavimento.
 *
 * Non piatto: la mattonella resta uguale ma sopra ci va un gradiente che
 * scurisce verso l'alto, ed è quello a farlo leggere come un piano che
 * si allontana invece che come una parete di legno. È lo stesso trucco
 * che usa qualunque fondale dipinto, e costa un gradiente.
 */
export function Parquet({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: `url(${legnoUrl})`,
        backgroundSize: `${DOGA} auto`,
        backgroundRepeat: "repeat"
      }}
    >
      {/* Il fondo si allontana: più su, più buio */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,11,0.88)_0%,rgba(6,7,11,0.45)_35%,rgba(6,7,11,0.15)_100%)]" />
      {/* e più freddo ai lati, dove la lampada non arriva */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_35%_100%,transparent_20%,rgba(6,7,11,0.6)_100%)]" />
    </div>
  );
}

/** La parete d'intonaco caldo, come nella sala. */
export function Intonaco({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: `url(${intonacoUrl})`,
        backgroundSize: `${MURO} auto`,
        backgroundRepeat: "repeat"
      }}
    >
      <div className="absolute inset-0 bg-legno/70" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_30%_0%,rgba(255,226,170,0.28),transparent_65%)]" />
    </div>
  );
}

/**
 * La boiserie: il rivestimento di legno fino a mezza parete, con il suo
 * listello in cima.
 *
 * È il pezzo che dice «sala di lettura» più di ogni altro, e nella
 * stanza in tre dimensioni c'è su tutte e quattro le pareti.
 */
export function Boiserie({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${className}`}
      style={{
        backgroundImage: `url(${legnoUrl})`,
        backgroundSize: `${DOGA} auto`,
        backgroundRepeat: "repeat"
      }}
    >
      <div className="absolute inset-0 bg-legno/45" />

      {/* I montanti verticali, appena accennati */}
      <div className="absolute inset-0 opacity-25 bg-[repeating-linear-gradient(90deg,transparent_0_104px,rgba(0,0,0,0.85)_104px_107px)]" />

      {/* Il listello in cima, con la sua luce sopra e la sua ombra sotto */}
      <div className="absolute inset-x-0 top-0 h-2 bg-legno shadow-[0_1px_0_rgba(250,204,21,0.16),0_6px_14px_-4px_rgba(0,0,0,0.8)]" />
    </div>
  );
}

/**
 * Il cono di luce di una lampada appesa.
 *
 * Non un alone tondo — quello è una luce vista da lontano, e queste tre
 * pagine sono tutte a un palmo dall'oggetto. Da vicino una lampada fa un
 * cono: stretto in cima dov'è la lampadina, largo in basso dove la luce
 * arriva sul piano. Il taglio lo dà `clip-path`, il colore il gradiente,
 * e la sfocatura tiene i bordi dal sembrare un triangolo disegnato.
 *
 * `da` è dove sta la lampada, in percentuale di larghezza.
 */
export function ConoDiLuce({ da = 50, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-0 h-[78%] ${className}`}
      style={{
        clipPath: `polygon(${da - 7}% 0, ${da + 7}% 0, ${da + 46}% 100%, ${da - 46}% 100%)`,
        background:
          "linear-gradient(180deg, rgba(255,214,150,0.30) 0%, rgba(255,204,130,0.13) 42%, transparent 92%)",
        filter: "blur(26px)"
      }}
    />
  );
}

/**
 * La grana: un velo di rumore sopra tutto.
 *
 * Un fondo fatto di gradienti è matematicamente liscio, e a schermo
 * grande si vede — le sfumature larghe si spezzano in fasce invece di
 * degradare. Un pizzico di disturbo le rompe. È un SVG di turbolenza
 * incorporato, quindi non è un file da scaricare.
 */
const RUMORE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
       <filter id="r"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/></filter>
       <rect width="180" height="180" filter="url(#r)"/>
     </svg>`
  );

export function Grana({ opacita = 0.05, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: `url("${RUMORE}")`, opacity: opacita }}
    />
  );
}

/**
 * Un piano di legno: il banco, il tavolino.
 *
 * Va sotto le cose che ci si posano sopra, e la sua ombra interna è
 * quella che fa capire che ci sono posate e non incollate.
 */
export function PianoDiLegno({ className = "", children }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        backgroundImage: `url(${legnoUrl})`,
        backgroundSize: `${DOGA} auto`,
        backgroundRepeat: "repeat"
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-legno/35 shadow-[inset_0_2px_0_rgba(250,204,21,0.1),inset_0_-30px_50px_-30px_rgba(0,0,0,0.9)]"
      />

      <div className="relative">{children}</div>
    </div>
  );
}
