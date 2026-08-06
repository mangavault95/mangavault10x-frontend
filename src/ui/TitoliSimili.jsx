import { useMemo } from "react";
import { Link } from "react-router-dom";
import Copertina from "./Copertina";
import { Sezione } from "./Pagina";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import {
  abbinaCollezione,
  intreccia,
  similiDaAnimeClick,
  titoliSimili
} from "../dati/simili";

/**
 * "Titoli simili" in fondo alla scheda di una serie.
 *
 * Somiglianza per storia e temi, non per genere: la regola sta in
 * `dati/simili.js`, qui c'è solo il modo di mostrarla. Ogni carta dice
 * anche *perché* è lì — i temi in comune, o quanti lettori l'hanno
 * segnalata — perché un consiglio senza motivo si legge come un banner
 * pubblicitario.
 *
 * Due fonti, due caricamenti separati. AniList risponde in mezzo
 * secondo perché il browser la interroga da sé; AnimeClick passa dal
 * backend e può metterci molto (Render si addormenta). Aspettarle
 * insieme significherebbe far arrivare tardi anche quella veloce:
 * meglio disegnare con quello che c'è e ricomporre quando arriva il
 * resto.
 *
 * È un di più, non un dato della collezione: se non risponde nessuno,
 * la sezione sparisce senza lasciare un riquadro d'errore in fondo alla
 * pagina.
 */
export default function TitoliSimili({ serie }) {
  const { serie: collezione } = useCollezione();

  const attivo = Boolean(serie?.titolo);

  const daAniList = useRisorsa(() => titoliSimili(serie), { attivo });
  const daAnimeClick = useRisorsa(() => similiDaAnimeClick(serie), { attivo });

  const simili = useMemo(() => {
    // AniList apre la fila: è la fonte che risponde sempre, e partire
    // dall'altra farebbe ballare le carte già disegnate quando arriva.
    const intrecciati = intreccia(daAniList.dati || [], daAnimeClick.dati || []);

    // Due righe piene bastano: le fonti insieme ne porterebbero venti, e
    // una sezione di coda più lunga della pagina che la ospita smette di
    // essere un consiglio e diventa un catalogo.
    return abbinaCollezione(intrecciati, collezione, serie?.id).slice(0, 12);
  }, [daAniList.dati, daAnimeClick.dati, collezione, serie?.id]);

  const inCorso = daAniList.inCorso || daAnimeClick.inCorso;

  if (!inCorso && !simili.length) return null;

  const inCasa = simili.filter((s) => s.posseduta).length;

  return (
    <Sezione
      titolo="Titoli simili"
      extra={
        <span className="text-xs text-ink-faint">
          per trama e temi, da AniList e dai lettori di AnimeClick
          {inCasa > 0 && ` · ${inCasa} li hai già`}
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-5 gap-y-8">
        {simili.map((m) => (
          <CartaSimile key={m.idEsterno} manga={m} />
        ))}

        {/* Le caselle vuote restano finché una fonte sta arrivando:
            senza, la fila si allunga di colpo sotto il mouse di chi sta
            già leggendo le prime carte. */}
        {inCorso &&
          Array.from({ length: Math.max(0, 6 - simili.length) }).map((_, i) => (
            <div key={`attesa-${i}`} className="space-y-2">
              <div className="aspect-cover w-full animate-pulse rounded-card border border-hairline bg-glass-1" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-glass-1" />
            </div>
          ))}
      </div>
    </Sezione>
  );
}

// Ogni fonte ha la sua targhetta e il suo colore: due carte accostate
// devono dire da sole chi le ha consigliate, senza una legenda.
const TARGHETTE = {
  anilist: { testo: "AniList", stile: "bg-void/70 text-lapis" },
  animeclick: { testo: "AnimeClick", stile: "bg-void/70 text-brass-300" }
};

function CartaSimile({ manga }) {
  const { posseduta } = manga;

  // Se ce l'hai, vince il titolo con cui è registrato in collezione: è
  // quello dell'edizione italiana che hai in mano ("Buonanotte Punpun"),
  // non il romaji con cui lo chiama AniList.
  const titolo = posseduta?.titolo || manga.titoloInglese || manga.titolo;

  const copertina = posseduta?.copertina || manga.copertina;
  const targhetta = TARGHETTE[manga.fonte] || TARGHETTE.anilist;

  const contenuto = (
    <>
      <div className="relative">
        <Copertina src={copertina} alt={titolo} riempi />

        {manga.voto !== null && manga.voto !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium text-brass-300 backdrop-blur-sm">
            {manga.voto.toFixed(1)}
          </span>
        )}

        <span
          className={`absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide backdrop-blur-sm ${targhetta.stile}`}
        >
          {targhetta.testo}
        </span>

        {/* "Ce l'hai" sta sotto e non al posto della fonte: sono due
            informazioni diverse — chi lo consiglia e se è già sullo
            scaffale — e schiacciarle in un'etichetta sola costringeva a
            nascondere la fonte proprio sulle carte che porti a casa. */}
        {posseduta && (
          <span className="absolute bottom-2 left-2 rounded-full bg-jade/25 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-jade backdrop-blur-sm">
            ce l'hai
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1.5 px-0.5">
        <h3 className="line-clamp-2 min-h-[2.1rem] text-sm font-medium leading-snug text-ink-bright transition-colors duration-quick group-hover:text-brass-300">
          {titolo}
        </h3>

        <Motivo manga={manga} />
      </div>
    </>
  );

  const stile =
    "group block rounded-panel outline-none transition-transform duration-base ease-settle hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-4 focus-visible:ring-offset-shelf";

  if (posseduta) {
    return (
      <Link to={`/serie/${posseduta.id}`} className={stile} title={`${titolo} — apri la scheda`}>
        {contenuto}
      </Link>
    );
  }

  return (
    <a
      href={manga.collegamento || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={stile}
      title={`${titolo} — apri su ${targhetta.testo}`}
    >
      {contenuto}
    </a>
  );
}

/**
 * Perché questa carta è qui.
 *
 * Ogni fonte sa rispondere a modo suo e nessuna delle due sa rispondere
 * come l'altra: AniList ha i temi dell'opera, AnimeClick ha quante
 * persone hanno segnalato l'accostamento. Mostrare il motivo che la
 * fonte ha davvero è più onesto che inventarne uno uguale per tutti.
 */
function Motivo({ manga }) {
  if (manga.temiInComune?.length) {
    return (
      <div className="flex flex-wrap gap-1">
        {manga.temiInComune.slice(0, 2).map((t) => (
          <span
            key={t}
            className="rounded-full border border-hairline bg-glass-1 px-1.5 py-0.5 text-[0.62rem] text-ink-muted"
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  const quanti = manga.fonte === "animeclick" ? manga.segnalazioni : manga.affinita;

  if (!quanti) return null;

  return (
    <p className="text-[0.65rem] italic text-ink-faint">
      {quanti === 1 ? "segnalato da un lettore" : `segnalato da ${quanti} lettori`}
    </p>
  );
}
