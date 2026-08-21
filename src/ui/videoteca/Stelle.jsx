import { useId } from "react";
import { formattaVoto } from "./formati";

/**
 * Il voto a mezze stelle, come in collezione.
 *
 * Cinque stelle, dieci gradini: metà sinistra di ciascuna stella è il
 * mezzo punto, metà destra il punto pieno. Sono due bottoni per stella
 * e non un cursore, perché un cursore da tastiera o su un telefono non
 * si ferma dove vuoi.
 *
 * Ritoccare il voto che hai già lo toglie: è il modo per dire "non lo
 * voto più" senza inventare un bottone apposta. Non votato non è zero,
 * è l'assenza del voto.
 */
export default function Stelle({ voto, alVoto, disabilitato = false, dimensione = 22 }) {
  const attuale = Number(voto) || 0;

  function scegli(valore) {
    if (disabilitato) return;

    alVoto(valore === attuale ? null : valore);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" role="group" aria-label="Voto">
        {[1, 2, 3, 4, 5].map((posizione) => {
          const pieno = attuale >= posizione;
          const mezzo = !pieno && attuale >= posizione - 0.5;

          return (
            <span key={posizione} className="relative inline-flex">
              <Stella dimensione={dimensione} riempimento={pieno ? 1 : mezzo ? 0.5 : 0} />

              {/* Le due metà cliccabili, sopra il disegno */}
              <button
                type="button"
                disabled={disabilitato}
                onClick={() => scegli(posizione - 0.5)}
                aria-label={`${posizione - 0.5} stelle`}
                className="absolute inset-y-0 left-0 w-1/2 disabled:cursor-default"
              />
              <button
                type="button"
                disabled={disabilitato}
                onClick={() => scegli(posizione)}
                aria-label={`${posizione} stelle`}
                className="absolute inset-y-0 right-0 w-1/2 disabled:cursor-default"
              />
            </span>
          );
        })}
      </div>

      <span className="font-numeric text-sm font-semibold text-quaderno-inchiostro">
        {attuale ? formattaVoto(attuale) : "—"}
      </span>
    </div>
  );
}

/**
 * Una stella, piena a metà quando serve.
 *
 * Il riempimento parziale si fa con un clipPath e non con due icone
 * sovrapposte: serve un id diverso per ogni stella, o due voti nella
 * stessa pagina si ruberebbero la maschera. L'id lo dà `useId` e non
 * un numero a caso — un valore casuale calcolato durante il render
 * cambia a ogni ridisegno, e con lui l'attributo che la maschera
 * cerca.
 */
function Stella({ riempimento, dimensione }) {
  const id = useId();
  const tracciato =
    "M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.9l6-.8z";

  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="text-quaderno-blu"
    >
      {riempimento > 0 && riempimento < 1 && (
        <clipPath id={id}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      )}

      <path
        d={tracciato}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity={riempimento ? 1 : 0.35}
      />

      {riempimento === 1 && <path d={tracciato} fill="currentColor" />}

      {riempimento > 0 && riempimento < 1 && (
        <path d={tracciato} fill="currentColor" clipPath={`url(#${id})`} />
      )}
    </svg>
  );
}
