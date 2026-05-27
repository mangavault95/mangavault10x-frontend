import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

/* -------------------- ICONS -------------------- */

function StarIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.7 14.9 8.6l6.5.95-4.7 4.58 1.1 6.47L12 17.55 6.2 20.6l1.1-6.47-4.7-4.58 6.5-.95L12 2.7Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
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

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
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

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6"
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
      className="w-5 h-5"
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
      className="w-5 h-5"
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
      className="w-6 h-6"
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
      const selected = JSON.parse(
        localStorage.getItem("mv_selected_manga") || "null"
      );
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
        px-5 py-5 gap-5
        bg-gradient-to-b from-[#050505] via-[#0b0b0d] to-[#050505]
        border-r border-white/6
        shadow-[18px_0_45px_rgba(0,0,0,0.45)]
        transition-all duration-300
        ${open ? "w-full" : "w-full items-center"}
      `}
    >
      {/* LOGO */}
      <div
        className={`
          flex items-start
          ${open ? "justify-between gap-3" : "justify-center"}
        `}
      >
        {open ? (
          <div className="min-w-0">
            <div className="text-3xl font-black tracking-tight text-white leading-none">
              MangaVault
            </div>

            <button
              onClick={onLogoToggle}
              className="
                mt-1 inline-flex items-center
                text-3xl font-black tracking-tight
                text-yellow-400
                hover:text-yellow-300
                drop-shadow-[0_0_16px_rgba(250,204,21,0.35)]
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
              text-3xl font-black tracking-tight
              text-yellow-400
              drop-shadow-[0_0_16px_rgba(250,204,21,0.35)]
              hover:text-yellow-300
              transition-all duration-200
              active:scale-95
            "
          >
            10X
          </button>
        )}
      </div>

      {/* NAV */}
      <nav className={`flex flex-col gap-3 ${open ? "" : "items-center w-full"}`}>
        <button
          onClick={() => navigate("favorites")}
          title="Preferiti"
          className={`
            group flex items-center gap-4 w-full
            rounded-2xl
            border border-white/[0.06]
            bg-white/[0.045]
            hover:bg-white/[0.075]
            hover:border-yellow-400/25
            transition-all duration-200
            ${open ? "px-4 py-3" : "p-3 justify-center"}
          `}
        >
          <span
            className={`
              text-yellow-400 transition-transform duration-200
              ${pulseFav ? "scale-125" : "group-hover:scale-110"}
            `}
          >
            <StarIcon />
          </span>

          {open && (
            <div className="flex-1 flex justify-between items-center min-w-0">
              <span className="text-sm font-medium text-white">Preferiti</span>
              <span className="text-xs text-zinc-400">{favoritesList.length}</span>
            </div>
          )}
        </button>

        <button
          onClick={() => navigate("history")}
          title="Ultime letture"
          className={`
            group flex items-center gap-4 w-full
            rounded-2xl
            border border-white/[0.06]
            bg-white/[0.045]
            hover:bg-white/[0.075]
            hover:border-yellow-400/25
            transition-all duration-200
            ${open ? "px-4 py-3" : "p-3 justify-center"}
          `}
        >
          <span className="text-zinc-300 group-hover:text-yellow-400 transition">
            <ClockIcon />
          </span>

          {open && (
            <span className="text-sm font-medium text-white">
              Ultime letture
            </span>
          )}
        </button>

        <button
          onClick={() => navigate("wishlist")}
          title="Wishlist"
          className={`
            group flex items-center gap-4 w-full
            rounded-2xl
            border border-white/[0.06]
            bg-white/[0.045]
            hover:bg-white/[0.075]
            hover:border-yellow-400/25
            transition-all duration-200
            ${open ? "px-4 py-3" : "p-3 justify-center"}
          `}
        >
          <span className="text-zinc-300 group-hover:text-yellow-400 transition">
            <CalendarIcon />
          </span>

          {open && (
            <span className="text-sm font-medium text-white">Wishlist</span>
          )}
        </button>

        <button
          onClick={() => navigate("records")}
          title="Records"
          className={`
            group flex items-center gap-4 w-full
            rounded-2xl
            border border-white/[0.06]
            bg-white/[0.045]
            hover:bg-white/[0.075]
            hover:border-yellow-400/25
            transition-all duration-200
            ${open ? "px-4 py-3" : "p-3 justify-center"}
          `}
        >
          <span className="text-zinc-300 group-hover:text-yellow-400 transition">
            <TrophyIcon />
          </span>

          {open && (
            <span className="text-sm font-medium text-white">Records</span>
          )}
        </button>
      </nav>

      {/* CURRENT READING PLAYER */}
      {open && currentReading && (
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.28)]">
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
              className="relative w-20 h-28 shrink-0 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl group"
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
        <div className="mt-auto">
          <StatsPanel />
        </div>
      )}
    </aside>
  );
}
