import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../app/Icon";
import { giornoPerEsteso, quandoBreveDa, quandoPerEsteso } from "../../dati/cineforum";
import { getAvvisi, segnaAvvisiLetti } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";
import Tondino from "./Tondino";

/**
 * LA CAMPANELLA — cosa è successo che ti riguarda.
 *
 * Il feed dice cosa hanno fatto tutti, e va benissimo finché si legge
 * per curiosità. Ma tre cose non si possono scoprire scorrendo
 * all'indietro: una risposta a un tuo post, un cuore, un commento su
 * una serie che hai visto anche tu. Sono lì dentro, sepolte fra le
 * giornate degli altri, e in pratica non si trovano mai.
 *
 * Le altre due nel feed non ci sono affatto, perché non sono cose
 * dette a tutti: un consiglio che ti hanno mandato, e la notizia che
 * un tuo consiglio è stato aperto. Il primo si vede anche come
 * cartolina a schermo intero (`PostaInArrivo`), ma quello succede una
 * volta sola — passata quella, «chi mi aveva consigliato cosa?» non
 * avrebbe nessun altro posto dove stare.
 *
 * Sta in alto a destra e non nella barra laterale: è una cosa del
 * Cineforum, non del sito, e la barra la vedrebbe anche chi sta
 * sfogliando la biblioteca.
 *
 * ---------------------------------------------------------------
 * APRIRE È LEGGERE
 *
 * Non c'è nessun «segna tutto come letto»: aprire la campanella
 * spegne il pallino, che è quello che chiunque si aspetta. Il segno
 * di «nuovo» però resta acceso sulle righe finché il pannello è
 * aperto — chiuderlo e vederle grigie è giusto, vederle diventare
 * grigie mentre le si legge no.
 *
 * ---------------------------------------------------------------
 * PERCHÉ NON SI CLICCA PER ANDARE AL POST
 *
 * Una risposta e un cuore stanno appesi a un post del feed, che è
 * paginato e non ha un indirizzo suo: portarci vorrebbe dire caricare
 * pagine finché non salta fuori. Il commento invece ce l'ha, la sua
 * scheda, e infatti quello si apre. Per il resto la campanella dice
 * cos'è successo e il post sta lì sotto.
 */

export default function Campanella() {
  const [aperta, setAperta] = useState(false);
  const [dati, setDati] = useState(null);

  // Il momento in cui erano stati visti l'ultima volta, congelato
  // all'apertura: serve a tenere accesi i pallini delle righe nuove
  // mentre le si legge, dopo che il server è già stato avvisato.
  const [primaDi, setPrimaDi] = useState(null);

  const carica = useCallback(() => {
    getAvvisi()
      .then(setDati)
      // Un avviso mancato non è un guasto da mostrare: la campanella
      // resta spenta e si riprova alla prossima apertura. Mettere un
      // errore rosso in cima al Cineforum perché Render dormiva
      // sarebbe peggio del problema.
      .catch(() => {});
  }, []);

  useEffect(carica, [carica]);

  async function apri() {
    setPrimaDi(dati?.visti_il ?? null);
    setAperta(true);

    if (dati?.daLeggere) {
      setDati((d) => ({ ...d, daLeggere: 0 }));

      try {
        await segnaAvvisiLetti();
      } catch {
        // Se il server non registra la lettura il pallino torna alla
        // prossima apertura: è il verso giusto in cui sbagliare.
      }
    }
  }

  const quanti = dati?.daLeggere ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={apri}
        aria-haspopup="dialog"
        aria-label={
          quanti ? `Avvisi — ${quanti} da leggere` : "Avvisi"
        }
        className="relative grid h-10 w-10 place-items-center rounded-full border border-quaderno-riga bg-quaderno-foglio text-quaderno-tenue transition-colors duration-quick hover:text-quaderno-inchiostro
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
      >
        <Icon nome="campanella" dimensione={19} />

        {/* Il pallino conta, non lampeggia soltanto: «hai avvisi» e
            «ne hai sette» sono due notizie diverse. Sopra il nove
            diventa «9+», o il numero non ci sta dentro. */}
        {quanti > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-quaderno-blu px-1 font-numeric text-[0.65rem] font-bold text-white">
            {quanti > 9 ? "9+" : quanti}
          </span>
        )}
      </button>

      {aperta && (
        <Foglietto
          dati={dati}
          primaDi={primaDi}
          chiudi={() => {
            setAperta(false);
            carica();
          }}
        />
      )}
    </>
  );
}

/* ==================================================
   IL PANNELLO
   ================================================== */

function Foglietto({ dati, primaDi, chiudi }) {
  const velo = useChiusuraVelo(chiudi);

  const avvisi = dati?.avvisi ?? [];

  return (
    <Sovrapposizione>
      <div
        {...velo}
        role="dialog"
        aria-label="Avvisi"
        className="fixed inset-0 z-modal flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-start sm:justify-end sm:p-4"
      >
        <div className="flex max-h-[80vh] w-full flex-col rounded-t-sheet border-t border-quaderno-riga bg-quaderno-foglio shadow-float sm:max-w-sm sm:rounded-panel sm:border">
          <header className="flex items-center gap-3 border-b border-quaderno-riga px-4 py-3">
            <h2 className="min-w-0 flex-1 font-display text-base font-semibold text-quaderno-inchiostro">
              Avvisi
            </h2>

            <button
              type="button"
              onClick={chiudi}
              aria-label="Chiudi"
              className="text-quaderno-tenue hover:text-quaderno-inchiostro"
            >
              <Icon nome="close" dimensione={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            {avvisi.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-quaderno-tenue">
                {dati?.daMigrare
                  ? "Il server non ha ancora l'ultima migrazione: fra poco."
                  : "Ancora niente. Qui arrivano le risposte ai tuoi post, i cuori, i commenti sulle serie che hai visto e i consigli che ti mandano."}
              </p>
            ) : (
              <ul className="divide-y divide-quaderno-riga">
                {avvisi.map((a) => (
                  <li key={a.chiave}>
                    <Avviso avviso={a} nuovo={!primaDi || new Date(a.quando) > new Date(primaDi)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Sovrapposizione>
  );
}

/* ==================================================
   UNA RIGA
   ================================================== */

/**
 * Come si chiama il post a cui è appesa una cosa.
 *
 * La chiave dice tutto (vedi `sql/016_cineforum.sql`): `messaggio:12`
 * è quello che hai scritto, `giornata:3:2026-08-21` è quel giorno lì.
 * Dire «al tuo post» e basta costringerebbe ad andare a cercare
 * quale.
 *
 * `tuo` è falso quando il post è di un altro e tu hai solo risposto
 * nello stesso filo: arriva l'avviso lo stesso — è una conversazione
 * a cui partecipi — ma chiamarla «la tua giornata» sarebbe una bugia.
 */
function nomeDelPost(chiave, tuo = true) {
  if (!tuo) return "un filo in cui hai scritto";

  if (!chiave) return "un tuo post";

  if (chiave.startsWith("messaggio:")) return "un tuo messaggio";

  const giorno = chiave.split(":")[2];

  return giorno ? `la tua giornata di ${giornoPerEsteso(giorno)}` : "una tua giornata";
}

function Avviso({ avviso, nuovo }) {
  const dentro = <Contenuto avviso={avviso} nuovo={nuovo} />;

  // Quello che ha una scheda porta alla scheda; risposta e cuore no,
  // perché il post del feed non ha un indirizzo suo.
  //
  // ⚠️ Per i consigli `anime.id` può essere NULL, e non è un caso
  // limite: si consiglia anche quello che nessuno dei due ha in
  // videoteca, e finché nessuno lo aggiunge quella scheda non esiste.
  // Un `<Link to="/videoteca/null">` porterebbe a un 404.
  if (avviso.anime?.id) {
    return (
      <Link
        to={`/videoteca/${avviso.anime.id}`}
        className="block px-4 py-3 transition-colors duration-quick hover:bg-quaderno-carta"
      >
        {dentro}
      </Link>
    );
  }

  return <div className="px-4 py-3">{dentro}</div>;
}

/** Il segno che sta sull'angolo della faccia, uno per tipo di avviso. */
function segnoDi(tipo) {
  if (tipo === "cuore") return "cuore";
  if (tipo === "consiglio" || tipo === "consiglio-aperto") return "busta";

  return "cineforum";
}

function Contenuto({ avviso, nuovo }) {
  return (
    <div className="flex gap-3">
      <div className="relative shrink-0">
        <Tondino utente={avviso.chi} dimensione={34} />

        {/* Il segno di cosa è successo, sull'angolo della faccia: tre
            tipi diversi in un elenco tutto uguale si distinguono
            prima con un simbolo che leggendo il verbo. */}
        <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-quaderno-foglio text-quaderno-blu">
          <Icon nome={segnoDi(avviso.tipo)} dimensione={12} piena={avviso.tipo === "cuore"} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-quaderno-inchiostro">
          <span className="font-semibold">{avviso.chi.nickname}</span> {frase(avviso)}
        </p>

        {avviso.testo && (
          <p className="mt-0.5 line-clamp-2 text-xs text-quaderno-tenue">
            {avviso.spoiler ? "— contiene spoiler —" : avviso.testo}
          </p>
        )}

        <p className="mt-0.5 font-numeric text-[0.7rem] text-quaderno-tenue" title={quandoPerEsteso(avviso.quando)}>
          {quandoBreveDa(avviso.quando)}
        </p>
      </div>

      {nuovo && (
        <span
          aria-label="Nuovo"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-quaderno-blu"
        />
      )}
    </div>
  );
}

function frase(avviso) {
  if (avviso.tipo === "cuore") return `ha messo un cuore a ${nomeDelPost(avviso.post)}`;

  if (avviso.tipo === "risposta") {
    return `ha risposto a ${nomeDelPost(avviso.post, avviso.tuo)}`;
  }

  if (avviso.tipo === "consiglio") return `ti ha consigliato ${avviso.anime.titolo}`;

  // Detta al passato e col titolo dentro: chi ha mandato tre consigli
  // in una settimana deve capire QUALE è stato aperto senza andare a
  // ricostruirlo dalla data.
  if (avviso.tipo === "consiglio-aperto") {
    return `ha aperto il tuo consiglio: ${avviso.anime.titolo}`;
  }

  return avviso.numeroEpisodio == null
    ? `ha commentato ${avviso.anime.titolo}`
    : `ha commentato l'episodio ${avviso.numeroEpisodio} di ${avviso.anime.titolo}`;
}
