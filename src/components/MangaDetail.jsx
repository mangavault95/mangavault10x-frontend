import { useEffect, useState, useRef } from "react";

/**
 * src/components/MangaDetail.jsx
 *
 * Gestisce:
 * - visualizzazione dettaglio manga
 * - rating (debounce -> POST /api/manga/updateRating)
 * - edit modal + drag&drop cover
 * - salvataggio con PUT /api/manga/:id (autenticato)
 * - gestione 401/403: apre modal login, salva token e ritenta
 * - fallback locale via onSave(payload)
 *
 * Sostituisci interamente il file esistente con questo.
 */

export default function MangaDetail({ manga, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [toast, setToast] = useState({ show: false, text: "", tone: "success" });
  const debounceRef = useRef(null);

  const [local, setLocal] = useState({
    Titolo: manga.Titolo || "",
    Autore: manga.Autore || "",
    Trama: manga.Trama || manga.Descrizione || "",
    Genere: manga.Genere || "",
    VolumiPosseduti: Number(manga.VolumiPosseduti) || 0,
    VolumiTotali: manga.VolumiTotali ? Number(manga.VolumiTotali) : null,
    CoverURL: manga.CoverURL || "",
    Costo: manga.Costo ? Number(manga.Costo) : 0,
    Editore: manga.Editore || ""
  });

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Login modal state (per gestire 401/403)
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Se abbiamo un'azione pendente da ritentare (es. save), la memorizziamo qui
  const pendingActionRef = useRef(null);

  function updateField(key, value) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  const owned = Number(local.VolumiPosseduti) || 0;
  const total = Number(local.VolumiTotali) || 0;
  const price = Number(local.Costo) || 0;

  const isCompleted =
    (!!total && total > 0 && owned === total) || manga.Concluso === 1;

  const isOngoing =
    !isCompleted &&
    (!total || total === 0 || manga.VolumiTotali === "?" || manga.Concluso === 0);

  const totalCost = price && owned ? (owned * price).toFixed(2) : "N/A";

  const percent = isCompleted
    ? 100
    : isOngoing
    ? 50
    : total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  // ---------- RATING (debounce + POST updateRating) ----------
  async function handleRating(stars) {
    setRating(stars);
    manga.Valutazione = stars;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          "https://mangavault10x-api.onrender.com/api/manga/updateRating",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`
            },
            body: JSON.stringify({
              id: manga.ID,
              rating: stars
            })
          }
        );

        await res.json().catch(() => ({}));
        setToast({ show: true, text: "⭐ Valutazione salvata!", tone: "success" });
        setTimeout(() => setToast({ show: false, text: "", tone: "success" }), 1800);
      } catch (err) {
        console.error("Errore aggiornamento rating:", err);
        setToast({ show: true, text: "Errore salvataggio valutazione", tone: "error" });
        setTimeout(() => setToast({ show: false, text: "", tone: "success" }), 2200);
      }
    }, 500);
  }

  // ---------- COVER UPLOAD PREVIEW ----------
  function handleCoverFile(file) {
    if (!file) return;
    setUploading(true);
    const url = URL.createObjectURL(file);
    updateField("CoverURL", url);
    setTimeout(() => setUploading(false), 700);
  }

  function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    handleCoverFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    handleCoverFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  // ---------- LOGIN (POST /api/manga/login) ----------
  async function doLoginAndRetry() {
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("https://mangavault10x-api.onrender.com/api/manga/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoginError(data?.error || `Login failed (${res.status})`);
        setLoginLoading(false);
        return;
      }

      const token = data?.token;
      if (!token) {
        setLoginError("Token non ricevuto");
        setLoginLoading(false);
        return;
      }

      // salva token e chiudi modal
      localStorage.setItem("token", token);
      setLoginLoading(false);
      setLoginOpen(false);
      setLoginUser("");
      setLoginPass("");
      setLoginError("");

      // se c'era un'azione pendente, ritentala
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        try { await action(); } catch (e) { /* handled in action */ }
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Errore di rete durante il login");
      setLoginLoading(false);
    }
  }

  // ---------- SAVE CHANGES (PUT /api/manga/:id) ----------
  async function saveChanges() {
    setSaving(true);

    const payloadForServer = {
      coverurl: local.CoverURL || null,
      trama: local.Trama || null,
      volumiposseduti: Number(local.VolumiPosseduti) || 0,
      volumitotali: local.VolumiTotali ? Number(local.VolumiTotali) : 0
    };

    const url = `https://mangavault10x-api.onrender.com/api/manga/${manga.ID}`;
    const token = localStorage.getItem("token");

    // funzione che esegue la richiesta (utile per ritentare dopo login)
    const doPut = async () => {
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payloadForServer)
        });

        const text = await res.text().catch(() => "");

        if (!res.ok) {
          console.error("Save error", res.status, text);

          // AUTH errors -> apri modal login e memorizza azione pendente
          if (res.status === 401 || res.status === 403) {
            setToast({ show: true, text: "Autenticazione richiesta o token non valido", tone: "error" });
            // memorizza l'azione e apri login modal
            pendingActionRef.current = doPut;
            setLoginOpen(true);
            setSaving(false);
            return;
          }

          if (res.status === 404) {
            setToast({ show: true, text: "Endpoint non trovato (404). Modifiche applicate localmente.", tone: "error" });
            if (onSave) onSave({ ...manga, ...local });
            setSaving(false);
            return;
          }

          setToast({ show: true, text: `Errore salvataggio: ${res.status}`, tone: "error" });
          setSaving(false);
          return;
        }

        // successo: aggiorna parent con shape completo
        if (onSave) {
          const updated = {
            ...manga,
            Titolo: local.Titolo,
            Autore: local.Autore,
            Trama: local.Trama,
            Genere: local.Genere,
            VolumiPosseduti: Number(local.VolumiPosseduti),
            VolumiTotali: local.VolumiTotali ? Number(local.VolumiTotali) : null,
            CoverURL: local.CoverURL,
            Costo: Number(local.Costo),
            Editore: local.Editore
          };
          onSave(updated);
        }

        setToast({ show: true, text: "Modifiche salvate", tone: "success" });
        setTimeout(() => setToast({ show: false, text: "", tone: "success" }), 1600);
        setEditing(false);
      } catch (err) {
        console.error("Errore salvataggio:", err);
        setToast({ show: true, text: "Errore di rete durante il salvataggio. Modifiche applicate localmente.", tone: "error" });
        if (onSave) onSave({ ...manga, ...local });
      } finally {
        setSaving(false);
      }
    };

    // esegui la PUT
    await doPut();
  }

  // ---------- Focus trap per modal di editing ----------
  const modalRef = useRef(null);
  useEffect(() => {
    if (!editing) return;
    const focusable = modalRef.current?.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    function handleKey(e) {
      if (e.key === "Escape") {
        setEditing(false);
      }
      if (e.key === "Tab") {
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    setTimeout(() => first?.focus?.(), 0);

    return () => document.removeEventListener("keydown", handleKey);
  }, [editing]);

  // ---------- RENDER ----------
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.96), rgba(30,30,30,0.96)), url(${local.CoverURL || manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.14
        }}
      />

      <div className="absolute inset-0 bg-black/64" />

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
        aria-label="Chiudi dettaglio"
      >
        ✕
      </button>

      {toast.show && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl text-lg font-semibold animate-fade-in-out z-9999 ${
            toast.tone === "success" ? "bg-green-500 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div
        className="relative max-w-6xl mx-auto mt-16 mb-16 p-8 rounded-3xl shadow-2xl border border-white/10 manga-detail-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex gap-8">
          <div className="flex-shrink-0">
            <div className="relative w-[260px]">
              <div className="rounded-xl overflow-hidden shadow-2xl transform-gpu transition-transform duration-300 hover:-translate-y-1">
                <div className="bg-black relative">
                  <img
                    src={local.CoverURL || manga.CoverURL || "https://placehold.co/300x450"}
                    className="w-full h-[380px] object-contain block"
                    alt={local.Titolo}
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="cover-shine" />
                  </div>
                </div>

                <div className="bg-white/6 backdrop-blur-md text-white p-3">
                  <div className="text-sm font-semibold truncate" title={local.Titolo}>{local.Titolo}</div>
                  <div className="text-xs text-zinc-300 truncate" title={local.Autore}>{local.Autore}</div>

                  <div className="mt-3 flex items-center gap-2">
                    {isCompleted ? (
                      <span className="inline-block px-2 py-0.5 text-xs bg-green-600 rounded-full">Completo</span>
                    ) : isOngoing ? (
                      <span className="inline-block px-2 py-0.5 text-xs bg-yellow-500 rounded-full">In corso</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs bg-zinc-600 rounded-full">—</span>
                    )}

                    <div className="text-xs text-zinc-300">⭐ {manga.Valutazione ?? "N/A"}</div>
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="absolute -top-2 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">Uploading</div>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white/8 backdrop-blur-md rounded-xl p-6 text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight">{local.Titolo}</h1>
                <div className="text-sm text-zinc-300 mt-1">{local.Autore}</div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 text-sm bg-white/8 rounded hover:bg-white/12"
                  onClick={() => setEditing(true)}
                >
                  Modifica
                </button>

                <button
                  className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700"
                  onClick={onClose}
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {String(local.Genere || "").split(",").filter(Boolean).slice(0,8).map((g, i) => (
                <span key={i} className="text-xs bg-white/8 px-2 py-1 rounded" title={g.trim()}>{g.trim()}</span>
              ))}
              {(!local.Genere || local.Genere === "") && <span className="text-xs text-zinc-400">Nessun genere</span>}
            </div>

            <div className="mt-4 text-sm text-zinc-200 leading-relaxed max-h-44 overflow-auto pr-2 custom-scrollbar">
              {local.Trama || <span className="text-zinc-400">Nessuna descrizione disponibile.</span>}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Volumi posseduti</div>
                <div className="text-2xl font-semibold">{owned}</div>
              </div>

              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Volumi totali</div>
                <div className="text-2xl font-semibold">{local.VolumiTotali ?? "—"}</div>
              </div>

              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Costo totale posseduto</div>
                <div className="text-2xl font-semibold">€ {totalCost}</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => {
                  const active = hoverRating ? i <= hoverRating : i <= rating;
                  return (
                    <span
                      key={i}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRating(i)}
                      className={`text-2xl cursor-pointer transition-transform ${active ? "text-yellow-400 glow-star" : "text-zinc-600"} hover:text-yellow-300 active:scale-125`}
                      aria-label={`Valuta ${i} stelle`}
                    >
                      ★
                    </span>
                  );
                })}
              </div>

              <div className="text-xs text-zinc-300 ml-3">Valuta questa serie</div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-zinc-300 mb-2">{owned}/{local.VolumiTotali ?? "?"} volumi</div>
              <div className="w-full bg-white/10 h-3 rounded overflow-hidden mb-2 border border-white/10">
                <div className={`${isCompleted ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-yellow-400 to-yellow-600"} h-full`} style={{ width: `${percent}%` }} />
              </div>

              <div className="flex gap-3">
                <button className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700" onClick={() => updateField("VolumiPosseduti", local.VolumiTotali || local.VolumiPosseduti)}>Segna come completato</button>
                <button className="px-3 py-2 bg-white/8 rounded hover:bg-white/12" onClick={saveChanges} disabled={saving}>
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EDIT MODAL */}
        {editing && (
          <div className="absolute inset-0 flex items-center justify-center z-60" role="dialog" aria-modal="true">
            <div ref={modalRef} className="bg-black/70 backdrop-blur-md p-6 rounded-lg w-[720px]">
              <h3 className="text-lg font-bold mb-3">Modifica dettagli</h3>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Titolo
                  <input value={local.Titolo} onChange={(e) => updateField("Titolo", e.target.value)} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <label className="text-sm">
                  Autore
                  <input value={local.Autore} onChange={(e) => updateField("Autore", e.target.value)} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <label className="text-sm col-span-2">
                  Generi (separa con virgola)
                  <input value={local.Genere} onChange={(e) => updateField("Genere", e.target.value)} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <label className="text-sm col-span-2">
                  Descrizione
                  <textarea value={local.Trama} onChange={(e) => updateField("Trama", e.target.value)} className="w-full mt-1 p-2 rounded bg-white/6 h-28 custom-scrollbar" />
                </label>

                <label className="text-sm">
                  Volumi posseduti
                  <input type="number" value={local.VolumiPosseduti} onChange={(e) => updateField("VolumiPosseduti", Number(e.target.value))} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <label className="text-sm">
                  Volumi totali
                  <input type="number" value={local.VolumiTotali ?? ""} onChange={(e) => updateField("VolumiTotali", e.target.value ? Number(e.target.value) : null)} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <label className="text-sm col-span-2">
                  Editore
                  <input value={local.Editore} onChange={(e) => updateField("Editore", e.target.value)} className="w-full mt-1 p-2 rounded bg-white/6" />
                </label>

                <div className="col-span-2">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-dashed border-2 border-white/10 rounded p-3 text-center"
                  >
                    <div className="text-sm text-zinc-300 mb-2">Trascina qui la nuova cover oppure</div>
                    <label className="inline-block px-3 py-2 bg-white/8 rounded cursor-pointer">
                      Seleziona file
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    <div className="mt-3 text-xs text-zinc-400">Preview: verrà mostrata nella scheda dopo il salvataggio</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="px-3 py-1 bg-white/6 rounded" onClick={() => setEditing(false)}>Annulla</button>
                <button className="px-3 py-1 bg-green-600 rounded" onClick={saveChanges} disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN MODAL (apre quando server risponde 401/403) */}
        {loginOpen && (
          <div className="absolute inset-0 flex items-center justify-center z-70" role="dialog" aria-modal="true">
            <div className="bg-black/80 backdrop-blur-md p-6 rounded-lg w-[420px]">
              <h3 className="text-lg font-bold mb-3">Login richiesto</h3>

              <div className="flex flex-col gap-2">
                <input placeholder="Username" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="p-2 rounded bg-white/6" />
                <input placeholder="Password" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="p-2 rounded bg-white/6" />
                {loginError && <div className="text-sm text-red-400">{loginError}</div>}
                <div className="flex justify-end gap-2 mt-3">
                  <button className="px-3 py-1 bg-white/6 rounded" onClick={() => setLoginOpen(false)}>Annulla</button>
                  <button className="px-3 py-1 bg-blue-600 rounded" onClick={doLoginAndRetry} disabled={loginLoading}>
                    {loginLoading ? "Login..." : "Accedi"}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-400">Usa le credenziali del backend (es. admin / 1234) per test.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
