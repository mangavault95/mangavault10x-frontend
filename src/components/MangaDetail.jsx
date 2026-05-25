import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const debounceRef = useRef(null);

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;
  const price = Number(manga.Costo) || 0;

  const isCompleted =
    (!!total && total > 0 && owned === total) || manga.Concluso === 1;

  const isOngoing =
    !isCompleted &&
    (!total || total === 0 || manga.VolumiTotali === "?" || manga.Concluso === 0);

  const totalCost = price && owned ? (owned * price).toFixed(2) : "N/A";

  const percent = isCompleted
    ? 100
    : isOngoing
    ? 50
    : total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  // ⭐ CLICK STELLE + DEBOUNCE + SALVATAGGIO BACKEND
  async function handleRating(stars) {
    setRating(stars);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          "https://mangavault10x-backend.vercel.app/api/manga/updateRating",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              id: manga.ID,
              rating: stars
            })
          }
        );

        const data = await res.json().catch(() => ({}));
        console.log("UPDATE RATING STATUS:", res.status, data);

      } catch (err) {
        console.error("Errore aggiornamento rating:", err);
      }
    }, 500);
  }

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto"
      onClick={onClose}
    >

      {/* BACKGROUND PATTERN */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(20,20,20,0.95), rgba(40,40,40,0.95)), url(${manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.25
        }}
      />

      <div className="absolute inset-0 bg-black/70" />

      {/* CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
      >
        ✕
      </button>

      {/* MAIN CARD */}
      <div
        className="relative max-w-5xl mx-auto mt-20 mb-20 p-10 rounded-3xl shadow-2xl border border-white/10 bg-[#1a1a1a]/90 backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-10">

          {/* COVER */}
          <img
            src={manga.CoverURL}
            className="w-[260px] h-[380px] object-cover rounded-2xl shadow-2xl border border-white/10"
          />

          {/* RIGHT SIDE */}
          <div className="flex-1">

            {/* TITLE */}
            <h1 className="text-5xl font-black text-white mb-2 drop-shadow-xl">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 text-lg mb-2">{manga.Autore}</p>

            {/* BADGE STATUS */}
            {isOngoing && (
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-semibold text-sm animate-pulse w-fit">
                <span className="text-lg">⏳</span>
                <span>In corso</span>
              </div>
            )}

            {isCompleted && (
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-semibold text-sm w-fit">
                <span className="text-lg">✅</span>
                <span>Completo</span>
              </div>
            )}

            {/* ⭐ RATING STARS CLICKABLE */}
            <div className="flex items-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <span
                  key={i}
                  onClick={() => handleRating(i)}
                  title={
                    i === 1 ? "Pessimo" :
                    i === 2 ? "Bruttino" :
                    i === 3 ? "Carino" :
                    i === 4 ? "Bello" :
                    "Capolavoro"
                  }
                  className={`text-3xl cursor-pointer transition-transform ${
                    i <= rating ? "text-yellow-400" : "text-zinc-600"
                  } hover:text-yellow-300 active:scale-125`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* DESCRIPTION */}
            <p className="text-zinc-300 leading-relaxed text-[15px] mb-8 whitespace-pre-line">
              {manga.Trama || "Nessuna descrizione disponibile."}
            </p>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-3xl font-semibold">{owned}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-3xl font-semibold">
                  {total || "?"}
                </p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Costo totale posseduto</p>
                <p className="text-3xl font-semibold">{totalCost}€</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Editore</p>
                <p className="text-2xl font-semibold">
                  {manga.Editore || "N/A"}
                </p>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full transition-all ${
                  isCompleted
                    ? "bg-gradient-to-r from-green-400 to-green-600"
                    : "bg-gradient-to-r from-yellow-400 to-yellow-600"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
