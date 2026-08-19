import { Link } from "react-router-dom";
import Copertina from "./Copertina";
import Progresso from "./Progresso";
import { BottonePreferito } from "./AzioniSerie";
import { useCollezione } from "../dati/collezione";
import { completamento, totaleDisponibile, volumiMancanti } from "../dati/serie";
import { generiDiSerie } from "../dati/generi";

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
 */
export default function CartaSerie({ serie, priorita = false, riempi = false }) {
  const { aggiornaLocale } = useCollezione();

  const pct = completamento(serie);
  const mancanti = volumiMancanti(serie);
  const totale = totaleDisponibile(serie);
  const generi = generiDiSerie(serie).slice(0, 3);

  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group block rounded-panel outline-none transition-transform duration-base ease-settle
                 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400
                 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf active:translate-y-0 active:scale-[0.99]"
    >
      <div className="relative">
        <Copertina src={serie.copertina} alt={serie.titolo} priorita={priorita} riempi={riempi} />

        {/* Sempre presente, non solo quando è già preferito: altrimenti
            non ci sarebbe modo di scoprire che si può segnare da qui.
            Sfumata finché non la guardi o non l'hai già segnata.

            Col dito «finché non la guardi» non arriva mai, e il cuore
            resterebbe invisibile per sempre: lì sta acceso a metà — si
            vede che c'è, senza gridare quanto uno già segnato. È l'unico
            modo di segnare un preferito dalla griglia, e una funzione
            raggiungibile solo col mouse su un telefono non esiste. */}
        <BottonePreferito
          serie={serie}
          onCambiato={(nuovo) => aggiornaLocale(serie.id, { preferito: nuovo })}
          className={`absolute right-2 top-2 h-7 w-7 bg-void/70 backdrop-blur-sm transition-opacity duration-quick
                      [@media(hover:none)]:h-9 [@media(hover:none)]:w-9
                      ${
                        serie.preferito
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
                      }`}
        />

        {/* Il voto sta sulla copertina, non sotto: è l'informazione
            che si cerca scorrendo, e lì non ruba una riga di testo.
            Lo zero non si mostra: in questa collezione significa "non
            ancora votato", e un "0.0" in bella vista sembra una stroncatura. */}
        {serie.valutazione > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium text-brass-300 backdrop-blur-sm">
            {serie.valutazione}★
          </span>
        )}

        {/* Il pallino di stato: giada se l'editore l'ha già conclusa,
            ottone se è ancora in uscita. Sta in basso per non litigare
            con voto e preferito, già in alto. */}
        {serie.stato && (serie.stato === "conclusa" || serie.stato === "in_corso") && (
          <span
            aria-hidden="true"
            title={serie.stato === "conclusa" ? "Conclusa" : "In corso"}
            className={`absolute bottom-2 left-2 h-2 w-2 rounded-full ring-2 ring-void/70 ${
              serie.stato === "conclusa" ? "bg-jade" : "bg-lapis"
            }`}
          />
        )}

        {/* I generi, leggibili solo al passaggio del mouse: in 189
            schede tutte insieme sarebbero solo rumore, ma sono il modo
            più veloce di riconoscere una serie mentre scorri la griglia
            cercando "qualcosa di simile a...". */}
        {generi.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1 rounded-b-card bg-gradient-to-t from-void/90 via-void/50 to-transparent p-2 pt-6 opacity-0 transition-opacity duration-quick group-hover:opacity-100"
          >
            {generi.map((g) => (
              <span
                key={g}
                className="rounded-full bg-void/70 px-1.5 py-0.5 text-[0.62rem] text-ink-muted backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>
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

        <p className="font-numeric text-xs text-ink-muted">
          {serie.posseduti}
          {totale ? ` / ${totale}` : ""} vol.
          {mancanti > 0 && (
            <span className="ml-1.5 text-ember/80">−{mancanti}</span>
          )}
        </p>

        <Progresso
          valore={pct}
          etichetta={
            pct !== null
              ? `${serie.titolo}: ${pct}% completa`
              : `${serie.titolo}: in corso, volumi totali non ancora noti`
          }
          sottile
        />
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
export function GrigliaSerie({ serie, riempi = false, children }) {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-3 gap-y-5
                 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] sm:gap-x-5 sm:gap-y-8"
    >
      {serie
        ? serie.map((s, i) => (
            <CartaSerie key={s.id} serie={s} priorita={i < 12} riempi={riempi} />
          ))
        : children}
    </div>
  );
}
