import { useState } from "react";
import { Bottone } from "../Controlli";
import { getMarketPrice } from "../../services/api";
import { euro } from "../../dati/serie";
import { SezioneChiudibile } from "./Pezzi";

/**
 * Quanto chiedono su eBay per questa serie, adesso.
 *
 * Non è "quanto si è venduta": l'API gratuita di eBay vede solo gli
 * annunci attivi, non le vendite concluse — quella vera richiede
 * un'approvazione speciale che eBay non concede ai piccoli sviluppatori.
 * Dire "prezzo medio degli annunci attivi" è meno impressionante di
 * "media delle vendite", ma è quello che il dato è davvero.
 *
 * Il caricamento parte solo al click: interrogare eBay per ogni
 * scheda aperta sarebbe lento e inutile nella maggior parte dei casi.
 */
export function QuotazioneMercato({ serie, sorelle }) {
  const [stato, setStato] = useState("fermo");
  const [dati, setDati] = useState(null);

  async function chiedi() {
    setStato("caricamento");

    try {
      const risposta = await getMarketPrice({
        titolo: serie.titolo,
        edizione: serie.edizione,
        // Le etichette delle edizioni sorelle: servono al server per
        // scartare gli annunci che nominano l'edizione sbagliata.
        altreEdizioni: sorelle.map((s) => s.edizione).filter(Boolean),
        volumiTotali: serie.totali
      });

      setDati(risposta);
      setStato("fatto");
    } catch (e) {
      setStato(e?.status === 501 ? "non_configurato" : "errore");
    }
  }

  const nonConfigurato = stato === "non_configurato";
  const scartati = dati?.campioneGrezzo > dati?.campione ? dati.campioneGrezzo - dati.campione : 0;

  return (
    <SezioneChiudibile titolo="Prezzo su eBay" apertaDiPartenza={false}>
      <div className="flex flex-wrap items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl">
        {stato === "fatto" && dati ? (
          <div className="space-y-1">
            {/* La mediana, non la media: un lotto completo o un
                esemplare da collezione messo in vendita insieme ai
                singoli volumi sposterebbe la media di decine di euro. */}
            <p className="font-numeric text-2xl font-semibold text-ink-bright">
              {dati.mediana ? euro(dati.mediana) : "Nessun dato"}
            </p>

            <p className="text-xs text-ink-muted">
              {dati.mediana
                ? `Mediana di ${dati.campione} annunci di serie completa su eBay Italia${
                    serie.edizione ? ` (edizione ${serie.edizione})` : ""
                  }${dati.media ? ` — media ${euro(dati.media)}` : ""}.`
                : dati.campioneGrezzo > 0
                  ? `Trovati ${dati.campioneGrezzo} annunci, ma nessuno sembrava la serie completa nell'edizione giusta.`
                  : "Nessun annuncio attivo trovato per questo titolo."}
            </p>

            {/* Trasparenza sul filtro: se il campione si è ridotto molto
                è giusto dirlo, invece di far sembrare il numero più
                solido di quanto sia. */}
            {scartati > 0 && (
              <p className="text-xs text-ink-faint">
                Scartati {scartati} annunci su {dati.campioneGrezzo}: volumi singoli o edizione diversa.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {stato === "errore"
              ? "La ricerca su eBay non ha risposto. Riprova fra poco."
              : nonConfigurato
                ? "Questa funzione non è ancora attivata: servono le credenziali eBay sul server."
                : "Cerca su eBay quanto chiedono adesso per la serie completa."}
          </p>
        )}

        {!nonConfigurato && (
          <Bottone
            variante="secondario"
            onClick={chiedi}
            disabled={stato === "caricamento"}
            className="ml-auto"
          >
            {stato === "caricamento" ? "Cerco…" : stato === "fatto" ? "Aggiorna" : "Cerca"}
          </Bottone>
        )}
      </div>
    </SezioneChiudibile>
  );
}
