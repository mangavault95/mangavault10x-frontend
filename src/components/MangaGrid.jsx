import { useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ searchResults = [], filter }) {

  const [selectedManga, setSelectedManga] = useState(null);

  // -----------------------------
  // HELPERS
  // -----------------------------
  function getTotals(m) {
    const rawTotal = m.VolumiTotali;
    const total = Number(rawTotal);
    const owned = Number(m.VolumiPosseduti) || 0;

    const hasKnownTotal = !isNaN(total) && total > 0;

    return { total, owned, hasKnownTotal };
  }

  function getStatus(m){
    const { total, owned, hasKnownTotal } = getTotals(m);

    // Serie non conclusa, volumi totali sconosciuti → IN CORSO
    if (m.Concluso === 0 && !hasKnownTotal && owned > 0) {
      return "ongoing";
    }

    // Serie non conclusa, volumi totali noti ma non completa → DA COMPLETARE
    if (m.Concluso === 0 && hasKnownTotal && owned > 0 && owned < total) {
      return "to_complete";
    }

    // Serie conclusa o comunque completa → COMPLETATA
    if (m.Concluso === 1 || (hasKnownTotal && owned >= total)) {
      return "completed";
    }

    // Fallback: la consideriamo ongoing
    return "ongoing";
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

      // IN CORSO → non conclusa, volumi totali sconosciuti, possiedi già qualcosa
      case "ongoing":
        return list.filter(m => {
          const { hasKnownTotal, owned } = getTotals(m);
          return m.Concluso === 0 &&
                 !hasKnownTotal &&
                 owned > 0;
        });

      // DA COMPLETARE → non conclusa, volumi totali noti, possiedi meno del totale
      case "to_complete":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getTotals(m);
          return m.Concluso === 0 &&
                 hasKnownTotal &&
                 owned > 0 &&
                 owned < total;
        });

      // COMPLETATI → concluso = 1 oppure possiedi tutti i volumi noti
      case "completed":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getTotals(m);
          return m.Concluso === 1 ||
                 (hasKnownTotal && owned >= total);
        });

      // SERIE BREVI → 2–7 volumi totali noti
      case "short":
        return list.filter(m => {
          const { total, hasKnownTotal } = getTotals(m);
          return hasKnownTotal && total >= 2 && total < 8;
        });

      // VOLUMI UNICI → 1/1
      case "oneshot":
        return list.filter(m => {
          const { total, owned, hasKnownTotal } = getTotals(m);
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

          const { total, owned, hasKnownTotal } = getTotals(m);
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
