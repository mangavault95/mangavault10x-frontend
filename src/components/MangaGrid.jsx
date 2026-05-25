import { useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ searchResults = [], filter }) {

  const [selectedManga, setSelectedManga] = useState(null);

  // -----------------------------
  // STATUS LOGIC
  // -----------------------------
  function getStatus(m){
    // ongoing = VolumiTotali === null
    if (m.VolumiTotali === null) return "ongoing";

    const total = Number(m.VolumiTotali);
    const owned = Number(m.VolumiPosseduti);

    if (owned >= total) return "completed";
    return "to_complete";
  }

  function barColor(status){
    if(status === "completed") return "bg-green-400";
    if(status === "to_complete") return "bg-red-400";
    return "bg-yellow-400"; // ongoing
  }

  // -----------------------------
  // FILTER LOGIC
  // -----------------------------
  const filtered = useMemo(() => {

    let list = [...searchResults].sort((a,b)=>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

    switch(filter){

      // IN CORSO → VolumiTotali === null
      case "ongoing":
        return list.filter(m =>
          m.VolumiTotali === null
        );

      // DA COMPLETARE → Concluso = 1 AND VolumiPosseduti < VolumiTotali
      case "to_complete":
        return list.filter(m =>
          m.Concluso === 1 &&
          m.VolumiTotali !== null &&
          Number(m.VolumiPosseduti) < Number(m.VolumiTotali)
        );

      // COMPLETATI → VolumiPosseduti >= VolumiTotali
      case "completed":
        return list.filter(m =>
          m.VolumiTotali !== null &&
          Number(m.VolumiPosseduti) >= Number(m.VolumiTotali)
        );

      // SERIE BREVI → 2–7 volumi
      case "short":
        return list.filter(m =>
          Number(m.VolumiTotali) >= 2 &&
          Number(m.VolumiTotali) < 8
        );

      // VOLUMI UNICI → 1/1
      case "oneshot":
        return list.filter(m =>
          Number(m.VolumiPosseduti) === 1 &&
          Number(m.VolumiTotali) === 1
        );

      default:
        return list;
    }

  }, [searchResults, filter]);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <>
      <div className="grid grid-cols-6 gap-6">

        {filtered.map(m => {

          const total = Number(m.VolumiTotali);
          const owned = Number(m.VolumiPosseduti);
          const status = getStatus(m);

          // percentuale barra
          const percent = total
            ? (owned / total) * 100
            : 50; // ongoing → barra neutra

          return (
            <div
              key={m.ID}
              onClick={() => setSelectedManga(m)}
              className="group cursor-pointer hover:scale-[1.05] transition"
            >

              <div className="bg-[#141414] rounded-xl border border-white/10 overflow-hidden">

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
                      className={`${barColor(status)} h-full`}
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
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}
    </>
  );
}
