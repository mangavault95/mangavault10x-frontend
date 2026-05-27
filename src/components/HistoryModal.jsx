import { useEffect, useState } from "react";
import ReadingHistoryAddModal from "./ReadingHistoryAddModal";

export default function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reading-history`
      );
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento cronologia:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">
              Ultime letture
            </h2>

            <p className="text-sm text-zinc-400 mt-1">
              Cronologia sincronizzata delle letture.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-semibold hover:brightness-110 active:scale-95 transition-all duration-200 shadow-[0_0_18px_rgba(234,179,8,0.18)] hover:shadow-[0_0_26px_rgba(234,179,8,0.35)]"
            >
              + Aggiungi
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white hover:bg-white/12 transition"
            >
              Chiudi
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
          {loading ? (
            <div className="text-center text-zinc-400 py-20">
              Caricamento cronologia...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-zinc-400 py-20">
              <div className="text-lg font-semibold text-white">
                Nessuna lettura recente
              </div>

              <div className="text-sm mt-2">
                Salva dal media player o aggiungi una lettura manualmente.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="panel-section p-4 text-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-black/20 border border-white/10 shrink-0">
                      {item.coverurl ? (
                        <img
                          src={item.coverurl}
                          alt={item.titolo || "Cover manga"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No cover
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        title={item.titolo || ""}
                      >
                        {item.titolo || "Titolo sconosciuto"}
                      </div>

                      <div
                        className="text-xs text-zinc-400 truncate mt-1"
                        title={item.autore || ""}
                      >
                        {item.autore || "Autore sconosciuto"}
                      </div>

                      <div className="text-xs text-zinc-500 mt-2">
                        Volume letto: {item.volume || 0}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-zinc-500 text-right">
                      {item.read_at
                        ? new Date(item.read_at).toLocaleString()
                        : "Data non disponibile"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {openAdd && (
        <ReadingHistoryAddModal
          onClose={() => setOpenAdd(false)}
          onSaved={() => {
            load();
            setOpenAdd(false);
          }}
        />
      )}
    </div>
  );
}
