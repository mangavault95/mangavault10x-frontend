import { useEffect, useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ search = "", filter = "all" }) {
  const [manga, setManga] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(d || []));
  }, []);

  const filtered = useMemo(() => {
    let list = [...manga].sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

    if (search)
      list = list.filter((m) =>
        m.Titolo.toLowerCase().includes(search.toLowerCase())
      );

    const getStatus = (m) => {
      const owned = m.VolumiPosseduti;
      const total = m.VolumiTotali;
      if (!total) return "ongoing";
      if (owned >= total) return "completed";
      return "to_complete";
    };

    switch (filter) {
      case "ongoing":
        return list.filter((m) => getStatus(m) === "ongoing");

      case "to_complete":
        return list.filter((m) => getStatus(m) === "to_complete");

      case "completed":
        return list.filter((m) => getStatus(m) === "completed");

      case "short":
        return list.filter(
          (m) => m.VolumiTotali >= 2 && m.VolumiTotali < 8
        );

      case "oneshot":
        return list.filter(
          (m) => m.VolumiTotali === 1 && m.VolumiPosseduti === 1
        );

      default:
        return list;
    }
  }, [manga, search, filter]);

  function getBarColor(m) {
    const owned = m.VolumiPosseduti;
    const total = m.VolumiTotali;

    if (total && owned >= total) return "bg-green-400";
    if (total) return "bg-yellow-400";
    return "bg-red-400";
  }

  return (
    <>
      <div className="grid grid-cols-6 gap-6">

        {filtered.map((m) => {
          const total = Number(m.VolumiTotali);
          const owned = Number(m.VolumiPosseduti);
          const percent = total ? (owned / total) * 100 : 50;

          return (
            <div
              key={m.ID}
              onClick={() => setSelectedManga(m)}
              className="hover:scale-[1.05] transition cursor-pointer"
            >
              <div className="bg-[#141414] rounded-xl overflow-hidden border border-white/10">

                <img
                  src={m.CoverURL || "https://placehold.co/300x450"}
                  className="w-full h-[190px] object-cover"
                />

                <div className="p-3">

                  <h3 className="text-sm font-bold truncate">
                    {m.Titolo}
                  </h3>

                  <p className="text-xs text-zinc-400">
                    {m.Genere || "Nessun genere"}
                  </p>

                  <div className="text-[10px] text-zinc-400 mt-1">
                    {total ? `${owned}/${total}` : `${owned}+`}
                  </div>

                  <div className="h-1 bg-zinc-800 mt-2 rounded">
                    <div
                      className={`${getBarColor(m)} h-full animate-pulse`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedManga && (
        <MangaDetail manga={selectedManga} onClose={() => setSelectedManga(null)} />
      )}
    </>
  );
}
