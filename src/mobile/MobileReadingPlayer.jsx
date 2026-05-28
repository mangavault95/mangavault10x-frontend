import { useEffect, useState } from "react";
import ReadingSessionAddModal from "../components/ReadingSessionAddModal";

/* -------------------- ICONS -------------------- */

function MinusIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 12h12" />
    </svg>
  );
}

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

function SaveIcon({ className = "w-5 h-5" }) {
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
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M8 4v6h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 14l5-5 5 5" />
    </svg>
  );
}

/* -------------------- COMPONENT -------------------- */

export default function MobileReadingPlayer() {
  const API = import.meta.env.VITE_API_URL;

  const [sessions, setSessions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openAddSession, setOpenAddSession] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadSessions() {
    try {
      const res = await fetch(`${API}/api/reading-sessions`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      setSessions(list);

      const storedActiveId = localStorage.getItem("mv_active_session_manga_id");

      if (storedActiveId && list.length > 0) {
        const idx = list.findIndex(
          (s) => String(s.manga_id) === String(storedActiveId)
        );
        setActiveIndex(idx >= 0 ? idx : 0);
      } else {
        setActiveIndex(0);
      }
    } catch (err) {
      console.error("Errore caricamento reading sessions mobile:", err);
      setSessions([]);
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const refresh = () => loadSessions();

    window.addEventListener("currentReadingUpdated", refresh);

    return () => {
      window.removeEventListener("currentReadingUpdated", refresh);
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= sessions.length && sessions.length > 0) {
      setActiveIndex(0);
    }
  }, [sessions, activeIndex]);

  const activeSession = sessions[activeIndex] || null;

  const prevIndex =
    sessions.length > 1
      ? (activeIndex - 1 + sessions.length) % sessions.length
      : null;

  const nextIndex =
    sessions.length > 1
      ? (activeIndex + 1) % sessions.length
      : null;

  const prevSession = prevIndex !== null ? sessions[prevIndex] : null;
  const nextSession = nextIndex !== null ? sessions[nextIndex] : null;

  useEffect(() => {
    if (activeSession?.manga_id) {
      localStorage.setItem(
        "mv_active_session_manga_id",
        String(activeSession.manga_id)
      );
    }
  }, [activeSession]);

  function softVibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch {
      // ignore
    }
  }

  function switchTo(index) {
    if (index === null || index === undefined) return;

    softVibrate();
    setActiveIndex(index);
  }

  async function updateCurrentVolume(delta) {
    if (!activeSession) return;

    softVibrate();

    const current = Number(activeSession.volume) || 0;
    const total = Number(activeSession.volumitotali) || 0;

    let next = current + delta;

    if (next < 0) next = 0;
    if (total && next > total) next = total;

    try {
      await fetch(`${API}/api/reading-sessions/${activeSession.manga_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          volume: next
        })
      });

      await loadSessions();
      window.dispatchEvent(new Event("currentReadingUpdated"));
    } catch (err) {
      console.error("Errore update reading session mobile:", err);
    }
  }

  async function saveCurrentReading() {
    if (!activeSession) return;

    softVibrate();
    setSaving(true);

    try {
      await fetch(`${API}/api/reading-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          manga_id: activeSession.manga_id,
          titolo: activeSession.titolo,
          autore: activeSession.autore || "",
          coverurl: activeSession.coverurl || "",
          volume: Number(activeSession.volume) || 0
        })
      });

      window.dispatchEvent(new Event("currentReadingUpdated"));
    } catch (err) {
      console.error("Errore salvataggio reading history mobile:", err);
    } finally {
      setTimeout(() => setSaving(false), 260);
    }
  }

  async function removeActiveSession() {
    if (!activeSession) return;

    softVibrate();

    try {
      await fetch(`${API}/api/reading-sessions/${activeSession.manga_id}`, {
        method: "DELETE"
      });

      await loadSessions();

      if (activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Errore rimozione reading session mobile:", err);
    }
  }

  function openDetail() {
    if (!activeSession) return;

    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: {
          ID: activeSession.manga_id,
          Titolo: activeSession.titolo,
          Autore: activeSession.autore,
          CoverURL: activeSession.coverurl,
          VolumiTotali: activeSession.volumitotali,
          VolumiPosseduti: activeSession.volume
        }
      })
    );
  }

  const readingOwned = Number(activeSession?.volume) || 0;
  const readingTotal = Number(activeSession?.volumitotali) || 0;

  const readingPercent = readingTotal
    ? Math.min(100, Math.round((readingOwned / readingTotal) * 100))
    : readingOwned > 0
    ? 50
    : 0;

  const progressLabel = readingTotal
    ? `${readingOwned}/${readingTotal}`
    : `${readingOwned}/?`;

  const hasMultiple = sessions.length > 1;

  /* -------------------- EMPTY COLLAPSED -------------------- */

  if (!activeSession) {
    return (
      <>
        <div className="fixed left-0 right-0 bottom-0 z-[950] px-3 pb-3 pointer-events-none">
          <button
            type="button"
            onClick={() => setOpenAddSession(true)}
            className="
              pointer-events-auto
              w-full
              rounded-[20px]
              border border-white/[0.08]
              bg-black/88
              px-3 py-2.5
              shadow-[0_14px_35px_rgba(0,0,0,0.42)]
              backdrop-blur-xl
              active:scale-[0.99]
              transition
            "
            style={{
              background:
                "linear-gradient(180deg, rgba(12,12,16,0.94), rgba(6,7,12,0.96))",
              WebkitBackdropFilter: "blur(16px)",
              backdropFilter: "blur(16px)"
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-yellow-400/15 border border-yellow-400/20 text-yellow-300 flex items-center justify-center">
                  <BookIcon />
                </div>

                <div className="min-w-0 text-left">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Stai leggendo
                  </div>
                  <div className="text-sm font-semibold text-white truncate">
                    Aggiungi una lettura
                  </div>
                </div>
              </div>

              <div className="w-9 h-9 rounded-2xl bg-yellow-400 text-black flex items-center justify-center">
                <PlusIcon />
              </div>
            </div>
          </button>
        </div>

        {openAddSession && (
          <ReadingSessionAddModal
            onClose={() => setOpenAddSession(false)}
            onSaved={() => {
              loadSessions();
              setOpenAddSession(false);
            }}
          />
        )}
      </>
    );
  }

  /* -------------------- MAIN -------------------- */

  return (
    <>
      {/* MINI DOCK SEMPRE VISIBILE */}
      <div className="fixed left-0 right-0 bottom-0 z-[950] px-3 pb-3 pointer-events-none">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="
            pointer-events-auto
            w-full
            rounded-[20px]
            border border-white/[0.08]
            px-3 py-2
            shadow-[0_14px_35px_rgba(0,0,0,0.42)]
            active:scale-[0.99]
            transition
            overflow-hidden
            relative
          "
          style={{
            background:
              "linear-gradient(180deg, rgba(12,12,16,0.94), rgba(6,7,12,0.96))",
            WebkitBackdropFilter: "blur(16px)",
            backdropFilter: "blur(16px)"
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-8 left-12 w-28 h-28 rounded-full bg-yellow-400/8 blur-3xl" />
          </div>

          <div className="relative flex items-center gap-3">
            <div className="w-10 h-14 shrink-0 rounded-xl overflow-hidden bg-black/25 border border-white/10">
              {activeSession.coverurl ? (
                <img
                  src={activeSession.coverurl}
                  alt={activeSession.titolo || "Cover manga"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                  No
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Stai leggendo
                </div>

                <div className="text-[10px] text-zinc-500">
                  {readingPercent}%
                </div>
              </div>

              <div className="text-sm font-bold text-white truncate mt-0.5">
                {activeSession.titolo}
              </div>

              <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500"
                  style={{ width: `${readingPercent}%` }}
                />
              </div>
            </div>

            <div className="w-9 h-9 rounded-2xl bg-white/[0.06] border border-white/10 text-zinc-300 flex items-center justify-center">
              <ExpandIcon />
            </div>
          </div>
        </button>
      </div>

      {/* PLAYER ESPANSO */}
      {expanded && (
        <div className="fixed inset-0 z-[1600] pointer-events-auto">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          />

          <div className="absolute left-0 right-0 bottom-0 px-3 pb-3">
            <section
              className="
                relative
                rounded-[30px]
                border border-white/[0.08]
                p-3
                overflow-hidden
                shadow-[0_24px_70px_rgba(0,0,0,0.55)]
              "
              style={{
                background:
                  "linear-gradient(180deg, rgba(14,14,18,0.97), rgba(6,7,12,0.98))",
                WebkitBackdropFilter: "blur(18px)",
                backdropFilter: "blur(18px)"
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-12 left-10 w-40 h-40 rounded-full bg-yellow-400/10 blur-3xl" />
                <div className="absolute -bottom-14 right-8 w-36 h-36 rounded-full bg-white/5 blur-3xl" />
              </div>

              <div className="relative z-10">
                {/* HANDLE */}
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="mx-auto mb-3 block w-12 h-1.5 rounded-full bg-white/20 active:scale-95 transition"
                  aria-label="Chiudi player"
                />

                {/* TOP */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-yellow-400/15 border border-yellow-400/20 text-yellow-300 flex items-center justify-center">
                      <BookIcon />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        Stai leggendo
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOpenAddSession(true)}
                      className="
                        w-8 h-8 rounded-xl
                        bg-white/[0.06]
                        border border-white/10
                        text-zinc-300
                        flex items-center justify-center
                        active:scale-95
                        transition
                      "
                      title="Aggiungi manga"
                    >
                      <PlusIcon />
                    </button>

                    <button
                      type="button"
                      onClick={removeActiveSession}
                      className="
                        w-8 h-8 rounded-xl
                        bg-white/[0.06]
                        border border-white/10
                        text-zinc-400
                        flex items-center justify-center
                        active:scale-95
                        transition
                      "
                      title="Rimuovi dal player"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* MAIN */}
                <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
                  {/* PREV */}
                  <div className="flex flex-col items-center gap-1">
                    {hasMultiple ? (
                      <>
                        <div
                          className="w-[44px] text-[9px] text-zinc-500 text-center truncate"
                          title={prevSession?.titolo || ""}
                        >
                          {prevSession?.titolo || ""}
                        </div>

                        <button
                          type="button"
                          onClick={() => switchTo(prevIndex)}
                          className="
                            w-8 h-8 rounded-full
                            bg-white/[0.055]
                            border border-white/10
                            text-zinc-300
                            flex items-center justify-center
                            active:scale-95
                            transition
                          "
                        >
                          <ChevronLeftIcon />
                        </button>
                      </>
                    ) : (
                      <div className="h-[44px]" />
                    )}
                  </div>

                  {/* CENTER */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={openDetail}
                        className="
                          relative
                          w-[64px] h-[90px]
                          shrink-0
                          rounded-2xl
                          overflow-hidden
                          bg-black/25
                          border border-white/10
                          shadow-[0_12px_26px_rgba(0,0,0,0.32)]
                          active:scale-95
                          transition
                        "
                      >
                        {activeSession.coverurl ? (
                          <img
                            src={activeSession.coverurl}
                            alt={activeSession.titolo || "Cover manga"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                            No cover
                          </div>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={openDetail}
                          className="text-left w-full"
                        >
                          <div className="text-sm font-bold text-white truncate">
                            {activeSession.titolo}
                          </div>

                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {activeSession.autore || "Autore sconosciuto"}
                          </div>
                        </button>

                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
                            <span>Vol {readingOwned}</span>
                            <span>{progressLabel}</span>
                          </div>

                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_14px_rgba(250,204,21,0.35)] transition-all duration-300"
                              style={{ width: `${readingPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="mt-4 flex items-center justify-center gap-5">
                      <button
                        type="button"
                        onClick={() => updateCurrentVolume(-1)}
                        className="
                          w-9 h-9 rounded-2xl
                          bg-white/[0.055]
                          border border-white/10
                          text-zinc-300
                          flex items-center justify-center
                          active:scale-95
                          transition
                        "
                      >
                        <MinusIcon />
                      </button>

                      <button
                        type="button"
                        onClick={saveCurrentReading}
                        className={`
                          w-14 h-14 rounded-full
                          bg-yellow-400 text-black
                          flex items-center justify-center
                          shadow-[0_0_32px_rgba(250,204,21,0.42)]
                          active:scale-95
                          transition-all duration-200
                          ${saving ? "scale-95 brightness-110" : ""}
                        `}
                      >
                        <SaveIcon />
                      </button>

                      <button
                        type="button"
                        onClick={() => updateCurrentVolume(1)}
                        className="
                          w-9 h-9 rounded-2xl
                          bg-white/[0.055]
                          border border-white/10
                          text-zinc-300
                          flex items-center justify-center
                          active:scale-95
                          transition
                        "
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  </div>

                  {/* NEXT */}
                  <div className="flex flex-col items-center gap-1">
                    {hasMultiple ? (
                      <>
                        <div
                          className="w-[44px] text-[9px] text-zinc-500 text-center truncate"
                          title={nextSession?.titolo || ""}
                        >
                          {nextSession?.titolo || ""}
                        </div>

                        <button
                          type="button"
                          onClick={() => switchTo(nextIndex)}
                          className="
                            w-8 h-8 rounded-full
                            bg-white/[0.055]
                            border border-white/10
                            text-zinc-300
                            flex items-center justify-center
                            active:scale-95
                            transition
                          "
                        >
                          <ChevronRightIcon />
                        </button>
                      </>
                    ) : (
                      <div className="h-[44px]" />
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {openAddSession && (
        <ReadingSessionAddModal
          onClose={() => setOpenAddSession(false)}
          onSaved={() => {
            loadSessions();
            setOpenAddSession(false);
          }}
        />
      )}
    </>
  );
}
