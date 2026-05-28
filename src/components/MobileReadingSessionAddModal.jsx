import { useEffect, useMemo, useState } from "react";

function CloseIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function MobileReadingSessionAddModal({ onClose, onSaved }) {
  const API = import.meta.env.VITE_API_URL;

  const [manga, setManga] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [volume, setVolume] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

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
        console.error("Errore caricamento dati player mobile:", err);
        setManga([]);
        setSessions([]);
      } finally {
        setLoading(false);
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

    if (!q) return availableManga.slice(0, 18);

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
      .slice(0, 18);
  }, [availableManga, query]);

  async function handleSave() {
    if (!selected || saving) return;

    setSaving(true);

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
            selected.VolumiTotali !== null &&
            selected.VolumiTotali !== undefined &&
            selected.VolumiTotali !== ""
              ? Number(String(selected.VolumiTotali).replace(/[^0-9]/g, "")) || null
              : null
        })
      });

      window.dispatchEvent(new Event("currentReadingUpdated"));

      if (typeof onSaved === "function") {
        onSaved();
      }

      onClose();
    } catch (err) {
      console.error("Errore aggiunta sessione mobile:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[7000] bg-black/70 backdrop-blur-sm flex items-end mobile-app"
      onClick={onClose}
    >
      <div
        className="
          w-full h-[100dvh]
          bg-[#0b0b0f]
          border-t border-white/10
          flex flex-col
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur-xl">
          <div>
            <div className="text-base font-bold text-white">
              Aggiungi a Stai leggendo
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Cerca un manga della collezione e avvia la lettura.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-10 h-10 rounded-xl
              bg-white/[0.06]
              border border-white/10
              text-zinc-300
              flex items-center justify-center
              active:scale-95
              transition
            "
            aria-label="Chiudi"
          >
            <CloseIcon />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          {/* SEARCH */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">
              Cerca manga
            </label>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <SearchIcon className="w-4 h-4 text-zinc-400" />

              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Titolo, autore, genere..."
                className="
                  flex-1 bg-transparent outline-none
                  text-[16px] text-white placeholder:text-zinc-500
                "
              />
            </div>
          </div>

          {loading && (
            <div className="text-center text-zinc-500 py-10">
              Caricamento manga...
            </div>
          )}

          {!loading && availableManga.length === 0 && (
            <div className="text-center text-zinc-500 py-10">
              Tutti i manga sono già nel player.
            </div>
          )}

          {!loading && availableManga.length > 0 && (
            <>
              {/* RESULTS */}
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8">
                    Nessun risultato
                  </div>
                ) : (
                  filtered.map((m) => {
                    const active = String(selected?.ID) === String(m.ID);

                    return (
                      <button
                        key={m.ID}
                        type="button"
                        onClick={() => {
                          setSelected(m);
                          setQuery(m.Titolo || "");
                          setVolume(
                            m.VolumiPosseduti !== null &&
                              m.VolumiPosseduti !== undefined
                              ? String(m.VolumiPosseduti)
                              : ""
                          );
                        }}
                        className={`
                          w-full flex gap-3 text-left
                          rounded-2xl p-3
                          border
                          active:scale-[0.99]
                          transition
                          ${
                            active
                              ? "bg-yellow-400/10 border-yellow-400/35"
                              : "bg-white/[0.045] border-white/10"
                          }
                        `}
                      >
                        <div className="w-12 h-16 shrink-0 rounded-xl overflow-hidden bg-black/25 border border-white/10">
                          {m.CoverURL ? (
                            <img
                              src={m.CoverURL}
                              alt={m.Titolo || "Cover manga"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                              No img
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white line-clamp-2">
                            {m.Titolo || "Titolo sconosciuto"}
                          </div>

                          <div className="text-xs text-zinc-400 truncate mt-1">
                            {m.Autore || "Autore sconosciuto"}
                          </div>

                          <div className="text-[10px] text-zinc-500 truncate mt-1">
                            {m.Genere || "Nessun genere"}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* SELECTED */}
              {selected && (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-20 h-28 shrink-0 rounded-2xl overflow-hidden bg-black/25 border border-white/10">
                      {selected.CoverURL ? (
                        <img
                          src={selected.CoverURL}
                          alt={selected.Titolo || "Cover manga"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                          No img
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white line-clamp-2">
                        {selected.Titolo}
                      </div>

                      <div className="text-xs text-zinc-400 truncate mt-1">
                        {selected.Autore || "Autore sconosciuto"}
                      </div>

                      <div className="text-[10px] text-zinc-500 mt-2">
                        Totale volumi: {selected.VolumiTotali || "?"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Volume corrente
                    </label>

                    <input
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="Es. 1"
                      className="
                        w-full px-3 py-2 rounded-xl
                        bg-white/[0.05]
                        border border-white/10
                        outline-none
                        text-[16px] text-white
                      "
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!selected || saving}
                    className="
                      w-full py-3 rounded-2xl
                      bg-yellow-400 text-black
                      text-sm font-semibold
                      disabled:opacity-50
                      active:scale-[0.98]
                      transition
                    "
                  >
                    {saving ? "Aggiunta..." : "Aggiungi al player"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
