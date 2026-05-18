import { useEffect, useMemo, useState } from "react";

export default function StatsPanel() {
  const [manga,setManga]=useState([]);

  useEffect(()=>{
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r=>r.json())
      .then(d=>setManga(d||[]));
  },[]);

  const stats = useMemo(()=>{
    let tot=0,comp=0,ongo=0,spesa=0;

    manga.forEach(m=>{
      const owned=Number(m.VolumiPosseduti)||0;
      const total=Number(m.VolumiTotali)||0;
      const cost=Number(m.Costo)||0;

      tot+=owned;
      spesa+=owned*cost;

      if(total && owned>=total) comp++;
      else if(!total) ongoing++;
      else ongoing++;
    });

    return {tot,comp,ongo,spesa};

  },[manga]);

  return(
    <div className="space-y-3 mt-4">

      {/* BIG CARD */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#101010] p-4 rounded-xl border border-white/10">
        <p className="text-xs text-zinc-500">Volumi totali</p>
        <p className="text-2xl font-black">{stats.tot}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">

        <div className="bg-[#141414] p-3 rounded-xl text-center border border-green-500/30">
          <p className="text-xs text-zinc-400">Completati</p>
          <p className="text-green-400 font-bold">{stats.comp}</p>
        </div>

        <div className="bg-[#141414] p-3 rounded-xl text-center border border-yellow-500/30">
          <p className="text-xs text-zinc-400">In corso</p>
          <p className="text-yellow-400 font-bold">{stats.ongo}</p>
        </div>

      </div>

      <div className="bg-[#141414] p-3 rounded-xl border border-yellow-500/20">
        <p className="text-xs text-zinc-400">Spesa totale</p>
        <p className="text-yellow-400 font-bold">
          €{stats.spesa.toFixed(0)}
        </p>
      </div>

    </div>
  );
}
