import { useEffect, useState, useRef } from "react";

/**
 * WishlistModal.jsx
 * - pannello usa variabili CSS per colore (coerenza con app.css)
 * - cover leggermente staccata dalla barra sinistra
 * - autofetch /api/manga/enrich (Anilist)
 * - NON sovrascrive Autore automaticamente
 * - salva su /api/wishlist e fallback su localStorage
 */

export default function WishlistModal({ onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    Trama: "",
    Genere: "",
    VolumiTotali: ""
  });

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setMeta(null);
      setError(null);
      return;
    }
    const t = setTimeout(() => fetchMeta(query), 700);
    return () => clearTimeout(t);
  }, [query]);

  async function fetchMeta(title) {
    setLoading(true);
    setError(null);
    setMeta(null);
    try {
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
          CoverURL: data.coverurl || "",
          Trama: data.trama || "",
          VolumiTotali: data.volumitotali || "",
          Genere: data.genere || ""
        };
        setMeta(normalized);
        setForm(prev => ({
          ...prev,
          Titolo: normalized.Titolo,
          CoverURL: normalized.CoverURL,
          Trama: normalized.Trama,
          VolumiTotali: normalized.VolumiTotali,
          Genere: normalized.Genere
        }));
      }
    } catch (err) {
      setError("Errore durante la ricerca");
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  const handleFile = (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, CoverURL: reader.result }));
    reader.readAsDataURL(f);
  };

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.Titolo || form.Titolo.trim() === "") return;
    setSaving(true);
    const payload = {
      titolo: form.Titolo,
      autori: form.Autore || null,
      coverurl: form.CoverURL || null,
      trama: form.Trama || null,
      generi: form.Genere || null,
      volumitotali: form.VolumiTotali ? Number(form.VolumiTotali) : null,
      dovecomprare: ""
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/wishlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Errore salvataggio");
      try {
        const existing = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
        localStorage.setItem("mv_wishlist_custom", JSON.stringify([data.item, ...existing]));
      } catch {}
      setSaving(false);
      if (typeof onSaved === "function") onSaved(data.item);
      onClose();
    } catch (err) {
      console.error("Wishlist save error:", err);
      const fallbackItem = {
        id: `c_${Date.now()}`,
        titolo: payload.titolo,
        autori: payload.autori,
        coverurl: payload.coverurl,
        trama: payload.trama,
        generi: payload.generi,
        volumitotali: payload.volumitotali,
        created_at: new Date().toISOString()
      };
      try {
        const existing = JSON.parse(localStorage.getItem("mv_wishlist_custom") || "[]");
        localStorage.setItem("mv_wishlist_custom", JSON.stringify([fallbackItem, ...existing]));
      } catch {}
      setSaving(false);
      if (typeof onSaved === "function") onSaved(fallbackItem);
      onClose();
    }
  };

  // style using CSS variables so the panel color matches app.css
  const panelStyle = {
    backgroundColor: "var(--panel-bg, rgba(255,255,255,0.06))",
    borderColor: "var(--border, rgba(255,255,255,0.08))"
  };

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.92), rgba(30,30,30,0.92))`,
          opacity: 0.92
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
        className="relative max-w-5xl mx-auto mt-16 mb-16 p-6 rounded-3xl shadow-2xl border backdrop-blur-md"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex gap-8">
          <div className="flex-shrink-0 w-[260px] relative">
            <div className="absolute -left-6 top-6 w-3 h-[380px] rounded-r-lg bg-gradient-to-b from-black/0 to-white/6 pointer-events-none" />
            <div className="rounded-xl overflow-hidden shadow-2xl transform-gpu transition-transform duration-300">
              <div className="bg-black relative">
                <img
                  src={form.CoverURL || meta?.CoverURL || "https://placehold.co/300x450"}
                  className="w-full h-[380px] object-contain block"
                  alt={form.Titolo || query || "Copertina"}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="cover-shine" />
                </div>
              </div>

              <div className="bg-white/6 backdrop-blur-md text-white p-3">
                <div className="text-sm font-semibold truncate" title={form.Titolo}>{form.Titolo || "Titolo"}</div>
                <div className="text-xs text-zinc-300 truncate" title={form.Autore}>{form.Autore || "Autore"}</div>
                <div className="mt-3 text-xs text-zinc-300">
                  {form.VolumiTotali ? `${form.VolumiTotali} volumi` : "Volumi: ?"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight">Aggiungi alla Wishlist</h1>
                <div className="text-sm text-zinc-300 mt-1">Inserisci il titolo e correggi i dati se necessario</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-white/8 rounded hover:bg-white/12" onClick={() => { setQuery(""); setMeta(null); setForm({ Titolo: "", Autore: "", CoverURL: "", Trama: "", Genere: "", VolumiTotali: "" }); }}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-zinc-400">Titolo</label>
                  <input value={form.Titolo} onChange={(e)=>handleChange("Titolo", e.target.value)} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Autore</label>
                  <input value={form.Autore} onChange={(e)=>handleChange("Autore", e.target.value)} placeholder="Inserisci autore (se necessario)" className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Volumi totali</label>
                  <input value={form.VolumiTotali} onChange={(e)=>handleChange("VolumiTotali", e.target.value)} type="number" className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Genere</label>
                  <input value={form.Genere} onChange={(e)=>handleChange("Genere", e.target.value)} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400">Trama</label>
                <textarea value={form.Trama} onChange={(e)=>handleChange("Trama", e.target.value)} rows={3} className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Cover (URL o upload)</label>
                <input value={form.CoverURL} onChange={(e)=>handleChange("CoverURL", e.target.value)} placeholder="https://..." className="w-full mt-2 p-2 rounded bg-[#070708] text-white text-sm border border-white/4" />
                <div className="mt-2 flex items-center gap-3">
                  <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="text-xs text-zinc-400" />
                  {form.CoverURL && <img src={form.CoverURL} alt="preview cover" className="w-20 h-28 rounded-md object-cover shadow-sm" />}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button onClick={handleSave} disabled={saving} className="px-4 py-3 rounded bg-yellow-400 text-black font-semibold hover:brightness-95">
                  {saving ? "Salvo…" : "Aggiungi alla wishlist"}
                </button>
                <button onClick={() => { setForm({ Titolo: "", Autore: "", CoverURL: "", Trama: "", Genere: "", VolumiTotali: "" }); setQuery(""); }} className="px-4 py-3 rounded bg-white/5 hover:bg-white/6">
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
