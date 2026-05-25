import { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(o => !o)}
        className="
          fixed top-4 left-4 z-50
          text-white bg-black/40 backdrop-blur-md
          px-3 py-2 rounded-lg border border-white/10
          hover:bg-black/60 transition
        "
      >
        {open ? "✖" : "☰"}
      </button>

      {/* SIDEBAR */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 z-40
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar />
      </div>

      {/* OVERLAY MOBILE */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-0 md:ml-72 overflow-y-auto">
        {children}
      </div>

    </div>
  );
}
