import { useMemo, useState } from "react";
import MangaDetail from "./MangaDetail";

export default function MangaGrid({ searchResults = [], filter }) {
  const [selectedManga, setSelectedManga] = useState(null);

  function parseTotal(raw) {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  function getMeta(m) {
    const total = parseTotal(m.VolumiTotali);
    const owned = Number(m.VolumiPosseduti) || 0;
    const hasKnownTotal = total !== null;
    return { total, owned, hasKnownTotal };
  }

  function getStatus(m) {
    const { total, owned, hasKnownTotal } = getMeta(m);
    if (!hasKnownTotal && owned > 0) return "ongoing";
    if (hasKnownTotal && owned < total) return "to_complete";
    if (hasKnownTotal && owned === total) return "completed";
    return "ongoing";
  }

  function barColor(status) {
    if (status === "completed") return "bg-green-500";
    if (status === "to_complete") return "bg-red-500";
    return "bg-yellow-400";
  }

  const filtered = useMemo(() => {
    let list = [...searchResults].sort((a, b) =>
      (a.Titolo || "").localeCompare(b.Titolo || "")
    );

    switch (filter) {
      case "ongoing":
        return list.filter((m) => {
          const { owned, hasKnownTotal } = getMeta(m);
          return !hasKnownTotal && owned > 0;
        });
      case "to_complete":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned < total;
        });
      case "completed":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && owned === total;
        });
      case "short":
        return list.filter((m) => {
          const { total, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total >= 2 && total < 8;
        });
      case "oneshot":
        return list.filter((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          return hasKnownTotal && total === 1 && owned >= 1;
        });
      default:
        return list;
    }
  }, [searchResults, filter]);

  return (
    <>
      <div className="manga-grid">
        {filtered.map((m) => {
          const { total, owned, hasKnownTotal } = getMeta(m);
          const status = getStatus(m);
          const percent = hasKnownTotal ? Math.min(100, (owned / total) * 100) : 50;

          // thickness logic: more volumi -> più spessore (clamp 6..28)
          const thickness = hasKnownTotal
            ? Math.min(28, Math.max(6, Math.round(total / 2)))
            : 10;

          return (
            <div key={m.ID} className="group cursor-pointer" onClick={() => setSelectedManga(m)}>
              <div className="volume-3d-wrap">
                <div
                  className="volume-3d"
                  style={{ ['--thickness']: `${thickness}px` }}
                >
                  <div className="cover">
                    <img src={m.CoverURL || "https://placehold.co/300x450"} alt={m.Titolo} />
                  </div>

                  {/* pages block (right side) */}
                  <div className="pages" aria-hidden="true" />

                  <div className="info">
                    <div className="title" title={m.Titolo}>{m.Titolo}</div>
                    <div className="meta">{m.Genere || "Nessun genere"}</div>

                    <div className="progress" aria-hidden>
                      <div
                        className={`bar ${barColor(status)}`}
                        style={{ width: `${percent}%` }}
                        title={
                          status === "completed"
                            ? "Completato"
                            : status === "to_complete"
                            ? "Da completare"
                            : "In corso"
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedManga && <MangaDetail manga={selectedManga} onClose={() => setSelectedManga(null)} />}
    </>
  );
}
