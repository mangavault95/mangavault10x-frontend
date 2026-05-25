// src/components/MangaCard.jsx
export default function MangaCard({ manga }) {
  return (
    <div className="group cursor-pointer">

      {/* WRAPPER: perspective + overflow visibile */}
      <div className="volume-3d-wrap inline-block">

        {/* VOLUME 3D */}
        <div className="volume-3d bg-[#141414] rounded-2xl border border-white/10 shadow-xl shadow-black/30 overflow-visible transition-transform duration-300">

          {/* COVER */}
          <div className="w-full h-[340px] bg-black flex items-center justify-center">
            <img
              src={manga.CoverURL || "https://via.placeholder.com/300x450"}
              alt={manga.Titolo}
              className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* OVERLAY INFO (stesso posizionamento ma dentro il volume) */}
          <div className="p-4">
            <div className="text-sm text-zinc-300 truncate">{manga.Genere}</div>
            <div className="text-yellow-400 mt-1">⭐ {manga.Valutazione || "N/A"}</div>
            <div className="mt-3">
              <h3 className="font-bold truncate">{manga.Titolo}</h3>
              <p className="text-zinc-400 text-sm truncate">{manga.Autore}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
