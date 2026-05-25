import { useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ searchResults = [], filter }) {

  const [selectedManga, setSelectedManga] = useState(null);

  // -----------------------------
  // PARSING ROBUSTO
  // -----------------------------
  function parseTotal(raw) {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  function getMeta(m) {
    const total = parseTotal(m.VolumiTotali);
    const owned = Number(m.VolumiPosseduti) || 0;
    const hasKnownTotal = total !== null;
    return { total, owned, hasKnownTotal };
  }

  // -----------------------------
  // STATUS
  // -----------------------------
  function getStatus(m){
    const { total, owned, hasKnownTotal } = getMeta(m);

    if (!hasKnownTotal && owned > 0) return "ongoing";
    if (hasKnownTotal && owned < total) return "to_complete";
    if (hasKnownTotal && owned === total) return "completed";

    return "ongoing";
  }

  function barColor(status){
    if(status === "completed") return "bg-green-500";
    if(status === "to_complete") return "bg-red-500";
    return "bg-yellow-400";
  }

  // -----------------------------
  // FILTRI
  // -----------------------------
  const filtered = useMemo(() => {

    let list = [...searchResults].sort((a,b)=>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

    switch(filter){

      case "ongoing":
        return list.filter(m => {
          const { owned, hasKnownTotal } = getMeta(m);
          return !hasKnownTotal && owned > 0;
        });

      case "to_complete":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned < total;
        });

      case "completed":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned === total;
        });

      case "short":
        return list.filter(m => {
          const { total, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total >= 2 && total < 8;
        });

      case "oneshot":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total === 1 && owned >= 1;
        });

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

          const { total, owned, hasKnownTotal } = getMeta(m);
          const status = getStatus(m);

          const percent = hasKnownTotal
            ? Math.min(100, (owned / total) * 100)
            : 50;

          return (
            <div
              key={m.ID}
              onClick={() => setSelectedManga(m)}
              className="group cursor-pointer"
            >

              {/* VOLUME 3D FLAT */}
              <div className="
                volume-3d
                bg-[#141414]
                rounded-xl
                border border-white/10
                shadow-xl shadow-black/40
                overflow-hidden
              ">

                {/* COVER */}
                <div className="w-full h-[230px] bg-black flex items-center justify-center">
                  <img
                    src={m.CoverURL || 'https://placehold.co/300x450'}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* INFO */}
                <div className="p-3">

                  <h3 className="text-sm font-bold truncate">
                    {m.Titolo}
                  </h3>

                  <p className="text-xs text-zinc-400 truncate">
                    {m.Genere || "Nessun genere"}
                  </p>

                  <div className="text-[10px] text-zinc-400 mt-1">
                    {hasKnownTotal ? `${owned}/${total}` : `${owned}+`}
                  </div>

                  {/* PROGRESS BAR */}
                  <div className="h-1 bg-zinc-800 mt-2 rounded overflow-hidden">
                    <div
                      className={`${barColor(status)} h-full transition-all duration-500 ease-out`}
                      style={{ width: `${percent}%` }}
                      title={
                        status === "completed"
                          ? "Completato"
                          : status === "to_complete"
                          ? "Da completare"
                          : "In corso"
                      }
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
