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

  useEffect(() => {
    if (!query || query.trim().length < 3) return;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/manga/enrich`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titolo: query })
          }
        );

        const data = await res.json();

        if (!data.error) {
          setForm(prev => ({
            ...prev,
            Titolo: data.titolo || "",
            Autore: data.autore || "",
            CoverURL: data.coverurl || "",
            Trama: data.trama || "",
            Genere: data.genere || "",
            VolumiTotali: data.volumitotali || ""
          }));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleSave() {
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

      if (data.item) onSaved(data.item);

      onClose();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    // ✅ BLOCCA TUTTO IL CLICK SOTTO
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* ❗ niente background = lascia vedere il sito */}
      <div className="absolute inset-0 bg-transparent" />

      {/* ✅ PANEL */}
      <div
        className="relative w-[900px] rounded-3xl border border-white/10 shadow-2xl manga-detail-card flex"
        onClick={(e) => e.stopPropagation()}
      >

        {/* LEFT */}
        <div className="w-[260px] p-4">
          <div className="h-[360px] bg-black rounded overflow-hidden flex items-center justify-center">
            {form.CoverURL ? (
              <img
                src={form.CoverURL}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="text-zinc-500">300x450</span>
            )}
          </div>

          <div className="mt-4 text-white">
            <p className="font-semibold truncate">
              {form.Titolo || "Titolo"}
            </p>
            <p className="text-sm text-zinc-400">
              {form.Autore || "Autore"}
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 p-6 text-white">

          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">
              Aggiungi alla Wishlist
            </h2>

            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-500 rounded"
            >
              Chiudi
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scrivi titolo..."
            className="w-full p-3 mb-4 bg-black/60 rounded"
          />

          {loading && (
            <p className="text-yellow-400 text-sm mb-2">
              Ricerca...
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">

            <input
              value={form.Titolo}
              onChange={(e) => setForm({ ...form, Titolo: e.target.value })}
              className="p-2 bg-black/60 rounded"
            />

            <input
              value={form.Autore}
              onChange={(e) => setForm({ ...form, Autore: e.target.value })}
              className="p-2 bg-black/60 rounded"
            />

            <input
              value={form.VolumiTotali}
              onChange={(e) => setForm({ ...form, VolumiTotali: e.target.value })}
              className="p-2 bg-black/60 rounded"
            />

            <input
              value={form.Genere}
              onChange={(e) => setForm({ ...form, Genere: e.target.value })}
              className="p-2 bg-black/60 rounded"
            />

          </div>

          <textarea
            value={form.Trama}
            onChange={(e) => setForm({ ...form, Trama: e.target.value })}
            className="w-full h-28 p-2 bg-black/60 rounded mb-4"
          />

          <div className="flex justify-end gap-2">

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 rounded"
            >
              Annulla
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-yellow-400 text-black rounded"
            >
              Aggiungi
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
