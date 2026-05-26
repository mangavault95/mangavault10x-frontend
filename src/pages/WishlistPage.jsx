import { useState } from "react";
import WishlistList from "../components/WishlistList";

export default function WishlistPage() {
  const [toast, setToast] = useState({ show: false, text: "", tone: "success" });

  const showGlobalToast = ({ show, text, tone = "success" }) => {
    setToast({ show, text, tone });
    if (show) setTimeout(() => setToast({ show: false, text: "", tone }), 2500);
  };

  return (
    <div className="min-h-[70vh]">
      <WishlistList onGlobalToast={showGlobalToast} />
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl z-50 ${toast.tone === "success" ? "bg-green-500 text-white" : "bg-red-600 text-white"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
