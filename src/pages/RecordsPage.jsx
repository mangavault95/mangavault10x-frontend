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
          flex justify-between px-4 py-2 rounded-lg
          bg-black/70
          border border-white/5
          hover:bg-black/90
          transition-all duration-300
          hover:translate-x-1
          cursor-pointer
        "
      >
        <div className="flex gap-2">
          <span>{medal[index] || `#${index + 1}`}</span>
          {item.Titolo || item.name}
        </div>

        <div className="font-bold text-yellow-500">
          {value}
        </div>
      </div>
    );
  };

  const Card = ({ title, data, type }) => (
    <div
      className="
        relative p-5 rounded-xl
        bg-[#0a0a0a]/90
        border border-white/10
        shadow-[0_0_30px_rgba(0,0,0,0.8)]
        before:absolute before:inset-0
        before:bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]
        before:opacity-20 before:rounded-xl
      "
    >
      <h3 className="
        mb-4 text-lg font-bold
        text-yellow-500
        uppercase tracking-wider
      ">
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
      bg-[url('https://www.transparenttextures.com/patterns/paper.png')]
      bg-[#0c0c0c]
    ">

      {/* FONT */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

          body {
            font-family: system-ui;
          }

          .title-manga {
            font-family: 'Anton', Impact, sans-serif;
            letter-spacing: 2px;
          }
        `}
      </style>

      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 bg-black border border-white/10 rounded-xl hover:bg-zinc-900"
      >
        ← Home
      </button>

      <h1 className="text-5xl title-manga">
        <span className="text-white">Manga</span>{" "}
        <span className="text-yellow-500">Records</span>
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-yellow-500 text-xl uppercase tracking-widest">
          💰 Record Monetari
        </h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="🔥 Serie più costose" data={topSerieCostose} type="cost"/>
          <Card title="💎 Volumi singoli più costosi" data={topVolumiSingoli} type="single"/>
          <Card title="🏢 Editori più costosi" data={topEditori}/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-white text-xl uppercase tracking-widest">
          📚 Record Generali
        </h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="📖 Serie più lunghe" data={topLunghe} type="long"/>
          <Card title="🏭 Editori con più serie" data={editori.slice(0,5)}/>
          <Card title="✍️ Autori con più serie" data={autori.slice(0,5)}/>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="
              w-[700px] p-6 rounded-xl
              bg-[#111]
              border border-yellow-500/20
              shadow-[0_0_60px_rgba(255,200,0,0.2)]
            "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl text-yellow-500 mb-4">
              {selected.name}
            </h2>

            <p className="text-sm mb-3">
              Serie: {selected.count} • Volumi: {selected.totalVol}
            </p>

            <p className="text-green-400 text-xs">
              ↑ {selected.best?.Titolo}
            </p>
            <p className="text-red-400 text-xs mb-4">
              ↓ {selected.worst?.Titolo}
            </p>

            <div className="max-h-56 overflow-y-auto custom-scroll space-y-1">
              {selected.list.map((m, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedManga(m)}
                  className="px-2 py-1 hover:bg-white/10 rounded cursor-pointer text-sm"
                >
                  {m.Titolo}
                </div>
              ))}
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
