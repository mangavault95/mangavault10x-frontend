import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const linkClass = (path) =>
    `block px-3 py-2 rounded text-sm transition-colors ${
      location.pathname === path
        ? "bg-white/6 text-white font-semibold"
        : "text-zinc-300 hover:text-white"
    }`;

  return (
    <aside
      className="w-56 min-h-screen p-4"
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--sidebar-bg, transparent)"
      }}
    >
      <div className="mb-6">
        <div className="text-lg font-extrabold text-white">MangaVault</div>
      </div>

      <nav className="flex flex-col gap-2" aria-label="Main navigation">
        <Link to="/" className={linkClass("/")}>
          Home
        </Link>

        {/* Wishlist navigates to the dedicated page (does not open modal) */}
        <Link to="/wishlist" className={linkClass("/wishlist")}>
          Wishlist
        </Link>

        <Link to="/records" className={linkClass("/records")}>
          Records
        </Link>

        <Link to="/admin" className={linkClass("/admin")}>
          Admin
        </Link>
      </nav>

      <div className="mt-6">
        <div className="text-xs text-zinc-400">Theme</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              document.documentElement.classList.toggle("light");
              try {
                const isLight = document.documentElement.classList.contains("light");
                localStorage.setItem("mv_theme", isLight ? "light" : "dark");
              } catch {}
            }}
            className="px-2 py-1 rounded bg-white/6 text-white text-sm"
            aria-label="Toggle theme"
          >
            Toggle
          </button>
        </div>
      </div>
    </aside>
  );
}
