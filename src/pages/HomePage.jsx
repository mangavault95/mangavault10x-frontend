import { useState } from "react";
import Sidebar from "../components/Sidebar";
import MangaGrid from "../components/MangaGrid";
import TopHero from "../components/TopHero";

export default function HomePage({ darkMode }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // 🔒 NORMALIZZAZIONE SICURA
  const safeSearch = search || "";

  return (
    <div
      className={
        darkMode
          ? "bg-[#0b0b0f] text-white min-h-screen"
          : "bg-[#f3f3f3] text-black min-h-screen"
      }
    >
      {/* SIDEBAR */}
      <div
        className={`
          fixed
          left-0
          top-0
          w-72
          h-screen
          z-30
          backdrop-blur-xl
          border-r
          ${
            darkMode
              ? "bg-black/60 border-zinc-800"
              : "bg-white/80 border-zinc-300"
          }
        `}
      >
        <Sidebar darkMode={darkMode} />
      </div>

      {/* MAIN */}
      <div className="ml-72 px-8 py-6 space-y-8">

        <TopHero darkMode={darkMode} />

        {/* HEADER */}
        <div className="flex justify-between items-center gap-4">

          <h2 className="text-2xl font-bold">
            La Mia Collezione
          </h2>

          {/* 🔥 SEARCH INPUT SICURA */}
          <input
            type="text"
            value={safeSearch}
            onChange={(e) => setSearch(e.target.value ?? "")}
            placeholder="Cerca manga..."
            className={`
              px-4
              py-2
              rounded-xl
              border
              outline-none
              transition-all
              w-64
              ${
                darkMode
                  ? "bg-zinc-900 border-zinc-700 text-white"
                  : "bg-white border-zinc-300 text-black"
              }
            `}
          />

        </div>

        {/* FILTRI */}
<div className="flex gap-2 flex-wrap">

  {[
    { key: "all", label: "Tutti" },
    { key: "ongoing", label: "In corso" },
    { key: "to_complete", label: "Da completare" },
    { key: "completed", label: "Completati" },
  ].map((f) => (
    <button
      key={f.key}
      onClick={() => setFilter(f.key)}
      className={`
        px-4 py-2 rounded-xl text-sm transition-all
        ${
          filter === f.key
            ? "bg-yellow-500 text-black"
            : darkMode
            ? "bg-zinc-800 hover:bg-zinc-700"
            : "bg-white border border-zinc-300 hover:bg-zinc-100"
        }
      `}
    >
      {f.label}
    </button>
  ))}

</div>

        {/* GRID */}
        <MangaGrid
          search={safeSearch}
          filter={filter}
          darkMode={darkMode}
        />

      </div>
    </div>
  );
}