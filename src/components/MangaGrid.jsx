import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ search = "", filter = "all" }) {
  const [manga, setManga] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(Array.isArray(data) ? data : []))
      .catch(() => setManga([]));
  }, []);

  const enriched = useMemo(() => {
    return manga.map((m) => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const total = Number(m.VolumiTotali) || 0;

      const percent = total ? Math.min((owned / total) * 100, 100) : 0;

      let status = "ongoing";
      if (total && owned >= total) status = "completed";
      else if (total) status = "to_complete";

      return {
        ...m,
        percent,
        status
      };
    });
  }, [manga]);

  const fuse = useMemo(() => {
    return new Fuse(enriched, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3
    });
  }, [enriched]);

  const searched = useMemo(() => {
    if (!search) return enriched;
    return fuse.search(search).map((r) => r.item);
  }, [search, fuse, enriched]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "completed":
        return searched.filter((m) => m.status === "completed");

      case "ongoing":
        return searched.filter((m) => m.status === "ongoing");

      case "to_complete":
        return searched.filter((m) => m.status === "to_complete");

      case "short":
  return searched.filter(
    m =>
      m.VolumiTotali &&
      m.VolumiTotali >= 2 &&
      m.VolumiTotali < 8
  );

      case "oneshot":
  return searched.filter(
    m => m.VolumiPosseduti === 1
  );
  }, [searched, filter]);

  function getColor(m) {
    if (m.status === "completed") return "bg-green-400";
    if (m.status === "to_complete") return "bg-orange-400";
    return "bg-red-400";
  }

  return (
    <>
      <div className="grid grid-cols-6 gap-5 pb-10">

        {filtered.map((m, index) => (
          <div
            key={m.Id || index}
            onClick={() => setSelectedManga(m)}
            className="group cursor-pointer hover:scale-[1.05] transition-all"
          >
            <div className="
              relative rounded-[20px] overflow-hidden
              bg-[#141414]
              border border-white/10
              group-hover:border-yellow-400
              group-hover:shadow-[0_0_25px_rgba(250,204,21,0.3)]
              transition-all duration-300
            ">

              <img
                src={
                  m.CoverURL?.startsWith("http")
                    ? m.CoverURL
                    : "https://placehold.co/300x450?text=MangaVault"
                }
                className="
                  w-full h-[190px] object-cover
                  transition duration-500
                  group-hover:scale-110
                "
              />

              <div className="p-3">

                <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition">
                  {m.Titolo}
                </h3>

                <p className="text-[11px] text-zinc-400 truncate">
                  {m.Genere || "Nessun genere"}
                </p>

                {/* PROGRESS */}
                <div className="mt-3">

                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>
                      {m.status === "ongoing"
                        ? "In corso"
                        : `${m.percent.toFixed(0)}%`}
                    </span>
                    <span>
                      {m.VolumiTotali
                        ? `${m.VolumiPosseduti}/${m.VolumiTotali}`
                        : `${m.VolumiPosseduti}+`}
                    </span>
                  </div>

                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`
                        h-full ${getColor(m)}
                        transition-all duration-500
                        animate-pulse
                      `}
                      style={{ width: `${m.percent}%` }}
                    />
                  </div>

                </div>

              </div>
            </div>
          </div>
        ))}

      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}

      <style>
        {`
        @keyframes pulse {
          0% { opacity: .6 }
          50% { opacity: 1 }
          100% { opacity: .6 }
        }
        `}
      </style>
    </>
  );
}
