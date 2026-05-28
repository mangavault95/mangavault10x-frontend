import MobilePanel from "./MobilePanel";

export default function MobileFavoritesPanel({ list = [], onClose }) {
  const favorites = list.filter((m) => Number(m?.Valutazione) >= 5);

  return (
    <MobilePanel title="Preferiti" onClose={onClose}>

      {favorites.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun preferito
        </div>
      )}

      <div className="space-y-3">
        {favorites.map((m) => (
          <div
            key={m.ID}
            className="flex gap-3 bg-white/5 p-3 rounded-xl"
          >
            <img
              src={m.CoverURL}
              className="w-12 h-16 object-cover"
            />
            <div>
              <div className="text-sm font-semibold">
                {m.Titolo}
              </div>
              <div className="text-xs text-yellow-400">
                ★ {m.Valutazione}
              </div>
            </div>
          </div>
        ))}
      </div>

    </MobilePanel>
  );
}
