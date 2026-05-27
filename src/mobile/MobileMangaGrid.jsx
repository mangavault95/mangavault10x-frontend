export default function MobileMangaGrid({
  searchResults = [],
  filter
}) {
  function getOwned(manga) {
    return Number(manga?.VolumiPosseduti) || 0;
  }

  function getTotal(manga) {
    const val = manga?.VolumiTotali;
    if (!val) return null;
    const n = Number(String(val).replace(/\D/g, ""));
    return Number.isNaN(n) ? null : n;
  }

  function getStatus(m) {
    const total = getTotal(m);
    const owned = getOwned(m);

    if (total === null) return "ongoing";
    if (owned >= total) return "completed";
    return "to_complete";
  }

  function getPercent(m) {
    const total = getTotal(m);
    const owned = getOwned(m);

    if (!total) return owned > 0 ? 50 : 0;
    return Math.min(100, (owned / total) * 100);
  }

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-[100px]">
      {searchResults.map((manga) => {
        const percent = getPercent(manga);
        const status = getStatus(manga);

        let bar = "bg-yellow-400";
        if (status === "completed") bar = "bg-green-500";
        if (status === "to_complete") bar = "bg-red-500";

        return (
          <button
            key={manga.ID}
            onClick={() => openDetail(manga)}
            className="rounded-xl overflow-hidden bg-white/[0.04] border border-white/10"
          >
            <div className="h-[180px] bg-black/20 relative">
              {manga.CoverURL && (
                <img
                  src={manga.CoverURL}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="p-2">
              <div className="text-xs font-semibold truncate">
                {manga.Titolo}
              </div>

              <div className="text-[10px] text-zinc-400 truncate">
                {manga.Autore}
              </div>

              <div className="mt-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className={bar}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

