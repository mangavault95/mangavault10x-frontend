import { useState, useEffect } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileHistoryPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/reading-history`)
      .then(r => r.json())
      .then(setData);
  }, []);

  return (
    <MobilePanel title="Ultime letture" onClose={onClose}>
      <div className="space-y-3">
        {data.map((m) => (
          <div key={m.id} className="flex gap-3 bg-white/5 p-3 rounded-xl">
            <img src={m.coverurl} className="w-12 h-16 object-cover" />
            <div>
              <div className="text-sm font-semibold">{m.titolo}</div>
              <div className="text-xs text-zinc-400">Vol. {m.volume}</div>
            </div>
          </div>
        ))}
      </div>
    </MobilePanel>
  );
}
