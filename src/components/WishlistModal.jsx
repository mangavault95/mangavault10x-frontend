import { useEffect, useState } from "react";

export default function WishlistModal({ onClose, onSaved, initialData }) {
  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    Trama: "",
    Genere: ""
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        Titolo: initialData.titolo || "",
        Autore: initialData.autori || "",
        CoverURL: initialData.coverurl || "",
        Trama: initialData.trama || "",
        Genere: initialData.generi || ""
      });
    }
  }, [initialData]);

  async function handleSave() {
    await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist`, {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titolo: form.Titolo,
        autori: form.Autore,
        coverurl: form.CoverURL,
        trama: form.Trama,
        generi: form.Genere
      })
    });

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">

      <div className="absolute inset-0 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-[900px] rounded-3xl manga-detail-card p-6 flex gap-6"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="w-[260px]">
          <div className="h-[360px] bg-black rounded overflow-hidden">
            {form.CoverURL && (
              <img src={form.CoverURL} className="w-full h-full object-contain" />
            )}
          </div>
        </div>

        <div className="flex-1 text-white space-y-3">

          <h2 className="text-xl font-bold">
            {initialData ? "Modifica" : "Aggiungi manga"}
          </h2>

          <input
            value={form.Titolo}
            onChange={(e) => setForm(p => ({ ...p, Titolo: e.target.value }))}
            className="w-full p-2 bg-black/40 rounded"
          />

          <input
            value={form.Autore}
            onChange={(e) => setForm(p => ({ ...p, Autore: e.target.value }))}
            className="w-full p-2 bg-black/40 rounded"
          />

          <textarea
            value={form.Trama}
            onChange={(e) => setForm(p => ({ ...p, Trama: e.target.value }))}
            className="w-full p-2 bg-black/40 rounded"
          />

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded">
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
    </div>
  );
}
