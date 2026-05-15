import { useEffect, useState } from "react";
import { getManga } from "../services/api";

export default function AdminPage() {

  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  // ✅ LOAD MANGA
  async function loadManga() {
    const data = await getManga();
    setMangaList(data || []);
    return data;
  }

  useEffect(() => {
    loadManga();
  }, []);

  // ✅ LOGOUT → HOME
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  // ✅ LOGIN
  async function login(user, pass) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    } else {
      alert("Login fallito");
    }
  }

  // ✅ ENRICH (NO TITOLO)
  async function enrichManga() {
    if (!selected) return;

    setLoading(true);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/manga/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titolo: selected.Titolo,
          autore: selected.Autore
        })
      });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      setLoading(false);
      return;
    }

    setSelected(prev => ({
      ...prev,
      Trama: data.trama || prev.Trama,
      CoverURL: data.coverurl || prev.CoverURL,
      VolumiTotali: data.volumitotali || prev.VolumiTotali
    }));

    setLoading(false);
  }

  // ✅ SAVE + UX FIX
  async function saveChanges() {
    if (!selected || !token) return alert("Rifai login");

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/manga/${selected.ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          coverurl: selected.CoverURL,
          trama: selected.Trama,
          volumiposseduti: selected.VolumiPosseduti || 0,
          volumitotali: selected.VolumiTotali || 0
        })
      });

    if (!res.ok) return alert("Errore salvataggio");

    alert("Salvato ✅");

    // ✅ 🔥 ricarica dati
    const updatedList = await loadManga();

    // ✅ 🔥 UX: mantieni selezionato aggiornato
    const updated = updatedList.find(m => m.ID === selected.ID);
    if (updated) setSelected(updated);
  }

  // ✅ LOGIN UI
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-zinc-900 p-8 rounded-xl space-y-4 w-80 text-center">
          <h2 className="text-xl font-bold">Login Admin</h2>

          <input id="u" placeholder="Username"
            className="w-full p-2 bg-zinc-800 rounded"/>

          <input id="p" type="password" placeholder="Password"
            className="w-full p-2 bg-zinc-800 rounded"/>

          <button
            onClick={() => login(u.value, p.value)}
            className="w-full bg-yellow-500 text-black py-2 rounded-lg"
          >
            Login
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="text-sm text-zinc-400"
          >
            ← Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  // ✅ ADMIN UI
  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b0f] text-white">

      {/* SIDEBAR */}
      <div className="w-72 bg-black/60 border-r border-zinc-800 overflow-y-auto">
        <div className="p-4 flex justify-between">
          <span className="font-bold">Admin</span>
          <button onClick={logout} className="text-red-400 text-sm">
            Logout
          </button>
        </div>

        {mangaList.map(m => (
          <div
            key={m.ID}
            onClick={() => setSelected(m)}
            className={`p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900 ${
              selected?.ID === m.ID ? "bg-zinc-800" : ""
            }`}
          >
            {m.Titolo}
          </div>
        ))}
      </div>

      {/* CONTENT FISSO */}
      <div className="flex-1 flex justify-center p-8">
        <div className="w-full max-w-5xl">

          {!selected ? (
            <div className="text-zinc-400">Seleziona un manga</div>
          ) : (
            <>
              <div className="flex gap-8">

                {/* COVER */}
                {selected.CoverURL && (
                  <img
                    src={selected.CoverURL}
                    className="w-64 h-[380px] object-cover rounded-xl"
                  />
                )}

                {/* FORM */}
                <div className="flex-1 space-y-4">

                  <input
                    value={selected.Titolo || ""}
                    disabled
                    className="w-full p-3 bg-zinc-800 rounded-xl text-zinc-400"
                  />

                  <input
                    value={selected.Autore || ""}
                    onChange={e =>
                      setSelected({ ...selected, Autore: e.target.value })
                    }
                    className="w-full p-3 bg-zinc-900 rounded-xl"
                  />

                  <textarea
                    value={selected.Trama || ""}
                    onChange={e =>
                      setSelected({ ...selected, Trama: e.target.value })
                    }
                    className="w-full p-3 bg-zinc-900 rounded-xl h-48"
                  />

                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={saveChanges}
                  className="bg-green-600 px-6 py-3 rounded-xl"
                >
                  Salva
                </button>

                <button
                  onClick={enrichManga}
                  className="bg-blue-600 px-6 py-3 rounded-xl"
                >
                  {loading ? "..." : "Auto Enrich"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
