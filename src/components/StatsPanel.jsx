import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/api/manga")
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
      icon: "🏆",
      color: "text-green-400",
      glow: "from-green-500/20"
    },
    {
      label: "In corso",
      value: stats.ongoing,
      icon: "📚",
      color: "text-orange-400",
      glow: "from-orange-500/20"
    },
    {
      label: "Volumi",
      value: stats.totalVolumes,
      icon: "📦",
      color: "text-blue-400",
      glow: "from-blue-500/20"
    },
    {
      label: "Spesa",
      value: `€${stats.totalSpent.toFixed(0)}`,
      icon: "💴",
      color: "text-yellow-400",
      glow: "from-yellow-500/20"
    }
  ];

  return (
    <div>
      <h3 className="text-sm font-bold text-zinc-300 mb-3">
        Stats
      </h3>

      <div className="grid grid-cols-2 gap-2">

        {cards.map((card) => (
          <div
            key={card.label}
            className="
              relative
              overflow-hidden
              rounded-xl
              bg-[#151518]
              border border-zinc-800
              p-3
            "
          >

            {/* GLOW */}
            <div
              className={`
                absolute inset-0
                bg-gradient-to-br ${card.glow}
                to-transparent
                opacity-60
              `}
            />

            <div className="relative z-10">

              <div className="flex items-center justify-between">
                <span className="text-lg">
                  {card.icon}
                </span>

                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                  {card.label}
                </span>
              </div>

              <div
                className={`
                  mt-3
                  text-xl
                  font-black
                  ${card.color}
                `}
              >
                {card.value}
              </div>

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}