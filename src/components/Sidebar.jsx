import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar() {
  const [manga, setManga] = useState([]);

  const selected = JSON.parse(localStorage.getItem("mv_selected_manga"));
  const currentVol = localStorage.getItem("mv_current_vol") || "";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  const latest = useMemo(() => {
    return [...manga]
      .sort((a, b) => new Date(b.DataAggiunta) - new Date(a.DataAggiunta))
      .slice(0, 3);
  }, [manga]);

  const progress = useMemo(() => {
    if (!selected) return 0;
    const total = Number(selected.VolumiTotali) || 0;
    const current = Number(currentVol) || 0;
    return total ? Math.min((current / total) * 100, 100) : 0;
  }, [selected, currentVol]);

  return (
    <div className="
      h-screen flex flex-col p-4 gap-5
      bg-gradient-to-b from-[#0b0b0f] via-[#111] to-[#0b0b0f]
    ">

      {/* LOGO */}
      <div className="
        flex items-center gap-3
        text-xl font-black tracking-tight
      ">
        <div className="
          w-6 h-6 rounded-md
          bg-gradient-to-br from-yellow-400 to-yellow-600
          shadow-[0_0_12px_rgba(250,204,21,0.6)]
        " />
        MangaVault<span className="text-yellow-400 ml-1">10X</span>
      </div>

      {/* CURRENT READING */}
      {selected && (
        <div className="
          p-4 rounded-2xl
          bg-gradient-to-br from-[#1a1a1a] to-[#121212]
          border border-white/10
          shadow-[0_10px_25px_rgba(0,0,0,0.6)]
          hover:shadow-[0_0_30px_rgba(250,204,21,0.15)]
          transition
        ">

          <div className="flex gap-3">

            <img
              src={selected.CoverURL || "https://placehold.co/80x120"}
              className="
                w-14 h-20 object-cover rounded-lg
                shadow-md
              "
            />

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-400">
                Stai leggendo
              </p>

              <p className="
                text-sm font-semibold
                truncate text-white
              ">
                {selected.Titolo}
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                Vol {currentVol} / {selected.VolumiTotali || "?"}
              </p>
            </div>

          </div>

          {/* PROGRESS */}
          <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 animate-pulse"
              style={{ width: `${progress}%` }}
            />
          </div>

        </div>
      )}

      {/* LATEST */}
      <div>

        <p className="
          text-xs uppercase tracking-wider
          text-zinc-500 mb-3
        ">
          Ultimi aggiunti
        </p>

        <div className="space-y-2">

          {latest.map((m) => (
            <div
              key={m.ID}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("openMangaDetail", { detail: m })
                )
              }
              className="
                flex items-center gap-3
                p-3 rounded-xl cursor-pointer
                bg-[#151515]
                border border-white/5
                hover:bg-[#1c1c1c]
                hover:border-yellow-400/30
                hover:shadow-[0_0_10px_rgba(250,204,21,0.15)]
                transition
              "
            >

              <img
                src={m.CoverURL || "https://placehold.co/60x90"}
                className="w-10 h-14 rounded-md object-cover"
              />

              <span className="text-sm truncate">
                {m.Titolo}
              </span>

            </div>
          ))}

        </div>
      </div>

      {/* STATS */}
      <div className="mt-auto">
        <StatsPanel />
      </div>

    </div>
  );
}
