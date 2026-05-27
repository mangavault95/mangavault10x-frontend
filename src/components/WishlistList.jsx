import { useEffect, useState } from "react";
import WishlistModal from "./WishlistModal";
import MangaDetail from "./MangaDetail";

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[15px] h-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[15px] h-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[15px] h-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function WishlistList({ onClose }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/wishlist/all`);
      const data = await res.json().catch(() => []);

      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore caricamento wishlist:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeItem(id) {
    try {
      await fetch(`${API_URL}/api/wishlist/${id}`, {
        method: "DELETE"
      });

      load();
    } catch (err) {
      console.error("Errore delete wishlist:", err);
    }
  }

  async function markAsOwned(id) {
    try {
      const res = await fetch(
        `${API_URL}/api/wishlist-actions/purchase/${id}`,
        {
          method: "POST"
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Errore acquisto wishlist:", data);
        return;
      }

      await load();

      window.dispatchEvent(new Event("favoritesUpdated"));
    } catch (err) {
      console.error("Errore acquisto wishlist:", err);
    }
  }

  function openDetail(m) {
    setSelected({
      ID: m.id,
      Titolo: m.titolo || "",
      Autore: m.autori || "",
      Trama: m.trama || "",
      Genere: m.generi || "",
      VolumiTotali: m.volumitotali || 0,
      VolumiPosseduti: 0,
      CoverURL: m.coverurl || "",
      Costo: 0,
      Editore: "",
      Valutazione: 0
    });
  }

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto"
      onClick={onClose}
    >
      {/* AMBIENT BACKGROUND */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 34%),
            radial-gradient(circle at bottom right, rgba(168,85,247,0.18), transparent 38%),
            linear-gradient(
              135deg,
              rgba(8,8,12,0.90),
              rgba(18,18,28,0.92)
            )
          `
        }}
      />

      {/* GLASS VEIL */}
      <div className="absolute inset-0 bg-black/52 backdrop-blur-[2px]" />

      <div className="min-h-screen flex items-center justify-center p-8">
        <div
          className="
            relative
            w-[1120px]
            max-w-[95vw]
            max-h-[84vh]

            rounded-[32px]
            overflow-hidden

            manga-detail-card

            border border-white/10

            shadow-[0_25px_80px_rgba(0,0,0,0.55)]

            before:absolute
            before:inset-0
            before:pointer-events-none
            before:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_35%)]

            after:absolute
            after:inset-0
            after:pointer-events-none
            after:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_40%)]

            backdrop-blur-xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Wishlist
              </h2>

              <p className="text-sm text-zinc-400 mt-1">
                I manga che vuoi recuperare, modificare o segnare come acquistati.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setOpenAdd(true)}
                className="
                  px-4 py-2 rounded-xl
                  bg-yellow-400 text-black font-semibold

                  hover:brightness-110
                  active:scale-95

                  transition-all duration-200

                  shadow-[0_0_18px_rgba(234,179,8,0.18)]
                  hover:shadow-[0_0_26px_rgba(234,179,8,0.35)]
                "
              >
                + Aggiungi
              </button>

              <button
                onClick={onClose}
                className="
                  px-4 py-2 rounded-xl
                  bg-white/8
                  border border-white/10
                  text-white
                  hover:bg-white/12
                  transition-all duration-200
                "
              >
                Chiudi
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(84vh-88px)] custom-scrollbar">
            {loading ? (
              <div className="text-center text-zinc-400 py-20">
                Caricamento wishlist...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center text-zinc-400 py-20">
                <div className="text-lg font-semibold text-white">
                  Wishlist vuota
                </div>

                <div className="text-sm mt-2">
                  Clicca su{" "}
                  <span className="text-yellow-400 font-medium">
                    + Aggiungi
                  </span>{" "}
                  per iniziare.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-5">
                {items.map((m) => (
                  <div
                    key={m.id}
                    className="
                      group

                      rounded-2xl
                      overflow-hidden

                      bg-white/[0.025]

                      border border-white/[0.08]

                      backdrop-blur-lg

                      hover:bg-white/[0.045]
                      hover:border-white/[0.14]

                      hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]

                      transition-all duration-300

                      cursor-pointer
                    "
                    onClick={() => openDetail(m)}
                  >
                    {/* COVER */}
                    <div className="relative h-[250px] overflow-hidden">
                      {m.coverurl ? (
                        <>
                          {/* AMBIENT FILL */}
                          <img
                            src={m.coverurl}
                            alt=""
                            aria-hidden="true"
                            className="
                              absolute inset-0
                              w-full h-full
                              object-cover
                              scale-110
                              blur-md
                              opacity-35
                            "
                          />

                          <div className="absolute inset-0 bg-black/10" />

                          {/* REAL COVER */}
                          <img
                            src={m.coverurl}
                            alt={m.titolo || "cover"}
                            className="
                              relative z-10
                              w-full h-full
                              object-contain

                              transition-transform duration-300
                              group-hover:scale-[1.02]
                            "
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                          Nessuna cover
                        </div>
                      )}

                      <div className="absolute inset-0 pointer-events-none">
                        <div className="cover-shine" />
                      </div>
                    </div>

                    {/* INFO */}
                    <div className="p-3 text-white">
                      <div
                        className="text-sm font-semibold leading-tight min-h-[2.6rem]"
                        title={m.titolo || ""}
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {m.titolo || "Titolo sconosciuto"}
                      </div>

                      <div
                        className="text-xs text-zinc-400 mt-1 truncate"
                        title={m.autori || ""}
                      >
                        {m.autori || "Autore sconosciuto"}
                      </div>

                      {/* ACTIONS */}
                      <div className="mt-3 flex justify-between gap-2">
                        {/* EDIT */}
                        <button
                          title="Modifica"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditItem(m);
                          }}
                          className="
                            flex items-center justify-center
                            w-10 h-10 rounded-xl

                            bg-white/[0.04]
                            backdrop-blur-sm

                            border border-white/[0.08]

                            text-zinc-400

                            transition-all duration-200 ease-out

                            hover:-translate-y-[1px]
                            hover:scale-[1.03]

                            hover:text-yellow-400
                            hover:border-yellow-400/35
                            hover:bg-yellow-400/10

                            hover:shadow-[0_0_14px_rgba(234,179,8,0.28)]

                            active:scale-95
                          "
                        >
                          <EditIcon />
                        </button>

                        {/* DELETE */}
                        <button
                          title="Elimina"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(m.id);
                          }}
                          className="
                            flex items-center justify-center
                            w-10 h-10 rounded-xl

                            bg-white/[0.04]
                            backdrop-blur-sm

                            border border-white/[0.08]

                            text-zinc-400

                            transition-all duration-200 ease-out

                            hover:-translate-y-[1px]
                            hover:scale-[1.03]

                            hover:text-red-400
                            hover:border-red-400/35
                            hover:bg-red-400/10

                            hover:shadow-[0_0_14px_rgba(248,113,113,0.28)]

                            active:scale-95
                          "
                        >
                          <TrashIcon />
                        </button>

                        {/* PURCHASE */}
                        <button
                          title="Segna come acquistato"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsOwned(m.id);
                          }}
                          className="
                            flex items-center justify-center
                            w-10 h-10 rounded-xl

                            bg-white/[0.04]
                            backdrop-blur-sm

                            border border-white/[0.08]

                            text-zinc-400

                            transition-all duration-200 ease-out

                            hover:-translate-y-[1px]
                            hover:scale-[1.03]

                            hover:text-green-400
                            hover:border-green-400/35
                            hover:bg-green-400/10

                            hover:shadow-[0_0_14px_rgba(74,222,128,0.28)]

                            active:scale-95
                          "
                        >
                          <CheckIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {openAdd && (
        <WishlistModal
          onClose={() => setOpenAdd(false)}
          onSaved={() => {
            load();
            setOpenAdd(false);
          }}
        />
      )}

      {editItem && (
        <WishlistModal
          initialData={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            load();
            setEditItem(null);
          }}
        />
      )}

      {selected && (
        <MangaDetail
          manga={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
