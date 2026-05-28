export default function MobileMangaGrid({
  searchResults = [],
  filter
}) {
  function getOwned(m) {
    return Number(m?.VolumiPosseduti) || 0;
  }

  function getTotal(m) {
    const raw = m?.VolumiTotali;

    if (raw === null || raw === undefined || raw === "") return null;

    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return null;

    const n = Number(cleaned);
    return Number.isNaN(n) ? null : n;
  }

  function matchFilter(m) {
    if (!filter || filter === "all") return true;

    const owned = getOwned(m);
    const total = getTotal(m);

    switch (filter) {
      case "ongoing":
        // ✅ FIX DEFINITIVO
        return total === null && owned > 0;

      case "to_complete":
        return total !== null && owned < total;

      case "completed":
        return total !== null && owned >= total;

      case "short":
        return total !== null && total >= 2 && total < 8;

      case "oneshot":
        return total === 1 && owned >= 1;

      default:
        return true;
    }
  }

  const list = [...searchResults]
    .filter(matchFilter)
    .sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-[100px]">
      {list.map((m) => {
        const owned = getOwned(m);
        const total = getTotal(m);

        const percent =
          total === null
            ? owned > 0 ? 50 : 0
            : Math.min(100, (owned / total) * 100);

        // ✅ colori corretti
        let color = "bg-yellow-400"; // ongoing
        if (total !== null && owned >= total) color = "bg-green-500";
        if (total !== null && owned < total) color = "bg-red-500";

        return (
          <button
            key={m.ID}
            onClick={() => openDetail(m)}
            className="
              rounded-xl overflow-hidden
              border border-white/10
              bg-white/[0.04]
              text-left
            "
          >
            {/* COVER */}
            <div className="h-[160px] flex items-center justify-center bg-black/20">
              {m.CoverURL ? (
                <img
                  src={m.CoverURL}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-zinc-500">
                  Nessuna cover
                </div>
              )}
            </div>

            {/* INFO */}
            <div className="p-2 space-y-1">

              {/* titolo */}
              <div className="text-[12px] font-semibold line-clamp-2">
                {m.Titolo || "Titolo sconosciuto"}
              </div>

              {/* autore ✅ aggiunto */}
              <div className="text-[10px] text-zinc-400 truncate">
                {m.Autore || "Autore sconosciuto"}
              </div>

              {/* progress ✅ */}
              <div className="mt-1">
                <div className="h-[4px] bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`${color} h-full`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="text-[10px] text-zinc-400 mt-[2px] text-right">
                  {owned}/{total !== null ? total : "?"}
                </div>
              </div>

            </div>
          </button>
        );
      })}
    </div>
  );
}
