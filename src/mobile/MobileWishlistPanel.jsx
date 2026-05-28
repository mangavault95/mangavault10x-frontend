import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({
  list = [],
  onClose
}) {
  const wishlist = list.filter((m) => m?.InWishlist);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", { detail: m })
    );
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>

      {wishlist.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessun manga in wishlist
        </div>
      )}

      {wishlist.map((m) => (
        <button
          key={m.ID}
          onClick={() => open(m)}
          className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left"
        >
          <img src={m.CoverURL} className="w-12 h-16 object-cover" />

          <div>
            <div className="text-sm font-semibold">
              {m.Titolo}
            </div>
            <div className="text-xs text-zinc-400">
              {m.Autore}
            </div>
          </div>
        </button>
      ))}
    </MobilePanel>
  );
}
