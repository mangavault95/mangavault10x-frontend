export default function MobilePanel({ title, children, onClose }) {
  return (
    <div className="w-full h-full flex flex-col bg-black">

      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={onClose}>←</button>

        <div className="font-bold">{title}</div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
