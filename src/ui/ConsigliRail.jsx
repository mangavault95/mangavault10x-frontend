import { useMemo } from "react";
import Copertina from "./Copertina";
import { Sezione } from "./Pagina";
import useRisorsa from "../dati/useRisorsa";
import { consigliaSerie, consigliaSerieAnimeClick } from "../dati/consigli";
import { intreccia } from "../dati/simili";

/**
 * "Da scoprire": consigli a partire dai preferiti e dai voti alti, con
 * quello che possiedi già tolto di mezzo.
 *
 * Due fonti alternate, una carta per una, ognuna con la sua targhetta:
 * le raccomandazioni di AniList e quelle scritte dai lettori italiani
 * su AnimeClick. La seconda passa dal backend ed è più lenta, quindi la
 * fila si disegna con la prima e si ricompone quando arriva l'altra —
 * la stessa regola dei titoli simili dentro la scheda di una serie.
 *
 * È un valore aggiunto, non un dato della collezione: se non risponde
 * nessuno, l'intera sezione sparisce senza lasciare un riquadro
 * d'errore. Nessuno deve accorgersi che è stata provata e non è andata.
 */
export default function ConsigliRail({ serie }) {
  const attivo = serie.length > 0;

  const daAniList = useRisorsa(() => consigliaSerie(serie), { attivo });
  const daAnimeClick = useRisorsa(() => consigliaSerieAnimeClick(serie), { attivo });

  const consigli = useMemo(
    () => intreccia(daAniList.dati || [], daAnimeClick.dati || []),
    [daAniList.dati, daAnimeClick.dati]
  );

  const inCorso = daAniList.inCorso || daAnimeClick.inCorso;

  if (!inCorso && !consigli.length) return null;

  return (
    <Sezione
      titolo="Da scoprire"
      extra={
        <span className="text-xs text-ink-faint">
          quello che non hai ancora, scelto dai tuoi preferiti
        </span>
      }
    >
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {consigli.map((m) => (
          <CartaConsiglio key={m.idEsterno} manga={m} />
        ))}

        {inCorso &&
          Array.from({ length: Math.max(0, 4 - consigli.length) }).map((_, i) => (
            <div key={`attesa-${i}`} className="w-36 shrink-0 space-y-2 sm:w-40">
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
  anilist: { testo: "AniList", stile: "text-lapis" },
  animeclick: { testo: "AnimeClick", stile: "text-brass-300" }
};

function CartaConsiglio({ manga }) {
  // Il romaji ("Hagane no Renkinjutsushi") è quello che AniList
  // preferisce di default, ma è irriconoscibile per chi non legge
  // giapponese. L'inglese ("Fullmetal Alchemist") è la forma con cui
  // la serie si conosce davvero da queste parti — non è la scheda
  // italiana ufficiale, che AniList non ha, ma è la scelta più onesta
  // fra quello che c'è. Da AnimeClick invece il titolo arriva già
  // italiano, ed è quello giusto senza scegliere niente.
  const titolo = manga.titoloInglese || manga.titolo;
  const targhetta = TARGHETTE[manga.fonte] || TARGHETTE.anilist;

  return (
    <a
      href={manga.collegamento || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-36 shrink-0 outline-none transition-transform duration-base ease-settle
                 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brass-400 sm:w-40"
      title={`${titolo} — apri su ${targhetta.testo}`}
    >
      <div className="relative">
        <Copertina src={manga.copertina} alt={titolo} riempi />

        {manga.voto !== null && manga.voto !== undefined && (
          <span className="absolute left-2 top-2 rounded-full bg-void/70 px-2 py-0.5 font-numeric text-xs font-medium text-brass-300 backdrop-blur-sm">
            {manga.voto.toFixed(1)}
          </span>
        )}

        <span
          className={`absolute right-2 top-2 rounded-full bg-void/70 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide backdrop-blur-sm ${targhetta.stile}`}
        >
          {targhetta.testo}
        </span>
      </div>

      <div className="mt-2 space-y-1 px-0.5">
        <h3 className="line-clamp-2 min-h-[2.1rem] text-xs font-medium leading-snug text-ink-bright transition-colors duration-quick group-hover:text-brass-300">
          {titolo}
        </h3>

        {/* Ogni fonte dice quello che sa: AniList i generi dell'opera,
            AnimeClick quante persone l'hanno segnalata. */}
        {manga.generi?.length > 0 ? (
          <p className="truncate text-[0.65rem] text-ink-faint">
            {manga.generi.slice(0, 2).join(" · ")}
          </p>
        ) : (
          manga.segnalazioni > 0 && (
            <p className="truncate text-[0.65rem] text-ink-faint">
              {manga.segnalazioni === 1
                ? "segnalato da un lettore"
                : `segnalato da ${manga.segnalazioni} lettori`}
            </p>
          )
        )}

        {manga.motivo && (
          <p className="line-clamp-2 text-[0.65rem] italic text-brass-500/80">{manga.motivo}</p>
        )}
      </div>
    </a>
  );
}
