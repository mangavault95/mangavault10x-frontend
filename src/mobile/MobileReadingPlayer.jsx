import { useEffect, useState } from "react";

export default function MobileReadingPlayer() {
  const API = import.meta.env.VITE_API_URL;

  const [sessions, setSessions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  async function loadSessions() {
    try {
      const res = await fetch(`${API}/api/reading-sessions`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      setSessions(list);

      const stored = localStorage.getItem("mv_active_session_manga_id");

      if (stored) {
        const idx = list.findIndex(
          (s) => String(s.manga_id) === stored
        );
        setActiveIndex(idx >= 0 ? idx : 0);
      } else {
        setActiveIndex(0);
      }
    } catch (err) {
      console.error("Errore reading sessions:", err);
    }
  }

  useEffect(() => {
    loadSessions();

    const refresh = () => loadSessions();
    window.addEventListener("currentReadingUpdated", refresh);

    return () => {
      window.removeEventListener("currentReadingUpdated", refresh);
    };
  }, []);

  const active = sessions[activeIndex];

  useEffect(() => {
    if (active?.manga_id) {
      localStorage.setItem(
        "mv_active_session_manga_id",
        String(active.manga_id)
      );
    }
  }, [active]);

  async function updateVolume(delta) {
    if (!active) return;

    let next = (Number(active.volume) || 0) + delta;

    if (next < 0) next = 0;
    if (active.volumitotali && next > active.volumitotali) {
      next = active.volumitotali;
    }

    await fetch(`${API}/api/reading-sessions/${active.manga_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volume: next })
    });

    loadSessions();
    window.dispatchEvent(new Event("currentReadingUpdated"));
  }

  async function saveHistory() {
    if (!active) return;

    await fetch(`${API}/api/reading-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        manga_id: active.manga_id,
        titolo: active.titolo,
        autore: active.autore || "",
        coverurl: active.coverurl || "",
        volume: Number(active.volume) || 0
      })
    });
  }

  if (!active) return null;

  const percent = active.volumitotali
    ? Math.min(
        100,
        Math.round((active.volume / active.volumitotali) * 100)
      )
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1100] bg-[#0b0b0f] border-t border-white/10 px-3 py-2">

      {/* TOP ROW */}
      <div className="flex items-center gap-3">

        <img
          src={active.coverurl}
          className="w-12 h-16 object-cover rounded-md"
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {active.titolo}
          </div>
          <div className="text-xs text-zinc-400">
            Vol {active.volume}
          </div>

          <div className="mt-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex justify-center items-center gap-6 mt-2">
        <button onClick={() => updateVolume(-1)}>➖</button>

        <button
          onClick={saveHistory}
          className="w-10 h-10 rounded-full bg-yellow-400 text-black font-bold"
        >
          ✔
        </button>

        <button onClick={() => updateVolume(1)}>➕</button>
      </div>
    </div>
  );
}

