import { useEffect, useState } from "react";

export default function WishlistModal({ onClose, onSaved, initialData }) {
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
    if (initialData) {
      setForm({
        Titolo: initialData.titolo || "",
        Autore: initialData.autori || "",
        CoverURL: initialData.coverurl || "",
        Trama: initialData.trama || "",
        Genere: initialData.generi || "",
        VolumiTotali: initialData.volumitotali || ""
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (!query || query.length < 3) return;

    const t = setTimeout(async () => {
      setLoading(true);

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

      setLoading(false);
    }, 500);

    return () => clearTimeout(t);
  }, [query]);

  async function handleSave() {
    const url = initialData
      ? `${import.meta.env.VITE_API_URL}/api/wishlist/${initialData.id}`
      : `${import.meta.env.VITE_API_URL}/api/wishlist`;

    const method = initialData ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titolo: form.Titolo,
        autori: form.Autore,
        coverurl: form.CoverURL,
        trama: form.Trama,
        generi: form.Genere,
        volumitotali: form.VolumiTotali
      })
    });

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto">

      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-[900px] rounded-3xl border border-white/10 shadow-2xl manga-detail-card flex"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="w-[260px] p-4">
          <div className="h-[360px] bg-black rounded overflow-hidden flex items-center justify-center">
            {form.CoverURL && <img src={form.CoverURL} className="w-full h-full object-contain" />}
          </div>
        </div>

        <div className="flex-1 p-6 text-white">

          <h2 className="text-xl font-bold mb-4">Wishlist</h2>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca..."
            className="w-full p-2 bg-black/60 rounded mb-3"
          />

          <input
            value={form.Titolo}
            onChange={(e) => setForm(p => ({ ...p, Titolo: e.target.value }))}
            className="w-full p-2 bg-black/60 rounded mb-2"
          />

          <input
            value={form.Autore}
            onChange={(e) => setForm(p => ({ ...p, Autore: e.target.value }))}
            className="w-full p-2 bg-black/60 rounded mb-2"
          />

          <textarea
            value={form.Trama}
            onChange={(e) => setForm(p => ({ ...p, Trama: e.target.value }))}
            className="w-full p-2 bg-black/60 rounded mb-3"
          />

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 bg-white/10 rounded">Annulla</button>
            <button onClick={handleSave} className="px-3 py-1 bg-yellow-400 text-black rounded">
              Salva
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
