import { useEffect, useState } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;

  const percent = total ? Math.min((owned / total) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">

      {/* ✅ BACKGROUND IDENTICO */}
      <div
        className="absolute inset-0"
        style={{
          background: manga.CoverURL
            ? `linear-gradient(120deg, rgba(8,10,25,0.9), rgba(40,20,60,0.9)), url(${manga.CoverURL})`
            : `linear-gradient(120deg, #0f172a, #1e1b4b)`,
          backgroundSize: "160px",
          opacity: 0.25
        }}
      />
      <div className="absolute inset-0 backdrop-blur-md" />

      {/* ✅ PANEL GRANDE */}
      <div
        className="relative w-[1250px] max-w-[96vw] rounded-3xl border border-white/10 shadow-2xl manga-detail-card"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex gap-12 p-10">

          {/* ✅ COLONNA SINISTRA */}
          <div className="w-[320px] flex flex-col">

            {/* COVER */}
            <div className="rounded-2xl overflow-hidden bg-black shadow-xl">
              <img
                src={manga.CoverURL}
                className="w-full h-[440px] object-cover"
              />
            </div>

            {/* INFO CARD SOTTO */}
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="font-semibold text-white">
                {manga.Titolo}
              </p>
              <p className="text-sm text-zinc-400">
                {manga.Autore}
              </p>

              <div className="mt-2 text-xs text-green-400">
                {total && owned === total ? "Completo" : "In corso"}
              </div>
            </div>
          </div>

          {/* ✅ COLONNA DESTRA */}
          <div className="flex-1 text-white">

            {/* HEADER */}
            <div className="flex justify-between items-start mb-4">

              <div>
                <h1 className="text-3xl font-bold">
                  {manga.Titolo}
                </h1>
                <p className="text-zinc-400 mt-1">
                  {manga.Autore}
                </p>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 bg-white/10 rounded">
                  Modifica
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1 bg-red-500 rounded"
                >
                  Chiudi
                </button>
              </div>
            </div>

            {/* TAG */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {String(manga.Genere || "")
                .split(",")
                .filter(Boolean)
                .map((g, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white/10 px-2 py-1 rounded"
                  >
                    {g.trim()}
                  </span>
                ))}
            </div>

            {/* DESCRIZIONE */}
            <p className="text-sm text-zinc-300 mb-6 max-h-[140px] overflow-auto leading-relaxed">
              {manga.Trama}
            </p>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-10 mb-6">

              <div>
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-xl font-semibold">{owned}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-xl font-semibold">{total || "?"}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-400">Completamento</p>
                <p className="text-xl font-semibold">{Math.round(percent)}%</p>
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-3 bg-white/10 rounded overflow-hidden mb-6">
              <div
                className="h-full bg-green-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* ✅ AZIONI COME NEL PRIMO SCREEN */}
            <div className="flex gap-4">

              <button className="px-5 py-2 bg-blue-600 rounded-lg">
                Segna come completato
              </button>

              <button className="px-5 py-2 bg-white/10 rounded-lg">
                Salva modifiche
              </button>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
