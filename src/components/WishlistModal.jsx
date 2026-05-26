import { useEffect, useMemo, useState, useRef } from "react";

const LS = {
  WISHLIST: "mv_wishlist",
  WISHLIST_CUSTOM: "mv_wishlist_custom",
};

function safeParse(v, fallback = []) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function uid() {
  return `c_${Date.now()}_${Math.floor(Math.random()*10000)}`;
}

export default function WishlistModal({ onClose }) {
  const [wishlist, setWishlist] = useState([]);
  const [mangaList, setMangaList] = useState([]);
  const [custom, setCustom] = useState([]);
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
    localStorage.setItem(LS.WISHLIST_CUSTOM, JSON.stringify(custom));
  }, [custom]);

  const wishManga = useMemo(() => {
    return mangaList.filter(m => wishlist.includes(m.ID));
  }, [mangaList, wishlist]);

  const combined = useMemo(() => {
    // custom items first, then site manga
    return [...custom, ...wishManga];
  }, [custom, wishManga]);

  const handleFormChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const addCustom = (e) => {
    e.preventDefault();
    if (!form.Titolo.trim()) return;
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

  const removeCustom = (id) => {
    setCustom(prev => prev.filter(c => c.ID !== id));
  };

  const editCustom = (id, patch) => {
    setCustom(prev => prev.map(c => c.ID === id ? { ...c, ...patch } : c));
  };

  const fetchAvgPrice = async (item) => {
    // item can be custom or site manga; use title + author as query
    const key = item.ID;
    setLoadingPriceId(key);
    try {
      const q = encodeURIComponent(`${item.Titolo} ${item.Autore || ""}`);
      // backend endpoint: /api/marketplace/avg-price?query=...&market=ebay
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/marketplace/avg-price?query=${q}&market=ebay`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      // expected shape: { median: number, mean: number, samples: number, timeframe: "3m" }
      setPriceCache(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      setPriceCache(prev => ({ ...prev, [key]: { error: true } }));
    } finally {
      setLoadingPriceId(null);
    }
  };

  const uploadCover = async (file) => {
    // semplice preview: convert to data URL (client-side). For production, upload to server or CDN.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-[min(96vw,720px)] bg-[#0f0f10] p-4 rounded-xl border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Wishlist</h3>
          <button onClick={onClose} className="text-sm text-zinc-400">Chiudi</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lista wishlist */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Elementi in wishlist</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {combined.length === 0 && <div className="text-zinc-500">Wishlist vuota</div>}
              {combined.map(item => (
                <div key={item.ID} className="flex items-start gap-3 p-2 rounded-md bg-white/5">
                  <img src={item.CoverURL || "https://placehold.co/60x90"} alt={`Copertina ${item.Titolo}`} loading="lazy" className="w-10 h-14 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold truncate text-white">{item.Titolo}</div>
                        {item.Autore && <div className="text-xs text-zinc-500">{item.Autore}</div>}
                        {item._custom && <div className="text-xs text-zinc-400 mt-1">Aggiunto manualmente</div>}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* prezzo desiderato */}
                        {item.PrezzoDesiderato != null && <div className="text-sm text-yellow-300">€{Number(item.PrezzoDesiderato).toFixed(2)}</div>}
                        <div className="flex gap-1">
                          {/* fetch prezzo medio */}
                          <button
                            onClick={() => fetchAvgPrice(item)}
                            className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/6"
                            title="Controlla prezzo medio venduto"
                          >
                            {loadingPriceId === item.ID ? "..." : "Prezzo medio"}
                          </button>
                          {item._custom && <button onClick={() => removeCustom(item.ID)} className="text-xs px-2 py-1 rounded bg-red-600/20">Elimina</button>}
                        </div>
                      </div>
                    </div>

                    {/* risultato prezzo */}
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

          {/* Form per aggiungere custom */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Aggiungi manga non presente</p>
            <form onSubmit={addCustom} className="space-y-2">
              <div>
                <label className="text-xs text-zinc-400">Titolo</label>
                <input value={form.Titolo} onChange={(e)=>handleFormChange("Titolo", e.target.value)} className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm" required />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Autore</label>
                <input value={form.Autore} onChange={(e)=>handleFormChange("Autore", e.target.value)} className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm" />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Cover (URL o upload)</label>
                <input value={form.CoverURL} onChange={(e)=>handleFormChange("CoverURL", e.target.value)} placeholder="https://..." className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm" />
                <input ref={fileInputRef} onChange={handleFile} type="file" accept="image/*" className="mt-2 text-xs text-zinc-400" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-zinc-400">Prezzo desiderato (€)</label>
                  <input value={form.PrezzoDesiderato} onChange={(e)=>handleFormChange("PrezzoDesiderato", e.target.value)} type="number" step="0.01" className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm" />
                </div>
                <div className="w-36">
                  <label className="text-xs text-zinc-400">Condizione</label>
                  <select value={form.Condizione} onChange={(e)=>handleFormChange("Condizione", e.target.value)} className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm">
                    <option value="new">Nuovo</option>
                    <option value="used">Usato</option>
                    <option value="any">Indifferente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400">Dove comprarlo (link / store)</label>
                <input value={form.DoveComprare} onChange={(e)=>handleFormChange("DoveComprare", e.target.value)} placeholder="es. eBay, Vinted, negozio locale" className="w-full mt-1 p-2 rounded bg-[#0b0b0c] text-white text-sm" />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded bg-yellow-500 text-black font-semibold">Aggiungi</button>
                <button type="button" onClick={() => setForm({ Titolo: "", Autore: "", CoverURL: "", PrezzoDesiderato: "", Condizione: "new", DoveComprare: "" })} className="py-2 px-3 rounded bg-white/5">Reset</button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
