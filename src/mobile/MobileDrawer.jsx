export default function MobileDrawer({ onClose }) {
  function open(page) {
    window.dispatchEvent(
      new CustomEvent("navigate", { detail: { page } })
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[3000] flex">

      <div
        className="absolute bg-black/60 inset-0"
        onClick={onClose}
      />

      <div className="relative w-[260px] bg-[#0b0b0f] p-4 flex flex-col gap-3 animate-slide-in">

        <div className="text-lg font-bold mb-3">
          Menu
        </div>

        {[
          { key: "history", label: "Ultime letture" },
          { key: "wishlist", label: "Wishlist" },
          { key: "records", label: "Records" }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => open(item.key)}
            className="p-3 bg-white/5 rounded-xl text-left"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
