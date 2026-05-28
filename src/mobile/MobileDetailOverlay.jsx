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
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          animate ? "opacity-100 delay-150" : "opacity-0"
        }`}
      >
        <MangaDetail manga={manga} onClose={handleClose} />
      </div>
    </div>
  );
}
