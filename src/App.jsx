import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import RecordsPage from "./pages/RecordsPage";
import MangaDetail from "./pages/MangaDetail";


<Route path="/manga/:id" element={<MangaDetail />} />

function App() {
  const [adminMode, setAdminMode] = useState(false);
  const [recordsMode, setRecordsMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("mv_theme") !== "light";
  });

  const [profileImage, setProfileImage] = useState(() => {
    return (
      localStorage.getItem("mv_profile") ||
      "https://i.imgur.com/2DhmtJ4.png"
    );
  });

  useEffect(() => {
    localStorage.setItem("mv_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("mv_profile", profileImage);
  }, [profileImage]);

  function changeProfileImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);
  }

  const isHome = !adminMode && !recordsMode;

  return (
    <div
      className={
        darkMode
          ? "bg-[#0b0b0f] text-white min-h-screen"
          : "bg-gray-100 text-black min-h-screen"
      }
    >

      {/* 👑 CORONA MENU SOLO HOME */}
      {isHome && (
        <div className="fixed top-4 right-4 z-[9999]">
          <div className="relative">

            {/* CORONA BUTTON */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="
                w-12 h-12
                rounded-full
                bg-zinc-900
                border border-zinc-700
                flex items-center justify-center
                hover:border-yellow-500
                transition
                shadow-lg
              "
            >
              👑
            </button>

            {/* DROPDOWN */}
            {menuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-[#111115]/95 rounded-2xl p-3 border border-zinc-800">

                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-full py-2 rounded-xl bg-yellow-500 text-black mb-2"
                >
                  Toggle Theme
                </button>

                <button
                  onClick={() => {
                    setAdminMode(true);
                    setRecordsMode(false);
                    setMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-green-600 mb-2"
                >
                  Admin
                </button>

                <button
                  onClick={() => {
                    setRecordsMode(true);
                    setAdminMode(false);
                    setMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-blue-600"
                >
                  Records
                </button>

              </div>
            )}

          </div>
        </div>
      )}

      {/* ROUTING */}
      {adminMode ? (
        <AdminPage
          darkMode={darkMode}
          setAdminMode={setAdminMode}
        />
      ) : recordsMode ? (
        <RecordsPage
          darkMode={darkMode}
          setRecordsMode={setRecordsMode}
        />
      ) : (
        <HomePage
          darkMode={darkMode}
          setAdminMode={setAdminMode}
          setRecordsMode={setRecordsMode}
        />
      )}

    </div>
  );
}

export default App;
