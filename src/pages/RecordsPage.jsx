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
      const avg =
        list.reduce((a, b) => a + b.Costo, 0) / list.length;

      const sorted = [...list].sort((a, b) => b.Costo - a.Costo);

      return {
        name: key,
        count: list.length,
        totalVol: list.reduce((a, b) => a + b.VolumiPosseduti, 0),
        avgCost: avg,
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

  const topLunghe = [...safe]
    .sort((a, b) => b.VolumiPosseduti - a.VolumiPosseduti)
    .slice(0, 5);

  const topEditoriCostosi = editori
    .filter(e => e.count >= 2)
    .sort((a, b) => b.avgCost - a.avgCost)
    .slice(0, 5);

  const topEditoriSerie = [...editori]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topAutori = [...autori]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const medal = ["🥇", "🥈", "🥉"];

  function handleClick(item) {
    if (item.Titolo) {
      setSelectedManga(item);
    } else {
      setSelected(item);
    }
  }

  const Row = ({ item, index, type }) => {
    let value = "";

    if (type === "cost") value = `€${(item.Costo * item.VolumiPosseduti).toFixed(0)}`;
    else if (type === "single") value = `€${item.Costo}`;
    else if (type === "long") value = `${item.VolumiPosseduti} vol`;
    else if (type === "edit") value = `€${item.avgCost.toFixed(2)} (${item.count})`;
    else value = item.count;

    return (
      <div
        onClick={() => handleClick(item)}
        className="
          flex justify-between items-center
          px-4 py-2 rounded-xl
          bg-zinc-900/70 backdrop-blur
          hover:bg-zinc-800/90
          hover:scale-[1.02]
          transition-all duration-300
          cursor-pointer
        "
      >
        <div className="flex gap-2 text-sm">
          <span>{medal[index] || `#${index + 1}`}</span>
          {item.Titolo || item.name}
        </div>
        <div className="text-yellow-400 font-bold">{value}</div>
      </div>
    );
  };

  const Card = ({ title, data, type }) => (
    <div className="bg-[#121218] p-5 rounded-2xl shadow-xl transition hover:shadow-2xl hover:scale-[1.01]">
      <h3 className="mb-4 font-bold text-lg text-white/90">
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
    <div className="min-h-screen text-white p-8 space-y-10">

      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition"
      >
        ← Home
      </button>

      <h1 className="text-4xl font-black tracking-tight">
        📊 Manga Records
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-yellow-400 text-2xl mb-4">💰 Record Monetari</h2>

        <div className="grid grid-cols-3 gap-6">
          <Card title="🔥 TOP Serie più costose" data={topSerieCostose} type="cost" />
          <Card title="💎 TOP Volumi singoli" data={topVolumiSingoli} type="single" />
          <Card title="🏢 TOP Editori più costosi" data={topEditoriCostosi} type="edit" />
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-blue-400 text-2xl mb-4">📚 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6">
          <Card title="📖 TOP Serie più lunghe" data={topLunghe} type="long" />
          <Card title="🏭 TOP Editori" data={topEditoriSerie} />
          <Card title="✍️ TOP Autori" data={topAutori} />
        </div>
      </div>

      {/* MODAL PREMIUM */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade"
          onClick={() => setSelected(null)}
        >
          <div
            className="
              w-[700px]
              bg-gradient-to-br from-[#14141a] to-[#0c0c12]
              rounded-3xl
              p-6
              shadow-[0_0_80px_rgba(0,0,0,0.8)]
              animate-scaleIn
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">
              {selected.name}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4 text-zinc-300">
              <div>Serie: {selected.count}</div>
              <div>Volumi: {selected.totalVol}</div>
              <div>Media: €{selected.avgCost.toFixed(2)}</div>
            </div>

            <div className="mb-3 text-xs">
              <p className="text-green-400">
                🟢 Più caro: {selected.best?.Titolo} (€{selected.best?.Costo})
              </p>
              <p className="text-red-400">
                🔴 Più economico: {selected.worst?.Titolo} (€{selected.worst?.Costo})
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto pr-2 custom-scroll space-y-1">
              {selected.list.map((m, i) => {
                const isBest = m === selected.best;
                const isWorst = m === selected.worst;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedManga(m)}
                    className={`
                      text-xs px-2 py-1 rounded cursor-pointer transition
                      hover:bg-zinc-800
                      ${isBest ? "text-green-400" : ""}
                      ${isWorst ? "text-red-400" : ""}
                    `}
                  >
                    {m.Titolo} — €{m.Costo}
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

      {/* ANIMAZIONI */}
      <style>{`
        @keyframes fade { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{transform:scale(0.9)} to{transform:scale(1)} }

        .animate-fade { animation: fade .3s ease; }
        .animate-scaleIn { animation: scaleIn .3s ease; }

        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 10px;
        }
      `}</style>

    </div>
  );
}
