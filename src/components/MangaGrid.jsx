// SOSTITUISCI SOLO LA PARTE DELLA CARD dentro map()

<div
  key={m.Id || m.Titolo || index}
  onClick={() => setSelectedManga(m)}
  className="group cursor-pointer relative"
  style={{
    animation: `fadeUp .35s ease forwards`,
    animationDelay: `${index * 20}ms`,
    opacity: 0
  }}
>
  {/* GLOW */}
  <div className="absolute -inset-1 rounded-[24px] opacity-0 blur-xl bg-yellow-500/20 transition-all duration-500 group-hover:opacity-100" />

  {/* CARD */}
  <div className="relative rounded-[22px] overflow-hidden bg-[#151518] border border-zinc-800 transition-all duration-500 group-hover:scale-[1.06] group-hover:-translate-y-2 shadow-[0_10px_25px_rgba(0,0,0,0.35)] group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.65)]">

    {/* COVER */}
    <div className="relative">
      <img
        src={
          m.CoverURL &&
          m.CoverURL !== "undefined" &&
          m.CoverURL.startsWith("http")
            ? m.CoverURL
            : "https://placehold.co/300x450?text=MangaVault"
        }
        alt={m.Titolo}
        className="w-full h-[190px] object-cover transition-all duration-700 group-hover:scale-110"
      />

      {/* OVERLAY HOVER */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300" />

      {/* STATUS */}
      <div
        className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
          m.status === "completed"
            ? "bg-green-400"
            : m.status === "to_complete"
            ? "bg-orange-400"
            : "bg-red-400"
        } shadow-lg`}
      />

      {/* TITLE ON HOVER */}
      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
        <p className="text-sm font-bold text-white">
          {m.Titolo}
        </p>
      </div>
    </div>

    {/* CONTENT */}
    <div className="p-3">
      <h3 className="text-sm font-bold line-clamp-1 text-white group-hover:text-yellow-300">
        {m.Titolo}
      </h3>

      <p className="text-[11px] text-zinc-400 mt-1 truncate">
        {m.Genere || "Nessun genere"}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-zinc-400">
            {m.status === "ongoing"
              ? "In corso"
              : `${m.percent.toFixed(0)}%`}
          </span>

          <span className="text-[10px] text-zinc-500">
            {m.VolumiTotali
              ? `${m.VolumiPosseduti}/${m.VolumiTotali}`
              : `${m.VolumiPosseduti}+`}
          </span>
        </div>

        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor(m)} transition-all duration-700`}
            style={{ width: `${m.percent}%` }}
          />
        </div>
      </div>
    </div>
  </div>
</div>
