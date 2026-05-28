import { useEffect, useState } from "react";
import MangaDetail from "../components/MangaDetail";

export default function MobileDetailOverlay({ manga, originRect, onClose }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimate(true));
  }, []);

  function handleClose() {
    setAnimate(false);
    setTimeout(onClose, 250);
  }

  if (!manga) return null;

  const startStyle = originRect
    ? {
        top: originRect.top,
        left: originRect.left,
        width: originRect.width,
        height: originRect.height,
        borderRadius: "16px"
      }
    : {};

  return (
    <div className="fixed inset-0 z-[4000]">

      {/* BACKDROP */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          animate ? "opacity-80" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* COVER ANIMATION */}
      <div
        className="absolute bg-black overflow-hidden"
        style={{
          ...(animate
            ? {
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "0px",
                transition: "all 0.3s ease"
              }
            : {
                ...startStyle,
                position: "absolute"
              })
        }}
      >
        <img
          src={manga.CoverURL}
          className="w-full h-full object-contain"
        />
      </div>

      {/* DETAIL */}
      {current && (
  <div
    className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex flex-col"
    onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
    onTouchEnd={handleSwipe}
  >
    {/* CLOSE */}
    <div className="flex justify-between items-center px-4 py-3">
      <button
        onClick={() => setActiveIndex(null)}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
      >
        ✕
      </button>

      <div className="text-xs text-zinc-400">
        {activeIndex + 1} / {filteredManga.length}
      </div>
    </div>

    {/* CONTENT */}
    <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-10">

      {/* ✅ COVER (RIDOTTA E CENTRATA) */}
      <div className="w-[65%] max-w-[260px] aspect-[3/4] mb-4">
        <img
          src={current.CoverURL}
          className="w-full h-full object-contain rounded-xl"
        />
      </div>

      {/* TITLO */}
      <h2 className="text-lg font-bold leading-snug">
        {current.Titolo}
      </h2>

      {/* AUTORE */}
      <p className="text-sm text-zinc-400 mt-1">
        {current.Autore}
      </p>

      {/* PROGRESS */}
      <div className="w-full max-w-[260px] mt-4">

        <div className="h-[5px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400"
            style={{
              width: `${
                current.VolumiTotali
                  ? Math.min(
                      100,
                      (current.VolumiPosseduti / current.VolumiTotali) * 100
                    )
                  : 50
              }%`
            }}
          />
        </div>

        <div className="text-xs text-zinc-400 mt-1">
          {current.VolumiPosseduti} / {current.VolumiTotali || "?"} volumi
        </div>
      </div>
    </div>
  </div>
)}
  );
}
