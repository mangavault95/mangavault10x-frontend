import { useEffect, useState, useRef } from "react";

/**
 * MangaDetail migliorato
 * - solo "Modifica" apre l'editor (modal)
 * - drag & drop + file input per cover
 * - focus trap nella modal di editing
 * - rimosse azioni ridondanti sotto la cover
 * - mantiene rating + debounce + toast
 *
 * Props:
 * - manga: oggetto manga
 * - onClose: funzione per chiudere il dettaglio
 * - onSave: funzione(payload) per salvare (opzionale)
 */
export default function MangaDetail({ manga, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  // rating
  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const debounceRef = useRef(null);

  // local state per preview / editing
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

  function updateField(key, value) {
    setLocal(prev => ({ ...prev, [key]: value }));
  }

  // calcoli
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

  // rating debounce (mantengo la chiamata esistente)
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
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              id: manga.ID,
              rating: stars
            })
          }
        );

        await res.json().catch(() => ({}));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        console.error("Errore aggiornamento rating:", err);
      }
    }, 500);
  }

  // Upload cover: drag & drop + file input (preview con createObjectURL)
  function handleCoverFile(file) {
    if (!file) return;
    setUploading(true);
    const url = URL.createObjectURL(file);
    updateField("CoverURL", url);

    // placeholder: qui puoi aggiungere upload al server
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

  // Salvataggio: invoca onSave(payload) se fornita
  function saveChanges() {
    const payload = {
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

    if (onSave) onSave(payload);
    setEditing(false);
  }

  // Focus trap per la modal di editing
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
    // autofocus first
    setTimeout(() => first?.focus?.(), 0);

    return () => document.removeEventListener("keydown", handleKey);
  }, [editing]);

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto" onClick={onClose}>

      {/* backdrop pattern + overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(10,10,10,0.96), rgba(30,30,30,0.96)), url(${local.CoverURL || manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.16
        }}
      />

      <div className="absolute inset-0 bg-black/72" />

      {/* close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
        aria-label="Chiudi dettaglio"
      >
        ✕
      </button>

      {/* toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-xl text-lg font-semibold animate-fade-in-out z-9999">
          ⭐ Valutazione salvata!
        </div>
      )}

      {/* main card */}
      <div
        className="relative max-w-6xl mx-auto mt-16 mb-16 p-8 rounded-3xl shadow-2xl border border-white/10 bg-transparent"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex gap-8">

          {/* LEFT: cover (no più "Cambia cover" qui) */}
          <div className="flex-shrink-0">
            <div className="relative w-[260px]">
              <div className="rounded-xl overflow-hidden shadow-2xl transform-gpu transition-transform duration-300 hover:-translate-y-1">
                <div className="bg-black relative">
                  <img
                    src={local.CoverURL || manga.CoverURL || "https://placehold.co/300x450"}
                    className="w-full h-[380px] object-contain block"
                    alt={local.Titolo}
                  />

                  {/* shine */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="cover-shine" />
                  </div>
                </div>

                {/* sotto cover: pannello semitrasparente minimale (solo info essenziali) */}
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

          {/* RIGHT: pannello semitrasparente con dettagli */}
          <div className="flex-1 bg-white/6 backdrop-blur-md rounded-xl p-6 text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="text-3xl font-extrabold leading-tight">{local.Titolo}</h1>
                <div className="text-sm text-zinc-300 mt-1">{local.Autore}</div>
              </div>

              <div className="flex gap-2">
                {/* solo questo bottone apre l'editor */}
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

            {/* generi come chip */}
            <div className="mt-4 flex flex-wrap gap-2">
              {String(local.Genere || "").split(",").filter(Boolean).slice(0,8).map((g, i) => (
                <span key={i} className="text-xs bg-white/8 px-2 py-1 rounded" title={g.trim()}>{g.trim()}</span>
              ))}
              {(!local.Genere || local.Genere === "") && <span className="text-xs text-zinc-400">Nessun genere</span>}
            </div>

            {/* descrizione con scrollbar custom */}
            <div className="mt-4 text-sm text-zinc-200 leading-relaxed max-h-44 overflow-auto pr-2 custom-scrollbar">
              {local.Trama || <span className="text-zinc-400">Nessuna descrizione disponibile.</span>}
            </div>

            {/* metadati e volumi con controlli rapidi (minimizzati) */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Volumi posseduti</div>
                <div className="text-2xl font-semibold">{owned}</div>
                <div className="mt-2 flex gap-2">
                  <button className="px-2 py-1 bg-white/6 rounded" onClick={() => updateField("VolumiPosseduti", Math.max(0, owned - 1))}>-</button>
                  <button className="px-2 py-1 bg-white/6 rounded" onClick={() => updateField("VolumiPosseduti", owned + 1)}>+</button>
                </div>
              </div>

              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Volumi totali</div>
                <div className="text-2xl font-semibold">{local.VolumiTotali ?? "—"}</div>
                <div className="mt-2">
                  <input type="number" value={local.VolumiTotali ?? ""} onChange={(e) => updateField("VolumiTotali", e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-transparent border border-white/6 rounded px-2 py-1 text-sm" />
                </div>
              </div>

              <div className="bg-white/4 p-3 rounded">
                <div className="text-xs text-zinc-300">Costo totale posseduto</div>
                <div className="text-2xl font-semibold">€ {totalCost}</div>
                <div className="mt-2">
                  <input type="number" step="0.01" value={local.Costo ?? ""} onChange={(e) => updateField("Costo", Number(e.target.value))}
                    className="w-full bg-transparent border border-white/6 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            {/* rating */}
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

            {/* progress bar avanzata */}
            <div className="mt-4">
              <div className="text-xs text-zinc-300 mb-2">{owned}/{local.VolumiTotali ?? "?"} volumi</div>
              <div className="w-full bg-white/10 h-3 rounded overflow-hidden mb-2 border border-white/10">
                <div className={`${isCompleted ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-yellow-400 to-yellow-600"} h-full`} style={{ width: `${percent}%` }} />
              </div>

              <div className="flex gap-3">
                <button className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-700" onClick={() => updateField("VolumiPosseduti", local.VolumiTotali || local.VolumiPosseduti)}>Segna come completato</button>
                <button className="px-3 py-2 bg-white/8 rounded hover:bg-white/12" onClick={saveChanges}>Salva modifiche</button>
              </div>
            </div>
          </div>
        </div>

        {/* EDIT MODAL (apre solo con Modifica) */}
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

                {/* Drag & drop cover upload */}
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
                <button className="px-3 py-1 bg-green-600 rounded" onClick={saveChanges}>Salva</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
