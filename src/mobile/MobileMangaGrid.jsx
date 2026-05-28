export default function MobileMangaGrid({
  searchResults = [],
  filter
}) {
  function getOwned(m) {
    return Number(m?.VolumiPosseduti) || 0;
  }

  function getTotal(m) {
    const raw = m?.VolumiTotali;
    if (!raw) return null;

    const n = Number(String(raw).replace(/\D/g, ""));
    return Number.isNaN(n) ? null : n;
  }

  function getStatus(m) {
    const owned = getOwned(m);
    const total = getTotal(m);

    if (total === null) return "ongoing";
    if (owned >= total) return "completed";
    return "to_complete";
  }

  function matchFilter(m) {
    if (!filter || filter === "all") return true;

    const owned = getOwned(m);
    const total = getTotal(m);

    switch (filter) {
      case "ongoing":
        return total === null && owned > 0;

      case "to_complete":
        return total !== null && owned < total;

      case "completed":
        return total !== null && owned >= total;

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

        const percent = total
          ? Math.min(100, (owned / total) * 100)
          : 0;

        let bar = "bg-yellow-400";
        if (status === "completed") bar = "bg-green-500";
        if (status === "to_complete") bar = "bg-red-500";

        return (
          <button
            key={manga.ID}
            onClick={() => openDetail(manga)}
            className="rounded-xl overflow-hidden bg-white/[0.04] border border-white/10"
          >
            <div className="h-[180px]">
              <img
                src={manga.CoverURL}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-2">

              <div className="text-xs font-semibold truncate">
                {manga.Titolo}
              </div>

              <div className="text-[10px] text-zinc-400 truncate">
                {manga.Autore}
              </div>

              <div className="mt-1 h-[4px] bg-white/10 rounded-full">
                <div
                  className={bar}
                  style={{ width: `${percent}%`, height: "100%" }}
                />
              </div>

              <div className="text-[10px] text-zinc-400 mt-1">
                {owned}/{total ?? "?"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
