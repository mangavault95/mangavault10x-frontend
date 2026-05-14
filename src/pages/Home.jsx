import TopHero from "../components/TopHero";
import StatsPanel from "../components/StatsPanel";
import MangaGrid from "../components/MangaGrid";

export default function Home() {
  return (
    <div className="px-6 py-4 space-y-6">

      {/* HERO ATTACCATO IN ALTO */}
      <TopHero />

      {/* CONTENUTO */}
      <div className="flex gap-6 items-start">

        <StatsPanel />

        <div className="flex-1">
          <MangaGrid />
        </div>

      </div>

    </div>
  );
}