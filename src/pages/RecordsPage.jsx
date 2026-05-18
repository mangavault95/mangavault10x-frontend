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

  // ===== TOP =====

  const topSerieCostose = [...safe]
    .sort((a,b)=> (b.Costo*b.VolumiPosseduti)-(a.Costo*a.VolumiPosseduti))
    .slice(0,5);

  const topVolumiSingoli = [...safe]
    .filter(m=>m.VolumiPosseduti===1)
    .sort((a,b)=>b.Costo-a.Costo)
    .slice(0,5);

  const topEditoriCostosi = useMemo(()=>{
    const g = {};
    safe.forEach(m=>{
      if(m.VolumiPosseduti===1) return;
      if(!g[m.Editore]) g[m.Editore]=[];
      g[m.Editore].push(m);
    });

    return Object.entries(g)
      .map(([editore,list])=>({
        editore,
        count:list.length,
        media: list.reduce((a,b)=>a+b.Costo,0)/list.length,
        list
      }))
      .filter(e=>e.count>=2)
      .sort((a,b)=>b.media-a.media)
      .slice(0,5);
  },[safe]);

  const topLunghe = [...safe]
    .sort((a,b)=>b.VolumiPosseduti-a.VolumiPosseduti)
    .slice(0,5);

  const topEditoriSerie = useMemo(()=>{
    const c={};
    safe.forEach(m=>{
      c[m.Editore]=(c[m.Editore]||0)+1;
    });
    return Object.entries(c).map(([e,count])=>({editore:e,count}))
      .sort((a,b)=>b.count-a.count)
      .slice(0,5);
  },[safe]);

  const topAutori = useMemo(()=>{
    const c={};
    safe.forEach(m=>{
      c[m.Autore]=(c[m.Autore]||0)+1;
    });
    return Object.entries(c).map(([a,count])=>({autore:a,count}))
      .sort((a,b)=>b.count-a.count)
      .slice(0,5);
  },[safe]);

  // ===== UI =====

  const medal = ["🥇","🥈","🥉"];

  const Row = ({item,index,type})=>{
    let value="";

    if(type==="cost") value=`€${(item.Costo*item.VolumiPosseduti).toFixed(0)}`;
    else if(type==="single") value=`€${item.Costo}`;
    else if(type==="long") value=`${item.VolumiPosseduti} vol`;
    else if(type==="editoreCost") value=`€${item.media.toFixed(2)} (${item.count} serie)`;
    else value=item.count;

    return(
      <div
        onClick={()=>setSelected({item,type})}
        className="flex justify-between bg-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition"
      >
        <div className="flex items-center gap-2 text-sm">
          <span>{medal[index] || `#${index+1}`}</span>
          {item.Titolo || item.editore || item.autore}
        </div>
        <div className="text-yellow-400 font-bold">{value}</div>
      </div>
    );
  };

  const Card = ({title,data,type,onClick})=>(
    <div className="bg-[#121218] p-5 rounded-2xl space-y-2 shadow-lg">
      <h3
        onClick={()=>onClick(data)}
        className="text-md font-bold mb-3 cursor-pointer hover:text-yellow-400 transition"
      >
        {title}
      </h3>

      {data.map((m,i)=>(
        <Row key={i} item={m} index={i} type={type}/>
      ))}
    </div>
  );

  const Chart = ()=>{
    if(!chart) return null;

    const max=Math.max(...chart.map(d=>{
      if(d.Costo) return d.Costo*d.VolumiPosseduti;
      if(d.media) return d.media;
      return d.count||1;
    }));

    return(
      <div className="bg-zinc-900 p-4 rounded-xl mt-8">
        {chart.map((d,i)=>{
          const v=d.Costo?d.Costo*d.VolumiPosseduti:d.media||d.count;
          return(
            <div key={i} className="mb-3">
              <div className="flex justify-between text-xs">
                <span>{d.Titolo||d.editore||d.autore}</span>
                <span>{v.toFixed(0)}</span>
              </div>

              <div className="h-2 bg-zinc-800 rounded">
                <div
                  className="h-2 bg-yellow-500 rounded transition-all duration-700"
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

      <button
        onClick={()=>setRecordsMode(false)}
        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
      >
        ← Home
      </button>

      <h1 className="text-4xl font-black">📊 Manga Records</h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-2xl text-yellow-400 mb-4">💰 Record Monetari</h2>
        <div className="grid grid-cols-3 gap-6">

          <Card
            title="🔥 TOP Serie più costose"
            data={topSerieCostose}
            type="cost"
            onClick={setChart}
          />

          <Card
            title="💎 TOP Volumi singoli"
            data={topVolumiSingoli}
            type="single"
            onClick={setChart}
          />

          <Card
            title="🏢 TOP Editori più costosi"
            data={topEditoriCostosi}
            type="editoreCost"
            onClick={setChart}
          />

        </div>
      </div>

      {/* GENERICI */}
      <div>
        <h2 className="text-2xl text-blue-400 mb-4">📚 Record Generali</h2>
        <div className="grid grid-cols-3 gap-6">

          <Card
            title="📖 TOP Serie più lunghe"
            data={topLunghe}
            type="long"
            onClick={setChart}
          />

          <Card
            title="🏭 TOP Editori con più serie"
            data={topEditoriSerie}
            type="count"
            onClick={setChart}
          />

          <Card
            title="✍️ TOP Autori"
            data={topAutori}
            type="count"
            onClick={setChart}
          />

        </div>
      </div>

      <Chart />

      {/* MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center"
          onClick={()=>setSelected(null)}
        >
          <div
            className="bg-zinc-900 p-6 rounded-2xl w-96"
            onClick={e=>e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-3">
              {selected.item.Titolo || selected.item.editore || selected.item.autore}
            </h2>

            <p className="text-sm text-zinc-400">
              Volumi: {selected.item.VolumiPosseduti || "-"}
            </p>

            <p className="text-sm text-zinc-400">
              Prezzo: €{selected.item.Costo || "-"}
            </p>

            {selected.item.count && (
              <p className="text-sm text-zinc-400">
                Serie: {selected.item.count}
              </p>
            )}

            {selected.item.media && (
              <p className="text-sm text-zinc-400">
                Media costo: €{selected.item.media.toFixed(2)}
              </p>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
