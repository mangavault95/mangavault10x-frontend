// SOLO STILE CAMBIATO, LOGICA IDENTICA

<div className="grid grid-cols-6 gap-5 pb-10">
{filtered.map((m,index)=>(
  <div
    key={m.Id || index}
    onClick={() => setSelectedManga(m)}
    className="group cursor-pointer transition-all duration-300 hover:scale-[1.05]"
  >
    <div className="
      relative rounded-[20px] overflow-hidden
      bg-[#141414]
      border border-white/10
      transition-all duration-300
      group-hover:border-yellow-400
      group-hover:shadow-[0_0_25px_rgba(250,204,21,0.3)]
    ">

      <img
        src={m.CoverURL || "https://placehold.co/300x450"}
        className="
          w-full h-[190px] object-cover
          transition duration-500
          group-hover:scale-110
        "
      />

      <div className="p-3">

        <h3 className="
          text-sm font-bold text-white
          group-hover:text-yellow-400 transition
        ">
          {m.Titolo}
        </h3>

        <div className="h-1 bg-zinc-800 mt-2">
          <div
            className="bg-yellow-400 h-full"
            style={{ width: `${m.percent}%` }}
          />
        </div>

      </div>
    </div>
  </div>
))}
</div>
