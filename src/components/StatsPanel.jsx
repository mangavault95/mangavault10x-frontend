import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  const stats = useMemo(() => {
    let completed = 0;
    let ongoing = 0;
    let totalVolumes = 0;
    let totalSpent = 0;

    manga.forEach((m) => {
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

  const cards = [
    {
      label: "Completate",
      value: stats.completed,
      icon: "🏆"
    },
    {
      label: "In corso",
      value: stats.ongoing,
      icon: "📚"
    },
    {
      label: "Volumi",
      value: stats.totalVolumes,
      icon: "📦"
    },
    {
      label: "Spesa",
      value: `€${stats.totalSpent.toFixed(0)}`,
      icon: "💴"
    }
  ];

  return (
    <div>

      <h3 className="text-sm font-bold text-zinc-400 mb-3">
        Stats
      </h3>

      <div className="grid grid-cols-2 gap-2">

        {cards.map((card) => (
          <div
            key={card.label}
            className="
              p-3 rounded-xl
              bg-[#151515]
              border border-zinc-800
              hover:border-yellow-400
              hover:shadow-[0_0_12px_rgba(250,204,21,0.3)]
              transition-all
            "
          >
            <div className="flex justify-between items-center">
              <span>{card.icon}</span>
              <span className="text-[10px] text-zinc-500 uppercase">
                {card.label}
              </span>
            </div>

            <div className="mt-3 text-xl font-bold text-yellow-400">
              {card.value}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
