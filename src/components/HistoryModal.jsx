import { useEffect, useState } from "react";

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // esempio: leggi cronologia da localStorage (se la salvi così)
    const h = JSON.parse(localStorage.getItem("mv_history") || "[]");
    setHistory(h.slice().reverse()); // mostra recenti prima
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-96 bg-[#0f0f10] p-4 rounded-xl border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Ultime letture</h3>
          <button onClick={onClose} className="text-sm text-zinc-400">Chiudi</button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {history.length === 0 && <div className="text-zinc-500">Nessuna lettura recente</div>}
          {history.map((h, idx) => (
            <div key={idx} className="p-2 rounded-md bg-white/5">
              <div className="text-sm font-semibold">{h.title}</div>
              <div className="text-xs text-zinc-500">{new Date(h.at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
