import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bottone } from "../Controlli";
import Copertina from "../Copertina";
import Foglio from "../Foglio";
import { useAccessoProtetto } from "../../dati/accesso";
import { creaManga, enrichManga } from "../../services/api";

/* ==================================================
   NUOVA SERIE
   ================================================== */

const CAMPI_VUOTI = {
  titolo: "",
  autore: "",
  disegnatore: "",
  editore: "",
  genere: "",
  coverurl: "",
  edizione: "",
  collegamento: "",
  trama: "",
  costo: "",
  volumiposseduti: "0",
  volumitotali: ""
};

/**
 * Aggiungere una serie che non è mai passata dalla wishlist.
 *
 * Prima l'unico modo era aprire Gestione — pensata per correggere
 * schede che esistono già, non per crearne di nuove da zero. Qui basta
 * il titolo: lo stesso servizio che arricchisce le schede in Gestione
 * compila il resto.
 */
export function ModuloNuovaSerie({ tutteLeSerie, titoloIniziale = "", onChiuso, onCreata }) {
  const eseguiProtetto = useAccessoProtetto();
  const navigate = useNavigate();

  const [campi, setCampi] = useState(() => ({ ...CAMPI_VUOTI, titolo: titoloIniziale }));
  const [compilando, setCompilando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);

  const cambia = (chiave) => (e) =>
    setCampi((p) => ({ ...p, [chiave]: e.target.value }));

  async function compila() {
    if (!campi.titolo.trim()) return;

    setCompilando(true);
    setErrore(null);

    try {
      const dati = await enrichManga(campi.titolo, campi.autore);

      if (dati?.error) {
        setErrore("Non ho trovato niente per questo titolo. Compila a mano.");
      } else {
        setCampi((p) => ({
          ...p,
          autore: p.autore || dati.autore || "",
          disegnatore: p.disegnatore || dati.disegnatore || "",
          editore: p.editore || dati.editore || "",
          genere: p.genere || dati.genere || "",
          coverurl: p.coverurl || dati.coverurl || "",
          trama: p.trama || dati.trama || "",
          volumitotali: p.volumitotali || dati.volumitotali || ""
        }));
      }
    } catch {
      setErrore("Il servizio non ha risposto. Riprova fra poco.");
    } finally {
      setCompilando(false);
    }
  }

  async function salva(e) {
    e.preventDefault();

    if (!campi.titolo.trim()) return;

    setSalvando(true);
    setErrore(null);

    // Il gruppo di un'edizione è quello della bersaglio scelta (o il suo
    // stesso id, se la bersaglio non è ancora collegata a nessuno) —
    // stessa regola di Gestione, vedi AdminPage.jsx.
    const bersaglio = tutteLeSerie.find((s) => String(s.id) === campi.collegamento);
    const operaId = bersaglio ? (bersaglio.operaId ?? bersaglio.id) : null;

    const corpo = {
      titolo: campi.titolo.trim(),
      autore: campi.autore || null,
      disegnatore: campi.disegnatore || null,
      editore: campi.editore || null,
      genere: campi.genere || null,
      coverurl: campi.coverurl || null,
      edizione: campi.edizione || null,
      operaId,
      trama: campi.trama || null,
      costo: campi.costo === "" ? null : Number(campi.costo),
      volumiposseduti: campi.volumiposseduti === "" ? 0 : Number(campi.volumiposseduti),
      volumitotali: campi.volumitotali === "" ? null : Number(campi.volumitotali)
    };

    try {
      const risposta = await eseguiProtetto(() => creaManga(corpo));

      onCreata();
      onChiuso();

      // Dritti sulla scheda appena creata: è quello che serve dopo
      // aver aggiunto una serie, non tornare a una griglia di 189.
      if (risposta?.creato?.ID) navigate(`/serie/${risposta.creato.ID}`);
    } catch (e2) {
      if (!e2?.annullato) {
        setErrore(e2?.message || "Il salvataggio non è andato a buon fine.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Foglio titolo="Nuova serie" titoloNascosto larghezza="sm:max-w-lg" onChiudere={onChiuso}>
      <form
        onSubmit={salva}
        className="space-y-5 pb-1"
      >
        <div className="flex items-start gap-4">
          {/* La copertina si vede da subito, non solo a scheda salvata:
              incollare un URL o premere "Compila dal titolo" altrimenti
              non dà nessun riscontro finché non si torna sulla scheda. */}
          <div className="w-20 shrink-0 sm:w-24">
            <Copertina src={campi.coverurl} alt={campi.titolo} inclina={false} />
          </div>

          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-bright">
                Nuova serie
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Basta il titolo: il resto puoi compilarlo da solo.
              </p>
            </div>

            <button
              type="button"
              onClick={onChiuso}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoModulo
            etichetta="Titolo"
            valore={campi.titolo}
            onChange={cambia("titolo")}
            required
            autoFocus
          />
          <CampoModulo etichetta="Autore" valore={campi.autore} onChange={cambia("autore")} />
          <CampoModulo
            etichetta="Disegnatore"
            valore={campi.disegnatore}
            onChange={cambia("disegnatore")}
          />
          <CampoModulo etichetta="Editore" valore={campi.editore} onChange={cambia("editore")} />
          <CampoModulo
            etichetta="Edizione"
            valore={campi.edizione}
            onChange={cambia("edizione")}
            placeholder="es. Perfect Edition — vuoto se standard/unica"
          />
          {tutteLeSerie.length > 0 && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                Stessa opera di
              </span>

              <select
                value={campi.collegamento}
                onChange={cambia("collegamento")}
                className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
              >
                <option value="" className="bg-alcove">Nessuna — edizione a sé</option>
                {tutteLeSerie.map((s) => (
                  <option key={s.id} value={s.id} className="bg-alcove">
                    {s.titolo}
                    {s.edizione ? ` (${s.edizione})` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <CampoModulo
            etichetta="Volumi posseduti"
            tipo="number"
            min="0"
            valore={campi.volumiposseduti}
            onChange={cambia("volumiposseduti")}
          />
          <CampoModulo
            etichetta="Volumi totali"
            tipo="number"
            min="0"
            valore={campi.volumitotali}
            onChange={cambia("volumitotali")}
          />
          <CampoModulo
            etichetta="Prezzo al volume"
            tipo="number"
            step="0.01"
            min="0"
            valore={campi.costo}
            onChange={cambia("costo")}
          />
          <CampoModulo etichetta="Generi" valore={campi.genere} onChange={cambia("genere")} />
          <CampoModulo
            etichetta="URL copertina"
            valore={campi.coverurl}
            onChange={cambia("coverurl")}
            className="sm:col-span-2"
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Trama
          </span>

          <textarea
            value={campi.trama}
            onChange={cambia("trama")}
            rows={4}
            className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        {errore && (
          <p role="alert" className="text-sm text-ember">
            {errore}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Bottone type="submit" disabled={salvando || !campi.titolo.trim()}>
            {salvando ? "Salvo…" : "Aggiungi alla collezione"}
          </Bottone>

          <Bottone
            type="button"
            variante="secondario"
            onClick={compila}
            disabled={compilando || !campi.titolo.trim()}
          >
            {compilando ? "Cerco…" : "Compila dal titolo"}
          </Bottone>

          <Bottone type="button" variante="fantasma" onClick={onChiuso}>
            Annulla
          </Bottone>
        </div>
      </form>
    </Foglio>
  );
}

function CampoModulo({ etichetta, tipo = "text", valore, onChange, className = "", ...resto }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </span>

      <input
        type={tipo}
        value={valore ?? ""}
        onChange={onChange}
        className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
        {...resto}
      />
    </label>
  );
}
