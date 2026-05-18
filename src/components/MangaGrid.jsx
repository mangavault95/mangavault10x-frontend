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

  const safeManga = useMemo(() => {
    return (manga || []).map((m) => ({
      ...m,
      Titolo: m?.Titolo || "",
      Autore: m?.Autore || "",
      Genere: m?.Genere || "",
      CoverURL: m?.CoverURL || "",
      VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
      VolumiTotali: m?.VolumiTotali ? Number(m.VolumiTotali) : null
    }));
  }, [manga]);

  const enriched = useMemo(() => {
    return safeManga.map((m) => {
      const owned = m.VolumiPosseduti;
      const total = m.VolumiTotali;

      let status = "ongoing";
      let percent = 50;

      if (total) {
        percent = Math.min((owned / total) * 100, 100);

        if (owned >= total) {
          status = "completed";
          percent = 100;
        } else {
          status = "to_complete";
        }
      }

      return {
        ...m,
        percent,
        status
      };
    });
  }, [safeManga]);

  const fuse = useMemo(() => {
    if (!enriched.length) return null;

    return new Fuse(enriched, {
      keys: ["Titolo", "Autore", "Genere"],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true
    });
  }, [enriched]);

  const searched = useMemo(() => {
    const q = (search || "").trim();

    if (!q || !fuse) return enriched;

    try {
      return fuse.search(q).map((r) => r.item);
    } catch {
      return enriched;
    }
  }, [search, fuse, enriched]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "completed":
        return searched.filter((m) => m.status === "completed");

      case "to_complete":
        return searched.filter((m) => m.status === "to_complete");

      case "ongoing":
        return searched.filter((m) => m.status === "ongoing");

      default:
        return searched;
    }
  }, [searched, filter]);

  function getColor(m) {
    if (m.status === "completed") return "bg-green-500";
    if (m.status === "to_complete") return "bg-orange-500";
    return "bg-red-500";
  }

  return (
    <>
      <div
        className="overflow-y-auto overflow-x-hidden scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="grid grid-cols-6 gap-5 pb-10">

          {filtered.map((m, index) => (
            <div
              key={m.Id || m.Titolo || index}
              onClick={() => setSelectedManga(m)}
              className="group cursor-pointer relative"
              style={{
                animation: `fadeUp .35s ease forwards`,
                animationDelay: `${index * 20}ms`,
                opacity: 0
              }}
            >
              {/* GLOW */}
              <div className="absolute -inset-1 rounded-[24px] opacity-0 blur-xl bg-yellow-500/20 transition-all duration-500 group-hover:opacity-100" />

              {/* CARD */}
              <div className="relative rounded-[22px] overflow-hidden bg-[#151518] border border-zinc-800 transition-all duration-500 group-hover:scale-[1.06] group-hover:-translate-y-2 shadow-[0_10px_25px_rgba(0,0,0,0.35)] group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.65)]">

                {/* COVER */}
                <div className="relative">
                  <img
                    src={
                      m.CoverURL &&
                      m.CoverURL !== "undefined" &&
                      m.CoverURL.startsWith("http")
                        ? m.CoverURL
                        : "https://placehold.co/300x450?text=MangaVault"
                    }
                    alt={m.Titolo}
                    className="w-full h-[190px] object-cover transition-all duration-700 group-hover:scale-110"
                  />

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300" />

                  {/* STATUS DOT */}
                  <div
                    className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
                      m.status === "completed"
                        ? "bg-green-400"
                        : m.status === "to_complete"
                        ? "bg-orange-400"
                        : "bg-red-400"
                    } shadow-lg`}
                  />

                  {/* TITLE OVERLAY */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <p className="text-sm font-bold text-white">
                      {m.Titolo}
                    </p>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-3">

                  <h3 className="text-sm font-bold leading-tight text-white group-hover:text-yellow-300 line-clamp-1">
                    {m.Titolo}
                  </h3>

                  <p className="text-[11px] text-zinc-400 mt-1 truncate">
                    {m.Genere || "Nessun genere"}
                  </p>

                  <div className="mt-3">

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-400">
                        {m.status === "ongoing"
                          ? "In corso"
                          : `${m.percent.toFixed(0)}%`}
                      </span>

                      <span className="text-[10px] text-zinc-500">
                        {m.VolumiTotali
                          ? `${m.VolumiPosseduti}/${m.VolumiTotali}`
                          : `${m.VolumiPosseduti || 0}+`}
                      </span>
                    </div>

                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getColor(m)} transition-all duration-700`}
                        style={{ width: `${m.percent}%` }}
                      />
                    </div>

                  </div>

                </div>
              </div>
            </div>
          ))}

        </div>

        <style>
          {`
            div::-webkit-scrollbar {
              display: none;
            }

            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(15px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}
    </>
  );
}
