export default function MobileMangaGrid({
  searchResults = [],
  filter,
  sort
}) {
  function getOwned(m) {
    return Number(m?.VolumiPosseduti) || 0;
  }

  function getTotal(m) {
    if (!m?.VolumiTotali) return null;

    const n = Number(String(m.VolumiTotali).replace(/\D/g, ""));
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
    switch (sort) {
      case "title":
        return list.sort((a, b) =>
          a.Titolo.localeCompare(b.Titolo)
        );

      case "author":
        return list.sort((a, b) =>
          (a.Autore || "").localeCompare(b.Autore || "")
        );

      case "volumes":
        return list.sort(
          (a, b) => (getTotal(b) || 0) - (getTotal(a) || 0)
        );

      default:
        return list;
    }
  }

  const list = sortList(searchResults.filter(matchFilter));

  return (
    <div className="grid grid-cols-2 gap-3 pb-[100px]">
      {list.map((m) => {
        const owned = getOwned(m);
        const total = getTotal(m);

        const percent =
          total === null ? 50 : Math.min(100, (owned / total) * 100);

        let color = "bg-yellow-400";
        if (total !== null && owned >= total) color = "bg-green-500";
        if (total !== null && owned < total) color = "bg-red-500";

        return (
          <button
            key={m.ID}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("openMangaDetail", {
                  detail: m
                })
              )
            }
            className="bg-white/5 rounded-xl p-2"
          >
            <img
              src={m.CoverURL}
              className="w-full h-[160px] object-contain"
            />

            <div className="text-xs font-bold mt-1">{m.Titolo}</div>

            <div className="text-[10px] text-zinc-400">
              {m.Autore}
            </div>

            <div className="h-[4px] bg-white/10 mt-1">
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
