import { useState, useEffect, useRef } from "react";

export default function MobileNavStack({ screens }) {
  const [stack, setStack] = useState([]);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    function handler(e) {
      const page = e.detail?.page;
      if (!page) return;

      setStack((prev) => [...prev, page]);
    }

    window.addEventListener("navigate", handler);

    return () => {
      window.removeEventListener("navigate", handler);
    };
  }, []);

  useEffect(() => {
    if (stack.length > 0) {
      const previousOverflow = document.body.style.overflow;
      const previousTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = previousOverflow;
        document.body.style.touchAction = previousTouchAction;
      };
    }
  }, [stack.length]);

  function goBack() {
    setStack((prev) => prev.slice(0, -1));
  }

  function onTouchStart(e) {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function onTouchEnd(e) {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    const startedFromEdge = touchStartX.current <= 22;
    const horizontalIntent = dx > 95 && Math.abs(dy) < 45;

    if (startedFromEdge && horizontalIntent) {
      goBack();
    }
  }

  if (stack.length === 0) return null;

  const current = stack[stack.length - 1];
  const Screen = screens[current];

  if (!Screen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[4000] bg-[#0b0b0f]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="w-full h-full animate-mobile-slide-in">
        <Screen onClose={goBack} />
      </div>
    </div>
  );
}
