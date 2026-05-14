import { useState } from "react";

export default function MangaDetail({ manga, onBack }) {
  if (!manga) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      
      <button
        onClick={onBack}
        className="mb-4 text-sm text-gray-400 hover:text-white"
      >
        ← Indietro
      </button>

      <div className="flex gap-6">
        
        <img
          src={manga.CoverURL}
          className="w-64 h-auto rounded-xl"
        />

        <div>
          <h1 className="text-3xl font-bold">{manga.Titolo}</h1>

          <p className="text-gray-400 mt-2">
            {manga.Autore} • {manga.Genere}
          </p>

          <p className="mt-4 text-gray-300 leading-relaxed">
            {manga.Trama}
          </p>

          <div className="mt-4 text-yellow-400">
            ⭐ {manga.Valutazione ?? "N/A"}
          </div>
        </div>

      </div>
    </div>
  );
}