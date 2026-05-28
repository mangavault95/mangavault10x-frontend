export default function MobilePanel({ title, children, onClose }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0b0b0f] mobile-app">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition"
          aria-label="Indietro"
        >
          ←
        </button>

        <div className="font-bold text-white truncate">
          {title}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
