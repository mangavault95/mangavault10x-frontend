export default function MangaGrid({ searchResults = [], filter }) {
  function parseTotal(value) {
    if (value === null || value === undefined || value === "") return null;
 
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return null;

    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  }

  function getOwned(manga) {
    return Number(manga?.VolumiPosseduti) || 0;
  }

  function getTotal(manga) {
    return parseTotal(manga?.VolumiTotali);
  }

  function getStatus(manga) {
    const owned = getOwned(manga);
    const total = getTotal(manga);

    // Nessun totale noto -> consideriamo "in corso" se ha almeno un volume
    if (total === null) {
      return owned > 0 ? "ongoing" : "ongoing";
    }

    // Se posseduti >= totali -> completo
    if (owned >= total) return "completed";

    // Se ha un totale noto ma non è completo -> da completare
    return "to_complete";
  }

  function getPercent(manga) {
    const owned = getOwned(manga);
    const total = getTotal(manga);

    if (total === null) {
      return owned > 0 ? 50 : 0;
    }

    if (total <= 0) return 0;

    return Math.min(100, (owned / total) * 100);
  }

  function matchesFilter(manga) {
    if (!filter) return true;

    const owned = getOwned(manga);
    const total = getTotal(manga);

    switch (filter) {
      case "ongoing":
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

  const filtered = [...searchResults]
    .filter(matchesFilter)
    .sort((a, b) =>
      String(a?.Titolo || "").localeCompare(String(b?.Titolo || ""))
    );

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {filtered.map((manga) => {
        const owned = getOwned(manga);
        const total = getTotal(manga);
        const status = getStatus(manga);
        const percent = getPercent(manga);

        let statusLabel = "In corso";
        if (status === "completed") statusLabel = "Completo";
        if (status === "to_complete") statusLabel = "Da completare";

        // ✅ colori corretti:
        // in corso = giallo
        // da completare = rosso
        // completato = verde
        let progressClass = "bg-gradient-to-r from-yellow-300 to-yellow-500";
        if (status === "completed") {
          progressClass = "bg-gradient-to-r from-green-400 to-green-600";
        } else if (status === "to_complete") {
          progressClass = "bg-gradient-to-r from-red-400 to-red-600";
        }

        let statusTextClass = "text-yellow-400";
        if (status === "completed") {
          statusTextClass = "text-green-400";
        } else if (status === "to_complete") {
          statusTextClass = "text-red-400";
        }

        return (
          <button
            key={manga.ID}
            type="button"
            onClick={() => openDetail(manga)}
            className="
              group text-left
              rounded-2xl overflow-hidden
              border border-white/10
              backdrop-blur-lg
              hover:border-yellow-400/25
              hover:shadow-[0_0_24px_rgba(99,102,241,0.16)]
              transition-all duration-300
            "
            style={{
              background:
                "linear-gradient(180deg, rgba(24,30,56,0.34), rgba(12,16,28,0.52))",
              boxShadow: "0 10px 26px rgba(0,0,0,0.16)"
            }}
          >
            {/* COVER */}
            <div className="relative h-[220px] overflow-hidden">
              {manga.CoverURL ? (
                <>
                  <img
                    src={manga.CoverURL}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-35"
                  />

                  <div className="absolute inset-0 bg-black/10" />

                  <img
                    src={manga.CoverURL}
                    alt={manga.Titolo || "Cover manga"}
                    className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
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
            <div className="p-2.5 text-white">
              <div
                className="text-[13px] font-semibold leading-tight min-h-[2.35rem]"
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
                className="text-[11px] text-zinc-300 mt-0.5 truncate"
                title={manga.Autore || ""}
              >
                {manga.Autore || "Autore sconosciuto"}
              </div>

              <div
                className="text-[10px] text-zinc-400 mt-0.5 truncate"
                title={manga.Genere || ""}
              >
                {manga.Genere || "Nessun genere"}
              </div>

              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
                  <span>
                    {owned}/{total !== null ? total : "?"} vol
                  </span>

                  <span className={statusTextClass}>{statusLabel}</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${progressClass}`}
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
