/**
 * LA BUSTA — un oggetto solo, disegnato una volta.
 *
 * La usano tutt'e due i capi del consiglio: quella che si chiude e
 * parte in `ConsigliaAnime`, quella che arriva e si apre in
 * `Cartolina`. Sta qui e non duplicata di là perché è letteralmente la
 * stessa cosa vista da due parti — se il lembo di chi manda fosse un
 * po' più stretto di quello di chi riceve, l'illusione che sia
 * arrivato QUEL foglio lì si romperebbe, e l'illusione è tutto quello
 * che questa animazione ha da offrire.
 *
 * ---------------------------------------------------------------
 * COM'È FATTA
 *
 * Tre strati sovrapposti, dal fondo:
 *
 *   1. il CORPO, un rettangolo di carta con le due pieghe di sotto
 *      disegnate in SVG — senza quelle è una scheda qualunque;
 *   2. quello che ci sta DENTRO (`children`), che NON è ritagliato:
 *      la copertina ci arriva da fuori grande e si rimpicciolisce, e
 *      un `overflow-hidden` qui la taglierebbe per tutto il tragitto;
 *   3. il LEMBO, che è l'unica parte che si muove.
 *
 * Il lembo si ribalta davvero, in tre dimensioni: `perspective` sta
 * sul contenitore e `transform-origin` in cima al lembo, perché sono
 * proprietà della FORMA — dove sta la cerniera — mentre il movimento
 * (quanto, quando, in che verso) lo passa chi la usa con `classeLembo`.
 * Il triangolo lo fa un `clip-path` e non un bordo obliquo: un bordo
 * non si può ruotare in prospettiva senza che i lati si scollino.
 */

/** Quanto scende il lembo, in percentuale sull'altezza della busta. */
const LEMBO = "58%";

export default function Busta({ classeLembo = "", stileLembo, children, className = "" }) {
  return (
    <div
      className={`relative aspect-[3/2] w-full ${className}`}
      // La prospettiva senza la quale il ribaltamento del lembo è una
      // barra che si schiaccia invece di un foglio che si piega.
      style={{ perspective: "900px" }}
    >
      {/* ① il corpo */}
      <div className="absolute inset-0 rounded-lg border border-quaderno-riga bg-quaderno-foglio shadow-float" />

      {/* Le due pieghe di sotto. `preserveAspectRatio="none"`: le linee
          devono seguire la busta qualunque forma prenda, non tenere le
          proporzioni del disegno. */}
      <svg
        viewBox="0 0 300 200"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full text-quaderno-riga"
      >
        <path d="M2 198 L150 104 L298 198" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* ② quello che c'è dentro */}
      {children}

      {/* ③ il lembo */}
      <div
        aria-hidden="true"
        // `stileLembo` serve a dire da che POSIZIONE parte — aperto o
        // chiuso — prima che l'animazione cominci. Con un ritardo,
        // l'animazione non tocca l'elemento finché non parte davvero, e
        // in quel frattempo vale quello che c'è scritto qui: senza,
        // una busta che deve chiudersi fra un secondo si vedrebbe già
        // chiusa per quel secondo.
        style={{
          transformOrigin: "top center",
          clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          height: LEMBO,
          ...stileLembo
        }}
        className={`absolute inset-x-0 top-0 rounded-t-lg bg-quaderno-blu-tenue ${classeLembo}`}
      />
    </div>
  );
}

/**
 * L'indirizzo scritto sopra: da chi, a chi.
 *
 * Sta sotto il lembo e non sopra, come su una busta vera. Serve a una
 * cosa sola ma importante: mentre la cartolina vola e si apre, quello
 * che si sta guardando dev'essere già riconoscibile come «una cosa
 * che mi ha mandato qualcuno», non come un rettangolo che si muove.
 */
export function Indirizzo({ children }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 px-3 pb-3 pt-6">
      {children}
    </div>
  );
}
