import { useEffect, useRef, useState } from "react";
import Icon from "../../app/Icon";
import { raggruppaCandidati } from "../../dati/videoteca";
import { cercaAnime, mandaConsiglio, urlCopertina } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import Busta, { Indirizzo } from "./Busta";
import { Bottone, Pillola, Scheda } from "./Foglio";
import Tondino from "./Tondino";

/**
 * CONSIGLIARE UN ANIME A QUALCUNO.
 *
 * Il Cineforum è la piazza: si scrive e lo leggono tutti. Questo è
 * l'unico gesto del sito che ha un DESTINATARIO — si sceglie chi, si
 * sceglie cosa, si scrive perché, e quello arriva a lui e a nessun
 * altro.
 *
 * ---------------------------------------------------------------
 * SI CERCA IN TUTTO ANIMECLICK, NON NELLA PROPRIA VIDEOTECA
 *
 * È la differenza che rende utile la funzione. Consigliare quello che
 * si ha già in videoteca è il caso facile; quello che vale è dire
 * «questo che stiamo per cominciare», «questo che ho visto vent'anni
 * fa» — roba che in videoteca non c'è, e che con una ricerca ristretta
 * alle proprie copertine non si potrebbe mandare affatto. È la stessa
 * ricerca di «Aggiungi una serie», con una domanda in più: `per`
 * chiede al server se la serie ce l'ha GIÀ la persona a cui stai per
 * mandarla. Consigliare a qualcuno una cosa che ha finito e votato è
 * l'errore più facile da fare, e senza quel dato si farebbe ogni
 * volta.
 *
 * ---------------------------------------------------------------
 * PERCHÉ L'ANIMAZIONE C'È
 *
 * Non è decorazione. Mandare un consiglio è l'unica cosa qui dentro
 * che ESCE dal proprio schermo e finisce su quello di un altro, e un
 * bottone che diventa grigio con scritto «mandato» non lo racconta:
 * dice che una richiesta ha risposto 201. La copertina che si piega
 * dentro una busta e parte dice che una cosa se n'è andata da qui — e
 * dall'altra parte la stessa busta arriva e si apre (`Cartolina`), che
 * è come si chiude il cerchio.
 */

/**
 * Quando parte ciascun pezzo del volo, in millisecondi dal «manda».
 *
 * Sono ritardi e non uno stato per fotogramma: le tre animazioni le
 * fa il browser, e farle rincorrere da tre `setTimeout` che
 * cambiano stato vorrebbe dire tre occasioni di sfasarsi su un
 * telefono lento. Qui l'unico conto che React tiene è quello finale.
 */
const RITMO = {
  imbusta: 200,
  lembo: 780,
  partenza: 1200,
  fine: 2000
};

/** Il commento sta su una cartolina: oltre queste righe è un post. */
const TESTO_MAX = 600;

function preferisceMenoMovimento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const pausa = (ms) => new Promise((finito) => setTimeout(finito, ms));

export default function ConsigliaAnime({ persona, chiudi, alMandato }) {
  const [scelto, setScelto] = useState(null);
  const [testo, setTesto] = useState("");
  const [inVolo, setInVolo] = useState(false);
  const [errore, setErrore] = useState(null);

  // Letta una volta sola al primo render, e non dentro un effetto:
  // in un effetto la busta partirebbe comunque per un istante prima
  // di essere fermata, cioè proprio l'animazione che qualcuno ha
  // chiesto di non vedere.
  const [ferma] = useState(preferisceMenoMovimento);

  async function manda() {
    if (!scelto || inVolo) return;

    setErrore(null);
    setInVolo(true);

    try {
      // Il volo e la richiesta insieme, non uno dopo l'altro: partono
      // nello stesso istante e si aspetta il più lento dei due. Prima
      // la richiesta vorrebbe dire un secondo di niente col dito
      // ancora sul bottone; prima il volo, due secondi buttati anche
      // quando il server ha già risposto.
      await Promise.all([
        mandaConsiglio({
          a: persona.id,
          animeclickId: scelto.capo.animeclickId,
          titolo: scelto.titolo,
          coverUrl: scelto.copertina,
          testo: testo.trim()
        }),
        pausa(ferma ? 0 : RITMO.fine)
      ]);

      alMandato?.();
      chiudi();
    } catch (err) {
      // Si torna a quello che si stava scrivendo, col testo ancora
      // dentro: una cartolina persa perché Render dormiva è la cosa
      // più facile da riscrivere e la più fastidiosa da riscrivere.
      setInVolo(false);
      setErrore(err);
    }
  }

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center p-3"
        role="dialog"
        aria-label={`Consiglia un anime a ${persona.nickname}`}
      >
        <div className="absolute inset-0 bg-quaderno-inchiostro/40" />

        {inVolo ? (
          <Volo persona={persona} scelto={scelto} ferma={ferma} />
        ) : (
          <Scheda className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden shadow-float">
            {scelto ? (
              <Scrivi
                persona={persona}
                scelto={scelto}
                testo={testo}
                setTesto={setTesto}
                errore={errore}
                indietro={() => setScelto(null)}
                chiudi={chiudi}
                manda={manda}
              />
            ) : (
              <Cerca persona={persona} scegli={setScelto} chiudi={chiudi} />
            )}
          </Scheda>
        )}
      </div>
    </Sovrapposizione>
  );
}

/* ==================================================
   ① CERCARE COSA MANDARE
   ================================================== */

function Cerca({ persona, scegli, chiudi }) {
  const [titolo, setTitolo] = useState("");

  // L'ultima risposta arrivata insieme alla domanda che l'ha
  // prodotta: `per` dice se quello che si vede risponde ancora a
  // quello che c'è scritto, senza un secondo stato «sto caricando» da
  // tenere d'accordo a ogni lettera.
  const [esito, setEsito] = useState(null);

  const annulla = useRef(null);

  const cercato = titolo.trim();

  const righe = cercato.length >= 2 ? (esito?.righe ?? null) : null;
  const errore = esito?.per === cercato ? esito.errore : null;
  const inCorso = cercato.length >= 2 && esito?.per !== cercato;

  useEffect(() => {
    if (cercato.length < 2) return undefined;

    // La stessa pausa di battitura di «Aggiungi una serie»: 300 ms è
    // il punto in cui si smette di scrivere una parola senza che
    // l'attesa si senta.
    const aspetta = setTimeout(async () => {
      annulla.current?.abort();

      const mio = new AbortController();

      annulla.current = mio;

      try {
        const trovati = await cercaAnime(cercato, mio.signal, { per: persona.id });

        setEsito({ per: cercato, righe: raggruppaCandidati(trovati), errore: null });
      } catch (err) {
        // Annullata perché è arrivata una lettera in più: non è
        // successo niente, e la risposta buona sta arrivando.
        if (err?.name === "AbortError") return;

        setEsito({ per: cercato, righe: null, errore: err });
      }
    }, 300);

    return () => clearTimeout(aspetta);
  }, [cercato, persona.id]);

  useEffect(() => () => annulla.current?.abort(), []);

  return (
    <>
      <div className="border-b border-quaderno-riga p-4">
        <div className="flex items-center gap-2">
          <Icon nome="busta" dimensione={18} className="shrink-0 text-quaderno-blu" />

          <p className="text-sm font-semibold text-quaderno-inchiostro">
            Consiglia qualcosa a {persona.nickname}
          </p>
        </div>

        <div className="relative mt-3">
          <input
            autoFocus
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="Scrivi il titolo — in italiano, in originale o in inglese"
            aria-label="Titolo da cercare"
            autoComplete="off"
            className="w-full rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 pr-20 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          <span
            aria-live="polite"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-quaderno-tenue"
          >
            {inCorso ? "cerco…" : righe?.length ? `${righe.length} serie` : ""}
          </span>
        </div>

        <p className="mt-2 text-xs text-quaderno-tenue">
          Si cerca in tutto AnimeClick, non solo nella tua videoteca: quello che vale la pena
          consigliare è di solito quello che nessuno dei due ha ancora.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {errore && (
          <p className="mb-3 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
            {errore.message}
          </p>
        )}

        {righe === null && !inCorso && (
          <p className="py-8 text-center text-sm text-quaderno-tenue">
            Cerca la serie che vuoi mandargli.
          </p>
        )}

        {righe?.length === 0 && !inCorso && (
          <p className="py-8 text-center text-sm text-quaderno-tenue">
            Nessun titolo. Prova con una parola sola, o col nome originale.
          </p>
        )}

        <ul className="space-y-2">
          {righe?.map((riga) => (
            <li key={riga.radice}>
              <button
                type="button"
                onClick={() => scegli(riga)}
                className="flex w-full items-center gap-3 rounded-card border border-quaderno-riga p-2 text-left transition-colors duration-quick hover:bg-quaderno-carta
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-quaderno-carta">
                  {riga.copertina && (
                    <img
                      src={urlCopertina(riga.copertina)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
                    {riga.titolo}
                  </p>

                  <p className="font-numeric text-xs text-quaderno-tenue">
                    {[
                      riga.dal && (riga.al && riga.al !== riga.dal ? `${riga.dal}–${riga.al}` : riga.dal),
                      riga.parti.length > 1 ? `${riga.parti.length} parti` : null
                    ]
                      .filter(Boolean)
                      .join(" · ") || "anno ignoto"}
                  </p>
                </div>

                {/* La targhetta che evita la figuraccia. Non impedisce
                    di mandarla — c'è chi consiglia di RIguardare una
                    cosa, ed è un consiglio legittimo — ma lo dice
                    prima invece che dopo. */}
                {riga.sue > 0 && (
                  <Pillola tono="blu" className="shrink-0">
                    ce l&apos;ha già
                  </Pillola>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end border-t border-quaderno-riga p-3">
        <Bottone onClick={chiudi}>Chiudi</Bottone>
      </div>
    </>
  );
}

/* ==================================================
   ② SCRIVERE PERCHÉ
   ================================================== */

function Scrivi({ persona, scelto, testo, setTesto, errore, indietro, chiudi, manda }) {
  const rimasti = TESTO_MAX - testo.length;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-quaderno-riga p-4">
        <Bottone tono="nudo" onClick={indietro}>
          ← Cambia
        </Bottone>

        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-quaderno-inchiostro">
          A {persona.nickname}
        </p>

        <Tondino utente={persona} dimensione={32} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex gap-3">
          <div className="h-32 w-[5.5rem] shrink-0 overflow-hidden rounded bg-quaderno-carta">
            {scelto.copertina && (
              <img
                src={urlCopertina(scelto.copertina)}
                alt=""
                // `eager` e non `lazy`: dentro un portale appena
                // montato una lazy non parte MAI — il browser decide
                // se caricarla guardando dov'è rispetto alla finestra,
                // e l'elemento nasce quando quel conto è già passato.
                // Si vedrebbe un rettangolo grigio per sempre, con
                // zero righe nella rete.
                loading="eager"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold leading-tight text-quaderno-inchiostro">
              {scelto.titolo}
            </p>

            <p className="mt-1 font-numeric text-xs text-quaderno-tenue">
              {[
                scelto.dal && (scelto.al && scelto.al !== scelto.dal ? `${scelto.dal}–${scelto.al}` : scelto.dal),
                scelto.parti.length > 1 ? `${scelto.parti.length} parti` : null
              ]
                .filter(Boolean)
                .join(" · ") || "anno ignoto"}
            </p>

            {scelto.sue > 0 && (
              <Pillola tono="blu" className="mt-2">
                {persona.nickname} ce l&apos;ha già
              </Pillola>
            )}
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-quaderno-tenue">
            Perché dovrebbe guardarlo
          </span>

          <textarea
            autoFocus
            value={testo}
            onChange={(e) => setTesto(e.target.value.slice(0, TESTO_MAX))}
            rows={4}
            placeholder="Due righe bastano. Si può anche mandare la copertina e basta."
            className="w-full resize-none rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 text-sm leading-relaxed text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />
        </label>

        {/* Il conto solo quando comincia a contare: una cifra che
            scende da 600 a ogni lettera è un cronometro addosso a chi
            scrive. */}
        {rimasti < 100 && (
          <p className="mt-1 text-right font-numeric text-xs text-quaderno-tenue">{rimasti}</p>
        )}

        {errore && (
          <p className="mt-3 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
            {errore.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-quaderno-riga p-3">
        <p className="min-w-0 flex-1 truncate text-xs text-quaderno-tenue">
          Lo vedrà appena riapre la videoteca.
        </p>

        <Bottone onClick={chiudi}>Annulla</Bottone>

        <Bottone tono="pieno" onClick={manda}>
          <Icon nome="busta" dimensione={16} />
          Manda
        </Bottone>
      </div>
    </>
  );
}

/* ==================================================
   ③ IL VOLO
   ================================================== */

/**
 * La copertina che si imbusta e parte.
 *
 * Tre animazioni sfalsate su un elemento ciascuna, con i ritardi di
 * `RITMO`: la copertina scivola dentro, il lembo si chiude sopra, la
 * busta parte. Il gruppo intero porta `spedisci`, quindi quando parte
 * si porta via tutto quello che ha dentro — è una cosa sola che se ne
 * va, non tre cose che spariscono insieme.
 *
 * Chi ha chiesto meno movimento vede la busta ferma con scritto che
 * sta partendo: la notizia è la stessa, e arriva senza che niente
 * attraversi lo schermo.
 */
function Volo({ persona, scelto, ferma }) {
  return (
    <div className="relative w-full max-w-xs" aria-live="polite">
      <div
        className={ferma ? "" : "animate-spedisci"}
        style={ferma ? undefined : { animationDelay: `${RITMO.partenza}ms` }}
      >
        <Busta
          classeLembo={ferma ? "" : "animate-chiudi-lembo"}
          // Il lembo parte APERTO e si chiude dopo. Con solo
          // `forwards` l'animazione non tocca niente finché non
          // comincia, quindi la posizione di partenza dev'essere
          // scritta qui: senza, per otto decimi di secondo si vedrebbe
          // una busta già chiusa che poi si chiude.
          stileLembo={ferma ? undefined : { transform: "rotateX(-176deg)" }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div
              className={`h-60 w-40 overflow-hidden rounded shadow-float ${
                ferma ? "scale-[0.34]" : "animate-imbusta"
              }`}
              style={ferma ? undefined : { animationDelay: `${RITMO.imbusta}ms` }}
            >
              {scelto?.copertina ? (
                <img
                  src={urlCopertina(scelto.copertina)}
                  alt=""
                  loading="eager"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-quaderno-carta px-2 text-center font-display text-sm font-semibold text-quaderno-inchiostro">
                  {scelto?.titolo}
                </div>
              )}
            </div>
          </div>

          <Indirizzo>
            <Tondino utente={persona} dimensione={26} />

            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-quaderno-inchiostro">
              {persona.nickname}
            </span>
          </Indirizzo>
        </Busta>
      </div>

      <p className="mt-6 text-center text-sm font-medium text-white">
        In viaggio verso {persona.nickname}…
      </p>
    </div>
  );
}
