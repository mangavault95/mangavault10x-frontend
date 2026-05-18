import { useEffect, useState, useMemo } from "react";
import MangaDetail from "../components/MangaDetail";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const safe = useMemo(() => {
    return manga.map(m => ({
      ...m,
      Titolo: m?.Titolo || "",
      VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
      Costo: Number(m?.Costo) || 0,
      Editore: m?.Editore || "Sconosciuto",
      Autore: m?.Autore || "Sconosciuto"
    }));
  }, [manga]);

  function groupBy(field) {
    const g = {};
    safe.forEach(m => {
      if (!g[m[field]]) g[m[field]] = [];
      g[m[field]].push(m);
    });

    return Object.entries(g).map(([key, list]) => {
      const sorted = [...list].sort((a, b) => b.Costo - a.Costo);

      return {
        name: key,
        count: list.length,
        totalVol: list.reduce((a, b) => a + b.VolumiPosseduti, 0),
        avgCost: list.reduce((a, b) => a + b.Costo, 0) / list.length,
        best: sorted[0],
        worst: sorted[sorted.length - 1],
        list
      };
    });
  }

  const editori = groupBy("Editore");
  const autori = groupBy("Autore");

  const topSerieCostose = [...safe]
    .sort((a, b) => (b.Costo * b.VolumiPosseduti) - (a.Costo * a.VolumiPosseduti))
    .slice(0, 5);

  const topVolumiSingoli = [...safe]
    .filter(m => m.VolumiPosseduti === 1)
    .sort((a, b) => b.Costo - a.Costo)
    .slice(0, 5);

  const topEditori = editori
    .filter(e => e.count >= 2)
    .sort((a, b) => b.avgCost - a.avgCost)
    .slice(0, 5);

  const topLunghe = [...safe]
    .sort((a, b) => b.VolumiPosseduti - a.VolumiPosseduti)
    .slice(0, 5);

  const medal = ["🥇", "🥈", "🥉"];

  function handleClick(item) {
    if (item.Titolo) setSelectedManga(item);
    else setSelected(item);
  }

  const Row = ({ item, index, type }) => {
    let value = "";

    if (type === "cost") value = `€${(item.Costo * item.VolumiPosseduti).toFixed(0)}`;
    else if (type === "single") value = `€${item.Costo}`;
    else if (type === "long") value = `${item.VolumiPosseduti} vol`;
    else value = `${item.count}`;

    return (
      <div
        onClick={() => handleClick(item)}
        className="
          flex justify-between items-center
          px-4 py-2 rounded-xl
          bg-white/5
          hover:bg-white/10
          transition-all duration-300
          hover:scale-[1.02]
          cursor-pointer
        "
      >
        <div className="flex gap-2 font-medium">
          <span>{medal[index] || `#${index + 1}`}</span>
          {item.Titolo || item.name}
        </div>

        <div className="font-bold text-pink-300">
          {value}
        </div>
      </div>
    );
  };

  const Card = ({ title, data, type, glow }) => (
    <div
      className={`
        p-5 rounded-3xl backdrop-blur
        border border-white/10
        shadow-xl
        ${glow}
        transition hover:scale-[1.02]
      `}
    >
      <h3 className="mb-4 font-bold text-lg tracking-wide text-white">
        {title}
      </h3>

      <div className="space-y-2">
        {data.map((m, i) => (
          <Row key={i} item={m} index={i} type={type} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="
      min-h-screen text-white p-8 space-y-10
      bg-gradient-to-br from-[#1a0f2e] via-[#0f0f1f] to-[#02020a]
    ">

      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
      >
        ← Home
      </button>

      <h1 className="text-5xl font-extrabold tracking-tight">
        📚 Manga Records
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-pink-400 text-2xl">💰 Record Monetari</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="🔥 Serie più costose" data={topSerieCostose} type="cost" glow="bg-pink-500/10"/>
          <Card title="💎 Volumi singoli" data={topVolumiSingoli} type="single" glow="bg-blue-500/10"/>
          <Card title="🏢 Editori top" data={topEditori} glow="bg-purple-500/10"/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-blue-400 text-2xl">📖 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="📚 Serie più lunghe" data={topLunghe} type="long" glow="bg-indigo-500/10"/>
          <Card title="🏭 Editori" data={editori.slice(0,5)} glow="bg-yellow-500/10"/>
          <Card title="✍️ Autori" data={autori.slice(0,5)} glow="bg-green-500/10"/>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="
              w-[700px]
              bg-gradient-to-br from-purple-900/80 to-black
              p-6 rounded-3xl
              shadow-[0_0_80px_rgba(168,85,247,0.4)]
              animate-[fade_.3s]
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-pink-400 mb-3">
              {selected.name}
            </h2>

            <div className="text-sm text-zinc-300 mb-4">
              Serie: {selected.count} • Volumi: {selected.totalVol}
            </div>

            <div className="text-xs mb-3">
              <p className="text-green-400">
                ↑ {selected.best?.Titolo} (€{selected.best?.Costo})
              </p>
              <p className="text-red-400">
                ↓ {selected.worst?.Titolo} (€{selected.worst?.Costo})
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto custom-scroll space-y-1">
              {selected.list.map((m, i) => {
                const isBest = m === selected.best;
                const isWorst = m === selected.worst;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedManga(m)}
                    className={`
                      px-2 py-1 rounded cursor-pointer text-sm
                      hover:bg-white/10 transition
                      ${isBest ? "text-green-400 font-semibold" : ""}
                      ${isWorst ? "text-red-400 font-semibold" : ""}
                    `}
                  >
                    {m.Titolo}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
