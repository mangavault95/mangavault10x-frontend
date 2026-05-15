import { useEffect, useState } from "react";
import { getManga } from "../services/api";

export default function AdminPage() {

  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    location.reload();
  }

  async function login(user, pass) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
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

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga/enrich`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        titolo: selected.Titolo,
        autore: selected.Autore
      })
    });

    const data = await res.json();

    if (data.error) return alert(data.error);

    setSelected({
      ...selected,
      Titolo: data.titolo,
      Trama: data.trama,
      CoverURL: data.coverurl,
      VolumiTotali: data.volumitotali
    });
  }

  async function saveChanges() {
    if (!selected || !token) {
      alert("Rifai login");
      return;
    }

    const id = selected.ID;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/manga/${id}`, {
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
      }
    );

    if (!res.ok) {
      alert("Errore save");
      return;
    }

    alert("Salvato ✅");
  }

  useEffect(() => {
    getManga().then(setMangaList);
  }, []);

  if (!token) {
    return (
      <div>
        <input id="u" placeholder="user" />
        <input id="p" type="password" />
        <button onClick={()=>login(u.value,p.value)}>Login</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={logout}>Logout</button>

      <div>
        {mangaList.map(m => (
          <div key={m.ID} onClick={()=>setSelected(m)}>
            {m.Titolo}
          </div>
        ))}
      </div>

      {selected && (
        <>
          <input value={selected.Titolo} onChange={e =>
            setSelected({...selected, Titolo:e.target.value})
          }/>

          <input value={selected.Autore||""} onChange={e =>
            setSelected({...selected, Autore:e.target.value})
          }/>

          <textarea value={selected.Trama||""} onChange={e =>
            setSelected({...selected, Trama:e.target.value})
          }/>

          <button onClick={saveChanges}>Salva</button>
          <button onClick={enrichManga}>Auto Enrich</button>
        </>
      )}
    </div>
  );
}
