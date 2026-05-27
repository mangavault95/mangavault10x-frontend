import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const debounceRef = useRef(null);

  const [toast, setToast] = useState({
    show: false,
    text: "",
    tone: "success"
  });

  async function handleRating(stars) {
    setRating(stars);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/manga/updateRating`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify({
              id: manga.ID,
              rating: stars
            })
          }
        );

        setToast({ show: true, text: "Valutazione salvata ✅", tone: "success" });
        setTimeout(() => setToast({ show: false, text: "", tone: "success" }), 1500);

      } catch (err) {
        console.error(err);
      }
    }, 400);
  }

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;

  const percent = total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >

      {/* ✅ NO overlay scuro */}
      <div className="absolute inset-0" />

      <div
        className="relative w-[900px] rounded-3xl border border-white/10 shadow-2xl manga-detail-card"
        onClick={(e) => e.stopPropagation()}
      >

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white text-xl"
        >
          ✕
        </button>

        {/* TOAST */}
        {toast.show && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-2 rounded text-white z-[9999]">
            {toast.text}
          </div>
        )}

        <div className="flex gap-6 p-6">

          {/* COVER */}
          <div className="w-[220px]">
            <div className="bg-black rounded overflow-hidden flex items-center justify-center h-[320px]">
              {manga.CoverURL ? (
                <img
                  src={manga.CoverURL}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-zinc-500">No cover</span>
              )}
            </div>

            <div className="mt-3 text-sm text-zinc-300">
              ⭐ {rating || "N/A"}
            </div>
          </div>

          {/* INFO */}
          <div className="flex-1 text-white">

            <h1 className="text-2xl font-bold">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 mb-2">
              {manga.Autore}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {String(manga.Genere || "")
                .split(",")
                .filter(Boolean)
                .map((g, i) => (
                  <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded">
                    {g.trim()}
                  </span>
                ))}
            </div>

            <p className="text-sm text-zinc-300 mb-4 max-h-32 overflow-auto">
              {manga.Trama || "Nessuna descrizione"}
            </p>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/10 p-3 rounded">
                <p className="text-xs">Posseduti</p>
                <p className="text-xl">{owned}</p>
              </div>

              <div className="bg-white/10 p-3 rounded">
                <p className="text-xs">Totali</p>
                <p className="text-xl">{total || "?"}</p>
              </div>

              <div className="bg-white/10 p-3 rounded">
                <p className="text-xs">Completamento</p>
                <p className="text-xl">{Math.round(percent)}%</p>
              </div>
            </div>

            {/* PROGRESS */}
            <div className="w-full bg-white/10 h-3 rounded overflow-hidden mb-4">
              <div
                className="bg-yellow-400 h-full"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* RATING */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => {
                const active = hoverRating ? i <= hoverRating : i <= rating;

                return (
                  <span
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRating(i)}
                    className={`text-2xl cursor-pointer ${
                      active ? "text-yellow-400" : "text-zinc-600"
                    }`}
                  >
                    ★
                  </span>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
