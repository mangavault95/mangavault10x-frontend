import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { SEZIONI, SEZIONE_ADMIN, eAttiva, titoloPer } from "./navigation";
import Icon from "./Icon";
import Bibliotecario from "../bibliotecario/Bibliotecario";

/**
 * La cornice fissa attorno a ogni pagina.
 *
 * Su schermo largo è una barra laterale, su mobile una barra in
 * basso: la stessa mappa di navigazione, resa nel modo giusto per
 * ciascun contesto. La posizione non cambia mai da una pagina
 * all'altra, così l'orientamento resta stabile.
 */
export default function Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const contenutoRef = useRef(null);

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

  // Scorciatoie: i tasti 1-5 saltano alle sezioni.
  useEffect(() => {
    function alTasto(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Mai rubare i tasti mentre si sta scrivendo.
      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      const sezione = SEZIONI.find((s) => s.tasto === e.key);
      if (sezione) {
        e.preventDefault();
        navigate(sezione.percorso);
      }
    }

    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-shelf text-ink">
      {/* Luce d'ambiente: immobile, dietro tutto, non intercetta i click */}
      <div className="pointer-events-none fixed inset-0 z-base overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] rounded-full bg-brass-500/[0.07] blur-[140px] animate-glow-pulse" />
        <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-lapis/[0.06] blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-indigo-500/[0.05] blur-[130px]" />
      </div>

      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-lg focus:bg-brass-400 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-void"
      >
        Vai al contenuto
      </a>

      {/* ---------- Barra laterale (da tablet in su) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className="fixed left-0 top-0 z-sticky hidden h-dvh w-rail flex-col items-center gap-2 border-r border-hairline bg-glass-1 py-6 backdrop-blur-xl md:flex"
      >
        <NavLink
          to="/"
          className="mb-4 grid h-11 w-11 place-items-center rounded-card bg-brass-400 font-display text-lg font-semibold text-void transition-transform duration-quick ease-spring hover:scale-105 active:scale-95"
          aria-label="MangaVault, torna allo scaffale"
        >
          M
        </NavLink>

        {SEZIONI.map((sezione) => (
          <VoceMenu
            key={sezione.id}
            sezione={sezione}
            attiva={eAttiva(sezione.percorso, location.pathname)}
          />
        ))}

        <div className="mt-auto">
          <VoceMenu
            sezione={SEZIONE_ADMIN}
            attiva={eAttiva(SEZIONE_ADMIN.percorso, location.pathname)}
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
          e restando qui non si smonta a ogni cambio di rotta. */}
      <Bibliotecario />

      {/* ---------- Barra inferiore (solo mobile) ---------- */}
      <nav
        aria-label="Navigazione principale"
        className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-hairline bg-glass-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
      >
        {/* Gestione non è fra le sezioni quotidiane, ma qui è l'unica
            barra che un telefono ha sempre sotto mano: senza di lei
            /admin da mobile sarebbe raggiungibile solo scrivendo
            l'indirizzo a mano (la vecchia postazione 3D che lo apriva
            non esiste più, sostituita dalla scena del bancone). */}
        {[...SEZIONI, SEZIONE_ADMIN].map((sezione) => {
          const attiva = eAttiva(sezione.percorso, location.pathname);

          return (
            <NavLink
              key={sezione.id}
              to={sezione.percorso}
              aria-current={attiva ? "page" : undefined}
              // 44px minimi di area toccabile, come da linee guida
              className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-quick ${
                attiva ? "text-brass-400" : "text-ink-muted active:text-ink"
              }`}
            >
              {attiva && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brass-400" />
              )}
              <Icon nome={sezione.icona} dimensione={20} />
              <span className="text-[0.65rem] font-medium tracking-wide">
                {sezione.etichetta}
              </span>
            </NavLink>
          );
        })}
      </nav>
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
function VoceMenu({ sezione, attiva }) {
  return (
    <NavLink
      to={sezione.percorso}
      aria-label={sezione.etichetta}
      aria-current={attiva ? "page" : undefined}
      title={`${sezione.etichetta}${sezione.tasto ? ` (${sezione.tasto})` : ""}`}
      className={`group relative grid h-11 w-11 place-items-center rounded-card transition-all duration-quick ease-settle
        ${
          attiva
            ? "bg-brass-400/12 text-brass-400"
            : "text-ink-muted hover:bg-glass-2 hover:text-ink-bright"
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf
        active:scale-95`}
    >
      {/* Indicatore di posizione: una barretta a sinistra */}
      <span
        className={`absolute -left-[1.15rem] h-6 w-0.5 rounded-r-full bg-brass-400 transition-all duration-base ease-spring ${
          attiva ? "opacity-100" : "scale-y-0 opacity-0"
        }`}
      />

      <Icon nome={sezione.icona} dimensione={20} />

      {/* Etichetta a comparsa */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg border border-hairline bg-glass-3 px-3 py-1.5 text-sm font-medium text-ink-bright opacity-0 shadow-raised backdrop-blur-xl transition-all duration-quick ease-settle translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
      >
        {sezione.etichetta}
        {sezione.tasto && (
          <kbd className="ml-2 rounded border border-soft bg-glass-1 px-1.5 py-0.5 font-numeric text-[0.65rem] text-ink-muted">
            {sezione.tasto}
          </kbd>
        )}
      </span>
    </NavLink>
  );
}
