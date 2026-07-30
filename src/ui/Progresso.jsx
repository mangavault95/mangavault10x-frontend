/**
 * La barra di completamento di una serie.
 *
 * Il colore dice a colpo d'occhio a che punto sei: ottone mentre
 * raccogli, giada quando la serie è completa. Quando i volumi totali
 * non si conoscono non è che manchi un dato a caso — vuol dire che la
 * serie è ancora in corso dal lato dell'editore, e quello è comunque
 * un'informazione. Sparire del tutto la nasconderebbe; una barra piena
 * la inventerebbe. Resta un indicatore indeterminato, nel colore che
 * il resto del sito già usa per "in corso": non una percentuale, ma
 * nemmeno il vuoto.
 */
export default function Progresso({ valore, etichetta, sottile = false }) {
  const misura = sottile ? "h-1" : "h-1.5";

  if (valore === null || valore === undefined) {
    return (
      <div
        role="progressbar"
        aria-valuenow={undefined}
        aria-valuetext="In corso, volumi totali non ancora noti"
        aria-label={etichetta || "In corso: il numero finale di volumi non è ancora noto"}
        title="In corso: il numero finale di volumi non è ancora noto"
        className={`w-full overflow-hidden rounded-full bg-lapis/20 ${misura}`}
      >
        <div
          className="h-full w-full animate-shimmer rounded-full bg-lapis/60
                     bg-[linear-gradient(90deg,transparent,rgba(129,140,248,0.9),transparent)] bg-[length:200%_100%]"
        />
      </div>
    );
  }

  const percentuale = Math.max(0, Math.min(100, valore));
  const completa = percentuale === 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={percentuale}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etichetta || `Completamento ${percentuale}%`}
      className={`w-full overflow-hidden rounded-full bg-white/[0.06] ${misura}`}
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
