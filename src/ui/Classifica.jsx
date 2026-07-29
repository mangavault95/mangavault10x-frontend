/**
 * Una classifica a barre orizzontali.
 *
 * Perché orizzontali: le etichette sono nomi di editori e generi, che
 * scritti sotto una colonna verticale finirebbero inclinati o tagliati.
 * In orizzontale si leggono normalmente, e l'ordine dall'alto in basso
 * è già la classifica.
 *
 * Una sola tinta (l'ottone), non un colore per riga: qui il colore
 * misura una quantità, non distingue delle categorie. Righe di colori
 * diversi suggerirebbero un significato che non c'è.
 *
 * Le barre partono tutte da zero e la più lunga occupa tutta la
 * larghezza: i confronti fra righe restano onesti.
 */
export default function Classifica({ voci, formatta = (v) => v, unita }) {
  if (!voci?.length) return null;

  const massimo = Math.max(...voci.map((v) => v.valore), 1);

  return (
    <ol className="space-y-2.5">
      {voci.map((v) => {
        const larghezza = Math.max(1.5, (v.valore / massimo) * 100);

        return (
          <li
            key={v.etichetta}
            className="group grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-4"
            title={`${v.etichetta}: ${formatta(v.valore)}${unita ? ` ${unita}` : ""}`}
          >
            <span className="truncate text-sm text-ink">{v.etichetta}</span>

            {/* Il binario resta visibile anche a barra corta: senza,
                una riga da 1 su 200 sembrerebbe un errore di stampa. */}
            <span className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
              <span
                className="block h-full rounded-full bg-brass-400/85 transition-[width,background-color] duration-slow ease-settle group-hover:bg-brass-400"
                style={{ width: `${larghezza}%` }}
              />
            </span>

            <span className="min-w-[3.5rem] text-right font-numeric text-sm tabular-nums text-ink-muted">
              {formatta(v.valore)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
