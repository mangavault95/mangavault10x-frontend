import { useEffect, useState } from "react";

export default function WishlistModal({ onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    Trama: "",
    Genere: "",
    VolumiTotali: ""
  });

  // 🔍 FETCH AUTOMATICO ENRICH
  useEffect(() => {
    if (!query || query.trim().length < 3) return;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/manga/enrich`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              titolo: query
            })
          }
        );

        const data = await res.json();

        if (!data.error) {
          setForm(prev => ({
            ...prev,
            Titolo: data.titolo || prev.Titolo,
            Autore: data.autore || prev.Autore,
            CoverURL: data.coverurl || prev.CoverURL,
            Trama: data.trama || prev.Trama,
            Genere: data.genere || prev.Genere,
            VolumiTotali: data.volumitotali || prev.VolumiTotali
          }));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [query]);

  // 💾 SAVE DB
  async function handleSave() {
    if (!form.Titolo) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/wishlist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titolo: form.Titolo,
            autori: form.Autore,
            coverurl: form.CoverURL,
            trama: form.Trama,
            generi: form.Genere,
            volumitotali: form.VolumiTotali
          })
        }
      );

      const data = await res.json();

      if (data.item) {
        onSaved(data.item);
      }

      onClose();

    } catch (err) {
      console.error(err);
    }
  }

  function updateField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(10,10,10,0.92), rgba(30,30,30,0.92))",
        backdropFilter: "blur(6px)"
      }}
      onClick={onClose}
    >
      {/* CARD */}
      <div
        className="w-[900px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PREVIEW */}
        <div className="w-[260px] bg-[#151515] p-4 flex flex-col">
          <div className="w-full h-[350px] bg-black rounded overflow-hidden flex items-center justify-center">
            {form.CoverURL ? (
              <img
                src={form.CoverURL}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-zinc-500 text-sm">300 × 450</span>
            )}
          </div>

          <div className="mt-4 text-white">
            <p className="font-semibold truncate">
              {form.Titolo || "Titolo"}
            </p>
            <p className="text-sm text-zinc-400 truncate">
              {form.Autore || "Autore"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Volumi: {form.VolumiTotali || "?"}
            </p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="flex-1 p-6 text-white">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">
                Aggiungi alla Wishlist
              </h2>
              <p className="text-sm text-zinc-400">
                Inserisci il titolo e correggi i dati
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setForm({
                    Titolo: "",
                    Autore: "",
                    CoverURL: "",
                    Trama: "",
                    Genere: "",
                    VolumiTotali: ""
                  })
                }
                className="px-3 py-1 bg-white/10 rounded"
              >
                Reset
              </button>

              <button
                onClick={onClose}
                className="px-3 py-1 bg-red-500 rounded"
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* SEARCH */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scrivi il titolo..."
            className="w-full mb-4 p-3 bg-black rounded"
          />

          {loading && (
            <p className="text-sm text-yellow-400 mb-2">
              Ricerca in corso...
            </p>
          )}

          {/* GRID FORM */}
          <div className="grid grid-cols-2 gap-4 mb-4">

            <input
              value={form.Titolo}
              onChange={(e) => updateField("Titolo", e.target.value)}
              placeholder="Titolo"
              className="p-2 bg-black rounded"
            />

            <input
              value={form.Autore}
              onChange={(e) => updateField("Autore", e.target.value)}
              placeholder="Autore"
              className="p-2 bg-black rounded"
            />

            <input
              value={form.VolumiTotali}
              onChange={(e) => updateField("VolumiTotali", e.target.value)}
              placeholder="Volumi totali"
              className="p-2 bg-black rounded"
            />

            <input
              value={form.Genere}
              onChange={(e) => updateField("Genere", e.target.value)}
              placeholder="Genere"
              className="p-2 bg-black rounded"
            />
          </div>

          <textarea
            value={form.Trama}
            onChange={(e) => updateField("Trama", e.target.value)}
            placeholder="Trama"
            className="w-full h-28 p-3 bg-black rounded mb-4"
          />

          <input
            value={form.CoverURL}
            onChange={(e) => updateField("CoverURL", e.target.value)}
            placeholder="URL cover"
            className="w-full p-2 bg-black rounded mb-4"
          />

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 rounded"
            >
              Annulla
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-yellow-400 text-black rounded font-semibold"
            >
              Aggiungi alla wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
