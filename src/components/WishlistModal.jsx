import { useEffect, useState, useRef } from "react";

/**
 * WishlistModal semplice e in stile MangaDetail.
 * - Inserisci solo il titolo.
 * - Auto-fetch metadata da /api/manga/enrich (Anilist) quando il titolo è confermato.
 * - Permette di correggere manualmente i campi prima del salvataggio.
 * - Salva in localStorage (mv_wishlist_custom) e opzionalmente invia al backend se vuoi.
 *
 * Nota: se vuoi MAL invece di Anilist, dimmi e cambio la fetch URL.
 */

export default function WishlistModal({ onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null); // { titolo, autore, coverurl, volumitotali, trama }
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // stato editabile (puoi correggere i dati prima di salvare)
  const [edit, setEdit] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    VolumiTotali: null,
    Note: "",
    DoveComprare: ""
  });

  // debounce semplice: cerca 700ms dopo ultimo input
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setMeta(null);
      setError(null);
      return;
    }
    setError(null);
    const t = setTimeout(() => {
      fetchMeta(query);
    }, 700);
    return () => clearTimeout(t);
  }, [query]);

  async function fetchMeta(title) {
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
      // usa l'endpoint esistente /api/manga/enrich (Anilist)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titolo: title })
      });
      const data = await res.json();
      if (data?.error) {
        setError(data.error || "Nessun risultato");
        setMeta(null);
      } else {
        const normalized = {
          Titolo: data.titolo || title,
          Autore: data.autore || "",
          CoverURL: data.coverurl || "",
          VolumiTotali: data.volumitotali || null,
          Trama: data.trama || ""
        };
        setMeta(normalized);
        setEdit(prev => ({ ...prev, ...normalized }));
      }
    } catch (err) {
      setError("Errore durante la ricerca");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  // preview upload client-side (dataURL)
  const handleFile = (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEdit(prev => ({ ...prev, CoverURL: reader.result }));
    };
    reader.readAsDataURL(f);
  };

  // salva in localStorage (mv_wishlist_custom) e opzionalmente invia al backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const item = {
        ID: `c_${Date.now()}`,
        Titolo: edit.Titolo,
        Autore: edit.Autore,
        CoverURL: edit.CoverURL,
        VolumiTotali: edit.VolumiTotali,
        Note: edit.Note || "",
        DoveComprare: edit.DoveComprare || "",
        createdAt: new Date().toISOString(),
        _custom: true
      };

      // salva localmente
      const existing = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
      localStorage.setItem("mv_wishlist_custom", JSON.stringify([item, ...existing]));

      // opzionale: invia al backend per persistere nel DB
      // se vuoi che lo faccia, dimmi i campi DB e l'endpoint; qui è commentato
      /*
      await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      */

      setSaving(false);
      if (onSaved) onSaved(item);
      onClose();
    } catch (err) {
      setSaving(false);
      setError("Errore salvataggio");
    }
  };

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.96), rgba(30,30,30,0.96))`,
          opacity: 0.9
        }}
      />
      <div className="absolute inset-0 bg-black/64" />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
        aria-label="Chiudi wishlist"
      >
        ✕
      </button>

      <div
        className="relative max-w-4xl mx-auto mt-16 mb-16 p-6 rounded-3xl shadow-2xl border border-white/10 bg-gradient-to-br from-[#0b0b0f] to-[#0f0f12]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex gap-6">
          {/* COVER PREVIEW */}
          <div className="flex-shrink-0 w-[220px]">
            <div className="rounded-xl overflow-hidden shadow-2xl transform-gpu transition-transform duration-300">
              <div className="bg-black relative">
                <img
                  src={edit.CoverURL || meta?.CoverURL || "https://placehold.co/300x450"}
                  className="w-full h-[320px] object-contain block"
                  alt={edit.Titolo || query || "Copertina"}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="cover-shine" />
                </div>
              </div>

              <div className="bg-white/6 backdrop-blur-md text-white p-3">
                <div className="text-sm font-semibold truncate" title={edit.Titolo}>{edit.Titolo || "Titolo"}</div>
                <div className="text-xs text-zinc-300 truncate" title={edit.Autore}>{edit.Autore || "Autore"}</div>
                <div className="mt-3 text-xs text-zinc-300">
                  {edit.VolumiTotali ? `${edit.VolumiTotali} volumi` : "Volumi: ?"}
                </div>
              </div>
            </div>
          </div>

          {/* FORM SEMPLIFICATO */}
          <div className="flex-1 bg-white/8 backdrop-blur-md rounded-xl p-6 text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-extrabold leading-tight">Aggiungi alla Wishlist</h1>
                <div className="text-sm text-zinc-300 mt-1">Inserisci il titolo e lascia che cerchi i dettagli</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-white/8 rounded hover:bg-white/12" onClick={() => { setQuery(""); setMeta(null); setEdit({ Titolo: "", Autore: "", CoverURL: "", VolumiTotali: null, Note: "", DoveComprare: "" }); }}>
                  Reset
                </button>
                <button className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700" onClick={onClose}>Chiudi</button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-xs text-zinc-400">Titolo</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scrivi il titolo..."
                className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4"
              />
              <div className="text-xs text-zinc-500">Digita almeno 3 caratteri per avviare la ricerca automatica.</div>

              {loading && <div className="text-sm text-zinc-300">Sto cercando…</div>}
              {error && <div className="text-sm text-red-400">{error}</div>}

              {/* campi editabili (precompilati da meta) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-zinc-400">Titolo (modifica)</label>
                  <input value={edit.Titolo} onChange={(e)=>setEdit(prev=>({...prev, Titolo: e.target.value}))} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Autore</label>
                  <input value={edit.Autore} onChange={(e)=>setEdit(prev=>({...prev, Autore: e.target.value}))} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Volumi totali</label>
                  <input value={edit.VolumiTotali || ""} onChange={(e)=>setEdit(prev=>({...prev, VolumiTotali: e.target.value ? Number(e.target.value) : null}))} type="number" className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Dove comprarlo</label>
                  <input value={edit.DoveComprare} onChange={(e)=>setEdit(prev=>({...prev, DoveComprare: e.target.value}))} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400">Cover (URL o upload)</label>
                <input value={edit.CoverURL} onChange={(e)=>setEdit(prev=>({...prev, CoverURL: e.target.value}))} placeholder="https://..." className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                <div className="mt-2 flex items-center gap-3">
                  <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="text-xs text-zinc-400" />
                  {edit.CoverURL && <img src={edit.CoverURL} alt="preview cover" className="w-20 h-28 rounded-md object-cover shadow-sm" />}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button onClick={handleSave} disabled={saving} className="px-4 py-3 rounded bg-yellow-400 text-black font-semibold hover:brightness-95">
                  {saving ? "Salvo…" : "Aggiungi alla wishlist"}
                </button>
                <button onClick={() => { setEdit({ Titolo: "", Autore: "", CoverURL: "", VolumiTotali: null, Note: "", DoveComprare: "" }); setQuery(""); }} className="px-4 py-3 rounded bg-white/5 hover:bg-white/6">
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
