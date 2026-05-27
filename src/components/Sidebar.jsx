import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

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

/* -------------------- COMPONENT -------------------- */

export default function Sidebar({ open = true }) {
  const [manga, setManga] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mv_favorites") || "[]");
    } catch {
      return [];
    }
  });

  const [pulseFav, setPulseFav] = useState(false);
  const [currentReading, setCurrentReading] = useState(null);
  const [currentVol, setCurrentVol] = useState("");

  function loadCurrentReading() {
    try {
      const selected = JSON.parse(localStorage.getItem("mv_selected_manga") || "null");
      const vol = localStorage.getItem("mv_current_vol") || "";

      setCurrentReading(selected);
      setCurrentVol(vol);
    } catch {
      setCurrentReading(null);
      setCurrentVol("");
    }
  }

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));

    loadCurrentReading();
  }, []);

  useEffect(() => {
    const favoriteHandler = () => {
      setPulseFav(true);
      setTimeout(() => setPulseFav(false), 900);
    };

    const refreshReading = () => loadCurrentReading();

    window.addEventListener("favoriteAdded", favoriteHandler);
    window.addEventListener("storage", refreshReading);
    window.addEventListener("currentReadingUpdated", refreshReading);

    return () => {
      window.removeEventListener("favoriteAdded", favoriteHandler);
      window.removeEventListener("storage", refreshReading);
      window.removeEventListener("currentReadingUpdated", refreshReading);
    };
  }, []);

  const favoritesList = useMemo(() => {
    return manga.filter((m) => favorites.includes(m.ID));
  }, [manga, favorites]);

  const toggleFavorite = (id) => {
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("mv_favorites", JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent("favoritesUpdated", {
        detail: { favorites: updated }
      })
    );

    window.dispatchEvent(new Event("favoriteAdded"));
  };

  const navigate = (page) => {
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
  };

  const onLogoToggle = () => {
    window.dispatchEvent(new Event("toggleSidebar"));
  };

  function updateCurrentVolume(delta) {
    if (!currentReading) return;

    const current = Number(currentVol) || 0;
    const total = Number(currentReading.VolumiTotali) || 0;

    let next = current + delta;

    if (next < 0) next = 0;
    if (total && next > total) next = total;

    setCurrentVol(String(next));
    localStorage.setItem("mv_current_vol", String(next));
    localStorage.setItem("mv_selected_manga", JSON.stringify(currentReading));
    window.dispatchEvent(new Event("currentReadingUpdated"));
  }

  function saveCurrentReading() {
    if (!currentReading) return;

    localStorage.setItem("mv_selected_manga", JSON.stringify(currentReading));
    localStorage.setItem("mv_current_vol", String(currentVol || "0"));

    try {
      const history = JSON.parse(localStorage.getItem("mv_history") || "[]");

      const next = [
        ...history,
        {
          title: currentReading.Titolo,
          id: currentReading.ID,
          volume: currentVol || "0",
          at: new Date().toISOString()
        }
      ].slice(-50);

      localStorage.setItem("mv_history", JSON.stringify(next));
    } catch {}

    window.dispatchEvent(new Event("currentReadingUpdated"));
  }

  const readingOwned = Number(currentVol) || 0;
  const readingTotal = Number(currentReading?.VolumiTotali) || 0;
  const readingPercent = readingTotal
    ? Math.min(100, Math.round((readingOwned / readingTotal) * 100))
    : 0;

  return (
    <aside
      className={`
        h-full flex flex-col
        px-5 py-5
        transition-all duration-300
        relative
        ${open ? "w-full gap-5" : "w-full items-center gap-4"}
      `}
      style={{
        background:
          "linear-gradient(180deg, rgba(18,22,42,0.56), rgba(10,12,24,0.74))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "18px 0 55px rgba(0,0,0,0.34)"
      }}
    >
      {/* luci ambientali */}
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
            <div className="text-[2rem] font-black tracking-tight text-white leading-none">
              MangaVault
            </div>

            <button
              onClick={onLogoToggle}
              className="
                inline-flex items-center
                text-[2.25rem] font-black tracking-tight leading-none
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
      <nav className={`relative z-10 flex flex-col gap-3 ${open ? "" : "items-center w-full"}`}>
        {[
          {
            key: "favorites",
            label: "Preferiti",
            icon: <StarIcon className="w-5 h-5" />,
            count: favoritesList.length,
            pulse: pulseFav,
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
              hover:bg-white/[0.085]
              hover:border-yellow-400/25
              transition-all duration-200
              ${open ? "px-4 py-3" : "p-3 justify-center"}
            `}
          >
            <span
              className={`
                ${item.accent}
                transition-transform duration-200
                ${item.pulse ? "scale-125" : "group-hover:scale-110"}
              `}
            >
              {item.icon}
            </span>

            {open && (
              <div className="flex-1 flex justify-between items-center min-w-0">
                <span className="text-sm font-medium text-white">{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="text-xs text-zinc-400">{item.count}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* CURRENT READING */}
      {open && currentReading && (
        <section
          className="relative z-10 rounded-[28px] border border-white/[0.08] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.22)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,26,48,0.42), rgba(12,14,28,0.42))",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)"
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Stai leggendo
            </div>

            <div className="text-[11px] text-zinc-500">
              {readingPercent}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("openMangaDetail", {
                    detail: currentReading
                  })
                )
              }
              className="relative w-20 h-28 shrink-0 rounded-2xl overflow-hidden bg-black/20 border border-white/10 shadow-2xl group"
              title="Apri dettaglio"
            >
              {currentReading.CoverURL ? (
                <img
                  src={currentReading.CoverURL}
                  alt={currentReading.Titolo || "Cover manga"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  No cover
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none">
                <div className="cover-shine" />
              </div>
            </button>

            <div className="min-w-0 flex-1">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("openMangaDetail", {
                      detail: currentReading
                    })
                  )
                }
                className="text-left w-full"
              >
                <div className="text-base font-bold text-white truncate">
                  {currentReading.Titolo}
                </div>

                <div className="text-xs text-zinc-400 truncate">
                  {currentReading.Autore || "Autore sconosciuto"}
                </div>
              </button>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span>Vol {readingOwned}</span>
                  <span>{readingTotal || "?"}</span>
                </div>

                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.38)] transition-all duration-300"
                    style={{ width: `${readingPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => updateCurrentVolume(-1)}
              className="w-11 h-11 rounded-2xl bg-white/[0.055] border border-white/[0.08] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/35 hover:bg-yellow-400/10 transition flex items-center justify-center active:scale-95"
              title="Togli un volume"
            >
              <MinusIcon />
            </button>

            <button
              onClick={saveCurrentReading}
              className="w-14 h-14 rounded-full bg-yellow-400 text-black shadow-[0_0_28px_rgba(250,204,21,0.35)] hover:brightness-110 active:scale-95 transition flex items-center justify-center"
              title="Salva avanzamento"
            >
              <SaveIcon />
            </button>

            <button
              onClick={() => updateCurrentVolume(1)}
              className="w-11 h-11 rounded-2xl bg-white/[0.055] border border-white/[0.08] text-zinc-300 hover:text-yellow-400 hover:border-yellow-400/35 hover:bg-yellow-400/10 transition flex items-center justify-center active:scale-95"
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
  );
}
