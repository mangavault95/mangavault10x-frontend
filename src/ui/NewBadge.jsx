/**
 * «3 nuovi»: l'unico modo di dire che ci sono puntate (o volumi) da
 * vedere (P2-01). Stesso colore (`novita`), stesso carattere e stesso
 * peso ovunque; cambia solo dove sta.
 *
 *   overlay   sopra una copertina: sfondo scuro semitrasparente, così si
 *             legge su qualunque immagine
 *   inline    dentro una riga di testo
 *
 * Con `count` a zero (o senza) non disegna niente.
 */
export default function NewBadge({ count, variant = "inline", className = "" }) {
  const n = Number(count);

  if (!Number.isFinite(n) || n <= 0) return null;

  const testo = `${n} ${n === 1 ? "nuovo" : "nuovi"}`;

  if (variant === "overlay") {
    return (
      <span
        className={`rounded-md border border-novita/40 bg-void/80 px-1.5 py-0.5 font-numeric text-xs font-semibold text-novita backdrop-blur ${className}`}
      >
        {testo}
      </span>
    );
  }

  return <span className={`font-numeric font-semibold text-novita ${className}`}>{testo}</span>;
}
