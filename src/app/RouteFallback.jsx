/**
 * Cosa si vede mentre il codice di una pagina viene scaricato.
 *
 * Non uno spinner: uno scheletro che occupa già la forma della
 * griglia. Così il passaggio al contenuto vero non fa saltare il
 * layout, e la pagina sembra arrivare invece che apparire.
 */
export default function RouteFallback() {
  return (
    <div className="px-8 py-10" role="status" aria-label="Caricamento in corso">
      <div className="h-8 w-56 rounded-lg bg-glass-2 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)] bg-[length:200%_100%]" />

      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-cover w-full rounded-card bg-glass-1 border border-hairline" />
            <div className="h-3 w-4/5 rounded bg-glass-1" />
            <div className="h-3 w-2/5 rounded bg-glass-1" />
          </div>
        ))}
      </div>

      <span className="sr-only">Caricamento della pagina in corso</span>
    </div>
  );
}
