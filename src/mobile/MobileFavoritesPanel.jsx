import MobilePanel from "./MobilePanel";

export default function MobileFavoritesPanel({ list = [], onClose }) {
  const favorites = list.filter((m) => Number(m?.Valutazione) >= 5);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", { detail: m })
    );
  }

  return (
    <MobilePanel title="Preferiti" onClose={onClose}>

      {favorites.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun preferito
        </div>
      )}

      {favorites.map((m) => (
        <button
          key={m.ID}
          onClick={() => open(m)}
          className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left active:scale-95 transition"
        >
          <img
            src={m.CoverURL}
            className="w-12 h-16 object-cover rounded-md"
          />

          <div>
            <div className="text-sm font-semibold">
              {m.Titolo}
            </div>

            <div className="text-xs text-yellow-400">
              ★ {m.Valutazione}
            </div>
          </div>
        </button>
      ))}

    </MobilePanel>
  );
}
