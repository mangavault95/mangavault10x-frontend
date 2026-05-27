import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";
import ReadingSessionAddModal from "./ReadingSessionAddModal";

/* -------------------- ICONS -------------------- */

function StarIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.7 14.9 8.6l6.5.95-4.7 4.58 1.1 6.47L12 17.55 6.2 20.6l1.1-6.47-4.7-4.58 6.5-.95L12 2.7Z" />
    </svg>
  );
}

function ClockIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3.2 2" />
    </svg>
  );
}

function CalendarIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9h16" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function TrophyIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10" />
      <path d="M16 6h2.5A2.5 2.5 0 0 1 16 10" />
      <path d="M12 12v4" />
      <path d="M9 20h6" />
      <path d="M10 16h4" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 12h12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M8 4v6h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* -------------------- SIDE SWITCH -------------------- */

function SideSwitch({ session, direction, onClick }) {
  if (!session) {
    return <div className="h-[56px]" />;
  }

  const isLeft = direction === "left";

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className="text-[10px] text-zinc-500 text-center truncate w-full max-w-[56px]"
        title={session.titolo || ""}
      >
        {session.titolo || (isLeft ? "Precedente" : "Successivo")}
      </div>

      <button
        type="button"
        onClick={onClick}
        className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.05] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/10 transition flex items-center justify-center"
        title={isLeft ? "Manga precedente" : "Manga successivo"}
      >
        {isLeft ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </button>
    </div>
  );
}

/* -------------------- COMPONENT -------------------- */

export default function Sidebar({ open = true }) {
  const API = import.meta.env.VITE_API_URL;

  const [manga, setManga] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openAddSession, setOpenAddSession] = useState(false);

  async function loadManga() {
    try {
      const res = await fetch(`${API}/api/manga`);
      const data = await res.json();
      setManga(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento manga:", err);
      setManga([]);
    }
  }

  async function loadSessions() {
    try {
      const res = await fetch(`${API}/api/reading-sessions`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      setSessions(list);

      const storedActiveId = localStorage.getItem("mv_active_session_manga_id");
      if (storedActiveId && list.length > 0) {
        const idx = list.findIndex(
          (s) => String(s.manga_id) === String(storedActiveId)
        );
        setActiveIndex(idx >= 0 ? idx : 0);
      } else {
        setActiveIndex(0);
      }
    } catch (err) {
      console.error("Errore caricamento reading sessions:", err);
      setSessions([]);
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    loadManga();
    loadSessions();
  }, []);

  useEffect(() => {
    const refreshAll = () => {
      loadManga();
      loadSessions();
    };

    window.addEventListener("favoritesUpdated", refreshAll);
    window.addEventListener("currentReadingUpdated", refreshAll);

    return () => {
      window.removeEventListener("favoritesUpdated", refreshAll);
      window.removeEventListener("currentReadingUpdated", refreshAll);
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= sessions.length && sessions.length > 0) {
      setActiveIndex(0);
    }
  }, [sessions, activeIndex]);

  const favoritesList = useMemo(() => {
    return manga.filter((m) => Number(m.Valutazione) >= 5);
  }, [manga]);

  const activeSession = sessions[activeIndex] || null;

  const prevIndex =
    sessions.length > 1
      ? (activeIndex - 1 + sessions.length) % sessions.length
      : null;

  const nextIndex =
    sessions.length > 1
      ? (activeIndex + 1) % sessions.length
      : null;

  const prevSession = prevIndex !== null ? sessions[prevIndex] : null;
  const nextSession = nextIndex !== null ? sessions[nextIndex] : null;

  useEffect(() => {
    if (activeSession?.manga_id) {
      localStorage.setItem(
        "mv_active_session_manga_id",
        String(activeSession.manga_id)
      );
    }
  }, [activeSession]);

  function navigate(page) {
    window.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { page }
      })
    );

    if (page === "favorites") {
      window.dispatchEvent(new Event("openFavoritesModal"));
    }

    if (page === "history") {
      window.dispatchEvent(new Event("openHistoryModal"));
    }
  }

  function onLogoToggle() {
    window.dispatchEvent(new Event("toggleSidebar"));
  }

  async function updateCurrentVolume(delta) {
    if (!activeSession) return;

    const current = Number(activeSession.volume) || 0;
    const total = Number(activeSession.volumitotali) || 0;

    let next = current + delta;

    if (next < 0) next = 0;
    if (total && next > total) next = total;

    try {
      await fetch(`${API}/api/reading-sessions/${activeSession.manga_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          volume: next
        })
      });

      await loadSessions();
      window.dispatchEvent(new Event("currentReadingUpdated"));
    } catch (err) {
      console.error("Errore update reading session:", err);
    }
  }

  async function saveCurrentReading() {
    if (!activeSession) return;

    try {
      await fetch(`${API}/api/reading-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          manga_id: activeSession.manga_id,
          titolo: activeSession.titolo,
          autore: activeSession.autore || "",
          coverurl: activeSession.coverurl || "",
          volume: Number(activeSession.volume) || 0
        })
      });
    } catch (err) {
      console.error("Errore salvataggio reading history:", err);
    }
  }

  async function removeActiveSession() {
    if (!activeSession) return;

    try {
      await fetch(`${API}/api/reading-sessions/${activeSession.manga_id}`, {
        method: "DELETE"
      });

      await loadSessions();

      if (activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Errore rimozione reading session:", err);
    }
  }

  const readingOwned = Number(activeSession?.volume) || 0;
  const readingTotal = Number(activeSession?.volumitotali) || 0;
  const readingPercent = readingTotal
    ? Math.min(100, Math.round((readingOwned / readingTotal) * 100))
    : 0;

  return (
    <>
      <aside
        className={`
          h-full flex flex-col relative overflow-y-auto
          px-5 py-4 transition-all duration-300
          ${open ? "w-full gap-4" : "w-full items-center gap-3"}
        `}
        style={{
          background:
            "linear-gradient(180deg, rgba(18,22,42,0.56), rgba(10,12,24,0.74))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "18px 0 55px rgba(0,0,0,0.34)"
        }}
      >
        {/* ambient lights */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-12 w-32 h-32 rounded-full bg-blue-500/12 blur-3xl" />
          <div className="absolute bottom-20 -left-10 w-28 h-28 rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        {/* LOGO */}
        <div
          className={`
            relative z-10 flex items-center
            ${open ? "justify-between gap-3" : "justify-center"}
          `}
        >
          {open ? (
            <div className="min-w-0 flex items-end gap-3">
              <div className="text-[1.9rem] font-black tracking-tight text-white leading-none">
                MangaVault
              </div>

              <button
                onClick={onLogoToggle}
                className="
                  inline-flex items-center
                  text-[2.1rem] font-black tracking-tight leading-none
                  text-yellow-400
                  hover:text-yellow-300
                  drop-shadow-[0_0_18px_rgba(250,204,21,0.38)]
                  transition-all duration-200
                  active:scale-95
                "
                title="Chiudi sidebar"
              >
                10X
              </button>
            </div>
          ) : (
            <button
              onClick={onLogoToggle}
              title="Apri sidebar"
              className="
                text-[2rem] font-black tracking-tight leading-none
                text-yellow-400
                hover:text-yellow-300
                drop-shadow-[0_0_18px_rgba(250,204,21,0.38)]
                transition-all duration-200
                active:scale-95
              "
            >
              10X
            </button>
          )}
        </div>

        {/* NAV */}
        <nav
          className={`relative z-10 flex flex-col gap-3 ${
            open ? "" : "items-center w-full"
          }`}
        >
          {[
            {
              key: "favorites",
              label: "Preferiti",
              icon: <StarIcon className="w-5 h-5" />,
              count: favoritesList.length,
              accent: "text-yellow-400"
            },
            {
              key: "history",
              label: "Ultime letture",
              icon: <ClockIcon className="w-5 h-5" />,
              accent: "text-zinc-300"
            },
            {
              key: "wishlist",
              label: "Wishlist",
              icon: <CalendarIcon className="w-5 h-5" />,
              accent: "text-zinc-300"
            },
            {
              key: "records",
              label: "Records",
              icon: <TrophyIcon className="w-5 h-5" />,
              accent: "text-zinc-300"
            }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              title={item.label}
              className={`
                group flex items-center gap-4 w-full
                rounded-2xl
                border border-white/[0.06]
                bg-white/[0.05]
                hover:bg-white/[0.08]
                hover:border-yellow-400/25
                transition-all duration-200
                ${open ? "px-4 py-2.5" : "p-3 justify-center"}
              `}
            >
              <span
                className={`${item.accent} transition-transform duration-200 group-hover:scale-110`}
              >
                {item.icon}
              </span>

              {open && (
                <div className="flex-1 flex justify-between items-center min-w-0">
                  <span className="text-sm font-medium text-white">
                    {item.label}
                  </span>

                  {typeof item.count === "number" && (
                    <span className="text-xs text-zinc-400">{item.count}</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* JUKEBOX */}
        {open && activeSession && (
          <section
            className="relative z-10 rounded-[24px] border border-white/[0.08] p-3 shadow-[0_18px_38px_rgba(0,0,0,0.20)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(22,26,48,0.42), rgba(12,14,28,0.42))",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Stai leggendo
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[10px] text-zinc-500">
                  {readingPercent}%
                </div>

                <button
                  type="button"
                  onClick={() => setOpenAddSession(true)}
                  className="w-7 h-7 rounded-full border border-white/[0.08] bg-white/[0.05] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/10 transition flex items-center justify-center"
                  title="Aggiungi manga al player"
                >
                  <PlusIcon />
                </button>

                <button
                  type="button"
                  onClick={removeActiveSession}
                  className="w-7 h-7 rounded-full border border-white/[0.08] bg-white/[0.05] text-zinc-300 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/10 transition flex items-center justify-center"
                  title="Rimuovi dal player"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            {/* MAIN PLAYER */}
            <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
              <SideSwitch
                session={prevSession}
                direction="left"
                onClick={() => setActiveIndex(prevIndex)}
              />

              <div className="flex flex-col items-center min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("openMangaDetail", {
                        detail: {
                          ID: activeSession.manga_id,
                          Titolo: activeSession.titolo,
                          Autore: activeSession.autore,
                          CoverURL: activeSession.coverurl,
                          VolumiTotali: activeSession.volumitotali,
                          VolumiPosseduti: activeSession.volume
                        }
                      })
                    )
                  }
                  className="relative w-24 h-36 rounded-[20px] overflow-hidden bg-black/20 border border-white/10 shadow-xl group"
                  title="Apri dettaglio"
                >
                  {activeSession.coverurl ? (
                    <img
                      src={activeSession.coverurl}
                      alt={activeSession.titolo || "Cover manga"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                      No cover
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none">
                    <div className="cover-shine" />
                  </div>
                </button>

                <div className="mt-2.5 w-full max-w-[168px]">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
                    <span>Vol {readingOwned}</span>
                    <span>{readingTotal || "?"}</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.38)] transition-all duration-300"
                      style={{ width: `${readingPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("openMangaDetail", {
                        detail: {
                          ID: activeSession.manga_id,
                          Titolo: activeSession.titolo,
                          Autore: activeSession.autore,
                          CoverURL: activeSession.coverurl,
                          VolumiTotali: activeSession.volumitotali,
                          VolumiPosseduti: activeSession.volume
                        }
                      })
                    )
                  }
                  className="mt-2.5 text-center max-w-full"
                >
                  <div className="text-[0.95rem] font-bold text-white truncate max-w-[170px]">
                    {activeSession.titolo}
                  </div>

                  <div className="text-xs text-zinc-400 truncate mt-0.5 max-w-[170px]">
                    {activeSession.autore || "Autore sconosciuto"}
                  </div>
                </button>
              </div>

              <SideSwitch
                session={nextSession}
                direction="right"
                onClick={() => setActiveIndex(nextIndex)}
              />
            </div>

            {/* CONTROLS */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={() => updateCurrentVolume(-1)}
                className="w-8 h-8 rounded-2xl bg-white/[0.055] border border-white/[0.08] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/35 hover:bg-yellow-400/10 transition flex items-center justify-center active:scale-95"
                title="Togli un volume"
              >
                <MinusIcon />
              </button>

              <button
                onClick={saveCurrentReading}
                className="w-16 h-16 rounded-full bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.35)] hover:brightness-110 active:scale-95 transition flex items-center justify-center"
                title="Salva avanzamento"
              >
                <SaveIcon />
              </button>

              <button
                onClick={() => updateCurrentVolume(1)}
                className="w-8 h-8 rounded-2xl bg-white/[0.055] border border-white/[0.08] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/35 hover:bg-yellow-400/10 transition flex items-center justify-center active:scale-95"
                title="Aggiungi un volume"
              >
                <PlusIcon />
              </button>
            </div>
          </section>
        )}

        {/* STATS */}
        {open && (
          <div className="relative z-10 mt-auto">
            <StatsPanel />
          </div>
        )}
      </aside>

      {openAddSession && (
        <ReadingSessionAddModal
          onClose={() => setOpenAddSession(false)}
          onSaved={() => {
            loadSessions();
            setOpenAddSession(false);
          }}
        />
      )}
    </>
  );
}
