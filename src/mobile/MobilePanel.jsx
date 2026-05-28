export default function MobilePanel({ title, children, onClose }) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0b0b0f]">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
        >
          ←
        </button>

        <div className="font-bold text-white">
          {title}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}
