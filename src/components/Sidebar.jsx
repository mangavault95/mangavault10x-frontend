import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const linkClass = (path) =>
    `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
      location.pathname === path
        ? "bg-white/6 text-white font-semibold"
        : "text-zinc-300 hover:text-white"
    }`;

  return (
    <aside
      className="w-56 min-h-screen p-4 flex flex-col justify-between"
      style={{
        borderRight: "1px solid var(--border)",
        background: "var(--sidebar-bg, rgba(0,0,0,0.0))"
      }}
    >
      <div>
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-300 flex items-center justify-center text-black font-bold">MV</div>
            <div>
              <div className="text-lg font-extrabold text-white leading-tight">MangaVault</div>
              <div className="text-xs text-zinc-400">La tua collezione</div>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Main navigation">
          <Link to="/" className={linkClass("/")}>
            <span className="w-5 text-center text-zinc-300">🏠</span>
            <span>Home</span>
          </Link>

          <Link to="/wishlist" className={linkClass("/wishlist")}>
            <span className="w-5 text-center text-zinc-300">💛</span>
            <span>Wishlist</span>
            <span className="ml-auto text-xs text-zinc-400"> {/* counter placeholder */}
              {(() => {
                try {
                  const arr = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
                  return Array.isArray(arr) ? arr.length : 0;
                } catch { return 0; }
              })()}
            </span>
          </Link>

          <Link to="/records" className={linkClass("/records")}>
            <span className="w-5 text-center text-zinc-300">📚</span>
            <span>Records</span>
          </Link>

          <Link to="/admin" className={linkClass("/admin")}>
            <span className="w-5 text-center text-zinc-300">⚙️</span>
            <span>Admin</span>
          </Link>
        </nav>

        <div className="mt-6">
          <div className="text-xs text-zinc-400 mb-2">Quick</div>
          <div className="flex flex-col gap-2">
            <Link to="/latest" className="px-3 py-2 rounded text-sm text-zinc-300 hover:text-white">Latest</Link>
            <Link to="/completed" className="px-3 py-2 rounded text-sm text-zinc-300 hover:text-white">Completati</Link>
          </div>
        </div>
      </div>

      <div>
        <div className="mt-6">
          <div className="text-xs text-zinc-400">Theme</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                try {
                  const isLight = document.documentElement.classList.toggle("light");
                  localStorage.setItem("mv_theme", isLight ? "light" : "dark");
                } catch {}
              }}
              className="px-2 py-1 rounded bg-white/6 text-white text-sm"
              aria-label="Toggle theme"
            >
              Toggle
            </button>
            <button
              onClick={() => {
                try {
                  // quick reset of wishlist localStorage for debugging
                  // remove this in production
                  // localStorage.removeItem("mv_wishlist_custom");
                  alert("Tip: per resettare la wishlist rimuovi mv_wishlist_custom da localStorage");
                } catch {}
              }}
              className="px-2 py-1 rounded bg-white/6 text-white text-sm"
            >
              Info
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-zinc-500">
          <div>v{process.env.REACT_APP_VERSION || process.env.npm_package_version || "dev"}</div>
        </div>
      </div>
    </aside>
  );
}
