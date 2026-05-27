import { useEffect, useMemo, useState } from "react";

export default function ReadingHistoryAddModal({ onClose, onSaved }) {
  const [manga, setManga] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [volume, setVolume] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return manga.slice(0, 20);

    return manga
      .filter((m) =>
        String(m?.Titolo || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [manga, query]);

  async function handleSave() {
    const selected = manga.find(
      (m) => String(m.ID) === String(selectedId)
    );

    if (!selected) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/reading-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          manga_id: selected.ID,
          titolo: selected.Titolo,
          autore: selected.Autore || "",
          coverurl: selected.CoverURL || "",
          volume: Number(volume) || 0
        })
      });

      if (typeof onSaved === "function") {
        onSaved();
      }

      onClose();
    } catch (err) {
      console.error("Errore salvataggio lettura manuale:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" />

      <div
        className="relative w-[640px] max-w-[92vw] rounded-3xl border border-white/10 shadow-2xl manga-detail-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Aggiungi lettura manualmente
            </h3>

            <p className="text-sm text-zinc-400 mt-1">
              Inserisci un volume letto senza passare dal media player.
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white hover:bg-white/12 transition"
          >
            Chiudi
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-4 text-white">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              Cerca manga
            </label>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/10 outline-none focus:border-yellow-400/50"
              placeholder="Es. GTO, Miyuki..."
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              Seleziona manga
            </label>

            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/10 outline-none"
            >
              <option value="">Seleziona...</option>

              {filtered.map((m) => (
                <option key={m.ID} value={m.ID}>
                  {m.Titolo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              Volume letto
            </label>

            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/10 outline-none focus:border-yellow-400/50"
              placeholder="Es. 4"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 text-white hover:bg-white/12 transition"
            >
              Annulla
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-yellow-400 text-black font-semibold hover:brightness-110 active:scale-95 transition-all duration-200 shadow-[0_0_18px_rgba(234,179,8,0.18)] hover:shadow-[0_0_26px_rgba(234,179,8,0.35)]"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
