import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../app/Icon";
import Foglio from "./Foglio";
import { VotoStelle } from "./AzioniSerie";
import { useCollezione } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { avvisa } from "../dati/avvisi";
import { vibra } from "../dati/tatto";
import { prossimoVolume, totaleDisponibile, volumiMancanti } from "../dati/serie";
import { annullaAcquisti, registraAcquisto, updateManga } from "../services/api";

/**
 * Le azioni rapide di una serie: il foglio che si apre tenendo premuta
 * una copertina (13/11/2026).
 *
 * Le tre cose che si fanno più spesso a una serie — segnare il volume
 * appena comprato, darle un voto, metterla fra i preferiti — fino a oggi
 * chiedevano tutte di aprire la scheda, farla e tornare indietro. Col
 * dito il preferito sulla copertina non compare nemmeno (vedi
 * `CartaSerie`), quindi dalla griglia non si poteva fare niente.
 *
 * Qui non c'è nessuna funzione nuova: sono le stesse chiamate della
 * scheda e della Collezione in elenco, portate a un tocco lungo di
 * distanza. Chi guarda senza poter scrivere non arriva fin qui.
 */
export default function AzioniRapide({ serie, onChiudere }) {
  const { aggiornaLocale, aggiornaVoto, ricarica } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();
  const [occupato, setOccupato] = useState(false);

  const mancanti = volumiMancanti(serie);
  const totale = totaleDisponibile(serie);
  const numero = prossimoVolume(serie);

  async function preso() {
    if (occupato) return;

    vibra("conferma");
    setOccupato(true);

    try {
      const esito = await eseguiProtetto(() => registraAcquisto(serie.id, { volumi: [numero] }));
      const acquisti = esito?.acquisti || [];

      // Il foglio si chiude e resta la ricevuta, con il modo di tornare
      // indietro: è lo stesso avviso del «+ N» della Collezione in elenco.
      onChiudere();
      avvisa({
        testo: `${serie.titolo} ${numero} registrato`,
        azione: acquisti.length
          ? {
              etichetta: "Annulla",
              alTocco: async () => {
                try {
                  await eseguiProtetto(() => annullaAcquisti(acquisti));
                  ricarica();
                } catch (e) {
                  if (!e?.annullato) avvisa({ testo: "Non sono riuscito ad annullarlo: riprova.", tono: "errore" });
                }
              }
            }
          : null,
        durata: 6000
      });
      ricarica();
    } catch (e) {
      if (!e?.annullato) avvisa({ testo: `${serie.titolo} ${numero} non è stato registrato.`, tono: "errore" });
    } finally {
      setOccupato(false);
    }
  }

  async function alternaPreferito() {
    const nuovo = !serie.preferito;

    vibra();
    // Subito sullo schermo; se il server dice di no si torna indietro.
    aggiornaLocale(serie.id, { preferito: nuovo });

    try {
      await eseguiProtetto(() => updateManga(serie.id, { preferito: nuovo }));
    } catch (e) {
      aggiornaLocale(serie.id, { preferito: !nuovo });
      if (!e?.annullato) avvisa({ testo: "Preferito non salvato: riprova.", tono: "errore" });
    }
  }

  const riga =
    "flex min-h-[3.25rem] w-full items-center gap-3 rounded-card px-3 text-left text-corpo font-medium text-ink-bright transition-colors duration-quick active:bg-glass-2 disabled:opacity-50";

  return (
    <Foglio
      titolo={serie.titolo}
      sotto={`${serie.posseduti}${totale ? `/${totale}` : ""} volumi${mancanti > 0 ? ` · ne mancano ${mancanti}` : ""}`}
      larghezza="sm:max-w-sm"
      onChiudere={onChiudere}
    >
      <div className="mb-2 flex items-center justify-between gap-3 rounded-card bg-glass-1 px-3 py-3">
        <span className="text-sm text-ink-muted">Il tuo voto</span>
        <VotoStelle serie={serie} onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)} dimensione={24} />
      </div>

      <ul className="flex flex-col">
        {mancanti > 0 && numero != null && (
          <li>
            <button type="button" onClick={preso} disabled={occupato} className={riga}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass-400/15 text-brass-300">
                <Icon nome="plus" dimensione={18} />
              </span>
              {occupato ? "Registro…" : `Ho preso il volume ${numero}`}
            </button>
          </li>
        )}

        <li>
          <button type="button" onClick={alternaPreferito} aria-pressed={Boolean(serie.preferito)} className={riga}>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                serie.preferito ? "bg-brass-400/15 text-brass-400" : "bg-glass-2 text-ink-muted"
              }`}
            >
              <Icon nome="star" dimensione={18} piena={Boolean(serie.preferito)} />
            </span>
            {serie.preferito ? "Togli dai preferiti" : "Metti fra i preferiti"}
          </button>
        </li>

        <li>
          <Link to={`/serie/${serie.id}`} onClick={onChiudere} className={riga}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-glass-2 text-ink-muted">
              <Icon nome="manga" dimensione={18} />
            </span>
            Apri la scheda
          </Link>
        </li>
      </ul>
    </Foglio>
  );
}
