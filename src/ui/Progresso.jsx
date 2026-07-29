/**
 * La barra di completamento di una serie.
 *
 * Il colore dice a colpo d'occhio a che punto sei: ottone mentre
 * raccogli, giada quando la serie è completa. Quando i volumi totali
 * non si conoscono la barra non compare affatto — meglio niente che
 * una percentuale inventata.
 */
export default function Progresso({ valore, etichetta, sottile = false }) {
  if (valore === null || valore === undefined) return null;

  const percentuale = Math.max(0, Math.min(100, valore));
  const completa = percentuale === 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={percentuale}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etichetta || `Completamento ${percentuale}%`}
      className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${
        sottile ? "h-1" : "h-1.5"
      }`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-slow ease-settle ${
          completa
            ? "bg-jade shadow-[0_0_10px_rgba(52,211,153,0.4)]"
            : "bg-brass-400"
        }`}
        style={{ width: `${percentuale}%` }}
      />
    </div>
  );
}
