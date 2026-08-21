import { useMemo } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { getCalendarioAnime, urlCopertina } from "../services/api";
import PaginaVideoteca, {
  Caricamento,
  Errore,
  Pillola,
  Scheda,
  Vuoto
} from "../ui/videoteca/Foglio";

/**
 * Quando escono i prossimi episodi — in Italia, con l'ora italiana.
 *
 * Le date arrivano dal calendario di AnimeClick attraverso il giro
 * quotidiano del backend: la pagina legge dal nostro database e non da
 * un sito altrui, così si apre anche quando quel sito è giù.
 *
 * Ci sono solo le serie in videoteca. Un calendario di tutto quello
 * che esce in Italia sarebbe un palinsesto — utile a qualcun altro,
 * non a chi vuole sapere cosa deve guardare stasera.
 */
export default function CalendarioPage() {
  const { dati, errore, inCorso, ricarica } = useRisorsa(() => getCalendarioAnime(21));

  const giorni = useMemo(() => raggruppaPerGiorno(dati ?? []), [dati]);

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="Cosa esce"
      sommario="Le prossime tre settimane delle serie che segui, con l'ora italiana e dove si vede."
    >
      {inCorso && !dati && <Caricamento testo="Guardo il calendario…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && giorni.length === 0 && (
        <Vuoto
          titolo="Niente in arrivo"
          sommario="Nessuna delle serie in videoteca ha episodi annunciati nei prossimi giorni. Le date arrivano dal giro quotidiano: se hai appena aggiunto una serie, domattina saranno qui."
        />
      )}

      <div className="space-y-6">
        {giorni.map(({ chiave, quando, uscite }) => (
          <section key={chiave}>
            <h2 className="mb-2 flex items-baseline gap-2 border-b border-quaderno-riga pb-1">
              <span className="font-display text-lg font-semibold capitalize text-quaderno-inchiostro">
                {etichettaGiorno(quando)}
              </span>
              <span className="font-numeric text-xs text-quaderno-tenue">
                {quando.toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Rome"
                })}
              </span>
            </h2>

            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {uscite.map((u) => (
                <li key={`${u.anime_id}-${u.numero}`}>
                  <Link
                    to={`/videoteca/${u.anime_id}`}
                    className="flex items-center gap-3 rounded-card border border-quaderno-riga bg-quaderno-foglio p-2 transition-shadow hover:shadow-lift
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
                  >
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-quaderno-carta">
                      {u.cover_url && (
                        <img
                          src={urlCopertina(u.cover_url)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
                        {u.serie}
                      </p>

                      <p className="truncate text-xs text-quaderno-tenue">
                        episodio {u.numero}
                        {u.titolo ? ` · ${u.titolo}` : ""}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="font-numeric text-xs font-semibold text-quaderno-blu">
                          {new Date(u.uscita_italia).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Rome"
                          })}
                        </span>

                        {u.piattaforma && <Pillola tono="contorno">{u.piattaforma}</Pillola>}

                        {/* Il numero da solo non dice se sei pronto per
                            guardarlo: questo sì. */}
                        {u.ultimo_visto !== null && Number(u.ultimo_visto) < u.numero - 1 && (
                          <Pillola>
                            sei all'{Number(u.ultimo_visto)}
                          </Pillola>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {dati && giorni.length > 0 && (
        <Scheda className="mt-6 p-3 text-center text-xs text-quaderno-tenue">
          Gli orari sono quelli dello streaming italiano, presi da AnimeClick una volta al
          giorno. Il doppiaggio esce a settimane di distanza dai sottotitoli: quando è quello,
          la piattaforma lo dice.
        </Scheda>
      )}
    </PaginaVideoteca>
  );
}

/** Le uscite in gruppi di giorno, nell'ordine in cui arrivano. */
function raggruppaPerGiorno(uscite) {
  const gruppi = new Map();

  for (const u of uscite) {
    const quando = new Date(u.uscita_italia);

    // La chiave è il giorno *italiano*: un episodio dell'una di notte
    // appartiene alla notte prima, non al giorno dopo, per chi lo
    // guarda da qui.
    const chiave = quando.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });

    if (!gruppi.has(chiave)) gruppi.set(chiave, { chiave, quando, uscite: [] });

    gruppi.get(chiave).uscite.push(u);
  }

  return [...gruppi.values()];
}

/** "oggi", "domani", "venerdì": come si dice a voce. */
function etichettaGiorno(quando) {
  const oggi = new Date();
  const domani = new Date(oggi.getTime() + 86400000);

  const stessoGiorno = (a, b) =>
    a.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" }) ===
    b.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });

  if (stessoGiorno(quando, oggi)) return "oggi";
  if (stessoGiorno(quando, domani)) return "domani";

  return quando.toLocaleDateString("it-IT", { weekday: "long", timeZone: "Europe/Rome" });
}
