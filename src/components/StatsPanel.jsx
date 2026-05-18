import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const stats = useMemo(() => {
    let totalVolumes = 0;
    let completed = 0;
    let ongoing = 0; // ✅ FIX
    let spent = 0;

    manga.forEach((m) => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const total = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;

      totalVolumes += owned;
      spent += owned * cost;

      if (total && owned >= total) {
        completed++;
      } else {
        // ✅ tutto il resto è ongoing (anche null/0)
        ongoing++;
      }
    });

    return {
      totalVolumes,
      completed,
      ongoing,
      spent
    };
  }, [manga]);

  return (
    <div className="space-y-3 mt-4">

      {/* TOTAL */}
      <div className="bg-[#141414] p-4 rounded-xl border border-white/10">
        <p className="text-xs text-zinc-400">Volumi totali</p>
        <p className="text-2xl font-black text-white">
          {stats.totalVolumes}
        </p>
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-2 gap-2">

        <div className="bg-[#141414] p-3 rounded-xl text-center border border-green-500/30">
          <p className="text-xs text-zinc-400">Completati</p>
          <p className="text-green-400 font-bold">
            {stats.completed}
          </p>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl text-center border border-yellow-500/30">
          <p className="text-xs text-zinc-400">In corso</p>
          <p className="text-yellow-400 font-bold">
            {stats.ongoing}
          </p>
        </div>

      </div>

      {/* SPESA */}
      <div className="bg-[#141414] p-3 rounded-xl border border-yellow-500/20">
        <p className="text-xs text-zinc-400">Spesa totale</p>
        <p className="text-yellow-400 font-bold">
          €{stats.spent.toFixed(0)}
        </p>
      </div>

    </div>
  );
}
