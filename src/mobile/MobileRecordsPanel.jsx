import MobilePanel from "./MobilePanel";

export default function MobileRecordsPanel({
  list = [],
  onClose
}) {
  if (!list || list.length === 0) {
    return (
      <MobilePanel title="Records" onClose={onClose}>
        <div className="text-center text-zinc-400">
          Nessun dato disponibile
        </div>
      </MobilePanel>
    );
  }

  /* -------- NORMALIZZAZIONE (come desktop) -------- */

  const safe = list.map((m) => ({
    ...m,
    Titolo: m?.Titolo || "",
    VolumiPosseduti: Number(m?.VolumiPosseduti) || 0,
    VolumiTotali: Number(m?.VolumiTotali) || 0,
    Costo: Number(m?.Costo) || 0,
    Editore: m?.Editore || "Sconosciuto",
    Autore: m?.Autore || "Sconosciuto",
    CoverURL: m?.CoverURL || ""
  }));

  /* -------- CALCOLI IDENTICI AL DESKTOP -------- */

  function groupBy(field) {
    const groups = {};

    safe.forEach((m) => {
      const key = m[field] || "Sconosciuto";

      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    return Object.entries(groups).map(([key, list]) => ({
      name: key,
      count: list.length,
      avgCost:
        list.reduce((sum, i) => sum + i.Costo, 0) /
        (list.length || 1)
    }));
  }

  const editori = groupBy("Editore")
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const autori = groupBy("Autore")
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topSerieCostose = [...safe]
    .sort(
      (a, b) =>
        b.Costo * b.VolumiPosseduti -
        a.Costo * a.VolumiPosseduti
    )
    .slice(0, 5);

  const topVolumiSingoli = [...safe]
    .filter((m) => m.VolumiPosseduti === 1)
    .sort((a, b) => b.Costo - a.Costo)
    .slice(0, 5);

  const topLunghe = [...safe]
    .sort(
      (a, b) =>
        b.VolumiPosseduti - a.VolumiPosseduti
    )
    .slice(0, 5);

  /* -------- CLICK → DETAIL -------- */

  function open(m) {
    window.dispatchEvent(
      new CustomEvent("openMangaDetail", {
        detail: m
      })
    );
  }

  /* -------- COMPONENT ROW -------- */

  function Row({ label, value, img, onClick }) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 w-full bg-white/5 p-2 rounded-lg text-left"
      >
        {img && (
          <img
            src={img}
            className="w-10 h-14 object-cover"
          />
        )}

        <div className="flex-1">
          <div className="text-xs font-semibold truncate">
            {label}
          </div>
        </div>

        <div className="text-xs text-yellow-400">
          {value}
        </div>
      </button>
    );
  }

  return (
    <MobilePanel title="Records" onClose={onClose}>

      {/* 💰 SERIE PIÙ COSTOSE */}
      <div>
        <div className="text-sm font-bold mb-2">
          💰 Serie più costose
        </div>

        <div className="space-y-2">
          {topSerieCostose.map((m) => (
            <Row
              key={m.ID}
              label={m.Titolo}
              value={`€${(
                m.Costo * m.VolumiPosseduti
              ).toFixed(0)}`}
              img={m.CoverURL}
              onClick={() => open(m)}
            />
          ))}
        </div>
      </div>

      {/* 💸 VOLUMI SINGOLI */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          💸 Volumi singoli più costosi
        </div>

        <div className="space-y-2">
          {topVolumiSingoli.map((m) => (
            <Row
              key={m.ID}
              label={m.Titolo}
              value={`€${m.Costo.toFixed(2)}`}
              img={m.CoverURL}
              onClick={() => open(m)}
            />
          ))}
        </div>
      </div>

      {/* 📚 SERIE PIÙ LUNGHE */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          📚 Serie più lunghe
        </div>

        <div className="space-y-2">
          {topLunghe.map((m) => (
            <Row
              key={m.ID}
              label={m.Titolo}
              value={`${m.VolumiPosseduti} vol`}
              img={m.CoverURL}
              onClick={() => open(m)}
            />
          ))}
        </div>
      </div>

      {/* 🏢 EDITORI */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          🏢 Editori con più serie
        </div>

        <div className="space-y-2">
          {editori.map((e) => (
            <Row
              key={e.name}
              label={e.name}
              value={e.count}
            />
          ))}
        </div>
      </div>

      {/* ✍️ AUTORI */}
      <div className="mt-4">
        <div className="text-sm font-bold mb-2">
          ✍️ Autori con più serie
        </div>

        <div className="space-y-2">
          {autori.map((a) => (
            <Row
              key={a.name}
              label={a.name}
              value={a.count}
            />
          ))}
        </div>
      </div>

    </MobilePanel>
  );
}
