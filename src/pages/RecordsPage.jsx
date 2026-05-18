import { useEffect, useState, useMemo } from "react";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const safe = useMemo(() => {
    return (manga || []).map((m) => ({
      ...m,
      VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
      Costo: Number(m?.Costo) || 0,
      Editore: m?.Editore || "Sconosciuto",
      Autore: m?.Autore || "Sconosciuto"
    }));
  }, [manga]);

  // 📊 TOP
  const topSerieCostose = [...safe]
    .sort((a, b) => (b.Costo * b.VolumiPosseduti) - (a.Costo * a.VolumiPosseduti))
    .slice(0, 5);

  const topVolumiSingoli = [...safe]
    .filter(m => m.VolumiPosseduti === 1)
    .sort((a, b) => b.Costo - a.Costo)
    .slice(0, 5);

  const topEditoriCostosi = useMemo(() => {
    const grouped = {};

    safe.forEach(m => {
      if (m.VolumiPosseduti === 1) return;

      if (!grouped[m.Editore]) grouped[m.Editore] = [];
      grouped[m.Editore].push(m);
    });

    return Object.entries(grouped)
      .map(([editore, list]) => {
        const media =
          list.reduce((a, b) => a + b.Costo, 0) / list.length;
        return { editore, media, list };
      })
      .filter(e => e.list.length >= 2)
      .sort((a, b) => b.media - a.media)
      .slice(0, 5);
  }, [safe]);

  const topLunghe = [...safe]
    .sort((a, b) => b.VolumiPosseduti - a.VolumiPosseduti)
    .slice(0, 5);

  const topEditoriSerie = useMemo(() => {
    const count = {};
    safe.forEach(m => {
      count[m.Editore] = (count[m.Editore] || 0) + 1;
    });
    return Object.entries(count)
      .map(([editore, count]) => ({ editore, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [safe]);

  const topAutori = useMemo(() => {
    const count = {};
    safe.forEach(m => {
      count[m.Autore] = (count[m.Autore] || 0) + 1;
    });
    return Object.entries(count)
      .map(([autore, count]) => ({ autore, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [safe]);

  // UI
  const medal = ["🥇", "🥈", "🥉"];

  const Row = ({ item, index, type }) => (
    <div
      onClick={() => setSelectedInfo({ item, type })}
      className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-800 hover:scale-[1.02] transition cursor-pointer"
    >
      <div className="text-sm">
        <span className="mr-2">{medal[index] || `#${index + 1}`}</span>
        {item.Titolo || item.editore || item.autore}
      </div>
      <div className="font-bold text-yellow-400">
        {type === "cost"
          ? `€${(item.Costo * item.VolumiPosseduti).toFixed(0)}`
          : type === "single"
          ? `€${item.Costo}`
          : type === "long"
          ? `${item.VolumiPosseduti} vol`
          : item.count || `€${item.media?.toFixed(2)}`}
      </div>
    </div>
  );

  const Chart = ({ data }) => {
    if (!data) return null;

    const max = Math.max(
      ...data.map(d =>
        d.Costo ? d.Costo * d.VolumiPosseduti : d.count || 1
      )
    );

    return (
      <div className="bg-zinc-900 p-4 rounded-xl mt-6">
        {data.map((d, i) => {
          const value = d.Costo
            ? d.Costo * d.VolumiPosseduti
            : d.count || 1;

          return (
            <div key={i} className="mb-2">
              <div className="flex justify-between text-xs">
                <span>{d.Titolo || d.editore || d.autore}</span>
                <span>{value.toFixed(0)}</span>
              </div>

              <div className="h-2 bg-zinc-800 rounded">
                <div
                  className="h-2 bg-yellow-500 rounded transition-all duration-700"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen text-white p-8 space-y-10">

      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
      >
        ← Home
      </button>

      <h1 className="text-4xl font-black">📊 Manga Records</h1>

      {/* MONETARI */}
      <div>
        <h2
          onClick={() => setChartData(topSerieCostose)}
          className="text-2xl mb-4 text-yellow-400 cursor-pointer"
        >
          💰 Record Monetari
        </h2>

        <div className="grid grid-cols-3 gap-6">

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topSerieCostose.map((m, i) => (
              <Row key={i} item={m} index={i} type="cost" />
            ))}
          </div>

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topVolumiSingoli.map((m, i) => (
              <Row key={i} item={m} index={i} type="single" />
            ))}
          </div>

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topEditoriCostosi.map((m, i) => (
              <Row key={i} item={m} index={i} />
            ))}
          </div>

        </div>
      </div>

      {/* GENERICI */}
      <div>
        <h2
          onClick={() => setChartData(topLunghe)}
          className="text-2xl mb-4 text-blue-400 cursor-pointer"
        >
          📚 Record Generali
        </h2>

        <div className="grid grid-cols-3 gap-6">

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topLunghe.map((m, i) => (
              <Row key={i} item={m} index={i} type="long" />
            ))}
          </div>

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topEditoriSerie.map((m, i) => (
              <Row key={i} item={m} index={i} />
            ))}
          </div>

          <div className="bg-[#121218] p-5 rounded-2xl space-y-2">
            {topAutori.map((m, i) => (
              <Row key={i} item={m} index={i} />
            ))}
          </div>

        </div>
      </div>

      {/* CHART */}
      <Chart data={chartData} />

      {/* MODAL */}
      {selectedInfo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedInfo(null)}
        >
          <div
            className="bg-zinc-900 p-6 rounded-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-3">
              {selectedInfo.item.Titolo ||
                selectedInfo.item.editore ||
                selectedInfo.item.autore}
            </h2>

            <p className="text-sm text-zinc-400 mb-1">
              Volumi: {selectedInfo.item.VolumiPosseduti || "-"}
            </p>

            <p className="text-sm text-zinc-400 mb-1">
              Prezzo: €{selectedInfo.item.Costo || "-"}
            </p>

            <p className="text-xs text-zinc-500 mt-3">
              Questo elemento è in classifica per il suo valore sopra la media o quantità.
            </p>
          </div>
        </div>
      )}

      {/* GLOW */}
      <div className="absolute top-0 left-1/2 w-[500px] h-[500px] -translate-x-1/2 bg-yellow-500/20 blur-[160px]" />
    </div>
  );
}
