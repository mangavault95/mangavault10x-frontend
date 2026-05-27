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

  // ✅ preload modifica
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

  // ✅ FETCH ANILIST (fix veroooo)
  useEffect(() => {
    if (!query || query.length < 3) return;

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
      }

      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);

  }, [query]);

  // ✅ SAVE
  async function handleSave() {
    await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist`, {
      method: initialData ? "PUT" : "POST",
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">

      {/* ✅ SFONDO TRASPARENTE → niente nero */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* ✅ PANEL GLASS COME MANGA DETAIL */}
      <div
        className="relative w-[900px] rounded-3xl border border-white/10 shadow-2xl manga-detail-card backdrop-blur-xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ✅ SINISTRA (preview) */}
        <div className="w-[280px] bg-black/30 p-4 flex items-center justify-center">

          <div className="w-full h-[360px] bg-black rounded-xl overflow-hidden flex items-center justify-center">

            {form.CoverURL ? (
              <img
                src={form.CoverURL}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-zinc-500">Preview</span>
            )}

          </div>

        </div>

        {/* ✅ DESTRA */}
        <div className="flex-1 p-6 text-white">

          <div className="flex justify-between mb-4">

            <h2 className="text-xl font-bold">
              {initialData ? "Modifica manga" : "Aggiungi manga"}
            </h2>

            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 rounded"
            >
              Chiudi
            </button>

          </div>

          {/* ✅ SEARCH */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca su AniList..."
            className="w-full p-3 mb-4 bg-black/40 rounded-lg border border-white/10"
          />

          {loading && (
            <p className="text-yellow-400 text-sm mb-2">
              Ricerca in corso...
            </p>
          )}

          {/* ✅ FORM */}
          <div className="space-y-3">

            <input
              value={form.Titolo}
              onChange={(e) => setForm(p => ({ ...p, Titolo: e.target.value }))}
              className="w-full p-2 bg-black/40 rounded border border-white/10"
              placeholder="Titolo"
            />

            <input
              value={form.Autore}
              onChange={(e) => setForm(p => ({ ...p, Autore: e.target.value }))}
              className="w-full p-2 bg-black/40 rounded border border-white/10"
              placeholder="Autore"
            />

            <textarea
              value={form.Trama}
              onChange={(e) => setForm(p => ({ ...p, Trama: e.target.value }))}
              className="w-full p-2 bg-black/40 rounded border border-white/10 h-24"
              placeholder="Trama"
            />

          </div>

          {/* ✅ BOTTONI */}
          <div className="flex justify-end gap-2 mt-5">

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 rounded-lg"
            >
              Annulla
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold"
            >
              Salva
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}
