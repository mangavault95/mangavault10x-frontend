import { useEffect, useState, useMemo } from "react";

export default function RecordsPage({ setRecordsMode }) {
  const [manga, setManga] = useState([]);

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
      VolumiTotali: Number(m?.VolumiTotali) || 0,
      Costo: Number(m?.Costo) || 0,
      Editore: m?.Editore || "Sconosciuto",
      Autore: m?.Autore || "Sconosciuto",
      Concluso: m?.Concluso || 0
    }));
  }, [manga]);

  // ======================
  // 🟡 MONETARI
  // ======================
  const topSerieCostose = [...safe]
    .sort((a, b) => (b.Costo * b.VolumiPosseduti) - (a.Costo * a.VolumiPosseduti))
    .slice(0, 5);

  const topVolumiSingoli = [...safe]
    .filter(m => m.VolumiPosseduti === 1 && m.Concluso === 1)
    .sort((a, b) => b.Costo - a.Costo)
    .slice(0, 5);

  const topEditoriCostosi = useMemo(() => {
    const grouped = {};

    safe.forEach(m => {
      if (m.VolumiPosseduti === 1 && m.Concluso === 1) return;

      if (!grouped[m.Editore]) {
        grouped[m.Editore] = [];
      }
      grouped[m.Editore].push(m.Costo);
    });

    return Object.entries(grouped)
      .map(([editore, costi]) => ({
        editore,
        media: costi.reduce((a, b) => a + b, 0) / costi.length
      }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 5);
  }, [safe]);

  // ======================
  // 🔵 GENERICHE
  // ======================
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

  // ======================
  // 🧩 COMPONENTI UI
  // ======================
  const Card = ({ title, children, icon }) => (
    <div className="bg-[#121218] border border-zinc-800 rounded-2xl p-5 shadow-lg">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );

  const Row = ({ index, title, value }) => (
    <div className="flex justify-between items-center bg-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-800 transition">
      <div className="text-sm">
        <span className="text-zinc-500 mr-2">#{index + 1}</span>
        {title}
      </div>
      <div className="font-bold text-yellow-400">{value}</div>
    </div>
  );

  return (
    <div className="relative min-h-screen text-white p-8 space-y-10">

      {/* BACK */}
      <button
        onClick={() => setRecordsMode(false)}
        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
      >
        ← Home
      </button>

      {/* TITLE */}
      <h1 className="text-4xl font-black tracking-tight">
        📊 Manga Records
      </h1>

      {/* MONETARI */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-yellow-400">
          💰 Record Monetari
        </h2>

        <div className="grid grid-cols-3 gap-6">

          <Card title="Serie più costose" icon="💸">
            {topSerieCostose.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.Titolo}
                value={`€${(m.Costo * m.VolumiPosseduti).toFixed(0)}`}
              />
            ))}
          </Card>

          <Card title="Volumi singoli più costosi" icon="💎">
            {topVolumiSingoli.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.Titolo}
                value={`€${m.Costo}`}
              />
            ))}
          </Card>

          <Card title="Editori più cari" icon="🏢">
            {topEditoriCostosi.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.editore}
                value={`€${m.media.toFixed(2)}`}
              />
            ))}
          </Card>

        </div>
      </div>

      {/* GENERICHE */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-blue-400">
          📚 Record Generali
        </h2>

        <div className="grid grid-cols-3 gap-6">

          <Card title="Serie più lunghe" icon="📖">
            {topLunghe.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.Titolo}
                value={`${m.VolumiPosseduti} vol`}
              />
            ))}
          </Card>

          <Card title="Editori con più serie" icon="🏭">
            {topEditoriSerie.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.editore}
                value={`${m.count}`}
              />
            ))}
          </Card>

          <Card title="Autori con più serie" icon="✍️">
            {topAutori.map((m, i) => (
              <Row
                key={i}
                index={i}
                title={m.autore}
                value={`${m.count}`}
              />
            ))}
          </Card>

        </div>
      </div>

      {/* BACKGROUND GLOW */}
      <div className="absolute top-0 left-1/2 w-[500px] h-[500px] -translate-x-1/2 bg-yellow-500/20 blur-[160px] pointer-events-none" />

    </div>
  );
}
