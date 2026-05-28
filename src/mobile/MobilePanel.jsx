export default function MobilePanel({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[4000] bg-black flex flex-col">

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={onClose}>←</button>
        <div className="font-bold">{title}</div>
        <div className="w-6" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
