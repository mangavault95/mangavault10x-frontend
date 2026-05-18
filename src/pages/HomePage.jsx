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
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getManga();
      setMangaList(data || []);
    }
    load();
  }, []);

  // ✅ IMPORTANTE: listener per sidebar
  useEffect(() => {
    const handler = (e) => setSelectedManga(e.detail);
    window.addEventListener("openMangaDetail", handler);
    return () => window.removeEventListener("openMangaDetail", handler);
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

          {/* SEARCH */}
          <div className="relative">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca manga..."
              className="
                pl-10 pr-4 py-2 rounded-xl w-64
                bg-[#1a1a1a]
                border border-white/10
                focus:border-yellow-400
                focus:shadow-[0_0_12px_rgba(250,204,21,0.4)]
                outline-none transition
              "
            />

            <div className="absolute left-3 top-2 text-zinc-500">
              🔍
            </div>

          </div>

          {/* MENU */}
          <div className="relative">

            <button
              onClick={() => setOpenMenu(prev => !prev)}
              className="
                w-10 h-10 rounded-full
                bg-[#1a1a1a]
                border border-white/10
                hover:border-yellow-400
                hover:shadow-[0_0_12px_rgba(250,204,21,0.4)]
              "
            >
              👑
            </button>

            {openMenu && (
              <div className="
                absolute right-0 mt-2 w-40
                bg-[#141414]
                border border-white/10
                rounded-xl
                overflow-hidden
              ">
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">
                  Toggle Theme
                </div>
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">
                  Admin
                </div>
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">
                  Records
                </div>
              </div>
            )}

          </div>

        </div>

        {/* FILTRI */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`
                px-4 py-2 rounded-xl text-sm
                ${filter === f.key
                  ? "bg-yellow-400 text-black"
                  : "bg-[#1a1a1a] hover:bg-[#222] border border-white/10"}
              `}
            >
              {f.label}
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
