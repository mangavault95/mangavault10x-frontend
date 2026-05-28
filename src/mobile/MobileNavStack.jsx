import { useState, useEffect, useRef } from "react";

export default function MobileNavStack({ screens, initial = null }) {
  const [stack, setStack] = useState(initial ? [initial] : []);
  const touchStartX = useRef(0);

  useEffect(() => {
    function handler(e) {
      if (e.detail?.page) {
        setStack((prev) => [...prev, e.detail.page]);
      }
    }

    window.addEventListener("navigate", handler);
    return () => window.removeEventListener("navigate", handler);
  }, []);

  function goBack() {
    setStack((prev) => prev.slice(0, -1));
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;

    if (dx > 80) {
      goBack();
    }
  }

  if (stack.length === 0) return null;

  const current = stack[stack.length - 1];
  const Screen = screens[current];

  return (
    <div
      className="fixed inset-0 z-[4000] bg-black"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="w-full h-full animate-slide-in">
        <Screen onClose={goBack} />
      </div>
    </div>
  );
}
