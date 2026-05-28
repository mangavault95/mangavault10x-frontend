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

  function matchFilter(m) {
    const owned = getOwned(m);
    const total = getTotal(m);

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

  const list = [...searchResults]
    .filter(matchFilter)
    .sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

  return (
    <div className="grid grid-cols-2 gap-3 pb-[100px]">
      {list.map((m) => {
        const owned = getOwned(m);
        const total = getTotal(m);

        const percent =
          total === null
            ? owned > 0 ? 50 : 0
            : Math.min(100, (owned / total) * 100);

        let color = "bg-yellow-400";
        if (total !== null && owned >= total) color = "bg-green-500";
        if (total !== null && owned < total) color = "bg-red-500";

        return (
          <button
            key={m.ID}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("openMangaDetail", { detail: m })
              )
            }
            className="bg-white/5 rounded-xl p-2 border border-white/10"
          >
            <img
              src={m.CoverURL}
              className="w-full h-[150px] object-contain"
            />

            <div className="text-xs font-semibold mt-1 line-clamp-2">
              {m.Titolo}
            </div>

            <div className="text-[10px] text-zinc-400">
              {m.Autore}
            </div>

            <div className="h-[4px] bg-white/10 mt-1 rounded-full">
              <div
                className={color}
                style={{ width: `${percent}%`, height: "100%" }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
