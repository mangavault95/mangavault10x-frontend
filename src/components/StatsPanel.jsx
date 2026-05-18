import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(res => res.json())
      .then(data => setManga(data || []));
  }, []);

  const stats = useMemo(() => {
    let completed = 0;
    let ongoing = 0;
    let totalVolumes = 0;

    manga.forEach(m => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const total = Number(m.VolumiTotali) || 0;

      totalVolumes += owned;

      if (total && owned >= total) completed++;
      else ongoing++;
    });

    return { completed, ongoing, totalVolumes };
  }, [manga]);

  return (
    <div className="mt-4">

      <p className="text-xs text-zinc-500 mb-2">Statistiche</p>

      <div className="bg-[#141414] p-3 rounded-xl border border-white/10">
        <p className="text-xs text-zinc-400">Totale volumi</p>
        <p className="text-lg font-bold truncate">{stats.totalVolumes}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">

        <div className="bg-[#141414] p-3 rounded-xl border text-center">
          <p className="text-xs text-zinc-400">Completate</p>
          <p className="text-lg">{stats.completed}</p>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl border text-center">
          <p className="text-xs text-zinc-400">In corso</p>
          <p className="text-lg">{stats.ongoing}</p>
        </div>

      </div>

    </div>
  );
}
``
