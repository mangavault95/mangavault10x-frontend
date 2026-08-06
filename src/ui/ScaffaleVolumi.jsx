/**
 * I volumi di una serie come quadratini numerati.
 *
 * Prima erano barrette di altezza variabile, pensate come coste di
 * libri visti di taglio. Due motivi per cui non funzionavano:
 *
 *   1. A pochi pixel di larghezza quella variazione non si legge come
 *      "libri" ma come un grafico — sembrava uno spettrogramma.
 *   2. Soprattutto: i volumi di una stessa collana hanno tutti la
 *      stessa misura. L'altezza variabile ha senso fra libri diversi
 *      su uno scaffale, non fra i volumi di una serie.
 *
 * Il numero, invece, è l'unica cosa che distingue davvero un volume
 * dall'altro — quindi è quello che va mostrato. Stesso linguaggio
 * della scheda serie, così non se ne impara uno nuovo per pagina.
 */

export default function ScaffaleVolumi({
  totali,
  letti = [],
  corrente = null,
  onSelezionaVolume,
  compatto = false
}) {
  const insieme = new Set(letti.map(Number));

  // Senza numero di volumi noto mostro solo fino al più alto letto:
  // inventare un totale darebbe un'informazione falsa.
  const quanti = totali && totali > 0 ? totali : Math.max(...letti.map(Number), 0);

  if (!quanti) return null;

  const volumi = Array.from({ length: quanti }, (_, i) => i + 1);
  const interattivo = typeof onSelezionaVolume === "function";

  // Da toccare crescono, ma solo quando c'è davvero qualcosa da premere:
  // un quadratino di sei millimetri si legge benissimo e si centra male,
  // e allargare anche quelli che sono solo un disegno vorrebbe dire
  // sprecare mezzo schermo per una serie da trenta volumi.
  const perDito = interattivo
    ? compatto
      ? " [@media(hover:none)]:h-8 [@media(hover:none)]:w-8 [@media(hover:none)]:text-[0.7rem]"
      : " [@media(hover:none)]:h-10 [@media(hover:none)]:w-10 [@media(hover:none)]:text-sm"
    : "";

  const misura = (compatto ? "h-6 w-6 text-[0.6rem]" : "h-8 w-8 text-xs") + perDito;

  return (
    <div className={compatto ? "space-y-1.5" : "space-y-2"}>
      <div
        className={`flex flex-wrap ${compatto ? "gap-1" : "gap-1.5"}`}
        role="list"
        aria-label={`${insieme.size} volumi letti su ${quanti}`}
      >
        {volumi.map((n) => {
          const letto = insieme.has(n);
          const eCorrente = corrente === n;

          const aspetto = eCorrente
            ? "border-brass-300 bg-brass-300 font-semibold text-void shadow-brass"
            : letto
              ? "border-brass-400/70 bg-brass-400/85 font-semibold text-void"
              : "border-dashed border-soft text-ink-faint";

          const descrizione =
            `Volume ${n}` +
            (eCorrente ? ", segnalibro qui" : letto ? ", letto" : ", non letto");

          const Elemento = interattivo ? "button" : "span";

          return (
            <Elemento
              key={n}
              role="listitem"
              {...(interattivo
                ? { type: "button", onClick: () => onSelezionaVolume(n) }
                : {})}
              aria-label={descrizione}
              title={descrizione}
              aria-current={eCorrente ? "true" : undefined}
              className={`grid place-items-center rounded-lg border font-numeric transition-all duration-quick ease-spring ${misura} ${aspetto}
                ${
                  interattivo
                    ? "cursor-pointer hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf"
                    : ""
                }`}
            >
              {n}
            </Elemento>
          );
        })}
      </div>

      {!compatto && (
        <p className="font-numeric text-xs text-ink-faint">
          {insieme.size} di {quanti} volumi
          {insieme.size > 0 && buchi(letti, quanti)}
        </p>
      )}
    </div>
  );
}

/**
 * Segnala i volumi saltati in mezzo a quelli letti.
 *
 * Un buco fra il 5 e il 12 è un'informazione diversa dall'essere
 * semplicemente indietro: dice che ti sei perso qualcosa.
 */
function buchi(letti, totali) {
  const numeri = letti.map(Number);
  const insieme = new Set(numeri);
  const massimo = Math.max(...numeri);

  const mancanti = [];
  for (let n = 1; n < massimo; n++) {
    if (!insieme.has(n)) mancanti.push(n);
  }

  if (mancanti.length === 0) return null;

  const elenco =
    mancanti.length <= 4
      ? mancanti.join(", ")
      : `${mancanti.slice(0, 3).join(", ")} e altri ${mancanti.length - 3}`;

  return <span className="text-ember/80"> · saltati: {elenco}</span>;
}
