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

  const topEditori = editori.filter(e => e.count >= 2)
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
          flex justify-between px-4 py-2 rounded-xl
          bg-white/5 hover:bg-white/10
          transition-all duration-300
          hover:scale-[1.03]
          cursor-pointer
        "
      >
        <div className="flex gap-2 font-semibold">
          <span>{medal[index] || `#${index + 1}`}</span>
          {item.Titolo || item.name}
        </div>

        <div className="font-bold text-pink-300">{value}</div>
      </div>
    );
  };

  const Card = ({ title, data, type, glow }) => (
    <div
      className={`
        p-5 rounded-3xl backdrop-blur
        border border-white/10
        shadow-lg
        ${glow}
        hover:scale-[1.02]
        transition
      `}
    >
      <h3 className="mb-4 text-lg font-bold text-white">
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
      bg-[linear-gradient(135deg,#1a0f2e,#0f0f1f,#05050a)]
      bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')]
    ">

      {/* FONT */}
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');

        body {
          font-family: 'Bangers', cursive, system-ui;
          letter-spacing: 1px;
        }

        .title-manga {
          font-family: 'Bangers', cursive;
          letter-spacing: 2px;
        }
        `}
      </style>

      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20"
      >
        ← Home
      </button>

      <h1 className="text-6xl title-manga text-pink-400">
        Manga Records
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-2xl text-pink-300 mb-4">💰 Record Monetari</h2>

        <div className="grid grid-cols-3 gap-6">
          <Card title="🔥 Serie più costose" data={topSerieCostose} type="cost" glow="bg-pink-500/10"/>
          <Card title="💎 Volumi singoli" data={topVolumiSingoli} type="single" glow="bg-blue-500/10"/>
          <Card title="🏢 Editori TOP" data={topEditori} glow="bg-purple-500/10"/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-2xl text-blue-300 mb-4">📚 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6">
          <Card title="📖 Serie più lunghe" data={topLunghe} type="long" glow="bg-indigo-500/10"/>
          <Card title="🏭 Editori" data={editori.slice(0,5)} glow="bg-yellow-500/10"/>
          <Card title="✍️ Autori" data={autori.slice(0,5)} glow="bg-green-500/10"/>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="
              w-[700px] p-6 rounded-3xl
              bg-gradient-to-br from-pink-900/80 to-purple-900/70
              shadow-[0_0_80px_rgba(255,0,128,0.4)]
            "
            onClick={(e) => e.stopPropagation()}
          >

            <h2 className="text-3xl text-pink-300 mb-4">
              {selected.name}
            </h2>

            <div className="text-sm mb-4">
              Serie: {selected.count} • Volumi: {selected.totalVol}
            </div>

            <div className="text-xs mb-3">
              <p className="text-green-400">
                ↑ {selected.best?.Titolo}
              </p>
              <p className="text-red-400">
                ↓ {selected.worst?.Titolo}
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
                      px-2 py-1 rounded cursor-pointer
                      hover:bg-white/10
                      ${isBest ? "text-green-400" : ""}
                      ${isWorst ? "text-red-400" : ""}
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
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #999;
          border-radius: 10px;
        }
      `}</style>

    </div>
  );
}
