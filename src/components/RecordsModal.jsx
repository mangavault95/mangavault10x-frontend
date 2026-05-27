import { useEffect, useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function RecordsModal({ onClose }) {
  const [manga, setManga] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/manga`);
        const data = await res.json();
        setManga(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Errore caricamento records:", err);
        setManga([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const safe = useMemo(() => {
    return manga.map((m) => ({
      ...m,
      Titolo: m?.Titolo || "",
      VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
      VolumiTotali: Number(m?.VolumiTotali) || 0,
      Costo: Number(m?.Costo) || 0,
      Editore: m?.Editore || "Sconosciuto",
      Autore: m?.Autore || "Sconosciuto",
      CoverURL: m?.CoverURL || "",
      Genere: m?.Genere || ""
    }));
  }, [manga]);

  function groupBy(field) {
    const groups = {};

    safe.forEach((m) => {
      const key = m[field] || "Sconosciuto";

      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    return Object.entries(groups).map(([key, list]) => {
      const sortedByCost = [...list].sort((a, b) => b.Costo - a.Costo);

      return {
        name: key,
        count: list.length,
        totalVol: list.reduce((sum, item) => sum + item.VolumiPosseduti, 0),
        avgCost:
          list.length > 0
            ? list.reduce((sum, item) => sum + item.Costo, 0) / list.length
            : 0,
        best: sortedByCost[0],
        worst: sortedByCost[sortedByCost.length - 1],
        list
      };
    });
  }

  const editori = useMemo(
    () => groupBy("Editore").sort((a, b) => b.count - a.count),
    [safe]
  );

  const autori = useMemo(
    () => groupBy("Autore").sort((a, b) => b.count - a.count),
    [safe]
  );

  const topSerieCostose = useMemo(() => {
    return [...safe]
      .sort(
        (a, b) =>
          b.Costo * b.VolumiPosseduti - a.Costo * a.VolumiPosseduti
      )
      .slice(0, 5);
  }, [safe]);

  const topVolumiSingoli = useMemo(() => {
    return [...safe]
      .filter((m) => m.VolumiPosseduti === 1)
      .sort((a, b) => b.Costo - a.Costo)
      .slice(0, 5);
  }, [safe]);

  const topEditoriCostosi = useMemo(() => {
    return [...editori]
      .filter((e) => e.count >= 2)
      .sort((a, b) => b.avgCost - a.avgCost)
      .slice(0, 5);
  }, [editori]);

  const topLunghe = useMemo(() => {
    return [...safe]
      .sort((a, b) => b.VolumiPosseduti - a.VolumiPosseduti)
      .slice(0, 5);
  }, [safe]);

  const medal = ["🥇", "🥈", "🥉"];

  function formatValue(item, type) {
    if (type === "cost") {
      return `€${(item.Costo * item.VolumiPosseduti).toFixed(0)}`;
    }

    if (type === "single") {
      return `€${Number(item.Costo || 0).toFixed(2)}`;
    }

    if (type === "long") {
      return `${item.VolumiPosseduti} vol`;
    }

    if (type === "editoriCost") {
      return `€${Number(item.avgCost || 0).toFixed(2)}`;
    }

    return item.count;
  }

  function handleRowClick(item) {
    if (item?.Titolo) {
      setSelectedManga(item);
    } else {
      setSelectedGroup(item);
    }
  }

  function Row({ item, index, type }) {
    const value = formatValue(item, type);

    return (
      <button
        type="button"
        onClick={() => handleRowClick(item)}
        className="
          w-full flex justify-between items-center gap-3
          px-4 py-3 rounded-xl
          bg-white/[0.045]
          border border-white/[0.08]
          hover:bg-white/[0.07]
          hover:border-yellow-400/30
          hover:shadow-[0_0_18px_rgba(234,179,8,0.12)]
          transition-all duration-200
          text-left
        "
      >
        <div className="min-w-0 flex items-center gap-2 text-sm text-white">
          <span className="shrink-0 text-base">
            {medal[index] || `#${index + 1}`}
          </span>

          <span className="truncate">
            {item.Titolo || item.name || "Sconosciuto"}
          </span>
        </div>

        <div className="shrink-0 font-bold text-yellow-400 text-sm">
          {value}
        </div>
      </button>
    );
  }

  function Card({ title, data, type }) {
    return (
      <div className="panel-section p-5 text-white">
        <h3 className="mb-4 text-sm font-bold text-yellow-400 uppercase tracking-wider">
          {title}
        </h3>

        <div className="space-y-2">
          {data.length === 0 ? (
            <div className="text-sm text-zinc-500 py-4">
              Nessun dato disponibile
            </div>
          ) : (
            data.map((item, index) => (
              <Row
                key={`${title}-${index}`}
                item={item}
                index={index}
                type={type}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0" />

      <div
        className="
          relative
          w-[1200px]
          max-w-[96vw]
          max-h-[88vh]
          rounded-3xl
          overflow-hidden
          border border-white/10
          shadow-2xl
        "
        style={{
          background:
            "linear-gradient(180deg, rgba(12,14,30,0.50), rgba(24,18,40,0.40))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow:
            "0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(99,102,241,0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(168,85,247,0.10), transparent 36%)"
          }}
        />

        <div className="relative z-10">
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Manga Records
              </h2>

              <p className="text-sm text-zinc-400 mt-1">
                Statistiche, record e classifiche della tua collezione.
              </p>
            </div>

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

          {/* CONTENT */}
          <div className="p-6 overflow-y-auto max-h-[calc(88vh-88px)] custom-scrollbar">
            {loading ? (
              <div className="text-center text-zinc-400 py-20">
                Caricamento records...
              </div>
            ) : (
              <div className="space-y-8">
                {/* MONETARI */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">💰</span>
                    <h3 className="text-yellow-400 text-lg font-bold uppercase tracking-wider">
                      Record Monetari
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <Card
                      title="Serie più costose"
                      data={topSerieCostose}
                      type="cost"
                    />

                    <Card
                      title="Volumi singoli più costosi"
                      data={topVolumiSingoli}
                      type="single"
                    />

                    <Card
                      title="Editori più costosi"
                      data={topEditoriCostosi}
                      type="editoriCost"
                    />
                  </div>
                </section>

                {/* GENERALI */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">📚</span>
                    <h3 className="text-white text-lg font-bold uppercase tracking-wider">
                      Record Generali
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <Card
                      title="Serie più lunghe"
                      data={topLunghe}
                      type="long"
                    />

                    <Card
                      title="Editori con più serie"
                      data={editori.slice(0, 5)}
                    />

                    <Card
                      title="Autori con più serie"
                      data={autori.slice(0, 5)}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* GROUP DETAIL */}
        {selectedGroup && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            onClick={() => setSelectedGroup(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <div
              className="relative w-[760px] max-w-[90vw] rounded-3xl border border-white/10 manga-detail-card p-6 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-yellow-400">
                    {selectedGroup.name}
                  </h3>

                  <p className="text-sm text-zinc-400 mt-1">
                    Serie: {selectedGroup.count} • Volumi:{" "}
                    {selectedGroup.totalVol}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition"
                >
                  Chiudi
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="panel-subtle p-3">
                  <p className="text-xs text-zinc-400 mb-1">
                    Più costoso
                  </p>
                  <p className="text-sm text-green-400 truncate">
                    {selectedGroup.best?.Titolo || "—"}
                  </p>
                </div>

                <div className="panel-subtle p-3">
                  <p className="text-xs text-zinc-400 mb-1">
                    Meno costoso
                  </p>
                  <p className="text-sm text-red-400 truncate">
                    {selectedGroup.worst?.Titolo || "—"}
                  </p>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2">
                {selectedGroup.list.map((m, index) => (
                  <button
                    key={`${m.ID}-${index}`}
                    onClick={() => {
                      setSelectedManga(m);
                    }}
                    className="
                      w-full flex items-center justify-between
                      px-4 py-3 rounded-xl
                      bg-white/[0.045]
                      border border-white/[0.08]
                      hover:bg-white/[0.07]
                      hover:border-yellow-400/30
                      transition
                      text-left
                    "
                  >
                    <span className="truncate text-sm">{m.Titolo}</span>
                    <span className="text-xs text-zinc-400">
                      € {Number(m.Costo || 0).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedManga && (
        <MangaDetail
          manga={selectedManga}
          onClose={() => set
