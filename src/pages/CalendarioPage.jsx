import { useLayoutEffect, useMemo, useRef } from "react";
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

/** Quanto si guarda indietro e quanto avanti, in giorni. */
const INDIETRO = 14;
const AVANTI = 21;

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
 *
 * Le due settimane passate stanno qui dentro, in grigio. Sono due
 * domande diverse fatte allo stesso foglio — "cosa esce stasera" e
 * "mi è sfuggito qualcosa?" — e la seconda senza il passato non ha
 * risposta. Il grigio è quello che le tiene separate senza dover
 * dividere la pagina in due: il colore dice da solo che quel giorno
 * è passato, e la pagina si apre comunque su oggi.
 */
export default function CalendarioPage() {
  const { dati, errore, inCorso, ricarica } = useRisorsa(() =>
    getCalendarioAnime(AVANTI, INDIETRO)
  );

  const { passati, prossimi, daRecuperare } = useMemo(
    () => raggruppaPerGiorno(dati ?? []),
    [dati]
  );

  const inizioPassato = useRef(null);
  const inizioProssimi = useRef(null);
  const giaSpostata = useRef(false);

  // La pagina si apre su oggi, non in cima: in cima c'è il passato, e
  // chi apre il calendario nove volte su dieci vuole sapere cosa esce
  // adesso. Il passato resta un dito di scorrimento più su — e il
  // bottone qui sotto lo dice, perché una cosa fuori schermo che
  // nessuno annuncia è una cosa che non esiste.
  //
  // `useLayoutEffect` e non `useEffect`: lo spostamento avviene prima
  // che il browser disegni, così non si vede la pagina saltare.
  useLayoutEffect(() => {
    if (giaSpostata.current) return;
    if (passati.length === 0 || !inizioProssimi.current) return;

    giaSpostata.current = true;
    porta(inizioProssimi.current, "auto");
  }, [passati.length, prossimi.length]);

  const vuoto = dati && passati.length === 0 && prossimi.length === 0;

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="Cosa esce"
      sommario="Le prossime tre settimane delle serie che segui, con l'ora italiana e dove si vede. Sopra, in grigio, le due passate."
    >
      {inCorso && !dati && <Caricamento testo="Guardo il calendario…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {vuoto && (
        <Vuoto
          titolo="Niente in arrivo"
          sommario="Nessuna delle serie in videoteca ha episodi annunciati nei prossimi giorni, né ne ha avuti nelle due settimane passate. Le date arrivano dal giro quotidiano: se hai appena aggiunto una serie, domattina saranno qui."
        />
      )}

      {passati.length > 0 && (
        <section ref={inizioPassato} className="mb-8">
          <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-quaderno-tenue">
            Già uscite · le due settimane passate
          </p>

          <div className="space-y-6">
            {passati.map((giorno) => (
              <Giorno key={giorno.chiave} giorno={giorno} />
            ))}
          </div>
        </section>
      )}

      {prossimi.length > 0 && (
        <div ref={inizioProssimi} className="scroll-mt-4">
          {passati.length > 0 && (
            <button
              type="button"
              onClick={() => porta(inizioPassato.current, "smooth")}
              className="mb-4 flex w-full items-center gap-3 rounded-lg border border-dashed border-quaderno-riga px-3 py-2
                text-xs text-quaderno-tenue transition-colors duration-quick hover:bg-quaderno-carta
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
            >
              <span aria-hidden="true">↑</span>

              <span>
                Sopra ci sono le due settimane passate
                {daRecuperare > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-quaderno-blu">
                      {daRecuperare} da recuperare
                    </span>
                  </>
                )}
              </span>
            </button>
          )}

          <div className="space-y-6">
            {prossimi.map((giorno) => (
              <Giorno key={giorno.chiave} giorno={giorno} />
            ))}
          </div>
        </div>
      )}

      {!vuoto && dati && (
        <Scheda className="mt-6 p-3 text-center text-xs text-quaderno-tenue">
          Gli orari sono quelli dello streaming italiano, presi da AnimeClick una volta al
          giorno. Il doppiaggio esce a settimane di distanza dai sottotitoli: quando è quello,
          la piattaforma lo dice.
        </Scheda>
      )}
    </PaginaVideoteca>
  );
}

/**
 * Un giorno del calendario, con le sue uscite.
 *
 * `passato` non cambia cosa si vede ma quanto pesa: stesso impianto,
 * inchiostro tenue al posto di quello pieno e copertina schiarita.
 * Un giorno passato che si legge come uno futuro obbliga a leggere la
 * data per capire, e a quel punto tanto valeva non metterlo.
 */
function Giorno({ giorno: { quando, uscite, passato } }) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 border-b border-quaderno-riga pb-1">
        <span
          className={`font-display text-lg font-semibold capitalize ${
            passato ? "text-quaderno-tenue" : "text-quaderno-inchiostro"
          }`}
        >
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
            <Uscita uscita={u} passato={passato} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Una puntata: copertina, numero, ora, piattaforma. */
function Uscita({ uscita: u, passato }) {
  const recuperare = passato && daRecuperareQuesta(u);

  return (
    <Link
      to={`/videoteca/${u.anime_id}`}
      className={`flex items-center gap-3 rounded-card border p-2 transition-shadow hover:shadow-lift
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu ${
          passato
            ? "border-quaderno-riga/60 bg-quaderno-carta/60"
            : "border-quaderno-riga bg-quaderno-foglio"
        }`}
    >
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-quaderno-carta">
        {u.cover_url && (
          <img
            src={urlCopertina(u.cover_url)}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover ${passato ? "opacity-50" : ""}`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${
            passato ? "text-quaderno-tenue" : "text-quaderno-inchiostro"
          }`}
        >
          {u.serie}
        </p>

        <p className="truncate text-xs text-quaderno-tenue">
          episodio {u.numero}
          {u.titolo ? ` · ${u.titolo}` : ""}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`font-numeric text-xs font-semibold ${
              passato ? "text-quaderno-tenue" : "text-quaderno-blu"
            }`}
          >
            {new Date(u.uscita_italia).toLocaleTimeString("it-IT", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Rome"
            })}
          </span>

          {u.piattaforma && <Pillola tono="contorno">{u.piattaforma}</Pillola>}

          {/* L'unica cosa che nel passato resta accesa: è la ragione per
              cui il passato sta in questa pagina. */}
          {recuperare && <Pillola tono="blu">da recuperare</Pillola>}

          {/* Il numero da solo non dice se sei pronto per guardarlo:
              questo sì. Nel passato lo sostituisce «da recuperare». */}
          {!passato && u.ultimo_visto !== null && Number(u.ultimo_visto) < u.numero - 1 && (
            <Pillola>sei all'{Number(u.ultimo_visto)}</Pillola>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Una puntata già uscita che non hai ancora spuntato.
 *
 * `ultimo_visto` è il MASSIMO degli episodi spuntati, non il conto: chi
 * è arrivato alla 12 ha visto anche la 9, e una serie senza nessuna
 * spunta le ha da recuperare tutte.
 *
 * Su una serie droppata non si scrive niente: lì "non l'hai vista" non
 * è un promemoria, è una scelta già fatta.
 */
function daRecuperareQuesta(u) {
  if (u.stato_visione === "droppata") return false;

  return u.ultimo_visto === null || Number(u.ultimo_visto) < u.numero;
}

/** Porta un blocco in cima allo schermo. */
function porta(elemento, comportamento) {
  if (!elemento) return;

  const cima = elemento.getBoundingClientRect().top + window.scrollY - 12;

  window.scrollTo({ top: Math.max(0, cima), behavior: comportamento });
}

/**
 * Le uscite in gruppi di giorno, divise fra passate e prossime.
 *
 * Il taglio è per GIORNO e non per istante: la puntata delle 15:30 di
 * oggi resta fra le prossime anche alle otto di sera. Grigiarla appena
 * esce direbbe "non c'è più" proprio nel momento in cui c'è — è la
 * sera in cui la si guarda.
 */
function raggruppaPerGiorno(uscite) {
  const gruppi = new Map();
  const oggi = giornoDi(new Date());

  for (const u of uscite) {
    const quando = new Date(u.uscita_italia);

    // La chiave è il giorno *italiano*: un episodio dell'una di notte
    // appartiene alla notte prima, non al giorno dopo, per chi lo
    // guarda da qui. In forma AAAA-MM-GG perché così si confronta con
    // un `<`, e "23/8/2026" no.
    const chiave = giornoDi(quando);

    if (!gruppi.has(chiave)) {
      gruppi.set(chiave, { chiave, quando, passato: chiave < oggi, uscite: [] });
    }

    gruppi.get(chiave).uscite.push(u);
  }

  const giorni = [...gruppi.values()];
  const passati = giorni.filter((g) => g.passato);

  return {
    passati,
    prossimi: giorni.filter((g) => !g.passato),
    daRecuperare: passati.reduce(
      (conto, g) => conto + g.uscite.filter(daRecuperareQuesta).length,
      0
    )
  };
}

/** Il giorno italiano di un istante, in forma ordinabile: 2026-08-23. */
function giornoDi(quando) {
  return quando.toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
}

/** "oggi", "ieri", "domani", "venerdì": come si dice a voce. */
function etichettaGiorno(quando) {
  const giorno = giornoDi(quando);
  const oggi = new Date();

  if (giorno === giornoDi(oggi)) return "oggi";
  if (giorno === giornoDi(new Date(oggi.getTime() + 86400000))) return "domani";
  if (giorno === giornoDi(new Date(oggi.getTime() - 86400000))) return "ieri";

  return quando.toLocaleDateString("it-IT", { weekday: "long", timeZone: "Europe/Rome" });
}
