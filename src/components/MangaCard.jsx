export default function MangaCard({ manga }) {
  return (
    <div className="group cursor-pointer">

      <div className="relative overflow-hidden rounded-2xl">

        <img
          src={
            manga.CoverURL ||
            "https://via.placeholder.com/300x450"
          }
          className="w-full h-[340px] object-cover group-hover:scale-110 transition duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

        <div className="absolute bottom-0 p-4 translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition duration-300">

          <div className="text-sm text-zinc-300">
            {manga.Genere}
          </div>

          <div className="text-yellow-400 mt-1">
            ⭐ {manga.Valutazione || "N/A"}
          </div>

        </div>

      </div>

      <div className="mt-3">

        <h3 className="font-bold truncate">
          {manga.Titolo}
        </h3>

        <p className="text-zinc-400 text-sm truncate">
          {manga.Autore}
        </p>

      </div>

    </div>
  );
}