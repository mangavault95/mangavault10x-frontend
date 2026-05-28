import StatsPanel from "../components/StatsPanel";

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.7 14.9 8.6l6.5.95-4.7 4.58 1.1 6.47L12 17.55 6.2 20.6l1.1-6.47-4.7-4.58 6.5-.95L12 2.7Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3.2 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9h16" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 8 10" />
      <path d="M16 6h2.5A2.5 2.5 0 0 1 16 10" />
      <path d="M12 12v4" />
      <path d="M9 20h6" />
    </svg>
  );
}

export default function MobileDrawer({ onClose }) {
  function open(page) {
    window.dispatchEvent(
      new CustomEvent("navigate", {
        detail: { page }
      })
    );

    if (typeof onClose === "function") {
      onClose();
    }
  }

  const items = [
    {
      key: "favorites",
      label: "Preferiti",
      icon: <StarIcon />,
      accent: "text-yellow-400"
    },
    {
      key: "history",
      label: "Ultime letture",
      icon: <ClockIcon />,
      accent: "text-zinc-300"
    },
    {
      key: "wishlist",
      label: "Wishlist",
      icon: <CalendarIcon />,
      accent: "text-zinc-300"
    },
    {
      key: "records",
      label: "Records",
      icon: <TrophyIcon />,
      accent: "text-zinc-300"
    }
  ];

  return (
    <div className="fixed inset-0 z-[3000] flex mobile-app">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        className="
          relative
          w-[84vw]
          max-w-[360px]
          h-full
          px-4 py-4
          flex flex-col
          animate-mobile-slide-in
          overflow-y-auto no-scrollbar
        "
        style={{
          background:
            "linear-gradient(180deg, rgba(12,12,16,0.98), rgba(5,5,8,0.99))",
          boxShadow: "20px 0 55px rgba(0,0,0,0.46)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-end gap-2 min-w-0">
            <div className="text-[1.65rem] font-black tracking-tight text-white leading-none truncate">
              MangaVault
            </div>
            <div className="text-[1.9rem] font-black tracking-tight text-yellow-400 leading-none drop-shadow-[0_0_12px_rgba(234,179,8,0.45)]">
              10X
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              w-10 h-10 rounded-2xl
              bg-white/[0.06]
              border border-white/10
              text-zinc-300
              flex items-center justify-center
              active:scale-95
              transition
            "
            aria-label="Chiudi menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* NAV */}
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => open(item.key)}
              className="
                w-full
                flex items-center justify-between gap-3
                rounded-2xl
                border border-white/[0.08]
                bg-white/[0.055]
                px-4 py-3
                text-left
                active:scale-[0.98]
                transition
              "
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={item.accent}>{item.icon}</span>
                <span className="text-sm font-medium text-white truncate">
                  {item.label}
                </span>
              </div>

              <span className="text-zinc-500 text-sm">›</span>
            </button>
          ))}
        </div>

        {/* STATS */}
        <div className="mt-5">
          <div
            className="
              rounded-[24px]
              border border-white/[0.08]
              bg-white/[0.045]
              p-3
              shadow-[0_16px_38px_rgba(0,0,0,0.24)]
              overflow-hidden
            "
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Dashboard
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  Statistiche
                </div>
              </div>

              <div className="w-8 h-8 rounded-xl bg-yellow-400/15 border border-yellow-400/20 text-yellow-300 flex items-center justify-center">
                <TrophyIcon />
              </div>
            </div>

            <StatsPanel />
          </div>
        </div>
      </aside>
    </div>
  );
}
