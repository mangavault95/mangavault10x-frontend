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
    getManga().then((d) => setMangaList(d || []));
  }, []);

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
    <div className="bg-[#111] text-white min-h-screen">

      {/* SIDEBAR */}
      <div className="fixed left-0 top-0 w-72 h-screen bg-black/60 border-r border-zinc-800 backdrop-blur-xl">
        <Sidebar />
      </div>

      {/* MAIN */}
      <div className="ml-72 px-10 py-6 space-y-8">

        <TopHero manga={mangaList} onSelect={setSelectedManga} />

        {/* HEADER */}
        <div className="flex justify-between items-center">

          <h2 className="text-2xl font-bold">La Mia Collezione</h2>

          {/* SEARCH */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-xl border border-white/10">
            <span className="text-zinc-500">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca manga..."
              className="bg-transparent outline-none w-52"
            />
          </div>

          {/* MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu((prev) => !prev)}
              className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-white/10"
            >
              ☰
            </button>

            {openMenu && (
              <div className="absolute right-0 mt-2 bg-[#141414] rounded-xl border w-40">
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">Tema</div>
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">Admin</div>
                <div className="p-3 hover:bg-zinc-800 cursor-pointer">Records</div>
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
                px-4 py-2 rounded-xl text-sm transition
                ${
                  filter === f.key
                    ? "bg-yellow-400 text-black"
                    : "bg-[#1a1a1a] border border-white/10"
                }
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
