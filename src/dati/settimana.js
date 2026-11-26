/**
 * Quando mostrare «La tua settimana» nella Home: la domenica dalle 17 e il
 * lunedì fino a mezzogiorno, ora italiana.
 *
 * È il momento in cui si guarda com'è andata; di mercoledì sarebbe una riga che
 * non dice niente di nuovo. Sta in un file a parte perché la regola si prova da
 * sola (`scripts/controlla-settimana.mjs`) e perché un file di componenti che
 * esporta anche funzioni spegne l'aggiornamento a caldo di Vite.
 */
export function eOraDellaSettimana(quando) {
  const parti = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome"
  }).formatToParts(new Date(quando));

  const giorno = parti.find((p) => p.type === "weekday")?.value;
  // «24» a mezzanotte in alcune implementazioni: si riporta a 0.
  const ora = Number(parti.find((p) => p.type === "hour")?.value) % 24;

  return (giorno === "Sun" && ora >= 17) || (giorno === "Mon" && ora < 12);
}
