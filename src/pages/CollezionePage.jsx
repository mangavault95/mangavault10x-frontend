import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import Pagina from "../ui/Pagina";
import { GrigliaSerie } from "../ui/CartaSerie";
import { CaricamentoGriglia, Errore, Vuoto } from "../ui/Stati";
import { CampoRicerca, Pastiglie, Tendina, Bottone } from "../ui/Controlli";
import { useCollezione } from "../dati/collezione";
import {
  FILTRI,
  ORDINAMENTI,
  filtroPerId,
  numeroIt,
  ordinamentoPerId,
  plurale
} from "../dati/serie";

/**
 * La collezione intera, con i mezzi per trovarci dentro qualcosa.
 *
 * Ricerca, filtro e ordinamento vivono nell'indirizzo, non nello
 * stato del componente. È una scelta che si paga da sola: una vista
 * si può salvare nei preferiti o mandare a qualcuno, il tasto
 * Indietro annulla un filtro invece di buttarti fuori dalla pagina,
 * e ricaricando resti dov'eri.
 */
export default function CollezionePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const [parametri, setParametri] = useSearchParams();

  const ricercaTesto = parametri.get("q") || "";
  const filtroAttivo = filtroPerId(parametri.get("filtro")).id;
  const ordineAttivo = ordinamentoPerId(parametri.get("ordine")).id;

  // I parametri vuoti spariscono dall'indirizzo: `?filtro=tutte&q=`
  // non dice niente in più di `/collezione` ed è più brutto da leggere.
  function aggiornaParametro(chiave, valore) {
    setParametri(
      (precedenti) => {
        const nuovi = new URLSearchParams(precedenti);

        if (!valore || valore === "tutte" || (chiave === "ordine" && valore === "titolo")) {
          nuovi.delete(chiave);
        } else {
          nuovi.set(chiave, valore);
        }

        return nuovi;
      },
      { replace: true }
    );
  }

  /* -------------------- Ricerca -------------------- */

  // L'indice si ricostruisce solo quando cambia la collezione, non a
  // ogni lettera digitata: su 188 serie con più chiavi la differenza
  // fra ricostruire e riusare si sente.
  const indice = useMemo(
    () =>
      new Fuse(serie, {
        keys: [
          { name: "titolo", weight: 3 },
          { name: "autore", weight: 2 },
          { name: "disegnatore", weight: 1 },
          { name: "editore", weight: 1 },
          { name: "generi", weight: 1 }
        ],
        threshold: 0.34,
        ignoreLocation: true
      }),
    [serie]
  );

  const risultati = useMemo(() => {
    const testo = ricercaTesto.trim();

    const base = testo ? indice.search(testo).map((r) => r.item) : serie;

    const filtrate = base.filter(filtroPerId(filtroAttivo).test);

    // Con una ricerca attiva l'ordine di rilevanza di Fuse è più utile
    // dell'ordinamento scelto: il risultato migliore deve stare in cima.
    if (testo && ordineAttivo === "titolo") return filtrate;

    return [...filtrate].sort(ordinamentoPerId(ordineAttivo).confronta);
  }, [ricercaTesto, indice, serie, filtroAttivo, ordineAttivo]);

  // Il numero accanto a ogni filtro si calcola sulla collezione intera,
  // non sui risultati: deve dire quante serie troverei premendolo.
  const conteggi = useMemo(() => {
    const mappa = {};

    for (const f of FILTRI) {
      mappa[f.id] = serie.filter(f.test).length;
    }

    return mappa;
  }, [serie]);

  const filtroPulito = !ricercaTesto && filtroAttivo === "tutte";

  if (errore) {
    return (
      <Pagina titolo="Collezione">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  return (
    <Pagina
      occhiello="Tutte le serie"
      titolo="Collezione"
      sommario={
        inCorso && !serie.length
          ? "Sto tirando giù le schede…"
          : `${plurale(serie.length, "serie in collezione", "serie in collezione")}, ${numeroIt(
              serie.reduce((t, s) => t + s.posseduti, 0)
            )} volumi.`
      }
      azioni={
        <CampoRicerca
          valore={ricercaTesto}
          onCambia={(v) => aggiornaParametro("q", v)}
          segnaposto="Titolo, autore, editore…"
          risultati={risultati.length}
        />
      }
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Pastiglie
          opzioni={FILTRI}
          attiva={filtroAttivo}
          onCambia={(v) => aggiornaParametro("filtro", v)}
          conteggi={conteggi}
        />

        <Tendina
          etichetta="Ordina"
          valore={ordineAttivo}
          opzioni={ORDINAMENTI}
          onCambia={(v) => aggiornaParametro("ordine", v)}
        />
      </div>

      {inCorso && !serie.length ? (
        <CaricamentoGriglia />
      ) : risultati.length ? (
        <>
          {!filtroPulito && (
            <p className="mb-5 text-sm text-ink-muted" aria-live="polite">
              {plurale(risultati.length, "serie trovata", "serie trovate")}
            </p>
          )}

          <GrigliaSerie serie={risultati} />
        </>
      ) : (
        <Vuoto
          titolo="Nessuna serie corrisponde"
          testo={
            ricercaTesto
              ? `Non trovo niente per «${ricercaTesto}». Prova con meno parole, o con il nome dell'autore.`
              : "Questo filtro non seleziona nessuna serie della collezione."
          }
          azione={
            <Bottone variante="secondario" onClick={() => setParametri({}, { replace: true })}>
              Azzera ricerca e filtri
            </Bottone>
          }
        />
      )}
    </Pagina>
  );
}
