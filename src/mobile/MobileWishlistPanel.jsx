import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  function extractArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.wishlist)) return data.wishlist;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  function normalizeWishlistItem(item) {
    return {
      ID: item.ID || item.id || item.manga_id || item.mangaId,
      Titolo: item.Titolo || item.titolo || item.title || "Senza titolo",
      Autore:
        item.Autore ||
        item.autori ||
        item.autore ||
        item.author ||
        "Autore sconosciuto",
      CoverURL:
        item.CoverURL ||
        item.coverurl ||
        item.cover_url ||
        item.cover ||
        "",
      Trama: item.Trama || item.trama || "",
      Genere: item.Genere || item.generi || item.genere || "",
      VolumiTotali:
        item.VolumiTotali ??
        item.volumitotali ??
        item.volumi_totali ??
        item.totalVolumes ??
        null,
      DoveComprare:
        item.DoveComprare ||
        item.dovecomprare ||
        item.dove_comprare ||
        "",
      CreatedAt: item.created_at || item.CreatedAt || null
    };
  }

  useEffect(() => {
    async function load() {
      setLoading(true);

      const endpoints = [
        `${API}/api/wishlist`,
        `${API}/api/wishlist_custom`,
        `${API}/api/wishlist-custom`
      ];

      try {
        let finalList = [];

        for (const endpoint of endpoints) {
          try {
            const res = await fetch(endpoint);

            if (!res.ok) {
              continue;
            }

            const data = await res.json();
            const arr = extractArray(data);

            if (arr.length > 0) {
              finalList = arr.map(normalizeWishlistItem);
              break;
            }
          } catch {
            // prova endpoint successivo
          }
        }

        setList(finalList);
      } catch (err) {
        console.error("Errore caricamento wishlist mobile:", err);
        setList([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [API]);

  function openDetail(manga) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: manga
      })
    );
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>
      {loading && (
        <div className="text-center text-zinc-400 py-10">
          Caricamento wishlist...
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="text-center text-zinc-400 py-10">
          Nessun manga in wishlist
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((manga, index) => (
            <button
              key={`${manga.ID || manga.Titolo}-${index}`}
              type="button"
              onClick={() => openDetail(manga)}
              className="
                w-full flex gap-3 text-left
                bg-white/[0.05]
                border border-white/10
                rounded-2xl p-3
                active:scale-[0.98]
                transition-all duration-200
              "
            >
              <div className="w-14 h-20 shrink-0 rounded-xl overflow-hidden bg-black/25 border border-white/10">
                {manga.CoverURL ? (
                  <img
                    src={manga.CoverURL}
                    alt={manga.Titolo || "Cover manga"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                    No img
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white line-clamp-2">
                  {manga.Titolo}
                </div>

                <div className="text-xs text-zinc-400 truncate mt-1">
                  {manga.Autore}
                </div>

                {manga.Genere && (
                  <div className="text-[10px] text-zinc-500 truncate mt-1">
                    {manga.Genere}
                  </div>
                )}

                <div className="mt-2 text-[10px] text-zinc-500">
                  Volumi: {manga.VolumiTotali || "?"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </MobilePanel>
  );
}
