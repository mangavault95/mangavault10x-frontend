import { useEffect, useMemo, useState } from "react";

export default function ReadingSessionAddModal({ onClose, onSaved }) {
  const API = import.meta.env.VITE_API_URL;

  const [manga, setManga] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [volume, setVolume] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [mangaRes, sessionsRes] = await Promise.all([
          fetch(`${API}/api/manga`),
          fetch(`${API}/api/reading-sessions`)
        ]);

        const mangaData = await mangaRes.json().catch(() => []);
        const sessionsData = await sessionsRes.json().catch(() => []);

        setManga(Array.isArray(mangaData) ? mangaData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      } catch (err) {
        console.error("Errore caricamento dati per reading sessions:", err);
        setManga([]);
        setSessions([]);
      }
    }

    load();
  }, [API]);

  const existingIds = useMemo(() => {
    return new Set(sessions.map((s) => String(s.manga_id)));
  }, [sessions]);

  const availableManga = useMemo(() => {
    return manga.filter((m) => !existingIds.has(String(m.ID)));
  }, [manga, existingIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return availableManga.slice(0, 12);

    return availableManga
      .filter((m) => {
        const title = String(m?.Titolo || "").toLowerCase();
        const author = String(m?.Autore || "").toLowerCase();
        const genre = String(m?.Genere || "").toLowerCase();

        return (
          title.includes(q) ||
          author.includes(q) ||
          genre.includes(q)
        );
      })
      .slice(0, 12);
  }, [availableManga, query]);

  async function handleSave() {
    if (!selected) return;

    try {
      await fetch(`${API}/api/reading-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          manga_id: selected.ID,
          titolo: selected.Titolo,
          autore: selected.Autore || "",
          coverurl: selected.CoverURL || "",
          volume: Number(volume) || 0,
          volumitotali:
            selected.VolumiTotali !== null && selected.VolumiTotali !== undefined
              ? Number(selected.VolumiTotali) || 0
              : null
        })
      });

      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Errore salvataggio reading session:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" />

      <div
        className="relative w-[760px] max-w-[94vw] rounded-3xl border border-white/10 shadow-2xl manga-detail-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Aggiungi a Stai leggendo
            </h3>

            <p className="text-sm text-zinc-400 mt-1">
              Cerca un manga e aggiungilo direttamente al jukebox di lettura.
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
        <div className="p-6 text-white">
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
            {/* LEFT */}
            <div>
              <label className="text-xs text-zinc-400 block mb-2">
                Cerca manga
              </label>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/25 border border-white/10 outline-none focus:border-yellow-400/50"
                placeholder="Es. Miyuki, GTO, Monster..."
              />

              <div className="mt-4 max-h-[320px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {filtered.length === 0 ? (
                  <div className="text-sm text-zinc-500 py-6 text-center">
                    Nessun risultato disponibile
                  </div>
                ) : (
                  filtered.map((m) => {
                    const active = selected?.ID === m.ID;

                    return (
                      <button
                        key={m.ID}
                        type="button"
                        onClick={() => setSelected(m)}
                        className={
                          "w-full text-left rounded-2xl border px-4 py-3 transition-all " +
                          (active
                            ? "border-yellow-400/40 bg-yellow-400/10 shadow-[0_0_18px_rgba(234,179,8,0.18)]"
