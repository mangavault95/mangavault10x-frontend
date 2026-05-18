import { useEffect, useState, useMemo } from "react";
import MangaDetail from "../components/MangaDetail";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chart, setChart] = useState(null);
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

    return Object.entries(g).map(([key, list]) => ({
      name: key,
      count: list.length,
      totalVol: list.reduce((a,b)=>a+b.VolumiPosseduti,0),
      avgCost: list.reduce((a,b)=>a+b.Costo,0)/list.length,
      best: list.sort((a,b)=>b.Costo-a.Costo)[0],
      worst: list.sort((a,b)=>a.Costo-b.Costo)[0],
      list
    }));
  }

  const editori = groupBy("Editore");
  const autori = groupBy("Autore");

  const topSerieCostose = [...safe]
    .sort((a,b)=> (b.Costo*b.VolumiPosseduti)-(a.Costo*a.VolumiPosseduti))
    .slice(0,5);

  const topVolumiSingoli = [...safe]
    .filter(m=>m.VolumiPosseduti===1)
    .sort((a,b)=>b.Costo-a.Costo)
    .slice(0,5);

  const topEditoriCostosi = editori
    .filter(e=>e.count>=2)
    .sort((a,b)=>b.avgCost-a.avgCost)
    .slice(0,5);

  const topLunghe = [...safe]
    .sort((a,b)=>b.VolumiPosseduti-a.VolumiPosseduti)
    .slice(0,5);

  const topEditoriSerie = [...editori]
    .sort((a,b)=>b.count-a.count)
    .slice(0,5);

  const topAutori = [...autori]
    .sort((a,b)=>b.count-a.count)
    .slice(0,5);

  const medal = ["🥇","🥈","🥉"];

  function open(item,type){
    if(item.Titolo){
      setSelectedManga(item); // 👉 apre manga detail
    }else{
      setSelected({item,type});
    }
  }

  const Row = ({item,index,type})=>{
    let value="";

    if(type==="cost") value=`€${(item.Costo*item.VolumiPosseduti).toFixed(0)}`;
    else if(type==="single") value=`€${item.Costo}`;
    else if(type==="long") value=`${item.VolumiPosseduti} vol`;
    else if(type==="edit") value=`€${item.avgCost.toFixed(2)} (${item.count})`;
    else value=item.count;

    return(
      <div
        onClick={()=>open(item,type)}
        className="flex justify-between bg-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition"
      >
        <div className="flex gap-2 text-sm">
          <span>{medal[index] || `#${index+1}`}</span>
          {item.Titolo || item.name}
        </div>
        <div className="text-yellow-400 font-bold">{value}</div>
      </div>
    );
  };

  const Card = ({title,data,type})=>(
    <div className="bg-[#121218] p-5 rounded-2xl">
      <h3
        onClick={()=>setChart(data)}
        className="mb-3 font-bold cursor-pointer hover:text-yellow-400"
      >
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
    <div className="min-h-screen text-white p-8 space-y-10">

      <button onClick={()=>setRecordsMode(false)}
        className="px-4 py-2 bg-zinc-800 rounded-xl">
        ← Home
      </button>

      <h1 className="text-4xl font-black">📊 Manga Records</h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-yellow-400 text-2xl">💰 Record Monetari</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="🔥 TOP Serie più costose" data={topSerieCostose} type="cost"/>
          <Card title="💎 TOP Volumi singoli" data={topVolumiSingoli} type="single"/>
          <Card title="🏢 TOP Editori più costosi" data={topEditoriCostosi} type="edit"/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-blue-400 text-2xl">📚 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="📖 TOP Serie più lunghe" data={topLunghe} type="long"/>
          <Card title="🏭 TOP Editori" data={topEditoriSerie} type="count"/>
          <Card title="✍️ TOP Autori" data={topAutori} type="count"/>
        </div>
      </div>

      {/* MODAL EDITORI/AUTORI */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={()=>setSelected(null)}>

          <div
            className="w-[650px] bg-gradient-to-br from-zinc-900 to-[#0f0f14] p-6 rounded-3xl shadow-2xl"
            onClick={e=>e.stopPropagation()}
          >

            <h2 className="text-2xl font-bold mb-4 text-yellow-400">
              {selected.item.name}
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>Serie: {selected.item.count}</div>
              <div>Volumi: {selected.item.totalVol}</div>
              <div>Media: €{selected.item.avgCost.toFixed(2)}</div>
            </div>

            {/* BEST / WORST */}
            <div className="text-xs mb-3">
              <p className="text-green-400">
                🟢 Più caro: {selected.item.best?.Titolo} (€{selected.item.best?.Costo})
              </p>
              <p className="text-red-400">
                🔴 Più economico: {selected.item.worst?.Titolo} (€{selected.item.worst?.Costo})
              </p>
            </div>

            {/* LIST */}
            <div className="max-h-48 overflow-y-auto pr-2 space-y-1 custom-scroll">
              {selected.item.list.map((m,i)=>(
                <div
                  key={i}
                  onClick={()=>setSelectedManga(m)}
                  className={`text-xs hover:bg-zinc-800 px-2 py-1 rounded cursor-pointer
                    ${m.Costo > selected.item.avgCost ? "text-green-400" : "text-red-400"}`}
                >
                  {m.Titolo} — €{m.Costo}
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* MANGA DETAIL */}
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={()=>setSelectedManga(null)}
        />
      )}

      {/* SCROLLBAR */}
      <style>
        {`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
        `}
      </style>

    </div>
  );
}
