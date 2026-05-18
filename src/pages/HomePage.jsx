import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";
import MangaDetail from "../components/MangaDetail";
import { getManga } from "../services/api";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedManga, setSelectedManga] = useState(null);
  const [mangaList, setMangaList] = useState([]);

  useEffect(() => {
    async function load() {
      const data = await getManga();
      setMangaList(data || []);
    }
    load();
  }, []);

  const filters = [
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
    { key: "short", label: "Serie brevi" },
    { key: "oneshot", label: "Volumi unici" }
  ];

  return (
    <div className="bg-[#111111] text-white min-h-screen">

      {/* SIDEBAR */}
      <div className="fixed left-0 top-0 w-72 h-screen z-30 bg-black/60 border-r border-zinc-800 backdrop-blur-xl">
        <Sidebar />
      </div>

      {/* MAIN */}
      <div className="ml-72 px-8 py-6 space-y-8">

        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex justify-between items-center">

          <h2 className="text-2xl font-bold">La Mia Collezione</h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca manga..."
            className="
              px-4 py-2 rounded-xl w-64
              bg-[#1a1a1a]
              border border-white/10
              text-white
              focus:border-yellow-400
              focus:shadow-[0_0_12px_rgba(250,204,21,0.4)]
              outline-none transition
            "
          />
        </div>

        {/* FILTRI */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-4 py-2 rounded-xl text-sm transition-all
                ${
                  filter === f.key
                    ? "bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                    : "bg-[#1a1a1a] hover:bg-[#222] hover:border-yellow-400 hover:shadow-[0_0_10px_rgba(250,204,21,0.3)] border border-white/10"
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* GRID */}
        <MangaGrid search={search} filter={filter} />

      </div>

      {/* DETAIL */}
      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}

      {/* SCROLLBAR */}
      <style>
        {`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
        `}
      </style>

    </div>
  );
}
