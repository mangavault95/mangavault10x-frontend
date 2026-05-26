import { useEffect, useMemo, useState, useRef } from "react";

const LS = {
  WISHLIST: "mv_wishlist",
  WISHLIST_CUSTOM: "mv_wishlist_custom",
};

function safeParse(v, fallback = []) {
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : fallback; } catch { return fallback; }
}
function uid() {
  return `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;
}

export default function WishlistModal({ onClose }) {
  const [wishlist, setWishlist] = useState(() => {
    if (typeof window === "undefined") return [];
    return safeParse(localStorage.getItem(LS.WISHLIST), []);
  });
  const [mangaList, setMangaList] = useState([]);
  const [custom, setCustom] = useState(() => safeParse(localStorage.getItem(LS.WISHLIST_CUSTOM), []));
  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    PrezzoDesiderato: "",
    Condizione: "new",
    DoveComprare: "",
  });
  const [loadingPriceId, setLoadingPriceId] = useState(null);
  const [priceCache, setPriceCache] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    setWishlist(safeParse(localStorage.getItem(LS.WISHLIST), []));
    setCustom(safeParse(localStorage.getItem(LS.WISHLIST_CUSTOM), []));
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then(r => r.json())
      .then(d => setMangaList(Array.isArray(d) ? d : []))
      .catch(() => setMangaList([]));
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS.WISHLIST_CUSTOM, JSON.stringify(custom)); } catch {}
  }, [custom]);

  const wishlistSet = useMemo(() => new Set((Array.isArray(wishlist) ? wishlist : []).map(String)), [wishlist]);

  const wishManga = useMemo(() => {
    if (!Array.isArray(mangaList)) return [];
    return mangaList.filter(m => wishlistSet.has(String(m.ID)));
  }, [mangaList, wishlistSet]);

  const combined = useMemo(() => {
    return [...custom, ...wishManga];
  }, [custom, wishManga]);

  const handleFormChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addCustom = (e) => {
    e.preventDefault();
    if (!form.Titolo?.trim()) return;
    const item = {
      ID: uid(),
      ...form,
      PrezzoDesiderato: form.PrezzoDesiderato ? Number(form.PrezzoDesiderato) : null,
      createdAt: new Date().toISOString(),
      _custom: true,
    };
    setCustom(prev => [item, ...prev]);
    setForm({ Titolo: "", Autore: "", CoverURL: "", PrezzoDesiderato: "", Condizione: "new", DoveComprare: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeCustom = (id) => setCustom(prev => prev.filter(c => c.ID !== id));
  const editCustom = (id, patch) => setCustom(prev => prev.map(c => c.ID === id ? { ...c, ...patch } : c));

  const fetchAvgPrice = async (item) => {
    const key = item.ID;
    setLoadingPriceId(key);
    try {
      const q = encodeURIComponent(`${item.Titolo} ${item.Autore || ""}`);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marketplace/avg-price?query=${q}&market=ebay`);
      const data = await res.json();
      setPriceCache(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      setPriceCache(prev => ({ ...prev, [key]: { error: true } }));
    } finally {
      setLoadingPriceId(null);
    }
  };

  const uploadCover = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await uploadCover(f);
    handleFormChange("CoverURL", dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-[min(96vw,980px)] bg-gradient-to-b from-[#0b0b0f] to-[#0f0f12] rounded-2xl border border-white/6 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="text-xl font-extrabold tracking-tight">Wishlist</div>
            <div className="text-xs text-zinc-400">Gestisci i tuoi desideri</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white">Chiudi</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* LEFT: lista wishlist (stile MangaDetail list) */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Elementi in wishlist</p>
            <div className="space-y-3 max-h-[56vh] overflow-y-auto pr-2">
              {combined.length === 0 && (
                <div className="rounded-xl p-6 bg-gradient-to-br from-[#0f0f10] to-[#0b0b0c] border border-white/4 text-zinc-500">
                  Wishlist vuota
                </div>
              )}

              {combined.map(item => (
                <div key={item.ID} className="flex gap-4 p-3 rounded-xl bg-gradient-to-r from-[#0f0f10] to-[#121212] border border-white/4 items-start">
                  <img src={item.CoverURL || "https://placehold.co/80x120"} alt={`Copertina ${item.Titolo}`} loading="lazy" className="w-16 h-24 rounded-md object-cover flex-shrink-0 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{item.Titolo}</div>
                        {item.Autore && <div className="text-xs text-zinc-400 truncate">{item.Autore}</div>}
                        {item._custom && <div className="text-[11px] text-yellow-300 mt-1">Aggiunto manualmente</div>}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {item.PrezzoDesiderato != null && <div className="text-sm text-yellow-300 font-semibold">€{Number(item.PrezzoDesiderato).toFixed(2)}</div>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchAvgPrice(item)}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/6"
                            aria-label={`Controlla prezzo medio per ${item.Titolo}`}
                          >
                            {loadingPriceId === item.ID ? "..." : "Prezzo medio"}
                          </button>
                          {item._custom && (
                            <button onClick={() => removeCustom(item.ID)} className="text-xs px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30">Elimina</button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      {priceCache[item.ID] ? (
                        priceCache[item.ID].error ? (
                          <div className="text-xs text-red-400">Impossibile recuperare prezzi</div>
                        ) : (
                          <div className="text-xs text-zinc-400">
                            Prezzo medio (ultimi {priceCache[item.ID].timeframe || "3m"}): <span className="text-white">€{Number(priceCache[item.ID].median).toFixed(2)}</span>
                            <div className="text-[11px] text-zinc-500">Campioni: {priceCache[item.ID].samples || 0}</div>
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: form aggiungi (stile MangaDetail panel) */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-3">Aggiungi manga non presente</p>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-[#0f0f10] to-[#0b0b0c] border border-white/6">
              <form onSubmit={addCustom} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400">Titolo</label>
                  <input value={form.Titolo} onChange={(e)=>handleFormChange("Titolo", e.target.value)} className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4" required />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Autore</label>
                  <input value={form.Autore} onChange={(e)=>handleFormChange("Autore", e.target.value)} className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Cover (URL o upload)</label>
                  <input value={form.CoverURL} onChange={(e)=>handleFormChange("CoverURL", e.target.value)} placeholder="https://..." className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4" />
                  <div className="mt-2 flex items-center gap-3">
                    <input ref={fileInputRef} onChange={handleFile} type="file" accept="image/*" className="text-xs text-zinc-400" />
                    {form.CoverURL && <img src={form.CoverURL} alt="preview cover" className="w-16 h-24 rounded-md object-cover shadow-sm" />}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-400">Prezzo desiderato (€)</label>
                    <input value={form.PrezzoDesiderato} onChange={(e)=>handleFormChange("PrezzoDesiderato", e.target.value)} type="number" step="0.01" className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4" />
                  </div>
                  <div className="w-36">
                    <label className="text-xs text-zinc-400">Condizione</label>
                    <select value={form.Condizione} onChange={(e)=>handleFormChange("Condizione", e.target.value)} className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4">
                      <option value="new">Nuovo</option>
                      <option value="used">Usato</option>
                      <option value="any">Indifferente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Dove comprarlo (link / store)</label>
                  <input value={form.DoveComprare} onChange={(e)=>handleFormChange("DoveComprare", e.target.value)} placeholder="es. eBay, Vinted, negozio locale" className="w-full mt-2 p-3 rounded bg-[#070708] text-white text-sm border border-white/4" />
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="submit" className="flex-1 py-3 rounded bg-yellow-400 text-black font-semibold hover:brightness-95">Aggiungi</button>
                  <button type="button" onClick={() => setForm({ Titolo: "", Autore: "", CoverURL: "", PrezzoDesiderato: "", Condizione: "new", DoveComprare: "" })} className="py-3 px-4 rounded bg-white/5 hover:bg-white/6">Reset</button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
