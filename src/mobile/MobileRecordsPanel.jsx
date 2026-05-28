import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileRecordsPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/records`)
      .then(r => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <MobilePanel title="Records" onClose={onClose}>

      <div className="grid grid-cols-2 gap-3 text-center">

        <div className="bg-white/5 p-4 rounded-xl">
          <div className="text-xl font-bold">{data.total}</div>
          <div className="text-xs text-zinc-400">Totale manga</div>
        </div>

        <div className="bg-white/5 p-4 rounded-xl">
          <div className="text-xl font-bold">{data.completed}</div>
          <div className="text-xs text-zinc-400">Completati</div>
        </div>

        <div className="bg-white/5 p-4 rounded-xl col-span-2">
          <div className="text-xl font-bold">
            € {data.total_cost}
          </div>
          <div className="text-xs text-zinc-400">Spesa totale</div>
        </div>

      </div>

    </MobilePanel>
  );
}
