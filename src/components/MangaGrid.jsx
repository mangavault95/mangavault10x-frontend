import { useMemo } from "react";

export default function MangaGrid({ searchResults = [], filter }) {
  function parseTotal(raw) {
    if (raw === null || raw === undefined || raw === "") return null;

    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return null;

    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  }

  function getMeta(m) {
    const total = parseTotal(m?.VolumiTotali);
    const owned = Number(m?.VolumiPosseduti) || 0;
    const hasKnownTotal = total !== null;

    return {
      total,
      owned,
      hasKnownTotal
    };
  }

  function getStatus(m) {
    const { total, owned, hasKnownTotal } = getMeta(m);

    if (!hasKnownTotal && owned > 0) return "ongoing";
    if (hasKnownTotal && owned < total) return "to_complete";
    if (hasKnownTotal && owned === total) return "completed";
    return "ongoing";
  }

  function progressPercent(m) {
    const { total, owned, hasKnownTotal } = getMeta(m);

    if (!hasKnownTotal) return owned > 0 ? 50 : 0;
    if (!total || total <= 0) return 0;

    return Math.min(100, (owned / total) * 100);
  }

  function progressBarClass(status) {
    if (status === "completed") {
      return "bg-gradient-to-r from-green-400 to-green-600";
    }

    if (status === "to_complete") {
      return "bg-gradient-to-r from-yellow-300 to-yellow-500";
    }

    return "bg-gradient-to-r from-blue-400 to-blue-500";
  }

  const filtered = useMemo(() => {
    let list = [...searchResults].sort((a, b) =>
      String(a?.Titolo || "").localeCompare(String(b?.Titolo || ""))
    );

    switch (filter) {
      case "ongoing":
        return list.filter((m) => {
          const { owned, hasKnownTotal } = getMeta(m);
          return !hasKnownTotal && owned > 0;
        });

      case "to_complete":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned < total;
        });

      case "completed":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned === total;
        });

      case "short":
        return list.filter((m) => {
          const { total, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total >= 2 && total < 8;
        });

      case "oneshot":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total === 1 && owned >= 1;
        });

      default:
        return list;
    }
  }, [searchResults, filter]);

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
        const { total, owned, hasKnownTotal } = getMeta(manga);
        const status = getStatus(manga);
        const percent = progressPercent(manga);

        const statusLabel =
          status === "completed"
            ? "Completo"
            : status === "to_complete"
            ? "Da completare"
            : "In corso";

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
                  {/* ambient fill */}
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

                  {/* real cover */}
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
                    {owned}/{hasKnownTotal ? total : "?"} vol
                  </span>

                  <span>{statusLabel}</span>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${progressBarClass(
                      status
                    )}`}
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
