import { useSyncExternalStore } from "react";
import Foglio from "./Foglio";
import { Bottone } from "./Controlli";
import { confermaCorrente, iscriviConferme } from "../dati/conferme";

/**
 * Dove le conferme si vedono (chi le chiede: `dati/conferme.js`).
 *
 * È un foglio come gli altri: sul telefono sale dal basso con i due
 * bottoni sotto il pollice, e trascinarlo via, toccare fuori o premere
 * Escape valgono tutti «no». Il bottone che conferma sta a destra e
 * prende lo spazio: è il gesto per cui il foglio si è aperto.
 */
export default function Conferme() {
  const domanda = useSyncExternalStore(iscriviConferme, confermaCorrente, () => null);

  if (!domanda) return null;

  return (
    <Foglio
      titolo={domanda.titolo}
      sotto={domanda.testo || undefined}
      larghezza="sm:max-w-sm"
      onChiudere={() => domanda.rispondi(false)}
      azioni={
        <>
          <Bottone variante="secondario" onClick={() => domanda.rispondi(false)} className="min-h-12">
            {domanda.annulla}
          </Bottone>

          <Bottone
            variante={domanda.pericolo ? "pericolo" : "primario"}
            onClick={() => domanda.rispondi(true)}
            className="min-h-12 flex-1"
          >
            {domanda.conferma}
          </Bottone>
        </>
      }
    />
  );
}
