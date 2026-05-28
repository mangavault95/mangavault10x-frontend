import { useEffect, useMemo, useState } from "react";

function LibraryIcon({ className = "w-4 h-4" }) {
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
      <path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
      <path d="M8 7h7" />
      <path d="M8 10h5" />
    </svg>
  );
}

function CoinIcon({ className = "w-4 h-4" }) {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10" />
      <path d="M15 9.2A3.2 3.2 0 0 0 12.5 8H11a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-1.5A3.2 3.2 0 0 1 9 14.8" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }) {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v5l3 1.8" />
    </svg>
  );
}

function parseTotal(value) {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value).replace(/[^0-9]/g, "");
  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

function getOwned(manga) {
  return Number(manga?.VolumiPosseduti) || 0;
}

function getTotal(manga) {
  return parseTotal(manga?.VolumiTotali);
}

function getCost(manga) {
  return Number(manga?.Costo) || 0;
}

export default function MobileStatsPanel() {
  const API = import.meta.env.VITE_API_URL;

  const [manga, setManga] = useState([]);

  async function loadManga() {
    try {
      const res = await fetch(`${API}/api/manga`);
      const data = await res.json();

      setManga(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento stats mobile:", err);
      setManga([]);
    }
  }

  useEffect(() => {
    loadManga();

    const refresh = () => loadManga();

    window.addEventListener("favoritesUpdated", refresh);
    window.addEventListener("currentReadingUpdated", refresh);

    return () => {
      window.removeEventListener("favoritesUpdated", refresh);
      window.removeEventListener("currentReadingUpdated", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    const totalVolumes = manga.reduce((sum, item) => {
      return sum + getOwned(item);
    }, 0);

    const totalValue = manga.reduce((sum, item) => {
      return sum + getOwned(item) * getCost(item);
    }, 0);

    const completed = manga.filter((item) => {
      const owned = getOwned(item);
      const total = getTotal(item);

      return total !== null && owned >= total;
    }).length;

    const ongoing = manga.filter((item) => {
      const owned = getOwned(item);
      const total = getTotal(item);

      return total === null && owned > 0;
    }).length;

    return {
      totalVolumes,
      totalValue,
      completed,
      ongoing
    };
  }, [manga]);

  const items = [
    {
      key: "volumes",
      label: "Volumi",
      value: stats.totalVolumes,
      icon: <LibraryIcon />,
      color: "text-zinc-200"
    },
    {
      key: "value",
      label: "Valore",
      value: `€${Math.round(stats.totalValue)}`,
      icon: <CoinIcon />,
      color: "text-yellow-400"
    },
    {
      key: "completed",
      label: "Complete",
      value: stats.completed,
      icon: <CheckIcon />,
      color: "text-green-400"
    },
    {
      key: "ongoing",
      label: "In corso",
      value: stats.ongoing,
      icon: <ClockIcon />,
      color: "text-sky-300"
    }
  ];

  return (
    <section
      className="
        rounded-[24px]
        border border-white/[0.08]
        bg-white/[0.035]
        px-4 py-4
      "
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Dashboard
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            Collezione
          </div>
        </div>

        <div className="w-9 h-9 rounded-2xl bg-yellow-400/12 border border-yellow-400/20 text-yellow-300 flex items-center justify-center">
          <LibraryIcon />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {items.map((item) => (
          <div key={item.key} className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className={item.color}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>

            <div className={`mt-1 text-lg font-black tracking-tight ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
``
