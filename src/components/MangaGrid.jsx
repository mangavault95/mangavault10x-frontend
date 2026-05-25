import { useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ searchResults = [], filter }) {

  const [selectedManga, setSelectedManga] = useState(null);

  // -----------------------------
  // PARSING ROBUSTO
  // -----------------------------
  function parseTotal(raw) {
    if (!raw) return null; // null, undefined, empty string

    // rimuove simboli non numerici (+, ?, ecc.)
    const cleaned = String(raw).replace(/[^0-9]/g, "");

    if (!cleaned) return null;

    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  function getMeta(m) {
    const total = parseTotal(m.VolumiTotali);
    const owned = Number(m.VolumiPosseduti) || 0;
    const hasKnownTotal = total !== null;
    const concluded = Number(m.Concluso) || 0; // 0 o 1, anche se era "0"/"1"

    return { total, owned, hasKnownTotal, concluded };
  }

  // -----------------------------
  // STATUS
  // -----------------------------
  function getStatus(m){
    const { total, owned, hasKnownTotal, concluded } = getMeta(m);

    // IN CORSO → non conclusa, totali sconosciuti, possiedi già qualcosa
    if (concluded === 0 && !hasKnownTotal && owned > 0)
      return "ongoing";

    // DA COMPLETARE → non conclusa, totali noti, possiedi meno del totale
    if (concluded === 0 && hasKnownTotal && owned < total)
      return "to_complete";

    // il resto lo consideriamo completato
    return "completed";
  }

  function barColor(status){
    if(status === "completed") return "bg-green-400";
    if(status === "to_complete") return "bg-red-400";
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

      // IN CORSO → non conclusa, totali sconosciuti, possiedi già qualcosa
      case "ongoing":
        return list.filter(m => {
          const { owned, hasKnownTotal, concluded } = getMeta(m);
          return concluded === 0 &&
                 !hasKnownTotal &&
                 owned > 0;
        });

      // DA COMPLETARE → non conclusa, totali noti, possiedi meno del totale
      case "to_complete":
        return list.filter(m => {
          const { total, owned, hasKnownTotal, concluded } = getMeta(m);
          return concluded === 0 &&
                 hasKnownTotal &&
                 owned < total;
        });

      // COMPLETATI → concluso = 1 oppure possiedi tutti i volumi noti
      case "completed":
        return list.filter(m => {
          const { total, owned, hasKnownTotal, concluded } = getMeta(m);
          return concluded === 1 ||
                 (hasKnownTotal && owned >= total);
        });

      // SERIE BREVI → 2–7 volumi totali noti
      case "short":
        return list.filter(m => {
          const { total, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total >= 2 && total < 8;
        });

      // VOLUMI UNICI → 1/1
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
                    {hasKnownTotal ? `${owned}/${total}` : `${owned}+`}
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
