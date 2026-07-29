import { Link } from "react-router-dom";
import Copertina from "./Copertina";
import Progresso from "./Progresso";
import { BottonePreferito } from "./AzioniSerie";
import { useCollezione } from "../dati/collezione";
import { completamento, volumiMancanti } from "../dati/serie";

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
export default function CartaSerie({ serie, priorita = false }) {
  const { aggiornaLocale } = useCollezione();

  const pct = completamento(serie);
  const mancanti = volumiMancanti(serie);

  return (
    <Link
      to={`/serie/${serie.id}`}
      className="group block rounded-panel outline-none transition-transform duration-base ease-settle
                 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400
                 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf active:translate-y-0 active:scale-[0.99]"
    >
      <div className="relative">
        <Copertina src={serie.copertina} alt={serie.titolo} priorita={priorita} />

        {/* Sempre presente, non solo quando è già preferito: altrimenti
            non ci sarebbe modo di scoprire che si può segnare da qui.
            Sfumata finché non la guardi o non l'hai già segnata. */}
        <BottonePreferito
          serie={serie}
          onCambiato={(nuovo) => aggiornaLocale(serie.id, { preferito: nuovo })}
          className={`absolute right-2 top-2 h-7 w-7 bg-void/70 backdrop-blur-sm transition-opacity duration-quick
                      ${serie.preferito ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        />

        {/* Il voto sta sulla copertina, non sotto: è l'informazione
            che si cerca scorrendo, e lì non ruba una riga di testo.
            Lo zero non si mostra: in questa collezione significa "non
            ancora votato", e un "0.0" in bella vista sembra una stroncatura. */}
        {serie.valutazione > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium text-brass-300 backdrop-blur-sm">
            {serie.valutazione.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-bright transition-colors duration-quick group-hover:text-brass-300">
          {serie.titolo}
        </h3>

        <p className="font-numeric text-xs text-ink-muted">
          {serie.posseduti}
          {serie.totali ? ` / ${serie.totali}` : ""} vol.
          {mancanti > 0 && (
            <span className="ml-1.5 text-ember/80">−{mancanti}</span>
          )}
        </p>

        <Progresso valore={pct} etichetta={`${serie.titolo}: ${pct}% completa`} sottile />
      </div>
    </Link>
  );
}

/**
 * La griglia che contiene le carte.
 *
 * Le colonne le decide `auto-fill` sulla larghezza minima di una
 * copertina leggibile: la stessa griglia va da due colonne sul
 * telefono a sette su un monitor largo senza breakpoint scritti a mano.
 */
export function GrigliaSerie({ serie, children }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8">
      {serie
        ? serie.map((s, i) => (
            <CartaSerie key={s.id} serie={s} priorita={i < 12} />
          ))
        : children}
    </div>
  );
}
