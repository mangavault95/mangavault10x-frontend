import { Link } from "react-router-dom";
import { urlCopertina } from "../../services/api";
import { Pillola, Progresso } from "./Foglio";
import { NOMI_STATO, formattaVoto, quandoBreve } from "./formati";

/**
 * Una serie nella griglia della videoteca.
 *
 * Una SERIE, non una scheda di AnimeClick: quello che arriva qui è già
 * il gruppo con dentro le sue stagioni (`dati/videoteca.js`), e i
 * numeri — puntate viste, prossima uscita — sono la somma di tutte.
 *
 * Mostra tre cose e non una di più: dove sei arrivato, come si chiama,
 * e — se c'è — quando esce il prossimo episodio. Il resto (trama,
 * generi, voti, note) sta nella scheda: una griglia che prova a dire
 * tutto non si legge da nessuna distanza.
 *
 * La copertina passa dal ponte del backend perché AnimeClick non manda
 * gli header CORS, esattamente come per i manga.
 */
export default function CartaAnime({ anime }) {
  const visti = Number(anime.episodi_visti || 0);
  const disponibili = Number(anime.episodi_disponibili || 0);
  const stagioni = Number(anime.quanteStagioni || 1);

  // Il denominatore giusto è quello che esiste davvero, non quello
  // dichiarato: su una serie in corso la scheda dice 24 ma le puntate
  // uscite sono 8, e una barra su 24 farebbe sembrare indietro chi è
  // in pari.
  const su = disponibili || Number(anime.episodi_totali) || null;

  const stato = anime.stato_visione;
  const inPari = su && visti >= su && anime.stato !== "conclusa";

  return (
    <Link
      to={`/videoteca/${anime.id}`}
      // `h-full`: la scheda riempie la riga della griglia.
      //
      // Senza, una copertina con il titolo su due righe rendeva alta
      // la riga e tutte le altre restavano corte, lasciando fra una
      // fila e l'altra dei gradini. La griglia allunga la CELLA (è il
      // comportamento normale di `align-items: stretch`), ma il
      // riquadro dentro la cella non la riempiva.
      className="group flex h-full flex-col overflow-hidden rounded-card border border-quaderno-riga bg-quaderno-foglio transition-shadow duration-quick hover:shadow-lift
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-quaderno-carta">
        {anime.cover_url ? (
          <img
            src={urlCopertina(anime.cover_url)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-base ease-settle group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center px-3 text-center text-xs text-quaderno-tenue">
            {anime.titolo}
          </div>
        )}

        {/* Quello che esce presto si vede senza aprire niente: è la
            ragione per cui uno torna sulla videoteca il venerdì.
            «In pari» sta nello stesso angolo perché risponde alla
            stessa domanda — c'è qualcosa da guardare? — e i due casi
            si escono a vicenda per costruzione: se un episodio è in
            arrivo, in pari non lo sei per definizione. Stando qui
            invece che fra i tag, la riga là sotto resta di una riga
            sola e la barra del progresso non cambia quota da una
            scheda all'altra. */}
        {anime.prossima_uscita ? (
          <span className="absolute left-2 top-2 rounded-full bg-quaderno-blu px-2 py-0.5 font-numeric text-[0.65rem] font-semibold text-white">
            ep {anime.prossimo_episodio} · {quandoBreve(anime.prossima_uscita)}
          </span>
        ) : (
          inPari && (
            <span className="absolute left-2 top-2 rounded-full bg-quaderno-foglio/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
              in pari
            </span>
          )
        )}

        {/* Quante stagioni ci sono là dentro. Senza, un pannello solo
            al posto di due sembrerebbe una serie sparita. */}
        {stagioni > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-quaderno-foglio/90 px-2 py-0.5 font-numeric text-[0.65rem] font-semibold text-quaderno-inchiostro">
            {stagioni} stagioni
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Il titolo occupa DUE RIGHE sempre, anche quando ne serve
            una. È la seconda metà del rimedio ai gradini: con
            `h-full` le schede sono già alte uguale, ma quelle dal
            titolo corto tenevano il vuoto in mezzo — barra del
            progresso e stato scendevano più in basso delle vicine, e
            due schede accanto sembravano disegnate in due momenti
            diversi. Riservando lo spazio, tutto quello che sta sotto
            si allinea da una scheda all'altra.

            `min-h` e non `h`: un titolo che a una certa larghezza
            occupasse tre righe verrebbe tagliato da `line-clamp-2`,
            ma su un carattere più grande — o su chi ingrandisce il
            testo dal telefono — l'altezza deve poter crescere invece
            di far uscire le lettere dal riquadro. */}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-quaderno-inchiostro">
          {anime.titolo}
        </h3>

        <div className="mt-auto space-y-2">
          <Progresso visti={visti} su={su} />

          {/* UNA riga, sempre alta uguale, anche quando è vuota.
              Prima era `flex-wrap` con dentro fino a tre cose: le
              schede con due tag mandavano il voto a capo, il blocco
              cresceva verso l'alto (è ancorato in basso da `mt-auto`)
              e la barra del progresso si alzava di venti pixel
              rispetto alla scheda accanto. Con l'altezza riservata e
              niente ritorno a capo, tutte le barre stanno sulla stessa
              linea qualunque cosa ci sia sotto. */}
          <div className="flex h-5 items-center gap-1.5 overflow-hidden">
            {stato && (
              <Pillola
                tono={stato === "in_visione" ? "blu" : "tenue"}
                className="min-w-0 shrink truncate"
              >
                {NOMI_STATO[stato]}
              </Pillola>
            )}

            {anime.voto && (
              <span className="ml-auto shrink-0 font-numeric text-xs font-semibold text-quaderno-blu">
                ★ {formattaVoto(anime.voto)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
