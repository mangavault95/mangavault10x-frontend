import { useEffect, useState, useMemo } from "react";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/api/manga")
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const safe = useMemo(() => {
    return (manga || []).map((m) => ({
      ...m,
      VolumiPosseduti: Number(m.VolumiPosseduti) || 0,
      Costo: Number(m.Costo) || 0
    }));
  }, [manga]);

  const topLong = [...safe]
    .sort((a, b) => b.VolumiPosseduti - a.VolumiPosseduti)
    .slice(0, 3);

  const topCost = [...safe]
    .sort(
      (a, b) =>
        b.VolumiPosseduti * b.Costo - a.VolumiPosseduti * a.Costo
    )
    .slice(0, 3);

  const PodiumCard = ({ manga, rank, type }) => {
    const colors = [
      "from-yellow-300/80 to-yellow-600/80",
      "from-zinc-200/70 to-zinc-500/70",
      "from-orange-300/70 to-orange-600/70"
    ];

    const sizes = [
      "w-28 h-28",
      "w-24 h-24",
      "w-24 h-24"
    ];

    return (
      <div
        className={`
          flex flex-col items-center justify-end
          ${sizes[rank]}
          relative
          animate-bounce
        `}
      >
        {/* SPOTLIGHT */}
        <div className="absolute -top-10 w-20 h-20 bg-white/10 blur-2xl rounded-full" />

        <div
          className={`
            w-full h-full
            rounded-2xl
            flex flex-col items-center justify-center
            text-center
            bg-gradient-to-b ${colors[rank]}
            shadow-xl
            border border-white/10
            backdrop-blur-md
            transition-transform duration-300 hover:scale-105
          `}
        >
          <div className="text-xs font-semibold text-white text-center w-full flex items-center justify-center">
            {manga?.Titolo}
          </div>

          <div className="text-[10px] text-white/80 mt-1 text-center w-full flex items-center justify-center">
            {type === "long"
              ? `${manga.VolumiPosseduti} vol`
              : `€${(manga.VolumiPosseduti * manga.Costo).toFixed(2)}`}
          </div>

          <div className="text-sm font-black text-white mt-1 text-center w-full flex items-center justify-center">
            #{rank + 1}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 text-white space-y-10 relative">

      {/* BACK BUTTON */}
      <button
        onClick={() => setRecordsMode(false)}
        className="mb-6 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
      >
        ← Home
      </button>

      <h1 className="text-3xl font-bold">📊 Manga Records</h1>

      {/* TOP LUNGHI */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-center">
          🏆 Più Lunghi
        </h2>

        <div className="flex items-end justify-center gap-6 h-40">
          <PodiumCard manga={topLong[1]} rank={1} type="long" />
          <PodiumCard manga={topLong[0]} rank={0} type="long" />
          <PodiumCard manga={topLong[2]} rank={2} type="long" />
        </div>
      </div>

      {/* TOP COSTOSI */}
      <div>
        <h2 className="text-xl font-bold mb-6 text-center">
          💰 Più Costosi
        </h2>

        <div className="flex items-end justify-center gap-6 h-40">
          <PodiumCard manga={topCost[1]} rank={1} type="cost" />
          <PodiumCard manga={topCost[0]} rank={0} type="cost" />
          <PodiumCard manga={topCost[2]} rank={2} type="cost" />
        </div>
      </div>

      {/* GLOW BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-1/2 w-96 h-96 bg-yellow-500 blur-[120px]" />
      </div>

    </div>
  );
}