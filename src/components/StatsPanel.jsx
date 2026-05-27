import { useEffect, useMemo, useState } from "react";

function StatIcon({ type }) {
  if (type === "volumes") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z" />
        <path d="M8 4v14a2 2 0 0 0 2 2" />
      </svg>
    );
  }

  if (type === "complete") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (type === "ongoing") {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let ongoing = 0;
    let spent = 0;

    manga.forEach((m) => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const tot = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;

      total += owned;
      spent += owned * cost;

      if (tot && owned >= tot) {
        completed++;
      } else {
        ongoing++;
      }
    });

    return { total, completed, ongoing, spent };
  }, [manga]);

  return (
    <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Statistiche
          </div>
          <div className="text-sm text-white font-semibold mt-1">
            Libreria
          </div>
        </div>

        <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
          <StatIcon type="volumes" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-2xl bg-black/20 border border-white/[0.06] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <StatIcon type="volumes" />
              <span>Volumi totali</span>
            </div>

            <span className="text-white font-bold">{stats.total}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-green-400/[0.08] border border-green-400/20 p-3">
          <div className="flex items-center gap-2 text-green-300 mb-2">
            <StatIcon type="complete" />
            <span className="text-xs">Completati</span>
          </div>

          <div className="text-xl font-black text-green-300">
            {stats.completed}
          </div>
        </div>

        <div className="rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/20 p-3">
          <div className="flex items-center gap-2 text-yellow-300 mb-2">
            <StatIcon type="ongoing" />
            <span className="text-xs">In corso</span>
          </div>

          <div className="text-xl font-black text-yellow-300">
            {stats.ongoing}
          </div>
        </div>

        <div className="col-span-2 rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-300 text-sm">
              <StatIcon type="money" />
              <span>Spesa totale</span>
            </div>

            <span className="text-yellow-300 font-black">
              €{stats.spent.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
