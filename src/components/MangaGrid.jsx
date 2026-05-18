import { useEffect, useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ search = "", filter = "all" }) {
  const [manga, setManga] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((res) => res.json())
      .then((data) => setManga(data || []));
  }, []);

  const filtered = useMemo(() => {
    let list = [...manga].sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

    if (search)
      list = list.filter((m) =>
        m.Titolo.toLowerCase().includes(search.toLowerCase())
      );

    switch (filter) {
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

  return (
    <>
      <div className="grid grid-cols-6 gap-5">

        {filtered.map((m) => {
          const total = m.VolumiTotali;
          const owned = m.VolumiPosseduti;

          return (
            <div
              key={m.Id}
              onClick={() => setSelectedManga(m)}
              className="group cursor-pointer hover:scale-105 transition"
            >

              <div className="bg-[#141414] rounded-xl overflow-hidden border border-white/10">

                src={
                    m.CoverURL || "https://placehold.co/300x450"
                  }
                  className="w-full h-[190px] object-cover"
                />

                <div className="p-3">

                  <h3 className="text-sm font-bold">{m.Titolo}</h3>

                  <p className="text-xs text-zinc-400">
                    {m.Genere || "Nessun genere"}
                  </p>

                  <div className="text-[10px] text-zinc-400 mt-1">
                    {total ? `${owned}/${total}` : `${owned}+`}
                  </div>

                </div>

              </div>

            </div>
          );
        })}
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
