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
    return manga.map((m) => ({
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
    const q = search.trim();
    if (!q || !fuse) return enriched;

    return fuse.search(q).map((r) => r.item);
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
      <div className="grid grid-cols-6 gap-5 pb-10">

        {filtered.map((m, index) => (
          <div
            key={m.Id || index}
            onClick={() => setSelectedManga(m)}
            className="group cursor-pointer transition-all duration-300 hover:scale-[1.05]"
          >

            {/* CARD */}
            <div
              className="
                relative rounded-[20px] overflow-hidden
                bg-[#141414]
                border border-white/10
                transition-all duration-300
                group-hover:border-yellow-400
                group-hover:shadow-[0_0_25px_rgba(250,204,21,0.3)]
              "
            >

              {/* COVER */}
              <img
                src={
                  m.CoverURL?.startsWith("http")
                    ? m.CoverURL
                    : "https://placehold.co/300x450?text=MangaVault"
                }
                alt={m.Titolo}
                className="
                  w-full h-[190px] object-cover
                  transition-all duration-500
                  group-hover:scale-110
                "
              />

              {/* CONTENT */}
              <div className="p-3">

                <h3 className="
                  text-sm font-bold text-white
                  group-hover:text-yellow-400
                  transition
                ">
                  {m.Titolo}
                </h3>

                <p className="text-[11px] text-zinc-400 mt-1 truncate">
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
                      className={`h-full ${getColor(m)} transition-all duration-500`}
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
    </>
  );
}
