import { Link } from "react-router-dom";
import Copertina from "./Copertina";
import Progresso from "./Progresso";
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
export default function CartaSerie({
  serie,
  priorita = false,
  riempi = false,
  lettore = null
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

  return (
    <Link
      // La scheda si apre sapendo di chi sono le letture da mostrare:
      // è l'indirizzo a portarselo dietro, come per ogni altro filtro
      // di questa pagina.
      to={lettore ? `/serie/${serie.id}?lettore=${lettore}` : `/serie/${serie.id}`}
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

        {/* Completa: solo il numero, niente da guardare. Incompleta: quanti
            ne hai su quanti e cosa manca, con la barra sottile. */}
        <p className="font-numeric text-xs text-ink-muted">
          {serie.posseduti}
          {mancanti > 0 && totale ? ` / ${totale}` : ""} vol.
          {mancanti === 0 && serie.stato === "conclusa" && (
            <span className="ml-1.5 text-jade">✓</span>
          )}
          {mancanti > 0 && <span className="ml-1.5 text-ember/80">−{mancanti}</span>}
        </p>

        {pct !== null && pct < 100 && (
          <Progresso valore={pct} etichetta={`${serie.titolo}: ${pct}% completa`} sottile />
        )}
      </div>
    </Link>
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
export function GrigliaSerie({ serie, riempi = false, lettore = null, children }) {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-3 gap-y-5
                 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] sm:gap-x-5 sm:gap-y-8"
    >
      {serie
        ? serie.map((s, i) => (
            <CartaSerie
              key={s.id}
              serie={s}
              priorita={i < 12}
              riempi={riempi}
              lettore={lettore}
            />
          ))
        : children}
    </div>
  );
}
