import { useEffect, useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ search = "", filter = "all" }) {
  const [manga, setManga] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  function getStatus(m){
    const total = Number(m.VolumiTotali);
    const owned = Number(m.VolumiPosseduti);

    if (!total) return "ongoing";        // niente totale = in corso
    if (owned >= total) return "completed";
    return "to_complete";
  }

  function barColor(status){
    if(status==="completed") return "bg-green-400";
    if(status==="to_complete") return "bg-red-400";
    return "bg-yellow-400";
  }

  const filtered = useMemo(() => {

    let list = [...manga].sort((a,b)=>
      (a.Titolo||"").localeCompare(b.Titolo||"")
    );

    if(search){
      list = list.filter(m =>
        (m.Titolo||"").toLowerCase().includes(search.toLowerCase())
      );
    }

    switch(filter){

      case "ongoing":
        return list.filter(m =>
          !m.VolumiTotali || m.VolumiTotali === 0
        );

      case "to_complete":
        return list.filter(m =>
          m.VolumiTotali && m.VolumiPosseduti < m.VolumiTotali
        );

      case "completed":
        return list.filter(m =>
          m.VolumiTotali && m.VolumiPosseduti >= m.VolumiTotali
        );

      case "short":
        return list.filter(m =>
          m.VolumiTotali >= 2 && m.VolumiTotali < 8
        );

      case "oneshot":
        return list.filter(m =>
          m.VolumiPosseduti === 1 && m.VolumiTotali === 1
        );

      default:
        return list;
    }

  }, [manga, search, filter]);

  return (
    <>
      <div className="grid grid-cols-6 gap-6">

        {filtered.map(m=>{

          const total = Number(m.VolumiTotali) || 0;
          const owned = Number(m.VolumiPosseduti) || 0;
          const percent = total ? (owned/total)*100 : 50;
          const status = getStatus(m);

          return(
            <div key={m.ID}
              onClick={()=>setSelectedManga(m)}
              className="group cursor-pointer hover:scale-[1.05] transition">

              <div className="bg-[#141414] rounded-xl border border-white/10 overflow-hidden">

                <img
                  src={m.CoverURL || "https://placehold.co/300x450"}
                  className="w-full h-[190px] object-cover"
                />

                <div className="p-3">

                  <h3 className="text-sm font-bold truncate">
                    {m.Titolo}
                  </h3>

                  <p className="text-xs text-zinc-400">
                    {m.Genere || "Nessun genere"}
                  </p>

                  <div className="text-[10px] text-zinc-400 mt-1">
                    {total ? `${owned}/${total}` : `${owned}+`}
                  </div>

                  <div className="h-1 bg-zinc-800 mt-2 rounded">
                    <div
                      className={`${barColor(status)} h-full`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={()=>setSelectedManga(null)}
        />
      )}
    </>
  );
}
