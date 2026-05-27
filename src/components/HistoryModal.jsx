import { useEffect, useState } from "react";

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("mv_history") || "[]");
      setHistory(Array.isArray(h) ? h.slice().reverse() : []);
    } catch {
      setHistory([]);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0" />

      <div
        className="relative w-[900px] max-w-[94vw] max-h-[80vh] rounded-3xl border border-white/10 shadow-2xl manga-detail-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-extrabold text-white">Ultime letture</h2>
            <p className="text-sm text-zinc-400 mt-1">
              La cronologia recente delle letture salvate localmente.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white hover:bg-white/12 transition-all duration-200"
          >
            Chiudi
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center text-zinc-400 py-20">
              <div className="text-lg font-semibold text-white">Nessuna lettura recente</div>
              <div className="text-sm mt-2">La cronologia apparirà qui quando inizierai a salvarla.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h, idx) => (
                <div
                  key={`${h.title || "history"}-${idx}`}
                  className="panel-section p-4 text-white"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        title={h.title || "Lettura"}
                      >
                        {h.title || "Titolo sconosciuto"}
                      </div>

                      <div className="text-xs text-zinc-400 mt-1">
                        {h.at ? new Date(h.at).toLocaleString() : "Data non disponibile"}
                      </div>
                    </div>

                    <span className="inline-flex px-2 py-1 rounded-full bg-white/8 border border-white/10 text-[11px] text-zinc-300 shrink-0">
                      Recente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
