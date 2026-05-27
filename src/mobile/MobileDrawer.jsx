import StatsPanel from "../components/StatsPanel";

export default function MobileDrawer({ onClose, onNavigate, manga }) {

  const favoritesCount = manga.filter(
    (m) => Number(m.Valutazione) >= 5
  ).length;

  return (
    <div className="fixed inset-0 z-[1200] flex">

      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* PANEL */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-[#0b0b0f] border-r border-white/10 px-4 py-5 flex flex-col gap-3">

        <div className="text-lg font-bold text-white mb-2">
          Menu
        </div>

        {/* NAV */}
        {[
          {
            key: "favorites",
            label: "Preferiti",
            extra: favoritesCount
          },
          {
            key: "history",
            label: "Ultime letture"
          },
          {
            key: "wishlist",
            label: "Wishlist"
          },
          {
            key: "records",
            label: "Records"
          }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm"
          >
            <span>{item.label}</span>
            {item.extra !== undefined && (
              <span className="text-xs text-zinc-400">
                {item.extra}
              </span>
            )}
          </button>
        ))}

        {/* STATS */}
        <div className="mt-4">
          <StatsPanel />
        </div>
      </div>
    </div>
  );
}
