import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
/*
 * `Link` e non `NavLink`, ed è una correzione, non una preferenza.
 *
 * `NavLink` decide da sé quale voce è quella corrente — combaciando
 * l'inizio dell'indirizzo — e in base a quella decisione scrive
 * `aria-current="page"`. Ma qui chi è la voce corrente lo decide
 * `eAttiva` (`navigation.js`), che segue regole diverse: il Cineforum
 * occupa la radice `/videoteca` e combacia solo esattamente, mentre
 * «Videoteca» vale per tutte le pagine delle persone e per le schede.
 *
 * Finché le due regole coincidevano non si notava. Da quando non
 * coincidono più il disaccordo si vede: su `/videoteca/chi/Nanaki` la
 * linguetta accesa era «Videoteca» ma `aria-current` stava su
 * «Cineforum» — cioè lo schermo diceva una cosa e un lettore di
 * schermo ne annunciava un'altra. Con `Link` la decisione è una sola.
 */
import {
  SCHEDE,
  SEZIONE_GESTIONE,
  eAttiva,
  mondoDi,
  schedaDi,
  sottosezioniDi,
  titoloPer
} from "./navigation";
import Icon from "./Icon";
import Bibliotecario from "../bibliotecario/Bibliotecario";
import Identita from "../ui/Identita";
import { useSessione } from "../dati/sessione";
import SceltaTema from "../ui/SceltaTema";
import Avvisi from "../ui/Avvisi";
import Foglio from "../ui/Foglio";
import TiraPerAggiornare from "../ui/TiraPerAggiornare";
import { ripristino } from "../dati/paginaViva";

/*
 * Due pezzi della videoteca che la cornice ospita ma che non servono per
 * disegnarla: il pannello «Aggiungi» (novecento righe, si apre quando esce
 * una serie nuova) e la posta dei consigli. Fino al 13/11/2026 stavano nel
 * pacchetto iniziale, cioè li scaricava anche chi apriva la Home per
 * segnare un volume. Adesso arrivano la prima volta che servono; nel
 * frattempo non si vede niente, che è quello che si vedeva comunque.
 */
const AggiungiAnime = lazy(() => import("../ui/videoteca/AggiungiAnime"));
const PostaInArrivo = lazy(() => import("../ui/videoteca/PostaInArrivo"));

/**
 * La cornice fissa attorno a ogni pagina.
 *
 * Su schermo largo è una barra laterale, su mobile una barra in
 * basso: la stessa mappa di navigazione, resa nel modo giusto per
 * ciascun contesto. La posizione non cambia mai da una pagina
 * all'altra, così l'orientamento resta stabile.
 *
 * DAL 04/10/2026 LA BARRA È UNA SOLA. Prima la cornice si vestiva come
 * il mondo in cui ci si trovava — ottone in biblioteca, blu e chiaro in
 * videoteca — e un commutatore BIB/VID in cima decideva quale delle due
 * barre mostrare. Adesso i colori li decide il tema di chi guarda
 * (`dati/tema.js`), e la barra è sempre Adesso · Manga · Anime · Cerca ·
 * Tu. Le sezioni di ciascun mondo stanno nella riga in cima alle sue
 * pagine (`Sottosezioni`).
 */

// Le classi stanno scritte per intero e non composte a pezzi: Tailwind
// legge i sorgenti alla lettera, e una classe formata unendo stringhe
// non finirebbe mai nel CSS prodotto.
const VESTE = {
  // Senza fondo proprio: sotto c'è il body, con gli aloni della notte
  // neon (index.css). Nel tema lilla il body è bianco e non cambia niente.
  pagina: "text-ink",
  barra: "border-r border-hairline bg-void/70 backdrop-blur-xl",
  barraBasso: "border-t border-hairline bg-shelf/95 backdrop-blur-xl",
  voceAttiva: "bg-brass-400/12 text-brass-400",
  voceInerte: "text-ink-muted hover:bg-glass-2 hover:text-ink-bright",
  barretta: "bg-brass-400 shadow-[0_0_10px_rgb(var(--c-accento))]",
  tabAttiva: "text-brass-400",
  tabInerte: "text-ink-muted active:text-ink",
  anello: "focus-visible:ring-brass-400 focus-visible:ring-offset-shelf",
  fogliettoBordo: "border-hairline bg-alcove text-ink-bright",
  acceso: "bg-brass-400 text-void"
};

export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contenutoRef = useRef(null);
  const { richieste, utente } = useSessione();
  // Il foglio «Altro» ricorda la pagina su cui è stato aperto, invece
  // di ricordare solo che è aperto. Così cambiando pagina si chiude da
  // sé — anche col tasto Indietro del browser — senza un effetto che
  // rincorra la navigazione per spegnerlo.
  const [apertoSu, setApertoSu] = useState(null);

  const mondo = mondoDi(location.pathname);
  const scheda = schedaDi(location.pathname);
  const tuAperto = apertoSu === location.pathname;
  const veste = VESTE;
  // In Gestione la linguetta «Tu» resta accesa: ci si arriva da lì.
  const inGestione = location.pathname.startsWith(SEZIONE_GESTIONE.percorso);

  /**
   * «Aggiungi una serie», raggiungibile da ovunque nella videoteca.
   *
   * Prima stava solo sulla griglia «tutti i titoli» — un tondo in
   * fondo alla pagina che si trova aprendo Cineforum, poi la propria
   * pagina, poi «Vedi tutto»: tre tocchi per una cosa che si usa ogni
   * volta che esce una serie nuova. Vive qui, nella cornice che non si
   * smonta mai, perché è esattamente il tipo di comando che non deve
   * dipendere da quale pagina della videoteca si sta guardando.
   *
   * Il pannello sta nell'indirizzo (`?aggiungi=`) come stava prima:
   * chi lo apre da Cineforum e poi va Indietro torna a Cineforum con
   * la ricerca ancora scritta, chi lo apre dalla propria pagina torna
   * lì. Non serve una rotta apposta, basta leggere lo stesso parametro
   * a un livello più alto.
   */
  const [parametriAggiunta, setParametriAggiunta] = useSearchParams();
  const puoiAggiungere = scheda === "anime" && Boolean(utente);
  const aggiunta = puoiAggiungere && parametriAggiunta.has("aggiungi");
  const titoloCercato = parametriAggiunta.get("aggiungi") || "";

  /**
   * Apre il pannello, eventualmente con una ricerca già scritta.
   *
   * Il titolo lo passa la cartolina di un consiglio: chi riceve
   * «guarda questo» e tocca la copertina di una serie che in catalogo
   * non c'è deve trovarsi il pannello con dentro il titolo, non una
   * casella vuota da riempire a memoria.
   *
   * ⚠️ Va chiamata SEMPRE con le parentesi (`() => apriAggiunta()`) da
   * un `onClick`: passata nuda, React le consegna l'evento del click e
   * quello finirebbe nell'indirizzo al posto del titolo.
   */
  function apriAggiunta(titolo = "") {
    const nuovi = new URLSearchParams(parametriAggiunta);
    nuovi.set("aggiungi", titolo);
    setParametriAggiunta(nuovi);
  }

  function chiudiAggiunta() {
    const nuovi = new URLSearchParams(parametriAggiunta);
    nuovi.delete("aggiungi");
    setParametriAggiunta(nuovi, { replace: true });
  }

  function ricordaCercato(testo) {
    const nuovi = new URLSearchParams(parametriAggiunta);
    nuovi.set("aggiungi", testo);
    setParametriAggiunta(nuovi, { replace: true });
  }

  // Il titolo della scheda dice dove sei: serve a chi tiene molte
  // schede aperte e a chi salva un indirizzo nei preferiti.
  useEffect(() => {
    document.title = titoloPer(location.pathname);
  }, [location.pathname]);

  // Cambiando pagina il focus va al contenuto: senza questo, chi
  // naviga da tastiera resterebbe fermo sul link appena premuto e
  // dovrebbe ripercorrere tutto il menu a ogni spostamento.
  useEffect(() => {
    contenutoRef.current?.focus({ preventScroll: true });

    // La Collezione che torna da una scheda si è già rimessa dov'era.
    if (ripristino.fatto) ripristino.fatto = false;
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Scorciatoie: 1-4 sono le linguette della barra, nello stesso ordine.
  useEffect(() => {
    function alTasto(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Mai rubare i tasti mentre si sta scrivendo.
      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      const voce = SCHEDE.find((s) => s.tasto === e.key);

      if (voce) {
        e.preventDefault();
        navigate(voce.percorso);
      }
    }

    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [navigate]);

  return (
    <div className={`min-h-dvh ${veste.pagina}`}>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-lg focus:bg-brass-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-void"
      >
        Vai al contenuto
      </a>

      {/* ---------- Barra laterale (da tablet in su) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className={`fixed left-0 top-0 z-sticky hidden h-dvh w-rail flex-col items-center gap-2 py-5 md:flex lg:w-56 lg:items-stretch lg:px-4 ${veste.barra}`}
      >
        {/* Da schermo largo la barra ha posto per il marchio e per i
            nomi: un menu di sole icone costringe a indovinare. */}
        <Link to="/" className="mb-5 hidden items-center gap-2.5 px-2 lg:flex" aria-label="MangaVault, Home">
          <span className="text-brass-400 drop-shadow-[0_0_6px_rgb(var(--c-accento)/0.7)]">
            <Icon nome="portale" dimensione={28} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-ink-bright">MangaVault</span>
        </Link>

        {SCHEDE.map((voce) => (
          <VoceMenu key={voce.id} sezione={voce} veste={veste} attiva={scheda === voce.id} />
        ))}

        <div className="mt-auto flex flex-col items-center gap-3">
          {/* Chi sei. Sopra Gestione perché è la stessa famiglia di
              cose — non è navigazione, è amministrazione di sé. */}
          <Identita mondo={mondo} />

          <VoceMenu
            sezione={SEZIONE_GESTIONE}
            veste={veste}
            attiva={eAttiva(SEZIONE_GESTIONE.percorso, location.pathname)}
            // La pallina è la notifica: qualcuno ha chiesto di entrare
            // e aspetta una risposta. Non è un avviso da schermo intero
            // perché non è urgente — ma deve essere impossibile aprire
            // il sito e non accorgersene.
            pallina={richieste.length}
          />
        </div>
      </nav>

      {/* ---------- Contenuto ---------- */}
      <main
        id="contenuto"
        ref={contenutoRef}
        tabIndex={-1}
        className="relative z-raised min-h-dvh pb-24 outline-none md:ml-rail md:pb-0 lg:ml-56"
      >
        <Sottosezioni
          scheda={scheda}
          percorso={location.pathname}
          aggiungi={puoiAggiungere ? () => apriAggiunta() : null}
        />

        {children}
      </main>

      {/* Il banco sta fuori dal contenuto: si raggiunge da ogni pagina,
          e restando qui non si smonta a ogni cambio di rotta.
          In videoteca non c'è: il bibliotecario risponde di carta,
          volumi ed edizioni, e un banco che non sa niente di quello che
          hai davanti è peggio di un banco assente. */}
      {/* Solo nelle pagine dei manga: su Adesso e su Cerca il bottone
          tondo copriva l'ultima riga, e di là c'è già da cercare. */}
      {scheda === "manga" && <Bibliotecario />}

      {/* ---------- Barra inferiore (solo mobile) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className={`fixed inset-x-0 bottom-0 z-sticky flex pb-[env(safe-area-inset-bottom)] md:hidden ${veste.barraBasso}`}
      >
        {SCHEDE.map((voce) => (
          <Linguetta key={voce.id} sezione={voce} veste={veste} attiva={scheda === voce.id} />
        ))}

        {/* «Tu»: chi sei, il tema, la sala e la Gestione. */}
        <button
          type="button"
          onClick={() => setApertoSu(tuAperto ? null : location.pathname)}
          aria-expanded={tuAperto}
          aria-label="Tu: account, tema e gestione"
          className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-quick ${
            tuAperto || inGestione ? veste.tabAttiva : veste.tabInerte
          }`}
        >
          <span className="relative">
            <Icon nome="persona" dimensione={20} />

            {richieste.length > 0 && (
              <span
                aria-label={`${richieste.length} in attesa`}
                className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-numeric text-[0.6rem] font-bold text-void"
              >
                {richieste.length}
              </span>
            )}
          </span>
          <span className="text-[0.65rem] font-medium tracking-wide">Tu</span>
          {/* La stessa riga del kana delle altre linguette, o «Tu» starebbe
              più in basso di tutte. */}
          <span aria-hidden="true" className={`kana -mt-1 h-3 font-pixel text-[0.55rem] leading-3 ${tuAperto || inGestione ? "opacity-70" : "invisible"}`}>
            あなた
          </span>
        </button>
      </nav>

      {tuAperto && <FoglioTu richieste={richieste.length} chiudi={() => setApertoSu(null)} />}

      <Suspense fallback={null}>
      {aggiunta && (
        <AggiungiAnime
          titoloIniziale={titoloCercato}
          alTitolo={ricordaCercato}
          chiudi={chiudiAggiunta}
          alFatto={(esito) => {
            // Solo «ho finito», e niente «chiudi»: chi ascolta è già
            // andato sulla scheda nuova, e un replace sui parametri
            // della pagina vecchia subito dopo se lo mangerebbe (vedi
            // la stessa nota che c'era prima su ElencoVideotecaPage).
            if (esito?.anime?.id) {
              navigate(`/videoteca/${esito.anime.id}`);
              return;
            }

            chiudiAggiunta();
          }}
        />
      )}

      {/* La posta: le cartoline che qualcuno ti ha consigliato e che
          non hai ancora aperto. Sta nella cornice e non in una pagina
          perché non è di nessuna pagina — è la prima cosa che si vede
          entrando nella videoteca, da qualunque indirizzo ci si
          entri. Stessa condizione dell'«aggiungi»: serve il mondo
          giusto e serve un nome, o non c'è nessuno a cui consegnarla. */}
      {puoiAggiungere && <PostaInArrivo apriAggiunta={apriAggiunta} />}
      </Suspense>

      {/* Gli avvisi («registrato», «Annulla»): uno per tutto il sito, e
          nella cornice perché devono sopravvivere al cambio di pagina. */}
      <Avvisi />

      {/* Tirare giù per aggiornare: nell'app sulla Home non c'è altro modo. */}
      <TiraPerAggiornare />
    </div>
  );
}

/**
 * Voce della barra laterale: icona sempre visibile, etichetta che
 * compare al passaggio del mouse.
 *
 * L'etichetta non è solo decorativa — un menu di sole icone
 * costringe a indovinare. Qui il nome resta comunque disponibile
 * ai lettori di schermo tramite aria-label.
 */
function VoceMenu({ sezione, veste, attiva, pallina = 0 }) {
  return (
    <Link
      to={sezione.percorso}
      aria-label={sezione.etichetta}
      aria-current={attiva ? "page" : undefined}
      title={`${sezione.etichetta}${sezione.tasto ? ` (${sezione.tasto})` : ""}`}
      className={`group relative grid h-11 w-11 place-items-center rounded-card transition-all duration-quick ease-settle
        lg:flex lg:w-full lg:items-center lg:justify-start lg:gap-3 lg:px-3
        ${attiva ? veste.voceAttiva : veste.voceInerte}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${veste.anello}
        active:scale-95`}
    >
      {/* Indicatore di posizione: una barretta a sinistra */}
      <span
        className={`absolute -left-[1.15rem] h-6 w-0.5 rounded-r-full lg:-left-4 transition-all duration-base ease-spring ${veste.barretta} ${
          attiva ? "opacity-100" : "scale-y-0 opacity-0"
        }`}
      />

      <Icon nome={sezione.icona} dimensione={20} />

      <span className="hidden flex-1 text-sm font-medium lg:inline">{sezione.etichetta}</span>
      {sezione.kana && (
        <span aria-hidden="true" className={`kana hidden font-pixel text-[0.65rem] lg:inline ${attiva ? "opacity-80" : "text-ink-faint"}`}>
          {sezione.kana}
        </span>
      )}

      {pallina > 0 && (
        <span
          aria-label={`${pallina} in attesa`}
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-numeric text-[0.6rem] font-bold text-void"
        >
          {pallina}
        </span>
      )}

      {/* Etichetta a comparsa */}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-full ml-3 lg:hidden whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium opacity-0 shadow-raised backdrop-blur-xl transition-all duration-quick ease-settle translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 ${veste.fogliettoBordo}`}
      >
        {sezione.etichetta}
        {sezione.tasto && (
          <kbd className="ml-2 rounded border border-current/20 px-1.5 py-0.5 font-numeric text-[0.65rem] opacity-70">
            {sezione.tasto}
          </kbd>
        )}
      </span>
    </Link>
  );
}

/** Una linguetta della barra del telefono. */
function Linguetta({ sezione, veste, attiva }) {
  return (
    <Link
      to={sezione.percorso}
      aria-current={attiva ? "page" : undefined}
      // 44px minimi di area toccabile, come da linee guida
      className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-quick ${
        attiva ? veste.tabAttiva : veste.tabInerte
      }`}
    >
      {attiva && (
        <span className={`barretta-entra absolute top-0 h-0.5 w-8 rounded-full ${veste.barretta}`} />
      )}

      <span className={attiva ? "icona-sveglia" : undefined}>
        <Icon nome={sezione.icona} dimensione={20} />
      </span>

      <span className="text-[0.65rem] font-medium tracking-wide">{sezione.etichetta}</span>
      {sezione.kana && (
        <span aria-hidden="true" className={`kana -mt-1 h-3 font-pixel text-[0.55rem] leading-3 ${attiva ? "opacity-70" : "invisible"}`}>
          {sezione.kana}
        </span>
      )}
    </Link>
  );
}

/**
 * La riga di linguette in cima alle pagine di un mondo.
 *
 * È quello che resta del vecchio commutatore: le sezioni di Manga
 * (Collezione, In lettura, Wishlist, Numeri, Kachinuki) e di Anime
 * (la propria videoteca, Calendario, Cineforum), a portata di pollice
 * in cima a ogni pagina di quel mondo invece che dentro un menu.
 *
 * Nella videoteca c'è anche «Aggiungi»: prima era il cerchio sollevato
 * al centro della barra, che con cinque linguette fisse sarebbe finito
 * sopra «Anime».
 */
function Sottosezioni({ scheda, percorso, aggiungi }) {
  const voci = sottosezioniDi(scheda);

  if (!voci.length) return null;

  // Tutte in vista dal 02/11/2026. Prima Numeri e Kachinuki stavano dietro
  // un «⋮» che non diceva cosa nascondeva; adesso la riga scorre di lato
  // e sfuma a destra (`sfuma-destra`), che è il segno che c'è altro.
  // Restano linguette sottolineate e non pillole: le pillole sono i
  // filtri qui sotto, e due righe della stessa forma si leggerebbero
  // come due filtri.
  return (
    <>
    <nav
      aria-label={scheda === "manga" ? "Sezioni dei manga" : "Sezioni degli anime"}
      className="mx-4 flex items-end gap-3 border-b border-hairline pt-3 sm:mx-6 lg:mx-8"
    >
      <div className="no-scrollbar sfuma-destra -mb-px flex min-w-0 flex-1 items-end gap-5 overflow-x-auto pr-6">
        {voci.map((voce) => {
          const attiva = eAttiva(voce.percorso, percorso);

          return (
            <Link
              key={voce.id}
              to={voce.percorso}
              aria-current={attiva ? "page" : undefined}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1.5 font-display text-[0.95rem] font-semibold transition-colors duration-quick sm:text-base
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                ${attiva ? "border-brass-400 text-ink-bright [box-shadow:0_6px_12px_-8px_rgb(var(--c-accento))]" : "border-transparent text-ink-muted hover:text-ink-bright"}`}
            >
              {voce.etichetta}
            </Link>
          );
        })}
      </div>

      {aggiungi && (
        <button
          type="button"
          onClick={aggiungi}
          className="mb-2 hidden shrink-0 items-center gap-1.5 rounded-full border border-viola/60 px-3.5 py-2 text-sm font-semibold text-ink-bright transition-colors duration-quick hover:bg-viola/10 active:scale-95 md:inline-flex
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <Icon nome="plus" dimensione={16} />
          Aggiungi
        </button>
      )}
    </nav>

    {/* Sul telefono «Aggiungi» è il tondo in basso a destra, lo stesso
        della Collezione — viola, il colore del mondo degli anime. */}
    {aggiungi && (
      <button
        type="button"
        onClick={aggiungi}
        aria-label="Aggiungi un titolo"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-sticky grid h-14 w-14 place-items-center rounded-full bg-viola text-void shadow-[0_8px_30px_-8px_rgb(var(--c-viola)/0.7)] transition-transform duration-quick active:scale-95 md:hidden
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf"
      >
        <Icon nome="plus" dimensione={24} />
      </button>
    )}
    </>
  );
}

/**
 * Il foglio che si apre da «Tu».
 *
 * Chi sei e la porta per entrare; il tema, che da quando ce n'è uno a
 * testa si può anche scegliere a mano; e le cose che non si aprono ogni
 * giorno: il riassunto del mese e la Gestione, che da mobile devono
 * restare raggiungibili senza scrivere l'indirizzo a mano ma non
 * meritano una linguetta.
 */
function FoglioTu({ richieste, chiudi }) {
  const { utente, esci } = useSessione();

  // Due voci sole. La sala in 3D non c'è più (05/10/2026) e le due
  // Gestioni sono una: dentro, tre linguette (Manga, Anime, Accessi).
  const voci = [
    { id: "mese", percorso: "/mese", etichetta: "Il vostro mese", icona: "calendario" },
    { id: "uscite", percorso: "/uscite", etichetta: "Uscite e spesa", icona: "uscite" },
    { ...SEZIONE_GESTIONE, descrizione: "Correggi schede, stagioni e accessi" }
  ];

  return (
    // Dal 13/11/2026 è il foglio di tutti (`ui/Foglio.jsx`): si trascina
    // giù per chiuderlo, come gli altri. Il titolo c'è ma non si vede —
    // lo dice già la linguetta da cui si apre.
    <Foglio titolo="Tu" titoloNascosto onChiudere={chiudi} className="md:hidden">

        {/* Chi sei, e la porta per diventare qualcuno. */}
        <div className="mb-3 flex items-center gap-3 rounded-card bg-shelf px-3 py-2.5">
          {utente ? (
            <>
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold ${VESTE.acceso}`}
              >
                {(utente.nickname || "?").trim().charAt(0).toUpperCase()}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                Sei <span className="font-semibold">{utente.nickname}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  chiudi();
                  esci();
                }}
                className="shrink-0 rounded-card px-3 py-2 text-sm font-medium opacity-70"
              >
                Esci
              </button>
            </>
          ) : (
            <>
              <Identita compatto />

              <span className="min-w-0 flex-1 text-sm font-medium">Entra o registrati</span>
            </>
          )}
        </div>

        {/* Notte o Giorno (02/11/2026). Anche per chi non è entrato: la
            scelta si ricorda sul suo dispositivo. */}
        <SceltaTema className="mb-3" />

        <ul className="flex flex-col">
          {voci.map((voce) => (
            <li key={voce.id}>
              <Link
                to={voce.percorso}
                onClick={chiudi}
                className={`flex items-center gap-3 rounded-card px-3 py-3 ${VESTE.voceInerte}`}
              >
                <Icon nome={voce.icona} dimensione={20} />

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{voce.etichetta}</span>
                  {voce.descrizione && (
                    <span className="block text-xs font-normal text-ink-muted">{voce.descrizione}</span>
                  )}
                </span>

                {voce.id === SEZIONE_GESTIONE.id && richieste > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1.5 font-numeric text-[0.7rem] font-bold text-void">
                    {richieste}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
    </Foglio>
  );
}
