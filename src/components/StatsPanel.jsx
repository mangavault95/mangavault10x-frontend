import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []));
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let ongoing = 0;
    let spent = 0;

    manga.forEach(m => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const tot = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;

      total += owned;
      spent += owned * cost;

      if (tot && owned >= tot) completed++;
      else ongoing++;
    });

    return { total, completed, ongoing, spent };
  }, [manga]);

  return (
    <div className="space-y-3 mt-4">

      {/* TOTAL */}
      <div className="
        p-4 rounded-xl
        bg-gradient-to-br from-[#1a1a1a] to-[#101010]
        border border-white/10
      ">
        <p className="text-xs text-zinc-500 mb-1">Volumi totali</p>
        <p className="text-xl font-semibold">{stats.total}</p>
      </div>

      {/* ROW */}
      <div className="grid grid-cols-2 gap-2">

        <div className="
          p-3 rounded-xl border border-green-500/30 bg-[#141414]
          text-center
        ">
          <p className="text-xs text-zinc-500">Completati</p>
          <p className="text-xl font-semibold text-green-400">
            {stats.completed}
          </p>
        </div>

        <div className="
          p-3 rounded-xl border border-yellow-500/30 bg-[#141414]
          text-center
        ">
          <p className="text-xs text-zinc-500">In corso</p>
          <p className="text-xl font-semibold text-yellow-400">
            {stats.ongoing}
          </p>
        </div>

      </div>

      {/* SPESA */}
      <div className="
        p-3 rounded-xl
        border border-yellow-500/20
        bg-[#141414]
      ">
        <p className="text-xs text-zinc-500 mb-1">Spesa totale</p>
        <p className="text-xl font-semibold text-yellow-400">
          €{stats.spent.toFixed(0)}
        </p>
      </div>

    </div>
  );
}
``
