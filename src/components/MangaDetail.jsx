import { useEffect } from "react";

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
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-5xl mt-10 mb-10
          bg-[#111111]
          border border-white/10
          rounded-2xl
          shadow-[0_0_50px_rgba(0,0,0,0.8)]
        "
        onClick={(e) => e.stopPropagation()}
      >

        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20"
        >
          ✕
        </button>

        <div className="flex gap-8 p-8">

          <img
            src={manga.CoverURL}
            className="w-72 h-[420px] object-cover rounded-xl"
          />

          <div className="flex-1">

            <h1 className="text-4xl font-black mb-4">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 mb-4">
              {manga.Trama}
