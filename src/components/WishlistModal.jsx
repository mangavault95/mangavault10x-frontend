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
    if (query.trim().length < 3) return;

    const t = setTimeout(async () => {
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
          setForm({
            Titolo: data.titolo || "",
            Autore: data.autore || "",
            CoverURL: data.coverurl || "",
            Trama: data.trama || "",
            Genere: data.genere || "",
            VolumiTotali: data.volumitotali || ""
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(t);
  }, [query]);

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

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] p-6 rounded-xl w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl mb-4 text-white">Aggiungi Manga</h2>

        <input
          placeholder="Cerca manga..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-2 mb-3 bg-black rounded text-white"
        />

        {loading && <p className="text-sm text-zinc-400">Caricamento...</p>}

        {form.CoverURL && (
          <img
            src={form.CoverURL}
            className="w-24 h-32 object-cover mb-3"
          />
        )}

        <input
          value={form.Autore}
          onChange={(e) =>
            setForm({ ...form, Autore: e.target.value })
          }
          placeholder="Autore"
          className="w-full p-2 mb-2 bg-black text-white rounded"
        />

        <textarea
          value={form.Trama}
          onChange={(e) =>
            setForm({ ...form, Trama: e.target.value })
          }
          placeholder="Trama"
          className="w-full p-2 h-24 mb-2 bg-black text-white rounded"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-zinc-700 rounded"
          >
            Annulla
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-yellow-400 text-black rounded"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
