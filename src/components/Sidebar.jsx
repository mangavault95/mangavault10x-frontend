import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar() {
  const [manga, setManga] = useState([]);

  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem("mv_selected_manga")) || null
  );

  const [currentVol, setCurrentVol] = useState(
    localStorage.getItem("mv_current_vol") || ""
  );

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(data || []));
  }, []);

  useEffect(() => {
    if (selected)
      localStorage.setItem("mv_selected_manga", JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    localStorage.setItem("mv_current_vol", currentVol);
  }, [currentVol]);

  const latest = useMemo(() => {
    return [...manga]
      .sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta))
      .slice(0, 3);
  }, [manga]);

  const progress = useMemo(() => {
    if (!selected) return 0;
    const total = Number(selected.VolumiTotali) || 0;
    const current = Number(currentVol) || 0;
    if (!total) return 0;
    return Math.min((current / total) * 100, 100);
  }, [selected, currentVol]);

  function reset() {
    setSelected(null);
    setCurrentVol("");
    localStorage.clear();
  }

  return (
    <div className="h-screen flex flex-col p-4 gap-4 text-white">

      {/* TITLE */}
      <div className="text-2xl font-black">
        Manga<span className="text-yellow-400">Vault</span>
      </div>

      {/* CURRENT READING */}
      {selected && (
        <div
          onContextMenu={(e) => { e.preventDefault(); reset(); }}
          className="
            p-4 rounded-2xl
            bg-[#141414]
            border border-white/10
            hover:border-yellow-400
            hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]
            transition-all
          "
        >
          <div className="flex gap-3 items-center">

            <img
              src={selected.CoverURL}
              className="w-12 h-16 object-cover rounded-lg"
            />

            <div className="flex-1">
              <p className="text-xs text-zinc-400">Stai leggendo</p>
              <p className="text-sm font-semibold line-clamp-2">
                {selected.Titolo}
              </p>
            </div>

          </div>

          {/* PROGRESS */}
          <div className="mt-3">

            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Volume</span>
              <span>{currentVol || 0} / {selected.VolumiTotali || "?"}</span>
            </div>

            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="
                  h-full bg-yellow-400
                  animate-pulse
                "
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>
        </div>
      )}

      {/* LATEST */}
      <div>
        <div className="text-xs text-zinc-500 mb-2 uppercase">
          Ultimi aggiunti
        </div>

        <div className="space-y-2">
          {latest.map((m) => (
            <div
              key={m.Id}
              className="
                flex gap-2 items-center
                p-2 rounded-xl
                bg-[#141414]
                border border-white/10
                hover:border-yellow-400
                hover:shadow-[0_0_10px_rgba(250,204,21,0.3)]
                transition cursor-pointer
              "
              onClick={() => window.dispatchEvent(new CustomEvent("openMangaDetail", { detail: m }))}
            >
              <img src={m.CoverURL} className="w-8 h-10 rounded" />
              <div className="text-sm truncate">{m.Titolo}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="mt-auto">
        <StatsPanel />
      </div>

      {/* SCROLLBAR */}
      <style>
        {`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }

        @keyframes pulse {
          0% { opacity: .6 }
          50% { opacity: 1 }
          100% { opacity: .6 }
        }
        `}
      </style>
    </div>
  );
}
