import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
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
    <div className="space-y-3 mt-4 text-sm">
      <div className="bg-[#141414] border border-white/10 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Volumi totali</span>
          <span className="font-semibold text-white">{stats.total}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#141414] border border-green-500/30 rounded-xl p-3">
          <div className="flex justify-between">
            <span className="text-zinc-400">Completati</span>
            <span className="text-green-400 font-semibold">{stats.completed}</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-yellow-500/30 rounded-xl p-3">
          <div className="flex justify-between">
            <span className="text-zinc-400">In corso</span>
            <span className="text-yellow-400 font-semibold">{stats.ongoing}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#141414] border border-yellow-500/20 rounded-xl p-3">
        <div className="flex justify-between">
          <span className="text-zinc-400">Spesa totale</span>
          <span className="text-yellow-400 font-semibold">€{stats.spent.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}
