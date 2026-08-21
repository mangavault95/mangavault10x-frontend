import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  MONDI,
  SEZIONE_ADMIN,
  eAttiva,
  mondoDi,
  primarieDi,
  secondarieDi,
  sezioniDi,
  titoloPer
} from "./navigation";
import Icon from "./Icon";
import Bibliotecario from "../bibliotecario/Bibliotecario";
import Identita from "../ui/Identita";
import { useSessione } from "../dati/sessione";

/**
 * La cornice fissa attorno a ogni pagina.
 *
 * Su schermo largo è una barra laterale, su mobile una barra in
 * basso: la stessa mappa di navigazione, resa nel modo giusto per
 * ciascun contesto. La posizione non cambia mai da una pagina
 * all'altra, così l'orientamento resta stabile.
 *
 * Da quando i mondi sono due (vedi `navigation.js`), la cornice fa una
 * cosa in più: si veste come il mondo in cui ci si trova. La
 * biblioteca resta ottone su legno scuro, la videoteca è chiara e blu
 * — l'idea è che passando di là si abbia l'impressione di essere
 * altrove, pur restando nello stesso sito.
 */

// I due vestiti. Le classi stanno scritte per intero e non composte a
// pezzi: Tailwind legge i sorgenti alla lettera, e una classe formata
// unendo stringhe non finirebbe mai nel CSS prodotto.
const VESTITO = {
  biblioteca: {
    pagina: "bg-shelf text-ink",
    barra: "border-r border-hairline bg-glass-1 backdrop-blur-xl",
    barraBasso: "border-t border-hairline bg-glass-3 backdrop-blur-2xl",
    voceAttiva: "bg-brass-400/12 text-brass-400",
    voceInerte: "text-ink-muted hover:bg-glass-2 hover:text-ink-bright",
    barretta: "bg-brass-400",
    tabAttiva: "text-brass-400",
    tabInerte: "text-ink-muted active:text-ink",
    anello: "focus-visible:ring-brass-400 focus-visible:ring-offset-shelf",
    fogliettoBordo: "border-hairline bg-glass-3 text-ink-bright",
    commutatoreFondo: "bg-glass-2",
    commutatoreAcceso: "bg-brass-400 text-void",
    commutatoreSpento: "text-ink-muted hover:text-ink-bright",
    ambiente: true
  },
  videoteca: {
    pagina: "bg-quaderno-carta text-quaderno-inchiostro",
    barra: "border-r border-quaderno-riga bg-quaderno-foglio",
    barraBasso: "border-t border-quaderno-riga bg-quaderno-foglio",
    voceAttiva: "bg-quaderno-blu-tenue text-quaderno-blu",
    voceInerte: "text-quaderno-tenue hover:bg-quaderno-carta hover:text-quaderno-inchiostro",
    barretta: "bg-quaderno-blu",
    tabAttiva: "text-quaderno-blu",
    tabInerte: "text-quaderno-tenue active:text-quaderno-inchiostro",
    anello: "focus-visible:ring-quaderno-blu focus-visible:ring-offset-quaderno-carta",
    fogliettoBordo: "border-quaderno-riga bg-quaderno-foglio text-quaderno-inchiostro",
    commutatoreFondo: "bg-quaderno-carta",
    commutatoreAcceso: "bg-quaderno-blu text-white",
    commutatoreSpento: "text-quaderno-tenue hover:text-quaderno-inchiostro",
    ambiente: false
  }
};

export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contenutoRef = useRef(null);
  const { richieste } = useSessione();
  // Il foglio «Altro» ricorda la pagina su cui è stato aperto, invece
  // di ricordare solo che è aperto. Così cambiando pagina si chiude da
  // sé — anche col tasto Indietro del browser — senza un effetto che
  // rincorra la navigazione per spegnerlo.
  const [apertoSu, setApertoSu] = useState(null);

  const mondo = mondoDi(location.pathname);
  const altroAperto = apertoSu === location.pathname;
  const veste = VESTITO[mondo];
  const primarie = primarieDi(mondo);
  const secondarie = secondarieDi(mondo);

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
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  // Scorciatoie: i numeri saltano alle sezioni del mondo acceso, B e V
  // cambiano mondo. I numeri ripartono da 1 di là — sono i piani di un
  // palazzo, e ogni piano ha la sua stanza 1.
  useEffect(() => {
    function alTasto(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Mai rubare i tasti mentre si sta scrivendo.
      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      const altroMondo = MONDI.find((m) => m.tasto === e.key.toLowerCase());

      if (altroMondo) {
        e.preventDefault();
        navigate(altroMondo.casa);
        return;
      }

      const sezione = sezioniDi(mondo).find((s) => s.tasto === e.key);

      if (sezione) {
        e.preventDefault();
        navigate(sezione.percorso);
      }
    }

    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [navigate, mondo]);

  return (
    <div className={`min-h-dvh ${veste.pagina}`}>
      {/* Luce d'ambiente: immobile, dietro tutto, non intercetta i click.
          Solo in biblioteca — su carta chiara le stesse aureole
          sembrerebbero aloni di umidità. */}
      {veste.ambiente && (
        <div className="pointer-events-none fixed inset-0 z-base overflow-hidden">
          <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] rounded-full bg-brass-500/[0.07] blur-[140px] animate-glow-pulse" />
          <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-lapis/[0.06] blur-[150px]" />
          <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.05] blur-[130px]" />
        </div>
      )}

      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-lg focus:bg-brass-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-void"
      >
        Vai al contenuto
      </a>

      {/* ---------- Barra laterale (da tablet in su) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className={`fixed left-0 top-0 z-sticky hidden h-dvh w-rail flex-col items-center gap-2 py-5 md:flex ${veste.barra}`}
      >
        <Commutatore mondo={mondo} veste={veste} />

        {sezioniDi(mondo).map((sezione) => (
          <VoceMenu
            key={sezione.id}
            sezione={sezione}
            veste={veste}
            attiva={eAttiva(sezione.percorso, location.pathname)}
          />
        ))}

        <div className="mt-auto flex flex-col items-center gap-3">
          {/* Chi sei. Sopra Gestione perché è la stessa famiglia di
              cose — non è navigazione, è amministrazione di sé. */}
          <Identita />

          <VoceMenu
            sezione={SEZIONE_ADMIN}
            veste={veste}
            attiva={eAttiva(SEZIONE_ADMIN.percorso, location.pathname)}
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
        className="relative z-raised min-h-dvh pb-24 outline-none md:ml-rail md:pb-0 animate-rise-in"
      >
        {children}
      </main>

      {/* Il banco sta fuori dal contenuto: si raggiunge da ogni pagina,
          e restando qui non si smonta a ogni cambio di rotta.
          In videoteca non c'è: il bibliotecario risponde di carta,
          volumi ed edizioni, e un banco che non sa niente di quello che
          hai davanti è peggio di un banco assente. */}
      {mondo === "biblioteca" && <Bibliotecario />}

      {/* ---------- Barra inferiore (solo mobile) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className={`fixed inset-x-0 bottom-0 z-sticky flex pb-[env(safe-area-inset-bottom)] md:hidden ${veste.barraBasso}`}
      >
        {primarie.map((sezione) => (
          <Linguetta
            key={sezione.id}
            sezione={sezione}
            veste={veste}
            attiva={eAttiva(sezione.percorso, location.pathname)}
          />
        ))}

        {/* «Altro» tiene insieme quello che non si apre ogni giorno e il
            passaggio all'altro mondo. È l'unico modo di stare dentro le
            cinque linguette che un telefono regge senza tagliare le
            parole a metà. */}
        <button
          type="button"
          onClick={() => setApertoSu(altroAperto ? null : location.pathname)}
          aria-expanded={altroAperto}
          aria-label="Altre sezioni"
          className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-quick ${
            altroAperto ? veste.tabAttiva : veste.tabInerte
          }`}
        >
          <span className="relative">
            <Icon nome="menu" dimensione={20} />

            {richieste.length > 0 && (
              <span
                aria-label={`${richieste.length} in attesa`}
                className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 font-numeric text-[0.6rem] font-bold text-void"
              >
                {richieste.length}
              </span>
            )}
          </span>
          <span className="text-[0.65rem] font-medium tracking-wide">Altro</span>
        </button>
      </nav>

      {altroAperto && (
        <FoglioAltro
          mondo={mondo}
          veste={veste}
          secondarie={secondarie}
          richieste={richieste.length}
          chiudi={() => setApertoSu(null)}
        />
      )}
    </div>
  );
}

/**
 * Il commutatore fra i due mondi, in cima alla barra.
 *
 * Prima qui c'era il battente della biblioteca — una porta di legno
 * con la maniglia, che riportava alla stanza d'ingresso. Adesso quel
 * ritorno è la prima voce del mondo biblioteca, e il posto in cima
 * serve a una domanda più grande: in quale metà del sito ti trovi.
 *
 * Sono due bottoni e non un interruttore a scivolo: uno scivolo dice
 * "acceso/spento", e nessuno dei due mondi è lo spegnimento dell'altro.
 */
function Commutatore({ mondo, veste }) {
  return (
    <div
      role="group"
      aria-label="Cambia sezione del sito"
      className={`mb-4 flex w-[3.25rem] flex-col gap-1 rounded-card p-1 ${veste.commutatoreFondo}`}
    >
      {MONDI.map((m) => {
        const acceso = m.id === mondo;

        return (
          <NavLink
            key={m.id}
            to={m.casa}
            aria-current={acceso ? "true" : undefined}
            title={`${m.etichetta} (${m.tasto.toUpperCase()})`}
            className={`grid h-8 place-items-center rounded-lg text-[0.6rem] font-semibold uppercase tracking-wider transition-colors duration-quick
              focus-visible:outline-none focus-visible:ring-2 ${veste.anello}
              ${acceso ? veste.commutatoreAcceso : veste.commutatoreSpento}`}
          >
            {/* Tre lettere, non l'icona: qui sotto le icone sono già
                sei, e due in più a distinguere due mondi si
                confonderebbero con le sezioni. */}
            {m.etichetta.slice(0, 3)}
          </NavLink>
        );
      })}
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
    <NavLink
      to={sezione.percorso}
      aria-label={sezione.etichetta}
      aria-current={attiva ? "page" : undefined}
      title={`${sezione.etichetta}${sezione.tasto ? ` (${sezione.tasto})` : ""}`}
      className={`group relative grid h-11 w-11 place-items-center rounded-card transition-all duration-quick ease-settle
        ${attiva ? veste.voceAttiva : veste.voceInerte}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${veste.anello}
        active:scale-95`}
    >
      {/* Indicatore di posizione: una barretta a sinistra */}
      <span
        className={`absolute -left-[1.15rem] h-6 w-0.5 rounded-r-full transition-all duration-base ease-spring ${veste.barretta} ${
          attiva ? "opacity-100" : "scale-y-0 opacity-0"
        }`}
      />

      <Icon nome={sezione.icona} dimensione={20} />

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
        className={`pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium opacity-0 shadow-raised backdrop-blur-xl transition-all duration-quick ease-settle translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 ${veste.fogliettoBordo}`}
      >
        {sezione.etichetta}
        {sezione.tasto && (
          <kbd className="ml-2 rounded border border-current/20 px-1.5 py-0.5 font-numeric text-[0.65rem] opacity-70">
            {sezione.tasto}
          </kbd>
        )}
      </span>
    </NavLink>
  );
}

/** Una linguetta della barra del telefono. */
function Linguetta({ sezione, veste, attiva }) {
  return (
    <NavLink
      to={sezione.percorso}
      aria-current={attiva ? "page" : undefined}
      // 44px minimi di area toccabile, come da linee guida
      className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-quick ${
        attiva ? veste.tabAttiva : veste.tabInerte
      }`}
    >
      {attiva && (
        <span className={`absolute top-0 h-0.5 w-8 rounded-full ${veste.barretta}`} />
      )}

      <Icon nome={sezione.icona} dimensione={20} />

      <span className="text-[0.65rem] font-medium tracking-wide">{sezione.etichetta}</span>
    </NavLink>
  );
}

/**
 * Il foglio che si apre da «Altro» sul telefono.
 *
 * In cima il passaggio fra i mondi, sotto le sezioni che non si aprono
 * ogni giorno e Gestione. Gestione sta qui e non fra le linguette per
 * la ragione di sempre: da mobile deve restare raggiungibile senza
 * scrivere l'indirizzo a mano, ma non merita un quinto dello schermo.
 */
function FoglioAltro({ mondo, veste, secondarie, richieste, chiudi }) {
  const voci = [...secondarie, SEZIONE_ADMIN];

  return (
    <div className="fixed inset-0 z-modal md:hidden" role="dialog" aria-label="Altre sezioni">
      {/* Il velo: toccare fuori chiude, che è il gesto che tutti provano. */}
      <button
        type="button"
        aria-label="Chiudi"
        onClick={chiudi}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />

      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-sheet border-t p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-float ${veste.fogliettoBordo}`}
      >
        <div className={`mx-auto mb-4 h-1 w-10 rounded-full ${veste.barretta} opacity-30`} />

        <div className={`mb-4 flex gap-1 rounded-card p-1 ${veste.commutatoreFondo}`}>
          {MONDI.map((m) => {
            const acceso = m.id === mondo;

            return (
              <NavLink
                key={m.id}
                to={m.casa}
                onClick={chiudi}
                aria-current={acceso ? "true" : undefined}
                className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors duration-quick ${
                  acceso ? veste.commutatoreAcceso : veste.commutatoreSpento
                }`}
              >
                {m.etichetta}
              </NavLink>
            );
          })}
        </div>

        <ul className="flex flex-col">
          {voci.map((sezione) => (
            <li key={sezione.id}>
              <NavLink
                to={sezione.percorso}
                onClick={chiudi}
                className={`flex items-center gap-3 rounded-card px-3 py-3 ${veste.voceInerte}`}
              >
                <Icon nome={sezione.icona} dimensione={20} />

                <span className="flex-1 text-sm font-medium">{sezione.etichetta}</span>

                {sezione.id === "admin" && richieste > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1.5 font-numeric text-[0.7rem] font-bold text-void">
                    {richieste}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
