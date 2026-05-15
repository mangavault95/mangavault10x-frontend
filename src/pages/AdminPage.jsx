import { useEffect, useState } from "react";
import { getManga } from "../services/api";

export default function AdminPage() {

  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  async function login(username, password) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
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

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/manga/enrich`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titolo: selected.Titolo,
            autore: selected.Autore
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        setLoading(false);
        return;
      }

      setSelected({
        ...selected,
        Titolo: data.titolo,
        Trama: data.trama,
        CoverURL: data.coverurl,
        VolumiTotali: data.volumitotali
      });

    } catch {
      alert("Errore enrich");
    }

    setLoading(false);
  }

  async function saveChanges() {
    if (!selected || !token) {
      alert("Devi rifare login");
      return;
    }

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/manga/${selected.ID}`,
      {
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
      }
    );

    if (!res.ok) {
      alert("Errore salvataggio");
      return;
    }

    alert("Salvato ✅");
  }

  useEffect(() => {
    getManga().then(setMangaList);
  }, []);

  // ✅ LOGIN SCREEN FIXATO
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="bg-zinc-900 p-8 rounded-xl space-y-4 w-80">
          <h2 className="text-xl font-bold text-center">Login Admin</h2>

          <input id="user" placeholder="Username"
            className="w-full p-2 bg-zinc-800 rounded"/>

          <input id="pass" type="password" placeholder="Password"
            className="w-full p-2 bg-zinc-800 rounded"/>

          <button
            onClick={() =>
              login(
                document.getElementById("user").value,
                document.getElementById("pass").value
              )
            }
            className="w-full bg-yellow-500 text-black py-2 rounded-lg font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#0b0b0f] text-white min-h-screen">

      {/* SIDEBAR */}
      <div className="w-72 bg-black/60 border-r border-zinc-800 overflow-y-auto">
        <div className="p-5 flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin</h1>
          <button onClick={logout} className="text-red-400 text-sm">Logout</button>
        </div>

        {mangaList.map((m) => (
          <div
            key={m.ID}
            onClick={() => setSelected(m)}
            className="p-3 border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer"
          >
            {m.Titolo}
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8">
        {!selected ? (
          <div className="text-zinc-400">Seleziona un manga</div>
        ) : (
          <>
            <div className="flex gap-8">

              {/* COVER */}
              <img
                src={selected.CoverURL || "https://placehold.co/300x450"}
                className="w-56 h-[340px] object-cover rounded-xl"
              />

              {/* FORM */}
              <div className="flex-1 space-y-4">

                <input
                  value={selected.Titolo || ""}
                  onChange={e => setSelected({ ...selected, Titolo: e.target.value })}
                  className="w-full p-3 bg-zinc-900 rounded-xl"
                />

                <input
                  value={selected.Autore || ""}
                  onChange={e => setSelected({ ...selected, Autore: e.target.value })}
                  className="w-full p-3 bg-zinc-900 rounded-xl"
                />

                <input
                  value={selected.CoverURL || ""}
                  onChange={e => setSelected({ ...selected, CoverURL: e.target.value })}
                  className="w-full p-3 bg-zinc-900 rounded-xl"
                />

                <textarea
                  value={selected.Trama || ""}
                  onChange={e => setSelected({ ...selected, Trama: e.target.value })}
                  className="w-full p-3 bg-zinc-900 rounded-xl h-48"
                />

              </div>
            </div>

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
  );
}
