import MobilePanel from "./MobilePanel";

export default function MobileRecordsPanel({
  list = [],
  onClose
}) {
  if (!list || list.length === 0) {
    return (
      <MobilePanel title="Records" onClose={onClose}>
        <div className="text-center text-zinc-400">
          Nessun dato disponibile
        </div>
      </MobilePanel>
    );
  }

  function getTotal(m) {
    const raw = m?.VolumiTotali;
    if (!raw) return 0;

    const n = Number(String(raw).replace(/\D/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }

  function getCost(m) {
    return Number(m?.CostoTotale) || 0;
  }

  // ✅ top per volumi
  const topVolumes = [...list]
    .sort((a, b) => getTotal(b) - getTotal(a))
    .slice(0, 5);

  // ✅ più costosi
  const topCost = [...list]
    .sort((a, b) => getCost(b) - getCost(a))
    .slice(0, 5);

  // ✅ editori più presenti
  const publishers = {};
  list.forEach((m) => {
    const p = m.Editore || "Sconosciuto";
    publishers[p] = (publishers[p] || 0) + 1;
  });

  const topPublishers = Object.entries(publishers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", { detail: m })
    );
  }

  return (
    <MobilePanel title="Records" onClose={onClose}>

      {/* TOP VOLUMI */}
      <div>
        <div className="text-sm font-bold mb-2">
          📚 Più volumi
        </div>

        <div className="space-y-2">
          {topVolumes.map((m) => (
            <button
              key={m.ID}
              onClick={() => open(m)}
              className="flex gap-3 w-full bg-white/5 p-2 rounded-lg text-left"
            >
              <img src={m.CoverURL} className="w-10 h-14 object-cover" />

              <div>
                <div className="text-xs font-semibold">{m.Titolo}</div>
                <div className="text-[10px] text-zinc-400">
                  {getTotal(m)} volumi
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* COSTO */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          💸 Più costosi
        </div>

        <div className="space-y-2">
          {topCost.map((m) => (
            <button
              key={m.ID}
              onClick={() => open(m)}
              className="flex gap-3 w-full bg-white/5 p-2 rounded-lg text-left"
            >
              <img src={m.CoverURL} className="w-10 h-14 object-cover" />

              <div>
                <div className="text-xs font-semibold">{m.Titolo}</div>
                <div className="text-[10px] text-zinc-400">
                  € {getCost(m)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* EDITORI */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          🏢 Editori più presenti
        </div>

        <div className="space-y-2 text-xs">
          {topPublishers.map(([name, count]) => (
            <div key={name} className="flex justify-between bg-white/5 p-2 rounded-lg">
              <span>{name}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>

    </MobilePanel>
  );
}
