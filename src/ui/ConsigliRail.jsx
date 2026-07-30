import Copertina from "./Copertina";
import { Sezione } from "./Pagina";
import useRisorsa from "../dati/useRisorsa";
import { consigliaSerie } from "../dati/consigli";

/**
 * "Da scoprire": consigli AniList a partire da preferiti e voti alti,
 * con quello che possiedi già tolto di mezzo.
 *
 * È un valore aggiunto, non un dato della collezione: se AniList non
 * risponde o non trova niente di nuovo, l'intera sezione sparisce senza
 * lasciare un riquadro d'errore. Nessuno deve accorgersi che è stata
 * provata e non è andata.
 */
export default function ConsigliRail({ serie }) {
  const consigli = useRisorsa(() => consigliaSerie(serie), {
    attivo: serie.length > 0
  });

  if (consigli.errore) return null;
  if (!consigli.inCorso && !consigli.dati?.length) return null;

  return (
    <Sezione titolo="Da scoprire" extra={<span className="text-xs text-ink-faint">consigliati da chi ha letto le tue serie preferite</span>}>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {consigli.inCorso && !consigli.dati
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-32 shrink-0 space-y-2 sm:w-36">
                <div className="aspect-cover w-full animate-pulse rounded-card border border-hairline bg-glass-1" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-glass-1" />
              </div>
            ))
          : consigli.dati.map((m) => <CartaConsiglio key={m.idEsterno} manga={m} />)}
      </div>
    </Sezione>
  );
}

function CartaConsiglio({ manga }) {
  return (
    <a
      href={manga.collegamento || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-32 shrink-0 outline-none transition-transform duration-base ease-settle
                 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400 sm:w-36"
      title={`${manga.titolo} — apri su AniList`}
    >
      <div className="relative">
        <Copertina src={manga.copertina} alt={manga.titolo} riempi />

        {manga.voto !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium text-brass-300 backdrop-blur-sm">
            {manga.voto.toFixed(1)}
          </span>
        )}

        <span className="absolute right-2 top-2 rounded-full bg-void/70 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-lapis backdrop-blur-sm">
          AniList
        </span>
      </div>

      <div className="mt-2 space-y-1 px-0.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug text-ink-bright transition-colors duration-quick group-hover:text-brass-300">
          {manga.titolo}
        </h3>

        {manga.generi.length > 0 && (
          <p className="truncate text-[0.65rem] text-ink-faint">{manga.generi.slice(0, 2).join(" · ")}</p>
        )}
      </div>
    </a>
  );
}
