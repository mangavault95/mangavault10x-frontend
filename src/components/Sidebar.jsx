import { useEffect, useMemo, useState } from "react";
import StatsPanel from "./StatsPanel";

export default function Sidebar() {
  const [manga, setManga] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [currentVol, setCurrentVol] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setManga(d || []));
  }, []);

  const results = manga
    .filter(m => m.Titolo?.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="h-screen flex flex-col p-4 text-white">

      <div className="text-2xl font-black mb-4">
        Manga<span className="text-yellow-400">Vault</span>
      </div>

      {!selected && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca..."
            className="
              w-full p-2 rounded-lg
              bg-[#141414]
              border border-white/10
              focus:border-yellow-400
              focus:shadow-[0_0_10px_rgba(250,204,21,0.4)]
              outline-none
            "
          />

          {results.map(m => (
            <div
              key={m.Id}
              onClick={() => setSelected(m)}
              className="
                p-2 text-sm mt-1
                hover:bg-[#1f1f1f]
                hover:shadow-[0_0_10px_rgba(250,204,21,0.3)]
                cursor-pointer
              "
            >
              {m.Titolo}
            </div>
          ))}
        </>
      )}

      <div className="mt-6">
        <StatsPanel />
      </div>

    </div>
  );
}
