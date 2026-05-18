import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar() {
  const [manga, setManga] = useState([]);
  const selected = JSON.parse(localStorage.getItem("mv_selected_manga"));
  const currentVol = localStorage.getItem("mv_current_vol") || "";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(data || []));
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

    return total ? (current / total) * 100 : 0;
  }, [selected, currentVol]);

  return (
    <div className="h-screen flex flex-col p-4 gap-4">

      {/* LOGO */}
      <div className="flex items-center gap-2 text-2xl font-black">
        <div className="w-5 h-5 bg-yellow-400 rounded shadow" />
        MangaVault<span className="text-yellow-400">10X</span>
      </div>

      {/* CURRENT READING */}
      {selected && (
        <div className="p-3 bg-[#141414] rounded-xl border border-white/10">

          <div className="flex gap-2">
            <img src={selected.CoverURL} className="w-12 h-16 rounded" />
            <div>
              <p className="text-xs text-zinc-400">Stai leggendo</p>
              <p className="text-sm">{selected.Titolo}</p>
            </div>
          </div>

          <div className="mt-2">
            <div className="text-xs text-zinc-400">
              {currentVol} / {selected.VolumiTotali}
            </div>
            <div className="h-2 bg-zinc-800 rounded">
              <div
                className="h-full bg-yellow-400 animate-pulse"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* LATEST */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Ultimi aggiunti</p>

        {latest.map((m) => (
          <div
            key={m.Id}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("openMangaDetail", { detail: m })
              )
            }
            className="flex gap-2 p-2 bg-[#141414] rounded-xl mb-2 cursor-pointer hover:bg-[#1a1a1a]"
          >
            <img src={m.CoverURL} className="w-8 h-10 rounded" />
            <span className="text-sm">{m.Titolo}</span>
          </div>
        ))}
      </div>

      {/* STATS */}
      <StatsPanel />

    </div>
  );
}
