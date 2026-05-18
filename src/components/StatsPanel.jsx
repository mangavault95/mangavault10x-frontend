import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(res => res.json())
      .then(data => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  const stats = useMemo(() => {
    let completed = 0;
    let ongoing = 0;
    let totalVolumes = 0;
    let totalSpent = 0;

    manga.forEach(m => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const total = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;

      totalVolumes += owned;
      totalSpent += owned * cost;

      if (total && owned >= total) completed++;
      else ongoing++;
    });

    return {
      completed,
      ongoing,
      totalVolumes,
      totalSpent
    };
  }, [manga]);

  return (
    <div className="space-y-4">

      {/* TITLE */}
      <h3 className="text-xs uppercase tracking-widest text-zinc-500">
        Statistiche
      </h3>

      {/* MAIN BIG CARD */}
      <div className="
        p-4 rounded-2xl
        bg-gradient-to-br from-[#1a1a1a] to-[#101010]
        border border-white/10
        shadow-[0_0_40px_rgba(0,0,0,0.5)]
      ">

        <div className="flex justify-between items-center mb-3">

          <div>
            <p className="text-xs text-zinc-500">Totale volumi</p>
            <p className="text-2xl font-black text-white">
              {stats.totalVolumes}
            </p>
          </div>

          <div
            className="
              w-10 h-10 rounded-full
              bg-yellow-400/10
              flex items-center justify-center
              text-yellow-400
              shadow-[0_0_12px_rgba(250,204,21,0.5)]
            "
          >
            📦
          </div>

        </div>

        {/* MINI BAR (PROGRESSIONE COMPLETATI) */}
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 animate-pulse"
            style={{
              width: `${
                stats.completed + stats.ongoing > 0
                  ? (stats.completed / (stats.completed + stats.ongoing)) * 100
                  : 0
              }%`
            }}
          />
        </div>

      </div>

      {/* GRID 3 CARD */}
      <div className="grid grid-cols-3 gap-2">

        {/* COMPLETED */}
        <div className="
          p-3 rounded-xl
          bg-[#151515]
          border border-white/10
          hover:border-green-400
          hover:shadow-[0_0_10px_rgba(34,197,94,0.4)]
          transition
        ">
          <div className="flex justify-between">
            <span className="text-green-400">🏆</span>
            <span className="text-[10px] text-zinc-500 uppercase">
              completate
            </span>
          </div>

          <p className="text-xl mt-2 font-bold text-white">
            {stats.completed}
          </p>
        </div>

        {/* ONGOING */}
        <div className="
          p-3 rounded-xl
          bg-[#151515]
          border border-white/10
          hover:border-orange-400
          hover:shadow-[0_0_10px_rgba(251,146,60,0.4)]
          transition
        ">
          <div className="flex justify-between">
            <span className="text-orange-400">📚</span>
            <span className="text-[10px] text-zinc-500 uppercase">
              in corso
            </span>
          </div>

          <p className="text-xl mt-2 font-bold text-white">
            {stats.ongoing}
          </p>
        </div>

        {/* SPENT */}
        <div className="
          p-3 rounded-xl
          bg-[#151515]
          border border-white/10
          hover:border-yellow-400
          hover:shadow-[0_0_10px_rgba(250,204,21,0.4)]
          transition
        ">
          <div className="flex justify-between">
            <span className="text-yellow-400">💴</span>
            <span className="text-[10px] text-zinc-500 uppercase">
              spesa
            </span>
          </div>

          <p className="text-lg truncate mt-2 font-bold text-white">
            €{stats.totalSpent.toFixed(0)}
          </p>
        </div>

      </div>

      {/* EXTRA SMALL KPI */}
      <div className="
        mt-2 text-[11px]
        text-zinc-500 flex justify-between
      ">
     
        <span>
          {(stats.totalVolumes / (stats.completed + stats.ongoing || 1)).toFixed(1)}
        </span>
      </div>

    </div>
  );
}
