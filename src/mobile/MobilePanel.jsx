export default function MobilePanel({ title, children, onClose }) {
  return (
    <div
      className="
        w-full h-full
        flex flex-col
        bg-[#0b0b0f]
        mobile-app
      "
    >
      {/* HEADER */}
      <div
        className="
          sticky top-0 z-10
          flex items-center justify-between gap-3
          px-4 py-3
          border-b border-white/10
          bg-[#0b0b0f]/95
          backdrop-blur-xl
        "
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="
            w-10 h-10
            rounded-2xl
            bg-white/[0.07]
            border border-white/10
            text-white
            flex items-center justify-center
            active:scale-95
            transition
          "
          aria-label="Indietro"
        >
          ←
        </button>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            MangaVault
          </div>
          <div className="font-bold text-white truncate">
            {title}
          </div>
        </div>

        <div className="w-10" />
      </div>

      {/* CONTENT */}
      <div
        className="
          flex-1
          overflow-y-auto
          p-4
          space-y-3
          no-scrollbar
        "
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
