import Foglio from "../Foglio";
import { Bottone } from "../Controlli";

/**
 * Cosa si può fare con un volume, toccandolo nel carosello (17/11/2026).
 *
 * Tre gesti, in quest'ordine perché è quello in cui servono:
 *
 *   Leggi da qui         sposta il segnalibro lì e apre il tavolo di lettura
 *   Segna come letto     (o «Togli dai letti» se lo è già)
 *   Segna letti fino a   il recupero di una serie letta prima di iscriversi
 *
 * Un foglio e non un tocco che scrive subito: la fila si fa scorrere col
 * pollice, e un volume segnato per sbaglio finisce nella classifica e
 * nella spesa del mese. Il foglio costa un tocco in più e toglie quel
 * rischio; `Annulla` nell'avviso copre il resto.
 *
 * Qui non si scrive niente: i tre gesti arrivano da `SeriePage`, che ha
 * già l'accesso, lo storico e la lettura aperta. `inCorso` dice quale è
 * partito, così il suo bottone cambia parole e gli altri si fermano.
 */
export default function FoglioVolume({
  titoloSerie,
  numero,
  letto,
  eCorrente = false,
  daRecuperare = 0,
  inCorso = null,
  onChiudere,
  onLeggi,
  onSegna,
  onTogli,
  onFinoA
}) {
  const occupato = Boolean(inCorso);

  const stato = eCorrente ? "segnalibro qui" : letto ? "letto" : "non ancora letto";

  return (
    <Foglio
      titolo={`Volume ${numero}`}
      sotto={`${titoloSerie} · ${stato}`}
      larghezza="sm:max-w-sm"
      onChiudere={onChiudere}
    >
      <div className="space-y-2 pb-1">
        <Bottone onClick={onLeggi} disabled={occupato} className="min-h-12 w-full">
          {inCorso === "leggi" ? "Apro…" : letto ? "Rileggi da qui" : "Leggi da qui"}
        </Bottone>

        {letto ? (
          <Bottone variante="secondario" onClick={onTogli} disabled={occupato} className="min-h-12 w-full">
            {inCorso === "togli" ? "Tolgo…" : "Togli dai letti"}
          </Bottone>
        ) : (
          <Bottone variante="secondario" onClick={onSegna} disabled={occupato} className="min-h-12 w-full">
            {inCorso === "segna" ? "Segno…" : "Segna come letto"}
          </Bottone>
        )}

        {/* Solo se c'è davvero da recuperare: con un volume solo da
            segnare sarebbe lo stesso gesto di quello sopra. */}
        {!letto && daRecuperare > 1 && (
          <Bottone variante="secondario" onClick={onFinoA} disabled={occupato} className="min-h-12 w-full">
            {inCorso === "fino" ? (
              "Segno…"
            ) : (
              <>
                Segna letti tutti fino al {numero}
                <span className="font-numeric text-xs font-normal text-ink-muted">{daRecuperare} volumi</span>
              </>
            )}
          </Bottone>
        )}
      </div>
    </Foglio>
  );
}
