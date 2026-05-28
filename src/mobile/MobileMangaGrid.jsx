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

  function getStatus(m) {
    const owned = getOwned(m);
    const total = getTotal(m);

    // ✅ ongoing: se non conosciamo il totale
    if (total === null) {
      return owned > 0 ? "ongoing" : "ongoing";
    }

    if (owned >= total) return "completed";

    return "to_complete";
  }

  function matchFilter(m) {
    if (!filter || filter === "all") return true;

    const owned = getOwned(m);
    const total = getTotal(m);

    switch (filter) {
      case "ongoing":
        // ✅ FIX: total deve essere NULL, NON 0
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

  const list = searchResults.filter(matchFilter);

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-[100px]">
      {list.map((manga) => {
        const owned = getOwned(manga);
        const total = getTotal(manga);
        const status = getStatus(manga);

        const percent =
          total === null
            ? owned > 0
              ? 50
              : 0
            : total > 0
            ? Math.min(100, (owned / total) * 100)
            : 0;

        // ✅ colori coerenti
        let bar = "bg-yellow-400"; // ongoing
        if (status === "completed") bar = "bg-green-500";
        if (status === "to_complete") bar = "bg-red-500";

        return (
          <button
            key={manga.ID}
            onClick={() => openDetail(manga)}
            className="rounded-xl overflow-hidden bg-white/[0.04] border border-white/10"
          >
            {/* COVER */}
            <div className="h-[180px] flex items-center justify-center bg-black/20">
              {manga.CoverURL ? (
                <img
                  src={manga.CoverURL}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-zinc-500">
                  Nessuna cover
                </div>
              )}
            </div>

            {/* INFO */}
            <div className="p-2">

              <div className="text-xs font-semibold truncate">
                {manga.Titolo || "Titolo sconosciuto"}
              </div>

              <div className="text-[10px] text-zinc-400 truncate">
                {manga.Autore || "Autore sconosciuto"}
              </div>

              {/* PROGRESS */}
              <div className="mt-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className={bar}
                  style={{ width: `${percent}%`, height: "100%" }}
                />
              </div>

              <div className="text-[10px] text-zinc-400 mt-1">
                {owned}/{total !== null ? total : "?"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
