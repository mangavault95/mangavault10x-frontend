export default function MobileMangaGrid({
  searchResults = [],
  filter,
  sortKey,
  sortDir
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

  function sortList(list) {
    const sorted = [...list];

    sorted.sort((a, b) => {
      let valA, valB;

      if (sortKey === "title") {
        valA = a.Titolo || "";
        valB = b.Titolo || "";
        return valA.localeCompare(valB);
      }

      if (sortKey === "author") {
        valA = a.Autore || "";
        valB = b.Autore || "";
        return valA.localeCompare(valB);
      }

      if (sortKey === "volumes") {
        valA = getTotal(a) || 0;
        valB = getTotal(b) || 0;
        return valA - valB;
      }
    });

    if (sortDir === "desc") sorted.reverse();

    return sorted;
  }

  const list = sortList(searchResults.filter(matchFilter));

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
              className="w-full h-[160px] object-contain"
            />

            <div className="text-xs font-semibold mt-1 line-clamp-2">
              {m.Titolo}
            </div>

            <div className="text-[10px] text-zinc-400">
              {m.Autore}
            </div>

            <div className="h-[4px] bg-white/10 mt-1 rounded-full">
              <div className={color} style={{ width: `${percent}%`, height: "100%" }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
