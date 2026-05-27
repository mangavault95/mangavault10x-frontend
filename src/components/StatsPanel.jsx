import { useEffect, useMemo, useState } from "react";

function VolumeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z" />
      <path d="M8 4v14a2 2 0 0 0 2 2" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function CompleteIcon() {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function OngoingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </svg>
  );
}

export default function StatsPanel() {
  const [manga, setManga] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/manga`)
      .then((r) => r.json())
      .then((d) => setManga(Array.isArray(d) ? d : []))
      .catch(() => setManga([]));
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let ongoing = 0;
    let spent = 0;

    manga.forEach((m) => {
      const owned = Number(m.VolumiPosseduti) || 0;
      const tot = Number(m.VolumiTotali) || 0;
      const cost = Number(m.Costo) || 0;

      total += owned;
      spent += owned * cost;

      if (tot && owned >= tot) {
        completed++;
      } else {
        ongoing++;
      }
    });

    return {
      total,
      completed,
      ongoing,
      spent
    };
  }, [manga]);

  return (
    <div
      className="rounded-[24px] border border-white/[0.08] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
      style={{
        background:
          "linear-gradient(180deg, rgba(22,26,48,0.42), rgba(12,14,28,0.42))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)"
      }}
    >
      <div className="mb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Statistiche
        </div>

      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-3">
          <div className="flex items-center gap-2 text-zinc-300 text-xs mb-1">
            <VolumeIcon />
            <span>Volumi</span>
          </div>

          <div className="text-lg font-black text-white">
            {stats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-yellow-400/[0.08] border border-yellow-400/20 p-3">
          <div className="flex items-center gap-2 text-yellow-300 text-xs mb-1">
            <MoneyIcon />
            <span>Valore</span>
          </div>

          <div className="text-lg font-black text-yellow-300">
            €{stats.spent.toFixed(0)}
          </div>
        </div>

        <div className="rounded-2xl bg-green-400/[0.08] border border-green-400/20 p-3">
          <div className="flex items-center gap-2 text-green-300 text-xs mb-1">
            <CompleteIcon />
            <span>Serie complete</span>
          </div>

          <div className="text-lg font-black text-green-300">
            {stats.completed}
          </div>
        </div>

        <div className="rounded-2xl bg-blue-400/[0.08] border border-blue-400/20 p-3">
          <div className="flex items-center gap-2 text-blue-300 text-xs mb-1">
            <OngoingIcon />
            <span>Serie in corso</span>
          </div>

          <div className="text-lg font-black text-blue-300">
            {stats.ongoing}
          </div>
        </div>
      </div>
    </div>
  );
}
