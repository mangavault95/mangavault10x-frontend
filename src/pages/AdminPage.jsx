import { useEffect, useState } from "react";
import { getManga } from "../services/api";

export default function AdminPage() {
  const [mangaList, setMangaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManga();
  }, []);

  async function loadManga() {
    setLoading(true);

    try {
      const data = await getManga();
      setMangaList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // SAVE MANGA
  async function saveChanges() {
    console.log("PAYLOAD:", {
  coverurl: selected.CoverURL,
  trama: selected.Trama,
  volumiposseduti: selected.VolumiPosseduti,
  volumitotali: selected.VolumiTotali,
});

    if (!selected) return;

    try {
      const id = selected.Id || selected.ID;

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/manga/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          
body: JSON.stringify({
  coverurl: selected.CoverURL,
  trama: selected.Trama,
  volumiposseduti: selected.VolumiPosseduti,
  volumitotali: selected.VolumiTotali,
})
,
        }
      );

      if (!res.ok) {
        throw new Error("Errore HTTP");
      }

      const data = await res.json();

      if (data.success) {
        alert("Salvato correttamente!");
        await loadManga();
      } else {
        alert("Errore salvataggio");
      }
    } catch (err) {
      console.error(err);
      alert("Errore server");
    }
  }

  // ENRICH
  async function enrichManga() {
  if (!selected) return;

  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/manga/enrich`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titolo: selected.Titolo,
        }),
      }
    );

    const data = await res.json();

    console.log("ENRICH DATA:", data); // 🔥 DEBUG

    // ✅ QUI È IL FIX: aggiorni UI
    setSelected({
      ...selected,
      Titolo: data.titolo || selected.Titolo,
      Trama: data.trama || selected.Trama,
      CoverURL: data.coverurl || selected.CoverURL,
      VolumiTotali: data.volumitotali || selected.VolumiTotali,
    });

  } catch (err) {
    console.error(err);
  }
}
  return (
    <div className="flex">
      {/* SIDEBAR */}
      <div className="w-72 h-screen bg-black/60 backdrop-blur-xl border-r border-zinc-800 overflow-y-auto">
        <h1 className="text-2xl font-bold p-5">
          Admin MangaVault
        </h1>

        <div className="px-5 pb-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all text-sm font-semibold"
          >
            Torna alla Home
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-zinc-400">Caricamento...</div>
        ) : (
          mangaList.map((m, i) => (
            <div
              key={m.Id || m.ID || i}
              onClick={() => setSelected(m)}
              className="p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900"
            >
              {m.Titolo}
            </div>
          ))
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!selected ? (
          <div className="text-zinc-400">
            Seleziona un manga
          </div>
        ) : (
          <>
            <div className="max-w-5xl">
              <div className="flex gap-8">
                <div className="w-64">
                  <img
                    src={
                      selected.CoverURL ||
                      "https://via.placeholder.com/300x450"
                    }
                    className="w-full h-[380px] object-cover rounded-2xl border border-zinc-800"
                    alt="cover"
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <input
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                    value={selected.Titolo || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, Titolo: e.target.value })
                    }
                  />

                  <input
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                    value={selected.Autore || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, Autore: e.target.value })
                    }
                  />

                  <input
                    className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl"
                    value={selected.CoverURL || ""}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        CoverURL: e.target.value,
                      })
                    }
                  />

                  <textarea
                    className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl h-56"
                    value={selected.Trama || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, Trama: e.target.value })
                    }
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
                  Auto Enrich
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
