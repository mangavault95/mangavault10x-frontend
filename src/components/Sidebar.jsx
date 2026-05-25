import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Chiudi sidebar" : "Apri sidebar"}
        className="
          fixed top-4 left-4 z-50
          bg-black/40 backdrop-blur-md
          border border-white/10
          text-white px-3 py-2 rounded-lg
          hover:bg-black/60 transition
        "
      >
        {open ? "✖" : "☰"}
      </button>

      {/* SIDEBAR CON LARGHEZZA DINAMICA */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-gradient-to-b from-[#0b0b0f] via-[#111] to-[#0b0b0f]
          border-r border-white/10
          transition-all duration-300
          ${open ? "w-72" : "w-16"}
        `}
      >
        <Sidebar open={open} />
      </aside>

      {/* OVERLAY MOBILE */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* MAIN CONTENT: si sposta a destra quando sidebar aperta */}
      <main className={`flex-1 transition-all duration-300 ${open ? "ml-72" : "ml-16"}`}>
        {children}
      </main>
    </div>
  );
}
