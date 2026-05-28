import { useEffect, useState } from "react";
import MobilePanel from "./MobilePanel";

export default function MobileHistoryPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;
  const [list, setList] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/reading-history`)
      .then(r => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, []);

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", { detail: m })
    );
  }

  return (
    <MobilePanel title="Ultime letture" onClose={onClose}>

      {list.length === 0 && (
        <div className="text-center text-zinc-400">
          Nessuna lettura recente
        </div>
      )}

      {list.map((m) => (
        <button
          key={m.id}
          onClick={() =>
            open({
              ID: m.manga_id,
              Titolo: m.titolo,
              Autore: m.autore,
              CoverURL: m.coverurl
            })
          }
          className="flex gap-3 w-full bg-white/5 p-3 rounded-xl text-left active:scale-95 transition"
        >
          <img
            src={m.coverurl}
            className="w-12 h-16 object-cover rounded-md"
          />

          <div>
            <div className="text-sm font-semibold">{m.titolo}</div>
            <div className="text-xs text-zinc-400">
              Vol. {m.volume}
            </div>
          </div>
        </button>
      ))}

    </MobilePanel>
  );
}
