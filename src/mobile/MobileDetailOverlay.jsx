import { useEffect, useState, useRef } from "react";
import MangaDetail from "../components/MangaDetail";

export default function MobileDetailOverlay({ manga, onClose }) {
  const [visible, setVisible] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    // trigger animazione ingresso
    setTimeout(() => setVisible(true), 10);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(() => onClose(), 250);
  }

  /* ✅ SWIPE DOWN CHIUSURA */
  function onTouchStart(e) {
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    const currentY = e.touches[0].clientY;

    if (currentY - startY.current > 120) {
      handleClose();
    }
  }

  if (!manga) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[3000]
        transition-all duration-300
        ${visible ? "bg-black/70 backdrop-blur-sm" : "bg-transparent"}
      `}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      <div
        className={`
          absolute inset-0
          transition-all duration-300
          flex items-center justify-center
          ${
            visible
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0"
          }
        `}
      >
        {/* contenitore detail */}
        <div className="w-full h-full">
          <MangaDetail
            manga={manga}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
}
