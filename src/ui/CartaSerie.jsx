import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import Copertina from "./Copertina";
import { BottonePreferito } from "./AzioniSerie";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { coloreDi } from "../dati/lettori";
import {
  completamento,
  totaleDisponibile,
  volumiLettiDa,
  volumiMancanti,
  votoDi,
  votoIt
} from "../dati/serie";

/**
 * Una serie dentro una griglia.
 *
 * L'intera carta è un solo link: non un div con `onClick` addosso.
 * Così si apre col tasto centrale in una scheda nuova, si copia
 * l'indirizzo col destro e la tastiera ci arriva da sola — tutte cose
 * che con il vecchio `onClick` non funzionavano.
 *
 * Il titolo e i metadati salgono di un capello al passaggio del mouse
 * insieme alla copertina: l'oggetto si muove tutto insieme, non a pezzi.
 *
 * `lettore` è di chi si sta guardando la collezione. Non cambia le
 * serie — quelle sono in comune — ma cambia tutto ciò che è di
 * qualcuno: il voto sulla copertina e quanti volumi ne ha letti. Senza,
 * filtrando per «lette da Nanaki» si otteneva la sua selezione con i
 * dati di chi guardava sopra: schede senza voto e senza letture, cioè
 * l'aria di una griglia rotta.
 */
/**
 * Il volo della copertina (03/11/2026).
 *
 * Aprendo una serie la copertina cliccata non sparisce per lasciare il
 * posto a un'altra pagina: si stacca dalla griglia, si avvicina e si
 * ingrandisce fino a diventare la copertina della scheda, mentre il
 * resto della scheda si fa strada sotto di lei. Lo fa il browser (View
 * Transitions): basta dare lo stesso `view-transition-name` alla
 * copertina di partenza e a quella d'arrivo, e lui calcola il percorso.
 *
 * Il nome si scrive sulla carta SOLO al momento del tocco: due elementi
 * con lo stesso nome nella stessa pagina annullerebbero la transizione.
 *
 * Dove il browser non sa farlo, o chi guarda ha scelto «riduci
 * movimento», non si intercetta niente e il collegamento si comporta
 * come sempre. Il pezzo di codice della scheda si scarica già al passaggio
 * del dito o del mouse, così al tocco c'è e la copertina ha dove atterrare.
 */
let schedaPronta = false;

function precaricaScheda() {
  if (schedaPronta) return;
  schedaPronta = true;
  import("../pages/SeriePage").catch(() => {
    schedaPronta = false;
  });
}

function useVolo(indirizzo) {
  const navigate = useNavigate();

  return function apriConVolo(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof document.startViewTransition !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const copertina = e.currentTarget.querySelector("[data-copertina]");
    if (!copertina) return;

    e.preventDefault();
    copertina.style.viewTransitionName = "copertina-serie";

    // Si naviga UNA volta, e comunque: se il browser non disegna (scheda in
    // secondo piano) la transizione non parte e il tocco sembrerebbe morto.
    let fatto = false;
    const vai = () => {
      if (fatto) return;
      fatto = true;
      flushSync(() => navigate(indirizzo));
    };
    const pulisci = () => (copertina.style.viewTransitionName = "");

    try {
      const volo = document.startViewTransition(vai);

      volo.finished.then(pulisci, pulisci);
      setTimeout(vai, 400);
    } catch {
      pulisci();
      vai();
    }
  };
}

export default function CartaSerie({
  serie,
  priorita = false,
  riempi = false,
  lettore = null,
  compatta = false
}) {
  const { aggiornaLocale } = useCollezione();
  const { lettoriBiblioteca: lettori } = useSessione();

  const pct = completamento(serie);
  const mancanti = volumiMancanti(serie);
  const totale = totaleDisponibile(serie);

  // `serie.valutazione` è già il voto di chi guarda: si scomoda
  // `votoDi` solo quando si sta guardando per conto di un altro.
  const voto = lettore ? votoDi(serie, lettore) : serie.valutazione;
  const letti = lettore ? volumiLettiDa(serie, lettore) : 0;
  const colore = lettore ? coloreDi(lettori, lettore) : null;

  const tono =
    pct === null ? "ignoto" : pct < 100 ? "parziale" : serie.stato === "conclusa" ? "conclusa" : "in-pari";
  const etichettaAnello =
    pct === null
      ? `${serie.titolo}: in corso, volumi totali non ancora noti`
      : `${serie.titolo}: ${pct}% completa`;
  const indirizzo = lettore ? `/serie/${serie.id}?lettore=${lettore}` : `/serie/${serie.id}`;
  const apriConVolo = useVolo(indirizzo);

  // La vista «solo copertine»: nessun testo sotto, quattro colonne, circa
  // ventiquattro serie per schermata invece di nove. Il completamento e
  // il «−N» passano sulla copertina, in un angolo; il titolo si legge
  // aprendo la scheda (o tornando alla vista con le copertine).
  if (compatta) {
    return (
      <Link
        to={indirizzo}
        onClick={apriConVolo}
        onPointerEnter={precaricaScheda}
        onTouchStart={precaricaScheda}
        title={serie.titolo}
        aria-label={`${serie.titolo}, ${serie.posseduti} volumi${mancanti > 0 ? `, ne mancano ${mancanti}` : ""}`}
        className="group relative block rounded-card outline-none transition-transform duration-quick
                   focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf active:scale-[0.97]"
      >
        <Copertina src={serie.copertina} alt={serie.titolo} priorita={priorita} riempi={riempi} inclina={false} />

        {voto > 0 && (
          <span
            className={`absolute left-1.5 top-1.5 rounded-full bg-void/70 px-1.5 py-0.5 font-numeric text-[0.65rem] font-medium backdrop-blur-sm ${
              colore ? colore.testo : "text-brass-300"
            }`}
          >
            {votoIt(voto)}★
          </span>
        )}

        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-void/75 p-1 backdrop-blur-sm">
          <AnelloCompletamento pct={pct} tono={tono} etichetta={etichettaAnello} />
          {mancanti > 0 && (
            <span className="pr-1 font-numeric text-[0.65rem] font-medium text-ember">−{mancanti}</span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <Link
      // La scheda si apre sapendo di chi sono le letture da mostrare:
      // è l'indirizzo a portarselo dietro, come per ogni altro filtro
      // di questa pagina.
      to={indirizzo}
      onClick={apriConVolo}
      onPointerEnter={precaricaScheda}
      onTouchStart={precaricaScheda}
      className="group block rounded-panel outline-none transition-transform duration-base ease-settle
                 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400
                 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf active:translate-y-0 active:scale-[0.99]"
    >
      <div className="relative">
        <Copertina src={serie.copertina} alt={serie.titolo} priorita={priorita} riempi={riempi} />

        {/* Il cuore si vede solo se la serie è già preferita, o col mouse
            sopra. Fino al 05/10/2026 stava sempre acceso a metà su ogni
            copertina per far scoprire che si poteva segnare da qui: su
            duecento serie era duecento cuori. Col dito non compare, e non
            deve nemmeno prendere i tocchi: si segna dalla scheda. */}
        <BottonePreferito
          serie={serie}
          onCambiato={(nuovo) => aggiornaLocale(serie.id, { preferito: nuovo })}
          className={`absolute right-2 top-2 h-7 w-7 bg-void/70 backdrop-blur-sm transition-opacity duration-quick
                      ${
                        serie.preferito
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:pointer-events-none"
                      }`}
        />

        {/* Il voto sta sulla copertina, non sotto: è l'informazione
            che si cerca scorrendo, e lì non ruba una riga di testo.
            Lo zero non si mostra: in questa collezione significa "non
            ancora votato", e un "0.0" in bella vista sembra una stroncatura. */}
        {voto > 0 && (
          <span
            className={`absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium backdrop-blur-sm ${
              colore ? colore.testo : "text-brass-300"
            }`}
          >
            {votoIt(voto)}★
          </span>
        )}

        {/* Quanti volumi ne ha letti la persona di cui si sta
            guardando la collezione. Sta in basso a destra, l'unico
            angolo libero, e porta il suo colore: è la stessa
            convenzione delle note — a dire chi parla è la tinta. */}
        {lettore && letti > 0 && (
          <span
            title={`${letti} volumi letti`}
            className={`absolute bottom-2 right-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium backdrop-blur-sm ${colore.testo}`}
          >
            {letti} letti
          </span>
        )}

      </div>

      <div className="mt-2 space-y-1 px-0.5 sm:mt-3 sm:space-y-1.5">
        {/* Altezza riservata per due righe sempre, non solo quante ne
            usa il titolo: un titolo corto su una riga sola altrimenti
            lascia la barra di completamento più in alto di quella della
            scheda accanto con un titolo lungo, e la griglia sembra
            storta anche se ogni riga, tecnicamente, è allineata. */}
        <h3 className="line-clamp-2 min-h-[2.2rem] text-[0.8rem] font-medium leading-snug text-ink-bright transition-colors duration-quick group-hover:text-brass-300 sm:min-h-[2.5rem] sm:text-sm">
          {serie.titolo}
        </h3>

        {/* Quanti ne hai su quanti e cosa manca. L'anello a sinistra c'è
            su OGNI carta, sempre nello stesso posto: prima la barra
            compariva solo a certe serie e la griglia sembrava a pezzi.
            Il segno a destra dice cosa vuol dire «finito»: verde se la
            serie è conclusa e ce l'hai tutta, azzurro se sei solo in
            pari con quello che è uscito. */}
        <p className="flex items-center gap-1.5 font-numeric text-xs text-ink-muted">
          <AnelloCompletamento pct={pct} tono={tono} etichetta={etichettaAnello} />
          {/* Con un «su quanti» il numero si legge da solo («12/13») e
              senza l'unità la riga sta in una colonna da telefono insieme
              al «−N»; senza, va a capo e l'anello resta in mezzo. */}
          <span className="whitespace-nowrap">
            {serie.posseduti}
            {mancanti > 0 && totale ? `/${totale}` : " vol."}
            {mancanti === 0 && serie.stato === "conclusa" && (
              <span className="ml-1.5 text-jade">✓</span>
            )}
            {mancanti === 0 && serie.stato !== "conclusa" && (
              <span title="In pari con le uscite" className="ml-1.5 text-lapis">
                ✓
              </span>
            )}
            {mancanti > 0 && <span className="ml-1.5 text-ember/80">−{mancanti}</span>}
          </span>
        </p>
      </div>
    </Link>
  );
}

/**
 * Il completamento di una serie, in quattordici pixel.
 *
 * Un anello e non una barra perché sta DENTRO la riga del conteggio: non
 * aggiunge una riga alla carta e non può mancare a qualcuna, quindi la
 * griglia resta uniforme. A questa misura una differenza di pochi punti
 * non si vede — la cifra e il «−N» accanto dicono il resto; l'anello dice
 * il tipo di situazione: piena, a metà, o aperta.
 *
 * Il totale ignoto è un anello tratteggiato e fermo: «ancora aperta» senza
 * inventare una percentuale, e senza muoversi, perché in griglia ce ne
 * sono decine insieme.
 */
const COLORE_ANELLO = {
  // Rosso lanterna e non l'accento (02/11/2026): «ne mancano» è uno
  // stato, e l'accento è riservato a quello che si può premere.
  parziale: "stroke-ember",
  "in-pari": "stroke-lapis",
  conclusa: "stroke-jade",
  ignoto: "stroke-lapis"
};

function AnelloCompletamento({ pct, tono, etichetta }) {
  const raggio = 5.5;
  const circonferenza = 2 * Math.PI * raggio;

  return (
    <svg
      role="img"
      aria-label={etichetta}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className="shrink-0"
    >
      <title>{etichetta}</title>
      <circle cx="7" cy="7" r={raggio} fill="none" strokeWidth="2" className="stroke-ink-bright/[0.14]" />
      {pct === null ? (
        <circle
          cx="7"
          cy="7"
          r={raggio}
          fill="none"
          strokeWidth="2"
          strokeDasharray="2.5 2.5"
          className={`${COLORE_ANELLO[tono]} opacity-80`}
        />
      ) : (
        <circle
          cx="7"
          cy="7"
          r={raggio}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${((circonferenza * pct) / 100).toFixed(1)} ${circonferenza.toFixed(1)}`}
          transform="rotate(-90 7 7)"
          className={COLORE_ANELLO[tono]}
        />
      )}
    </svg>
  );
}

/**
 * La griglia che contiene le carte.
 *
 * Le colonne le decide `auto-fill` sulla larghezza minima di una
 * copertina leggibile: la stessa griglia va da tre colonne sul telefono
 * a sette su un monitor largo senza breakpoint scritti a mano.
 *
 * La misura minima però non è una sola. Su un monitor una copertina
 * sotto i 9rem è un francobollo in mezzo allo spazio che avanza; su un
 * telefono largo 430 pixel quella stessa misura dà **due** colonne, cioè
 * quattro serie per schermata su una collezione di duecento. Sotto `sm`
 * scende a 6.5rem: tre colonne, copertine da 127 pixel — la larghezza a
 * cui un titolo si legge ancora e se ne vedono nove per schermata.
 */
export function GrigliaSerie({ serie, riempi = false, lettore = null, compatta = false, children }) {
  return (
    <div
      className={
        compatta
          ? "sequenza grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] sm:gap-3"
          : `sequenza grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-3 gap-y-5
             sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] sm:gap-x-5 sm:gap-y-8`
      }
    >
      {serie
        ? serie.map((s, i) => (
            <CartaSerie
              key={s.id}
              serie={s}
              priorita={i < 12}
              riempi={riempi}
              lettore={lettore}
              compatta={compatta}
            />
          ))
        : children}
    </div>
  );
}
