import { useMemo, useState } from "react";
import Copertina from "../Copertina";
import { Bottone, CampoRicerca } from "../Controlli";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";

// Quante serie mostrare nella finestra "Cosa apriamo?" prima di
// rimandare alla ricerca. Erano 24, cioè sei righe su schermo largo:
// abbastanza per scorrere un po', troppo poche perché l'elenco sembri
// la collezione.
const MASSIME_IN_SCELTA = 60;

/* ==================================================
   SCELTA DELLA SERIE DA APRIRE
   ================================================== */

/**
 * È una finestra sopra la pagina, non un pannello in cima.
 *
 * Da inserto stava in testa alla pagina mentre il pulsante che lo apre
 * sta sotto le letture aperte: da telefono, con otto libri sul tavolo,
 * si apriva **duemila pixel più su** dello schermo. Toccavi "Inizia
 * un'altra lettura" e non succedeva niente — bisognava indovinare che
 * la risposta era risalire.
 *
 * Sopra la pagina il problema non esiste: compare dove sei, la ricerca
 * ha già il cursore, e si chiude con Escape o toccando fuori.
 */
export function SceltaSerie({ serie, escludi, onScegli, onAnnulla }) {
  const [cerca, setCerca] = useState("");
  const velo = useChiusuraVelo(onAnnulla);

  const disponibili = useMemo(
    () => serie.filter((m) => !escludi.has(String(m.id))),
    [serie, escludi]
  );

  const trovate = useMemo(() => {
    const q = cerca.trim().toLowerCase();

    return q
      ? disponibili.filter((m) =>
          `${m.titolo} ${m.autore || ""}`.toLowerCase().includes(q)
        )
      : disponibili;
  }, [disponibili, cerca]);

  // Duecento copertine in una finestra sono un muro: se ne mostrano
  // quante bastano a farsi un'idea, e il resto si trova cercando. Il
  // numero però va detto — un elenco che finisce senza dire quanto ne
  // resta fuori sembra un elenco completo, e chi non ci trova la
  // propria serie conclude che non c'è.
  const risultati = trovate.slice(0, MASSIME_IN_SCELTA);
  const nascoste = trovate.length - risultati.length;

  return (
    <Sovrapposizione>
    <div
      className="fixed inset-0 z-toast grid place-items-center bg-void/70 p-4 animate-rise-in sm:p-5"
      onKeyDown={(e) => {
        if (e.key === "Escape") onAnnulla();
      }}
      {...velo}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scegli la serie da aprire"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-panel border border-brass-400/20 bg-glass-3 p-5 shadow-float backdrop-blur-2xl"
      >
      <div className="mb-4 space-y-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-bright">
            Cosa apriamo?
          </h3>
          <p className="text-sm text-ink-muted">
            Scegli dalla collezione. Il segnalibro parte dal primo volume che non hai letto.
          </p>
        </div>

        <CampoRicerca
          valore={cerca}
          onCambia={setCerca}
          segnaposto="Cerca fra le tue serie…"
          risultati={trovate.length}
          fuocoSubito
          larghezzaPiena
        />
      </div>

      {risultati.length ? (
        <ul className="-mr-1 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {risultati.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => onScegli(m)}
                // Il titolo è già dentro il pulsante, ma la copertina
                // accanto lo spezza in più nodi: l'etichetta esplicita
                // garantisce che un lettore di schermo annunci la serie
                // invece di un generico "pulsante".
                aria-label={`Inizia a leggere ${m.titolo}`}
                className="group flex w-full items-center gap-3 rounded-card border border-hairline bg-glass-1 p-2 text-left transition-all duration-quick ease-settle
                           hover:border-brass-400/40 hover:bg-glass-2 active:scale-[0.98]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
              >
                <span className="w-9 shrink-0">
                  <Copertina src={m.copertina} alt="" inclina={false} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-bright">
                    {m.titolo}
                  </span>
                  {m.totali ? (
                    <span className="font-numeric text-xs text-ink-faint">
                      {m.totali} volumi
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-ink-muted">
          {cerca
            ? "Nessuna serie con questo nome."
            : "Hai già aperto tutte le serie della collezione."}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="font-numeric text-xs text-ink-faint">
          {nascoste > 0
            ? `altre ${nascoste} non in elenco: cercale per nome`
            : " "}
        </p>

        <Bottone variante="fantasma" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
      </div>
    </div>
    </Sovrapposizione>
  );
}
