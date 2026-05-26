import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import RecordsPage from "./pages/RecordsPage";

function App() {
  const [adminMode, setAdminMode] = useState(false);
  const [recordsMode, setRecordsMode] = useState(false);
const wishlistRouter = require("./routes/wishlist");
app.use("/api/wishlist", wishlistRouter);

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("mv_theme") !== "light";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mv_theme", darkMode ? "dark" : "light");
    } catch {}
  }, [darkMode]);

  return (
    <div
      className={
        darkMode
          ? "bg-[#0b0b0f] text-white min-h-screen"
          : "bg-gray-100 text-black min-h-screen"
      }
    >
      {adminMode ? (
        <AdminPage darkMode={darkMode} setAdminMode={setAdminMode} />
      ) : recordsMode ? (
        <RecordsPage darkMode={darkMode} setRecordsMode={setRecordsMode} />
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
