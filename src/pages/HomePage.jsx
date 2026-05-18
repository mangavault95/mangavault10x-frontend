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

  return (
    <div className="bg-[#111111] text-white min-h-screen">

      <div className="fixed left-0 top-0 w-72 h-screen z-30 bg-black/60 border-r border-zinc-800 backdrop-blur-xl">
        <Sidebar />
      </div>

      <div className="ml-72 px-8 py-6 space-y-8">

        <TopHero manga={mangaList} onSelect={setSelectedManga} />

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
              focus:border-yellow-400
              focus:shadow-[0_0_12px_rgba(250,204,21,0.4)]
              outline-none transition
            "
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all","ongoing","to_complete","completed"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-xl text-sm
                ${filter === f
                  ? "bg-yellow-400 text-black"
                  : "bg-[#1a1a1a] hover:bg-[#222] hover:shadow-[0_0_10px_rgba(250,204,21,0.3)]"}
              `}
            >
              {f}
            </button>
          ))}
        </div>

        <MangaGrid search={search} filter={filter} />

      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => setSelectedManga(null)}
        />
      )}
    </div>
  );
}
