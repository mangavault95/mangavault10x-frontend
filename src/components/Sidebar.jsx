import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar() {
  const [manga, setManga] = useState([]);

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(() => {
    const saved = localStorage.getItem("mv_selected_manga");
    return saved ? JSON.parse(saved) : null;
  });

  const [currentVol, setCurrentVol] = useState(() => {
    return localStorage.getItem("mv_current_vol") || "";
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  useEffect(() => {
    if (selected) {
      localStorage.setItem("mv_selected_manga", JSON.stringify(selected));
    }
  }, [selected]);

  useEffect(() => {
    localStorage.setItem("mv_current_vol", currentVol);
  }, [currentVol]);

  const latest = useMemo(() => {
    return [...manga]
      .sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta))
      .slice(0, 3);
  }, [manga]);

  const results = useMemo(() => {
    if (!search || selected) return [];

    return manga
      .filter((m) =>
        m.Titolo?.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 5);
  }, [search, manga, selected]);

  const progress = useMemo(() => {
    if (!selected) return 0;

    const total = Number(selected.VolumiTotali) || 0;
    const current = Number(currentVol) || 0;

    if (!total) return 0;

    return Math.min((current / total) * 100, 100);
  }, [selected, currentVol]);

  function resetSelection() {
    setSelected(null);
    setSearch("");
    setCurrentVol("");

    localStorage.removeItem("mv_selected_manga");
    localStorage.removeItem("mv_current_vol");
  }

  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
    
      {/* BRAND */}
<div className="mb-5">

  <button
    onClick={() => window.location.reload()}
    className="
      group
      text-left
      leading-none
      transition-all
      hover:scale-[1.02]
    "
  >

    <div
      className="
        text-3xl
        font-black
        tracking-tight
        text-white
      "
      style={{
        textShadow: "0 0 18px rgba(255,255,255,0.08)"
      }}
    >
      MangaVault

      <span
        className="
          text-yellow-500
          ml-1
          italic
        "
        style={{
          textShadow: "0 0 14px rgba(234,179,8,0.45)"
        }}
      >
        10X
      </span>
    </div>

    <div
      className="
        h-[2px]
        w-0
        bg-yellow-500
        rounded-full
        mt-1
        transition-all
        duration-300
        group-hover:w-full
      "
    />

  </button>

</div>

      {/* SEARCH */}
{!selected && (
  <div className="space-y-2">

    <input
      className="w-full bg-zinc-900 p-2 rounded-lg text-sm outline-none border border-zinc-800 focus:border-yellow-500 transition"
      placeholder="Cerca manga..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    {results.length > 0 && (
      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
        {results.map((m) => (
          <div
            key={m.Id}
            onClick={() => {
              setSelected(m);
              setSearch("");
            }}
            className="p-2 text-sm hover:bg-zinc-800 cursor-pointer transition"
          >
            {m.Titolo}
          </div>
        ))}
      </div>
    )}

  </div>
)}


      {/* CURRENT READING */}
     {selected && (
  <div
    className="mt-4 space-y-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
    onContextMenu={(e) => {
      e.preventDefault();
      resetSelection();
    }}
  >

    <div className="flex items-center gap-3">
      <img
        src={selected.CoverURL}
        className="w-10 h-12 rounded object-cover"
      />

      <div>
        <p className="text-[11px] text-zinc-500">Stai leggendo</p>
        <p className="text-sm font-semibold">{selected.Titolo}</p>
      </div>
    </div>

    <input
      type="number"
      className="w-full bg-black/40 p-2 rounded-lg text-sm border border-zinc-700 focus:border-yellow-500"
      value={currentVol}
      onChange={(e) => setCurrentVol(e.target.value)}
      placeholder="Volume attuale"
    />

    <div className="flex justify-between text-[11px] text-zinc-400">
      <span>Volume</span>
      <span>
        {currentVol || 0} / {selected.VolumiTotali || "?"}
      </span>
    </div>

    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-yellow-500 transition-all duration-500"
        style={{ width: `${progress}%` }}
      />
    </div>

    <p className="text-[10px] text-zinc-600">
      tasto destro per rimuovere
    </p>
  </div>
)}

      {/* LATEST */}
<div className="mt-4">
  <div className="flex items-center justify-between mb-2">
    <div className="text-[11px] uppercase tracking-wider text-zinc-500">
      Ultimi aggiunti
    </div>

    <div className="text-[10px] text-zinc-700">
      {latest.length}
    </div>
  </div>

  <div className="space-y-1.5">
    {latest.map((m) => (
      <div
        key={m.Id}
        className="
          group
          flex items-center gap-2
          px-2 py-1.5
          bg-zinc-900/80
          border border-zinc-800
          rounded-xl
          hover:bg-zinc-800/80
          transition-all
        "
      >

        <img
          src={m.CoverURL}
          className="
            w-7 h-9
            object-cover
            rounded-md
            flex-shrink-0
          "
        />

        <div className="min-w-0 flex-1">

          <div
            className="
              text-[11px]
              font-semibold
              text-zinc-200
              truncate
              group-hover:text-white
            "
          >
            {m.Titolo}
          </div>

          <div className="text-[10px] text-zinc-500">
            {m.VolumiPosseduti}/{m.VolumiTotali || "?"}
          </div>

        </div>

      </div>
    ))}
  </div>
</div>
      {/* STATS COMPACT */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="scale-[0.92] origin-top-left">
          <StatsPanel />
        </div>
      </div>

    </div>
  );
}
