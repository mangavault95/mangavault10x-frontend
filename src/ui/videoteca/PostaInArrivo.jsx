import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../app/Icon";
import { quandoBreveDa } from "../../dati/cineforum";
import { getConsigliInArrivo, segnaConsiglioAperto, urlCopertina } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import Busta, { Indirizzo } from "./Busta";
import Tondino from "./Tondino";

/**
 * LA POSTA — le cartoline che qualcuno ti ha mandato.
 *
 * Sta nella cornice (`Shell`) e non in una pagina, perché non è di
 * nessuna pagina in particolare: è la prima cosa che si vede aprendo
 * il mondo videoteca, da qualunque parte ci si entri. Chi consiglia
 * qualcosa a qualcuno non sa da che indirizzo l'altro riaprirà il
 * sito, e una cartolina che arriva solo su una schermata sarebbe una
 * cartolina che a volte non arriva.
 *
 * ---------------------------------------------------------------
 * UNA PER VOLTA, DALLA PIÙ VECCHIA
 *
 * Se ne sono arrivate tre si aprono in fila, nell'ordine in cui sono
 * state mandate, come si aprirebbe la posta. Mostrarle tutte insieme
 * vorrebbe dire tre copertine piccole in una griglia, cioè un elenco
 * — e un elenco è esattamente quello che la campanella fa già.
 *
 * ---------------------------------------------------------------
 * «APERTA» SI SEGNA QUANDO COMPARE
 *
 * Non alla chiusura. Chi spegne il telefono a metà animazione l'ha
 * comunque vista, e rimostrargliela al prossimo accesso — e a quello
 * dopo — sarebbe il modo sbagliato di sbagliare. È anche l'istante in
 * cui scatta l'avviso per chi l'ha mandata: la stessa riga letta
 * dall'altro capo (vedi `services/campanella.js`).
 */

export default function PostaInArrivo({ apriAggiunta }) {
  const [coda, setCoda] = useState([]);

  // Una volta sola, quando la cornice entra nel mondo videoteca. Non
  // c'è nessun rinfresco periodico: una cartolina non è un messaggio
  // di chat, e interrogare il server ogni trenta secondi per una cosa
  // che arriva una volta a settimana è batteria buttata. Chi ricarica
  // la vede; chi non ricarica ha comunque il pallino della campanella.
  useEffect(() => {
    let vivo = true;

    getConsigliInArrivo()
      .then((esito) => {
        if (vivo) setCoda(esito?.consigli ?? []);
      })
      // Una cartolina mancata non è un guasto da mostrare: si riprova
      // alla prossima apertura. Un errore rosso in cima al sito perché
      // Render dormiva sarebbe peggio del problema.
      .catch(() => {});

    return () => {
      vivo = false;
    };
  }, []);

  if (coda.length === 0) return null;

  return (
    <Cartolina
      // La chiave rimonta il componente da capo a ogni cartolina: senza,
      // la seconda comparirebbe già aperta, con addosso lo stato finale
      // dell'animazione della prima.
      key={coda[0].id}
      consiglio={coda[0]}
      apriAggiunta={apriAggiunta}
      chiudi={() => setCoda((resto) => resto.slice(1))}
    />
  );
}

/* ==================================================
   UNA CARTOLINA
   ================================================== */

/**
 * Quando comincia ciascun pezzo dell'arrivo, in millisecondi.
 *
 * `apertura` è quando la busta ha finito di volare (760 in
 * `tailwind.config.js`, arrotondato a 700 perché l'ultimo pezzo del
 * volo è già quasi fermo) e il lembo comincia a ribaltarsi.
 *
 * `contenuto` è quando il lembo ha finito (620 di ribaltamento). Non
 * un momento prima: tagliarlo a metà — com'era, a 1250 — voleva dire
 * che il lembo non arrivava mai a spalancarsi, e quello è il
 * fotogramma che si sta aspettando da due secondi.
 */
const RITMO = {
  apertura: 700,
  contenuto: 1320
};

function preferisceMenoMovimento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function Cartolina({ consiglio, apriAggiunta, chiudi }) {
  const navigate = useNavigate();

  // Letta al primo render e non in un effetto: in un effetto la busta
  // attraverserebbe comunque lo schermo per un istante prima di essere
  // fermata.
  const [ferma] = useState(preferisceMenoMovimento);

  // `arrivo` → `apertura` → `contenuto`. Chi ha chiesto meno movimento
  // parte già dall'ultima: la notizia è la stessa e arriva subito.
  const [fase, setFase] = useState(ferma ? "contenuto" : "arrivo");

  useEffect(() => {
    if (ferma) return undefined;

    const alLembo = setTimeout(() => setFase("apertura"), RITMO.apertura);
    const alContenuto = setTimeout(() => setFase("contenuto"), RITMO.contenuto);

    return () => {
      clearTimeout(alLembo);
      clearTimeout(alContenuto);
    };
  }, [ferma]);

  useEffect(() => {
    // Se la scrittura non va a buon fine la cartolina ricompare al
    // prossimo accesso, che è il verso giusto in cui sbagliare: meglio
    // rivederla due volte che non vederla mai.
    segnaConsiglioAperto(consiglio.id).catch(() => {});
  }, [consiglio.id]);

  useEffect(() => {
    function alTasto(e) {
      if (e.key === "Escape") chiudi();
    }

    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [chiudi]);

  /**
   * Dove porta la copertina.
   *
   * Alla scheda, quando la serie è in catalogo. Quando non c'è —
   * succede, perché si consiglia anche quello che nessuno dei due ha —
   * porta al pannello «aggiungi», col titolo già scritto dentro:
   * quello è l'unico posto che sa portarsi dietro stagioni, film e
   * OAV, e mandarci chi ha appena ricevuto un consiglio è la cosa più
   * vicina a «aprilo» che si possa fare.
   */
  function apri() {
    chiudi();

    if (consiglio.anime?.id) navigate(`/videoteca/${consiglio.anime.id}`);
    else apriAggiunta?.(consiglio.titolo);
  }

  const copertina = urlCopertina(consiglio.cover_url);

  return (
    <Sovrapposizione>
      <div
        role="dialog"
        aria-label={`${consiglio.da.nickname} ti consiglia ${consiglio.titolo}`}
        className="fixed inset-0 z-modal grid place-items-center overflow-y-auto bg-quaderno-inchiostro/70 p-4 backdrop-blur-sm"
      >
        {/* La ✕ c'è da subito, anche mentre la busta vola: un velo a
            schermo intero senza via d'uscita per due secondi è una
            trappola, per quanto breve. */}
        <button
          type="button"
          onClick={chiudi}
          aria-label="Chiudi"
          className="fixed right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-quaderno-foglio/90 text-quaderno-tenue shadow-lift transition-colors duration-quick hover:text-quaderno-inchiostro
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Icon nome="close" dimensione={18} />
        </button>

        {/* La busta e quello che c'era dentro stanno nella STESSA cella
            di griglia (`col-start-1 row-start-1`), quindi si
            sovrappongono invece di stare in fila. È l'unico modo di non
            avere uno stacco: smontare la busta e montare il contenuto
            lascia un fotogramma vuoto, e per un decimo di secondo lo
            schermo resta nero mentre la cartolina è ancora a opacità
            zero. Così la busta si dissolve MENTRE la cartolina sale, che
            è anche quello che succederebbe davvero. */}
        <div className="relative grid w-full max-w-sm place-items-center py-8">
          <div
            aria-hidden="true"
            className={`pointer-events-none col-start-1 row-start-1 w-full max-w-xs transition-opacity duration-base ${
              fase === "contenuto" ? "opacity-0" : ferma ? "" : "animate-cartolina-arriva"
            }`}
          >
            <Busta
              classeLembo={fase === "apertura" ? "animate-apri-lembo" : ""}
              // Chiusa finché non è il momento: `apri-lembo` parte da
              // rotateX(0), che è già la posizione di riposo, quindi
              // qui non serve scrivere niente — ma il commento sì,
              // perché la busta che PARTE (in `ConsigliaAnime`) fa
              // l'opposto e le due cose vanno lette insieme.
            >
              <Indirizzo>
                <Tondino utente={consiglio.da} dimensione={26} />

                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-quaderno-inchiostro">
                  da {consiglio.da.nickname}
                </span>
              </Indirizzo>
            </Busta>
          </div>

          {fase === "contenuto" && (
            <div
              className={`col-start-1 row-start-1 z-raised flex w-full flex-col items-center gap-3 ${
                ferma ? "" : "animate-esce-dalla-busta"
              }`}
            >
              <div className="flex items-center gap-2">
                <Tondino utente={consiglio.da} dimensione={30} />

                <p className="text-sm text-white">
                  <span className="font-semibold">{consiglio.da.nickname}</span> ti consiglia
                </p>
              </div>

              {/* La copertina è il bottone. Non c'è un «apri» sotto: la
                  cosa che si sta guardando È il collegamento, e un tasto
                  accanto a un'immagine grande quanto lo schermo
                  chiederebbe di cercare altrove quello che si ha già
                  sotto il dito. */}
              <button
                type="button"
                onClick={apri}
                className="w-48 overflow-hidden rounded-lg shadow-float transition-transform duration-base ease-spring hover:scale-[1.03] active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-56"
                aria-label={`Apri ${consiglio.titolo}`}
              >
                {copertina ? (
                  <img
                    src={copertina}
                    alt=""
                    // `eager`: dentro un portale appena montato una lazy
                    // non parte mai — nascerebbe un rettangolo grigio per
                    // sempre, con zero righe nella rete.
                    loading="eager"
                    className="aspect-cover w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-cover w-full place-items-center bg-quaderno-foglio px-3 text-center font-display text-base font-semibold text-quaderno-inchiostro">
                    {consiglio.titolo}
                  </div>
                )}
              </button>

              <p className="text-center font-display text-xl font-bold leading-tight text-white">
                {consiglio.titolo}
              </p>

              {consiglio.testo && (
                <blockquote className="w-full rounded-card bg-quaderno-foglio px-4 py-3 text-sm leading-relaxed text-quaderno-inchiostro shadow-lift">
                  {consiglio.testo}
                </blockquote>
              )}

              <p className="text-center text-xs text-white/70">
                Tocca la copertina per {consiglio.anime?.id ? "aprirla" : "metterla in videoteca"}{" "}
                · {quandoBreveDa(consiglio.mandato_il)}
              </p>
            </div>
          )}
        </div>
      </div>
    </Sovrapposizione>
  );
}
