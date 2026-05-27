import { useEffect, useRef, useState } from "react";

export default function WishlistModal({ onClose, onSaved, initialData }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fileRef = useRef(null);

  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    Trama: "",
    Genere: "",
    VolumiTotali: "",
    DoveComprare: ""
  });

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (!initialData) return;

    setForm({
      Titolo: initialData.titolo || initialData.Titolo || "",
      Autore: initialData.autori || initialData.Autore || "",
      CoverURL: initialData.coverurl || initialData.CoverURL || "",
      Trama: initialData.trama || initialData.Trama || "",
      Genere: initialData.generi || initialData.Genere || "",
      VolumiTotali: initialData.volumitotali || initialData.VolumiTotali || "",
      DoveComprare: initialData.dovecomprare || initialData.DoveComprare || ""
    });

    setQuery(initialData.titolo || initialData.Titolo || "");
  }, [initialData]);

  useEffect(() => {
    if (isEditing) return;
    if (!query || query.trim().length < 3) return;

    const timeout = setTimeout(() => {
      searchManga(query);
    }, 700);

    return () => clearTimeout(timeout);
  }, [query, isEditing]);

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  }

  async function searchManga(titleToSearch) {
    const cleanTitle = titleToSearch.trim();

    if (cleanTitle.length < 3) {
      setError("Scrivi almeno 3 caratteri per cercare.");
      return;
    }

    setLoading(true);
    setError("");
    setToast("");

    try {
      const res = await fetch(`${API_URL}/api/manga/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          titolo: cleanTitle,
          autore: form.Autore || ""
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(`Errore ricerca: ${res.status}`);
        return;
      }

      if (data?.error) {
        setError(data.error || "Nessun risultato trovato.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        Titolo: data.titolo || prev.Titolo || cleanTitle,
        Autore: data.autore || prev.Autore || "",
        CoverURL: data.coverurl || prev.CoverURL || "",
        Trama: data.trama || prev.Trama || "",
        Genere: data.genere || prev.Genere || "",
        VolumiTotali:
          data.volumitotali !== undefined && data.volumitotali !== null
            ? data.volumitotali
            : prev.VolumiTotali
      }));

      setToast("Dati trovati e caricati.");
      setTimeout(() => setToast(""), 1800);
    } catch (err) {
      console.error("Errore ricerca wishlist:", err);
      setError("Errore di rete durante la ricerca.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateField("CoverURL", reader.result);
    };

    reader.readAsDataURL(file);
  }

  function buildPayload() {
    return {
      titolo: form.Titolo.trim(),
      autori: form.Autore.trim() || null,
      coverurl: form.CoverURL.trim() || null,
      trama: form.Trama.trim() || null,
      generi: form.Genere.trim() || null,
      volumitotali:
        form.VolumiTotali !== "" && form.VolumiTotali !== null
          ? Number(form.VolumiTotali)
          : null,
      dovecomprare: form.DoveComprare.trim() || ""
    };
  }

  async function handleSave() {
    setError("");
    setToast("");

    if (!form.Titolo.trim()) {
      setError("Il titolo è obbligatorio.");
      return;
    }

    const payload = buildPayload();

    setSaving(true);

    try {
      let savedItem = null;

      if (isEditing) {
        const putRes = await fetch(`${API_URL}/api/wishlist/${initialData.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (putRes.ok) {
          const putData = await putRes.json().catch(() => ({}));
          savedItem = putData.item || putData.updated || payload;
        } else if (putRes.status === 404 || putRes.status === 405) {
          await fetch(`${API_URL}/api/wishlist/${initialData.id}`, {
            method: "DELETE"
          });

          const postRes = await fetch(`${API_URL}/api/wishlist`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (!postRes.ok) {
            throw new Error(`Errore salvataggio: ${postRes.status}`);
          }

          const postData = await postRes.json().catch(() => ({}));
          savedItem = postData.item || payload;
        } else {
          throw new Error(`Errore modifica: ${putRes.status}`);
        }
      } else {
        const res = await fetch(`${API_URL}/api/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`Errore salvataggio: ${res.status}`);
        }

        const data = await res.json().catch(() => ({}));
        savedItem = data.item || payload;
      }

      if (typeof onSaved === "function") {
        onSaved(savedItem);
      }

      onClose();
    } catch (err) {
      console.error("Errore salvataggio wishlist:", err);
      setError("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setQuery("");
    setError("");
    setToast("");

    setForm({
      Titolo: "",
      Autore: "",
      CoverURL: "",
      Trama: "",
      Genere: "",
      VolumiTotali: "",
      DoveComprare: ""
    });
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* Sfondo trasparente: si vede il sito sotto */}
      <div className="absolute inset-0" />

      <div
        className="
          relative w-[980px] max-w-[94vw] max-h-[88vh]
          rounded-3xl border border-white/10 shadow-2xl
          manga-detail-card backdrop-blur-xl
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex">
          {/* COLONNA SINISTRA */}
          <div className="w-[300px] p-5 border-r border-white/10">
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
              <div className="w-full h-[390px] flex items-center justify-center">
                {form.CoverURL ? (
                  <img
                    src={form.CoverURL}
                    alt={form.Titolo || "Cover wishlist"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#111827]/80 to-[#020617]/80 text-zinc-500">
                    <div className="text-sm">Preview cover</div>
                    <div className="text-xs mt-1">300 × 450</div>
                  </div>
                )}
              </div>

              <div className="absolute inset-0 pointer-events-none">
                <div className="cover-shine" />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/6 backdrop-blur-md border border-white/10 text-white">
              <div className="text-sm font-semibold truncate" title={form.Titolo}>
                {form.Titolo || "Titolo manga"}
              </div>

              <div className="text-xs text-zinc-400 truncate mt-1" title={form.Autore}>
                {form.Autore || "Autore sconosciuto"}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/20 text-[11px]">
                  Wishlist
                </span>

                <span className="text-[11px] text-zinc-400">
                  Volumi: {form.VolumiTotali || "?"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="
                mt-4 w-full px-4 py-2 rounded-xl
                bg-white/8 border border-white/10
                text-sm text-white hover:bg-white/12
                transition-all duration-200
              "
            >
              Cambia cover locale
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* COLONNA DESTRA */}
          <div className="flex-1 p-6 text-white">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-extrabold leading-tight">
                  {isEditing ? "Modifica wishlist" : "Aggiungi alla wishlist"}
                </h2>

                <p className="text-sm text-zinc-400 mt-1">
                  Cerca il manga su AniList, poi correggi i dati prima di salvarlo.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="
                    px-3 py-2 rounded-lg bg-white/8 border border-white/10
                    text-sm hover:bg-white/12 transition
                  "
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="
                    px-3 py-2 rounded-lg bg-red-600/90
                    text-sm hover:bg-red-600 transition
                  "
                >
                  Chiudi
                </button>
              </div>
            </div>

            {!isEditing && (
              <div className="mb-4">
                <label className="text-xs text-zinc-400 mb-1 block">
                  Cerca su AniList
                </label>

                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchManga(query);
                      }
                    }}
                    placeholder="Es. Cross Game, Berserk, Monster..."
                    className="
                      flex-1 px-4 py-3 rounded-xl
                      bg-black/35 border border-white/10
                      text-sm outline-none
                      focus:border-yellow-400/60
                      focus:shadow-[0_0_14px_rgba(234,179,8,0.18)]
                      transition
                    "
                  />

                  <button
                    type="button"
                    onClick={() => searchManga(query)}
                    disabled={loading}
                    className="
                      px-4 py-3 rounded-xl
                      bg-yellow-400 text-black font-semibold text-sm
                      hover:brightness-110 active:scale-95
                      disabled:opacity-60 disabled:cursor-not-allowed
                      transition-all duration-200
                    "
                  >
                    {loading ? "Cerco..." : "Cerca"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            {toast && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/15 border border-green-400/20 text-green-300 text-sm">
                {toast}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-xs text-zinc-400">Titolo</span>
                <input
                  value={form.Titolo}
                  onChange={(e) => updateField("Titolo", e.target.value)}
                  placeholder="Titolo"
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm">
                <span className="text-xs text-zinc-400">Autore</span>
                <input
                  value={form.Autore}
                  onChange={(e) => updateField("Autore", e.target.value)}
                  placeholder="Autore"
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm">
                <span className="text-xs text-zinc-400">Volumi totali</span>
                <input
                  type="number"
                  value={form.VolumiTotali}
                  onChange={(e) => updateField("VolumiTotali", e.target.value)}
                  placeholder="Volumi totali"
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm">
                <span className="text-xs text-zinc-400">Generi</span>
                <input
                  value={form.Genere}
                  onChange={(e) => updateField("Genere", e.target.value)}
                  placeholder="Drama, Mystery..."
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm col-span-2">
                <span className="text-xs text-zinc-400">URL cover</span>
                <input
                  value={form.CoverURL}
                  onChange={(e) => updateField("CoverURL", e.target.value)}
                  placeholder="https://..."
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm col-span-2">
                <span className="text-xs text-zinc-400">Dove comprare</span>
                <input
                  value={form.DoveComprare}
                  onChange={(e) => updateField("DoveComprare", e.target.value)}
                  placeholder="Amazon, Star Shop, eBay..."
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    transition
                  "
                />
              </label>

              <label className="text-sm col-span-2">
                <span className="text-xs text-zinc-400">Trama</span>
                <textarea
                  value={form.Trama}
                  onChange={(e) => updateField("Trama", e.target.value)}
                  placeholder="Descrizione del manga..."
                  className="
                    w-full mt-1 px-3 py-2 rounded-lg h-28
                    bg-black/35 border border-white/10
                    outline-none focus:border-yellow-400/50
                    custom-scrollbar
                    transition resize-none
                  "
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="
                  px-4 py-2 rounded-xl
                  bg-white/8 border border-white/10
                  text-white hover:bg-white/12
                  transition-all duration-200
                "
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="
                  px-5 py-2 rounded-xl
                  bg-yellow-400 text-black font-semibold
                  hover:brightness-110
                  active:scale-95
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-200
                  shadow-[0_0_18px_rgba(234,179,8,0.18)]
                  hover:shadow-[0_0_26px_rgba(234,179,8,0.35)]
                "
              >
                {saving ? "Salvataggio..." : isEditing ? "Salva modifiche" : "Aggiungi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
