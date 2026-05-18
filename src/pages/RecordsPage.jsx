import { useEffect, useState, useMemo } from "react";
import MangaDetail from "../components/MangaDetail";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const safe = useMemo(() => {
    return manga.map(m => ({
      ...m,
      Titolo: m?.Titolo || "",
      VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
      Costo: Number(m?.Costo) || 0,
      Editore: m?.Editore || "Sconosciuto",
      Autore: m?.Autore || "Sconosciuto"
    }));
  }, [manga]);

  function groupBy(field) {
    const g = {};
    safe.forEach(m => {
      if (!g[m[field]]) g[m[field]] = [];
      g[m[field]].push(m);
    });

    return Object.entries(g)
      .map(([key, list]) => {
        const sorted = [...list].sort((a, b) => b.Costo - a.Costo);

        return {
          name: key,
          count: list.length,
          totalVol: list.reduce((a, b) => a + b.VolumiPosseduti, 0),
          avgCost: list.reduce((a, b) => a + b.Costo, 0) / list.length,
          best: sorted[0],
          worst: sorted[sorted.length - 1],
          list
        };
      });
  }

  const editori = groupBy("Editore").sort((a,b)=>b.count-a.count);
  const autori = groupBy("Autore").sort((a,b)=>b.count-a.count);

  const topSerieCostose = [...safe]
    .sort((a,b)=>b.Costo*b.VolumiPosseduti - a.Costo*a.VolumiPosseduti)
    .slice(0,5);

  const topVolumiSingoli = [...safe]
    .filter(m=>m.VolumiPosseduti===1)
    .sort((a,b)=>b.Costo-a.Costo)
    .slice(0,5);

  const topEditoriCostosi = [...editori]
    .filter(e=>e.count>=2)
    .sort((a,b)=>b.avgCost-a.avgCost)
    .slice(0,5);

  const topLunghe = [...safe]
    .sort((a,b)=>b.VolumiPosseduti-a.VolumiPosseduti)
    .slice(0,5);

  const medal = ["🥇","🥈","🥉"];

  function handleClick(item){
    if(item.Titolo) setSelectedManga(item);
    else setSelected(item);
  }

  const Row = ({item,index,type})=>{
    let value="";

    if(type==="cost") value=`€${(item.Costo*item.VolumiPosseduti).toFixed(0)}`;
    else if(type==="single") value=`€${item.Costo}`;
    else if(type==="long") value=`${item.VolumiPosseduti} vol`;
    else if(type==="editoriCost") value=`€${item.avgCost.toFixed(2)}`;
    else value=item.count;

    return(
      <div
        onClick={()=>handleClick(item)}
        className="
          flex justify-between px-4 py-2 rounded-xl
          bg-[#141414]
          border border-transparent
          hover:border-yellow-400
          hover:shadow-[0_0_12px_rgba(250,204,21,0.6)]
          transition-all duration-300
          cursor-pointer
        "
      >
        <div className="flex gap-2 text-sm text-white">
          <span>{medal[index] || `#${index+1}`}</span>
          {item.Titolo || item.name}
        </div>

        <div className="font-bold text-yellow-400">
          {value}
        </div>
      </div>
    );
  };

  const Card = ({title,data,type})=>(
    <div
      className="
        p-5 rounded-2xl
        bg-[#1a1a1a]
        border border-white/5
        hover:border-yellow-400/50
        hover:shadow-[0_0_25px_rgba(250,204,21,0.25)]
        transition-all duration-300
      "
    >
      <h3 className="mb-4 text-base font-bold text-yellow-400 uppercase tracking-wider">
        {title}
      </h3>

      <div className="space-y-2">
        {data.map((m,i)=>(
          <Row key={i} item={m} index={i} type={type}/>
        ))}
      </div>
    </div>
  );

  return (
    <div className="
      min-h-screen p-8 space-y-10
      bg-[#111111]
      text-white
    ">

      {/* FONT */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');

          .title-manga {
            font-family: 'Anton', sans-serif;
            letter-spacing: 2px;
          }

          .custom-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scroll::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 10px;
          }
        `}
      </style>

      <button
        onClick={()=>setRecordsMode(false)}
        className="px-4 py-2 bg-black border border-white/10 rounded-xl hover:bg-zinc-900"
      >
        ← Home
      </button>

      <h1 className="text-5xl title-manga">
        <span className="text-white">Manga</span>{" "}
        <span className="text-yellow-400">Records</span>
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-yellow-400 text-xl uppercase">💰 Record Monetari</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="Serie più costose" data={topSerieCostose} type="cost"/>
          <Card title="Volumi singoli più costosi" data={topVolumiSingoli} type="single"/>
          <Card title="Editori più costosi" data={topEditoriCostosi} type="editoriCost"/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-white text-xl uppercase">📚 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="Serie più lunghe" data={topLunghe} type="long"/>
          <Card title="Editori con più serie" data={editori.slice(0,5)}/>
          <Card title="Autori con più serie" data={autori.slice(0,5)}/>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center"
          onClick={()=>setSelected(null)}
        >
          <div
            className="
              w-[700px] p-6 rounded-xl
              bg-[#151515]
              border border-yellow-400/20
              shadow-[0_0_40px_rgba(250,204,21,0.3)]
            "
            onClick={e=>e.stopPropagation()}
          >
            <h2 className="text-2xl text-yellow-400 mb-4">
              {selected.name}
            </h2>

            <p className="text-sm mb-3 text-zinc-300">
              Serie: {selected.count} • Volumi: {selected.totalVol}
            </p>

            <p className="text-green-400 text-xs">
              ↑ {selected.best?.Titolo}
            </p>
            <p className="text-red-400 text-xs mb-4">
              ↓ {selected.worst?.Titolo}
            </p>

            <div className="max-h-56 overflow-y-auto custom-scroll space-y-1">
              {selected.list.map((m,i)=>(
                <div
                  key={i}
                  onClick={()=>setSelectedManga(m)}
                  className="px-2 py-1 hover:bg-white/10 rounded cursor-pointer text-sm"
                >
                  {m.Titolo}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={()=>setSelectedManga(null)}
        />
      )}

    </div>
  );
}
