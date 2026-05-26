import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import RecordsPage from "./pages/RecordsPage";
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// importa le tue route esistenti
const mangaRouter = require("./routes/manga");
app.use("/api/manga", mangaRouter);

// importa la nuova route marketplace
const marketplaceRouter = require("./routes/marketplace");
app.use("/api/marketplace", marketplaceRouter);

// healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});


function App() {
  const [adminMode, setAdminMode] = useState(false);
  const [recordsMode, setRecordsMode] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("mv_theme") !== "light";
  });

  useEffect(() => {
    localStorage.setItem("mv_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div
      className={
        darkMode
          ? "bg-[#0b0b0f] text-white min-h-screen"
          : "bg-gray-100 text-black min-h-screen"
      }
    >

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
