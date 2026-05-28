import { useEffect, useMemo, useState } from "react";
import MobilePanel from "./MobilePanel";

/* -------------------- ICONS -------------------- */

function PlusIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* -------------------- HELPERS -------------------- */

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function bestTitle(media) {
  return (
    media?.title?.romaji ||
    media?.title?.english ||
    media?.title?.native ||
    "Senza titolo"
  );
}

function bestAuthor(media) {
  const edges = media?.staff?.edges || [];

  const preferred = edges.find((edge) => {
    const role = String(edge?.role || "").toLowerCase();

    return (
      role.includes("story") ||
      role.includes("art") ||
      role.includes("creator") ||
      role.includes("original creator")
    );
  });

  return (
    preferred?.node?.name?.full ||
    edges?.[0]?.node?.name?.full ||
    "Autore sconosciuto"
  );
}

function mapWishlistItem(item) {
  return {
    ID: item.id,
    Titolo: item.titolo || "Senza titolo",
    Autore: item.autori || "Autore sconosciuto",
    CoverURL: item.coverurl || "",
    Trama: item.trama || "",
    Genere: item.generi || "",
    VolumiTotali: item.volumitotali ?? null,
    DoveComprare: item.dovecomprare || "",
    Valutazione: 0,
    VolumiPosseduti: 0,
    Costo: 0,
    Editore: ""
  };
}

/* -------------------- COMPONENT -------------------- */

export default function MobileWishlistPanel({ onClose }) {
  const API = import.meta.env.VITE_API_URL;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [anilistQuery, setAnilistQuery] = useState("");
  const [anilistResults, setAnilistResults] = useState([]);
  const [anilistLoading, setAnilistLoading] = useState(false);
  const [anilistError, setAnilistError] = useState("");

  const [form, setForm] = useState({
    titolo: "",
    autori: "",
    coverurl: "",
    trama: "",
    generi: "",
    volumitotali: "",
    dovecomprare: ""
  });

  async function loadWishlist() {
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/wishlist/all`);
      const data = await res.json();

      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento wishlist mobile:", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  const normalizedList = useMemo(() => {
    return list.map(mapWishlistItem);
  }, [list]);

  function openDetail(item) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: mapWishlistItem(item)
      })
    );
  }

  async function removeItem(id) {
    if (!id) return;

    setBusyId(id);

    try {
      await fetch(`${API}/api/wishlist/${id}`, {
        method: "DELETE"
      });

      await loadWishlist();
    } catch (err) {
      console.error("Errore rimozione wishlist:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function purchaseItem(id) {
    if (!id) return;

    setBusyId(id);

    try {
      await fetch(`${API}/api/wishlist-actions/purchase/${id}`, {
        method: "POST"
      });

      await loadWishlist();

      window.dispatchEvent(new Event("favoritesUpdated"));
      window.dispatchEvent(new Event("currentReadingUpdated"));
    } catch (err) {
      console.error("Errore spostamento wishlist in collezione:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function searchAniList(queryValue) {
    const q = queryValue.trim();

    if (q.length < 2) {
      setAnilistResults([]);
      setAnilistError("");
      setAnilistLoading(false);
      return;
    }

    setAnilistLoading(true);
    setAnilistError("");

    try {
      const query = `
        query ($search: String) {
          Page(page: 1, perPage: 8) {
            media(search: $search, type: MANGA) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                extraLarge
              }
              description(asHtml: false)
              genres
              volumes
              staff(perPage: 10) {
                edges {
                  role
                  node {
                    name {
                      full
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          query,
          variables: {
            search: q
          }
        })
      });

      const data = await res.json();
      const results = data?.data?.Page?.media || [];

      setAnilistResults(results);
    } catch (err) {
      console.error("Errore ricerca AniList:", err);
      setAnilistError("Errore durante la ricerca AniList.");
      setAnilistResults([]);
    } finally {
      setAnilistLoading(false);
    }
  }

  useEffect(() => {
    if (!addOpen) return;

    const timer = setTimeout(() => {
      searchAniList(anilistQuery);
    }, 450);

    return () => clearTimeout(timer);
  }, [anilistQuery, addOpen]);

  function selectAniList(media) {
    const title = bestTitle(media);
    const author = bestAuthor(media);
    const genres = Array.isArray(media?.genres)
      ? media.genres.join(", ")
      : "";

    setForm({
      titolo: title,
      autori: author,
      coverurl:
        media?.coverImage?.extraLarge ||
        media?.coverImage?.large ||
        "",
      trama: stripHtml(media?.description || ""),
      generi: genres,
      volumitotali:
        media?.volumes !== null && media?.volumes !== undefined
          ? String(media.volumes)
          : "",
      dovecomprare: ""
    });

    // ✅ Dopo il click sull'anteprima, la lista risultati sparisce.
    setAnilistQuery(title);
    setAnilistResults([]);
    setAnilistError("");
    setAnilistLoading(false);
  }

  async function saveNewWishlistItem() {
    const titolo = form.titolo.trim();

    if (!titolo) return;

    setBusyId("new");

    try {
      await fetch(`${API}/api/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          titolo: form.titolo.trim(),
          autori: form.autori.trim(),
          coverurl: form.coverurl.trim(),
          trama: form.trama.trim(),
          generi: form.generi.trim(),
          volumitotali: form.volumitotali
            ? Number(form.volumitotali)
            : null,
          dovecomprare: form.dovecomprare.trim()
        })
      });

      setForm({
        titolo: "",
        autori: "",
        coverurl: "",
        trama: "",
        generi: "",
        volumitotali: "",
        dovecomprare: ""
      });

      setAnilistQuery("");
      setAnilistResults([]);
      setAnilistError("");
      setAnilistLoading(false);
      setAddOpen(false);

      await loadWishlist();
    } catch (err) {
      console.error("Errore salvataggio wishlist:", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <MobilePanel title="Wishlist" onClose={onClose}>
      {/* TOP ACTION */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="
          w-full mb-4
          flex items-center justify-center gap-2
          px-4 py-3
          rounded-2xl
          bg-yellow-400 text-black
          text-sm font-semibold
          active:scale-[0.98]
          transition
        "
      >
        <PlusIcon />
        Aggiungi manga
      </button>

      {/* LOADING */}
      {loading && (
        <div className="text-center text-zinc-400 py-10">
          Caricamento wishlist...
        </div>
      )}

      {/* EMPTY */}
      {!loading && list.length === 0 && (
        <div className="text-center text-zinc-400 py-10">
          Nessun manga in wishlist
        </div>
      )}

      {/* LIST */}
      {!loading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((item, index) => {
            const manga = normalizedList[index];
            const disabled = busyId === item.id;

            return (
              <div
                key={item.id}
                className="
                  bg-white/[0.05]
                  border border-white/10
                  rounded-2xl
                  p-3
                "
              >
                <button
                  type="button"
                  onClick={() => openDetail(item)}
                  className="
                    w-full flex gap-3 text-left
                    active:scale-[0.99]
                    transition
                  "
                >
                  <div className="w-14 h-20 shrink-0 rounded-xl overflow-hidden bg-black/25 border border-white/10">
                    {manga.CoverURL ? (
                      <img
                        src={manga.CoverURL}
                        alt={manga.Titolo || "Cover manga"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                        No img
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white line-clamp-2">
                      {manga.Titolo}
                    </div>

                    <div className="text-xs text-zinc-400 truncate mt-1">
                      {manga.Autore}
                    </div>

                    {manga.Genere && (
                      <div className="text-[10px] text-zinc-500 truncate mt-1">
                        {manga.Genere}
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-zinc-500">
                      Volumi: {manga.VolumiTotali || "?"}
                    </div>
                  </div>
                </button>

                {/* MINIMAL ACTIONS */}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => purchaseItem(item.id)}
                    className="
                      w-9 h-9 rounded-xl
                      bg-yellow-400/15
                      border border-yellow-400/25
                      text-yellow-300
                      flex items-center justify-center
                      disabled:opacity-50
                      active:scale-95
                      transition
                    "
                    title="Aggiungi alla collezione"
                  >
                    {disabled ? (
                      <span className="text-[10px]">...</span>
                    ) : (
                      <CheckIcon />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeItem(item.id)}
                    className="
                      w-9 h-9 rounded-xl
                      bg-red-400/10
                      border border-red-400/20
                      text-red-300
                      flex items-center justify-center
                      disabled:opacity-50
                      active:scale-95
                      transition
                    "
                    title="Rimuovi dalla wishlist"
                  >
                    {disabled ? (
                      <span className="text-[10px]">...</span>
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD SHEET */}
      {addOpen && (
        <div
          className="fixed inset-0 z-[6000] bg-black/70 backdrop-blur-sm flex items-end"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="
              w-full h-[100dvh]
              bg-[#0b0b0f]
              border-t border-white/10
              overflow-hidden
              flex flex-col
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* SHEET HEADER */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0b0f]">
              <div>
                <div className="text-base font-bold text-white">
                  Aggiungi alla wishlist
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Cerca su AniList e completa i campi.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="
                  w-10 h-10 rounded-xl
                  bg-white/[0.06]
                  border border-white/10
                  flex items-center justify-center
                  text-zinc-300
                "
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* SEARCH */}
              <div>
                <label className="block text-xs text-zinc-400 mb-2">
                  Cerca manga
                </label>

                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
                  <SearchIcon className="w-4 h-4 text-zinc-400" />

                  <input
                    value={anilistQuery}
                    onChange={(e) => setAnilistQuery(e.target.value)}
                    placeholder="Es. Cross Game, Happy, Katsu..."
                    className="
                      flex-1 bg-transparent outline-none
                      text-[16px] text-white placeholder:text-zinc-500
                    "
                  />
                </div>
              </div>

              {/* RESULTS */}
              {(anilistLoading || anilistError || anilistResults.length > 0) && (
                <div className="space-y-2">
                  {anilistLoading && (
                    <div className="text-xs text-zinc-500">
                      Ricerca in corso...
                    </div>
                  )}

                  {anilistError && (
                    <div className="text-xs text-red-300">
                      {anilistError}
                    </div>
                  )}

                  {anilistResults.map((media) => {
                    const title = bestTitle(media);
                    const author = bestAuthor(media);
                    const cover =
                      media?.coverImage?.large ||
                      media?.coverImage?.extraLarge ||
                      "";

                    return (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => selectAniList(media)}
                        className="
                          w-full flex gap-3 text-left
                          bg-white/[0.045]
                          border border-white/10
                          rounded-2xl p-3
                          active:scale-[0.99]
                          transition
                        "
                      >
                        <div className="w-12 h-16 rounded-xl overflow-hidden bg-black/25 shrink-0">
                          {cover ? (
                            <img
                              src={cover}
                              alt={title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                              No img
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white line-clamp-2">
                            {title}
                          </div>
                          <div className="text-xs text-zinc-400 truncate mt-1">
                            {author}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Volumi: {media?.volumes || "?"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* FORM */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Titolo
                  </label>
                  <input
                    value={form.titolo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, titolo: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Autori
                  </label>
                  <input
                    value={form.autori}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, autori: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Cover URL
                  </label>
                  <input
                    value={form.coverurl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, coverurl: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Volumi
                    </label>
                    <input
                      type="number"
                      value={form.volumitotali}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          volumitotali: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Dove comprare
                    </label>
                    <input
                      value={form.dovecomprare}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dovecomprare: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Generi
                  </label>
                  <input
                    value={form.generi}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, generi: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Trama
                  </label>
                  <textarea
                    value={form.trama}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trama: e.target.value }))
                    }
                    rows={5}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 outline-none text-[16px] text-white resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveNewWishlistItem}
                  disabled={busyId === "new" || !form.titolo.trim()}
                  className="
                    w-full py-3 rounded-2xl
                    bg-yellow-400 text-black
                    text-sm font-semibold
                    disabled:opacity-50
                    active:scale-[0.98]
                    transition
                  "
                >
                  {busyId === "new" ? "Salvataggio..." : "Salva in wishlist"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobilePanel>
  );
}
