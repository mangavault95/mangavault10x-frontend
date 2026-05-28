export default function MobileMangaGrid({
  searchResults = [],
  filter,
  onPreview
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

  const list = [...searchResults]
    .filter(matchFilter)
    .sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

  return (
    <div className="grid grid-cols-2 gap-3"> 
      {list.map((m) => (
        <button
          key={m.ID}
          onClick={() => onPreview(m)}
          className="bg-white/5 rounded-xl p-2 border border-white/10"
        >
          <img src={m.CoverURL} className="w-full h-[140px] object-contain" />

          <div className="text-xs font-semibold line-clamp-2 mt-1">
            {m.Titolo}
          </div>
        </button>
      ))}
    </div>
  );
}
