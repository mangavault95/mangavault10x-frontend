import { useEffect, useState } from "react";
import { getManga } from "../services/api";

export default function AdminPage() {

  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/";
  }

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

    setSelected({
      ...selected,
      Trama: data.trama,
      CoverURL: data.coverurl,
    });

    setLoading(false);
  }

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
          volumiposseduti: 0,
          volumitotali: selected.VolumiTotali
        })
      });

    if (!res.ok) return alert("Errore salvataggio");

    alert("Salvato ✅");
  }

  useEffect(() => {
    getManga().then(setMangaList);
  }, []);

  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-zinc-900 p-8 rounded-xl space-y-4 w-80 text-center">
          <h2 className="text-xl font-bold">Login Admin</h2>

          <input id="u" placeholder="Username" className="w-full p-2 bg-zinc-800 rounded"/>
          <input id="p" type="password" placeholder="Password" className="w-full p-2 bg-zinc-800 rounded"/>

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

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b0f] text-white">

      {/* SIDEBAR */}
      <div className="w-72 bg-black/60 border-r border-zinc-800 overflow-y-auto">
        <div className="p-4 flex justify-between">
          <span>Admin</span>
          <button onClick={logout}>Logout</button>
        </div>

        {mangaList.map(m => (
          <div
            key={m.ID}
            onClick={() => setSelected(m)}
            className="p-3 border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer"
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

                <img
                  src={selected.CoverURL || "https://placehold.co/300x450"}
                  className="w-60 rounded-xl"
                />

                <div className="flex-1 space-y-4">

                  <input value={selected.Titolo || ""}
                    onChange={e => setSelected({...selected, Titolo:e.target.value})}
                    className="w-full p-3 bg-zinc-900 rounded-xl"/>

                  <input value={selected.Autore || ""}
                    onChange={e => setSelected({...selected, Autore:e.target.value})}
                    className="w-full p-3 bg-zinc-900 rounded-xl"/>

                  <textarea value={selected.Trama || ""}
                    onChange={e => setSelected({...selected, Trama:e.target.value})}
                    className="w-full p-3 bg-zinc-900 rounded-xl h-48"/>

                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button onClick={saveChanges} className="bg-green-600 px-6 py-3 rounded-xl">
                  Salva
                </button>

                <button onClick={enrichManga} className="bg-blue-600 px-6 py-3 rounded-xl">
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
