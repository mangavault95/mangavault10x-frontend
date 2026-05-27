export default function MangaGrid({ searchResults = [], filter }) {
  function getOwned(m) {
    return Number(muti) || 0;
  }

  function getTotal(m) {
    const total = Number(m?.VolumiTotali);
    return Number.isFinite(total) ? total : 0;
  }

  function isCompleted(m) {
    const owned = getOwned(m);
    const total = getTotal(m);
    return (!!total && total > 0 && owned >= total) || m?.Concluso === 1;
  }

  function isOngoing(m) {
    const total = getTotal(m);
    return (
      !isCompleted(m) &&
      (!total || total === 0 || m?.VolumiTotali === "?" || m?.Concluso === 0)
    );
  }

  function matchesFilter(m) {
    if (!filter) return true;

    const owned = getOwned(m);
    const total = getTotal(m);

    switch (filter) {
      case "ongoing":
        return isOngoing(m);

      case "to_complete":
        return !isCompleted(m) && owned > 0 && total > 0;

      case "completed":
        return isCompleted(m);

      case "short":
        return total > 0 && total <= 5;

      case "oneshot":
        return total === 1;

      default:
        return true;
    }
  }

  const filtered = searchResults.filter(matchesFilter);

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      {filtered.map((manga) => {
        const owned = getOwned(manga);
        const total = getTotal(manga);

        const percent =
          total > 0 ? Math.min((owned / total) * 100, 100) : isOngoing(manga) ? 50 : 0;

        return (
          <button
            key={manga.ID}
            type="button"
            onClick={() => openDetail(manga)}
            className="
              group text-left
              rounded-2xl overflow-hidden
              border border-white/[0.09]
              bg-white/[0.035]
              backdrop-blur-md
              hover:bg-white/[0.055]
              hover:border-yellow-400/25
              hover:shadow-[0_0_28px_rgba(99,102,241,0.12)]
              transition-all duration-300
            "
          >
            {/* COVER */}
            <div className="relative h-[250px] overflow-hidden">
              {manga.CoverURL ? (
                <>
                  {/* riempimento soft per evitare bande nere */}
                  <img
                    src={manga.CoverURL}
                    alt=""
                    aria-hidden="true"
                    className="
                      absolute inset-0
                      w-full h-full
                      object-cover
                      scale-110
                      blur-md
                      opacity-35
                    "
                  />

                  <div className="absolute inset-0 bg-black/10" />

                  <img
                    src={manga.CoverURL}
                    alt={manga.Titolo || "Cover manga"}
                    className="
                      relative z-10
                      w-full h-full
                      object-contain
                      transition-transform duration-300
                      group-hover:scale-[1.02]
                    "
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm bg-white/[0.02]">
                  Nessuna cover
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none">
                <div className="cover-shine" />
              </div>
            </div>

            {/* INFO */}
            <div className="p-3 text-white">
              <div
                className="text-sm font-semibold leading-tight min-h-[2.6rem]"
                title={manga.Titolo || ""}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {manga.Titolo || "Titolo sconosciuto"}
              </div>

              <div
                className="text-xs text-zinc-400 mt-1 truncate"
                title={manga.Autore || ""}
              >
                {manga.Autore || "Autore sconosciuto"}
              </div>

              <div
                className="text-[11px] text-zinc-500 mt-1 truncate"
                title={manga.Genere || ""}
              >
                {manga.Genere || "Nessun genere"}
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                  <span>
                    {owned}/{total || "?"} vol
                  </span>

                  <span>
                    {isCompleted(manga)
                      ? "Completo"
                      : isOngoing(manga)
                      ? "In corso"
                      : "Da completare"}
                  </span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted(manga)
                        ? "bg-gradient-to-r from-green-400 to-green-600"
                        : "bg-gradient-to-r from-yellow-300 to-yellow-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
