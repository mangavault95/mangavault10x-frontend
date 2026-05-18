import { useEffect, useState, useMemo } from "react";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chart, setChart] = useState(null);

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

  // GROUP UTILS
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
      list
    }));
  }

  const editori = groupBy("Editore");
  const autori = groupBy("Autore");

  // TOP
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

  function open(item, type) {
    setSelected({item,type});
  }

  const Row = ({item,index,type})=>{
    let label=item.Titolo || item.name;
    let value="";

    if(type==="cost") value=`€${(item.Costo*item.VolumiPosseduti).toFixed(0)}`;
    else if(type==="single") value=`€${item.Costo}`;
    else if(type==="long") value=`${item.VolumiPosseduti} vol`;
    else if(type==="editCost") value=`€${item.avgCost.toFixed(2)} (${item.count})`;
    else value=item.count;

    return(
      <div
        onClick={()=>open(item,type)}
        className="flex justify-between bg-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition"
      >
        <div className="flex gap-2 text-sm">
          <span>{medal[index] || `#${index+1}`}</span>
          {label}
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

  const Chart = ()=>{
    if(!chart) return null;

    const max=Math.max(...chart.map(d=>{
      if(d.Costo) return d.Costo*d.VolumiPosseduti;
      if(d.avgCost) return d.avgCost;
      return d.count;
    }));

    return (
      <div className="bg-zinc-900 p-4 rounded-xl mt-8">
        {chart.map((d,i)=>{
          const v=d.Costo?d.Costo*d.VolumiPosseduti:d.avgCost||d.count;
          return(
            <div key={i} className="mb-2">
              <div className="flex justify-between text-xs">
                <span>{d.Titolo || d.name}</span>
                <span>{v.toFixed(0)}</span>
              </div>

              <div className="h-2 bg-zinc-800">
                <div
                  className="h-2 bg-yellow-500"
                  style={{width:`${(v/max)*100}%`}}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
          <Card title="🏢 TOP Editori più costosi" data={topEditoriCostosi} type="editCost"/>
        </div>
      </div>

      {/* GENERALI */}
      <div>
        <h2 className="text-blue-400 text-2xl">📚 Record Generali</h2>

        <div className="grid grid-cols-3 gap-6 mt-4">
          <Card title="📖 TOP Serie più lunghe" data={topLunghe} type="long"/>
          <Card title="🏭 TOP Editori per serie" data={topEditoriSerie} type="count"/>
          <Card title="✍️ TOP Autori" data={topAutori} type="count"/>
        </div>
      </div>

      <Chart />

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={()=>setSelected(null)}
        >
          <div className="bg-zinc-900 p-6 rounded-2xl w-96"
            onClick={e=>e.stopPropagation()}>

            <h2 className="text-xl font-bold mb-3">
              {selected.item.Titolo || selected.item.name}
            </h2>

            {"list" in selected.item ? (
              <>
                <p className="text-sm text-zinc-400">
                  Serie: {selected.item.count}
                </p>

                <p className="text-sm text-zinc-400">
                  Volumi totali: {selected.item.totalVol}
                </p>

                <p className="text-sm text-zinc-400">
                  Prezzo medio: €{selected.item.avgCost.toFixed(2)}
                </p>

                <div className="mt-3 max-h-40 overflow-auto text-xs text-zinc-500">
                  {selected.item.list.map((m,i)=>(
                    <div key={i}>{m.Titolo}</div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">
                  Volumi: {selected.item.VolumiPosseduti}
                </p>

                <p className="text-sm text-zinc-400">
                  Prezzo: €{selected.item.Costo}
                </p>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
