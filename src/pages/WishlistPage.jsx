import { useMemo, useState } from "react";
import Pagina from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import {
  addToWishlist,
  deleteWishlistItem,
  enrichManga,
  getWishlist,
  purchaseWishlistItem,
  updateWishlistItem
} from "../services/api";
import { dataIt } from "../dati/serie";

/**
 * I desideri: le serie che non hai ancora.
 *
 * La differenza con la collezione è che qui i dati li scrive una
 * persona, non un import. Quindi il modulo fa il lavoro pesante:
 * basta il titolo, il resto lo cerca il bottone "Compila" chiamando
 * lo stesso servizio che arricchisce le schede della collezione.
 */

const VUOTO = {
  titolo: "",
  autori: "",
  coverurl: "",
  trama: "",
  generi: "",
  volumitotali: "",
  dovecomprare: ""
};

export default function WishlistPage() {
  const { dati, inCorso, errore, ricarica, setDati } = useRisorsa(getWishlist);

  const [modulo, setModulo] = useState(null); // null = chiuso
  const [ricercaTesto, setRicerca] = useState("");
  const [problema, setProblema] = useState(null);

  // `dati || []` sta dentro il useMemo: fuori creerebbe un array nuovo
  // a ogni render, e il filtro si rifarebbe da capo anche quando non
  // è cambiato niente.
  const visibili = useMemo(() => {
    const elementi = dati || [];
    const testo = ricercaTesto.trim().toLowerCase();

    if (!testo) return elementi;

    return elementi.filter((e) =>
      [e.titolo, e.autori, e.generi, e.dovecomprare]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(testo))
    );
  }, [dati, ricercaTesto]);

  /* -------------------- Azioni -------------------- */

  async function salva(valori) {
    setProblema(null);

    const corpo = {
      ...valori,
      volumitotali: valori.volumitotali === "" ? null : Number(valori.volumitotali)
    };

    try {
      if (valori.id) {
        await updateWishlistItem(valori.id, corpo);
      } else {
        await addToWishlist(corpo);
      }

      setModulo(null);
      ricarica();
    } catch {
      setProblema("Il salvataggio non è andato a buon fine.");
    }
  }

  async function elimina(elemento) {
    if (!window.confirm(`Togliere «${elemento.titolo}» dai desideri?`)) return;

    setProblema(null);
    setDati((precedenti) => (precedenti || []).filter((e) => e.id !== elemento.id));

    try {
      await deleteWishlistItem(elemento.id);
    } catch {
      setProblema("Non sono riuscito a eliminare la voce.");
      ricarica();
    }
  }

  async function comprato(elemento) {
    setProblema(null);

    try {
      await purchaseWishlistItem(elemento.id);
      ricarica();
    } catch {
      setProblema("Non sono riuscito a spostare la serie in collezione.");
    }
  }

  return (
    <Pagina
      occhiello="Da comprare"
      titolo="Desideri"
      sommario="Le serie che vuoi, con dove trovarle."
      azioni={
        <div className="flex flex-wrap items-center gap-3">
          <CampoRicerca
            valore={ricercaTesto}
            onCambia={setRicerca}
            segnaposto="Cerca fra i desideri…"
            risultati={visibili.length}
          />

          <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi</Bottone>
        </div>
      }
    >
      <div className="space-y-8">
        {problema && (
          <p
            role="alert"
            className="rounded-card border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember"
          >
            {problema}
          </p>
        )}

        {modulo && (
          <ModuloDesiderio
            valori={modulo}
            onSalva={salva}
            onAnnulla={() => setModulo(null)}
          />
        )}

        {errore ? (
          <Errore errore={errore} riprova={ricarica} />
        ) : inCorso && !dati ? (
          <CaricamentoElenco />
        ) : visibili.length ? (
          <ul className="space-y-3">
            {visibili.map((e) => (
              <li key={e.id}>
                <RigaDesiderio
                  elemento={e}
                  onModifica={() =>
                    setModulo({
                      ...VUOTO,
                      ...e,
                      volumitotali: e.volumitotali ?? ""
                    })
                  }
                  onElimina={() => elimina(e)}
                  onComprato={() => comprato(e)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Vuoto
            titolo={ricercaTesto ? "Nessun desiderio corrisponde" : "La lista è vuota"}
            testo={
              ricercaTesto
                ? "Prova con meno parole."
                : "Aggiungi le serie che vuoi comprare: quando le prendi, un click le sposta in collezione."
            }
            azione={
              !ricercaTesto && <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi la prima</Bottone>
            }
          />
        )}
      </div>
    </Pagina>
  );
}

/* ==================================================
   RIGA
   ================================================== */

function RigaDesiderio({ elemento, onModifica, onElimina, onComprato }) {
  return (
    <div className="flex flex-wrap items-start gap-x-5 gap-y-4 rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl transition-colors duration-base hover:border-soft">
      <div className="w-16 shrink-0">
        <Copertina src={elemento.coverurl} alt={elemento.titolo} />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-medium text-ink-bright">{elemento.titolo}</h3>

        {elemento.autori && (
          <p className="text-sm text-ink-muted">{elemento.autori}</p>
        )}

        <p className="font-numeric text-xs text-ink-faint">
          {elemento.volumitotali ? `${elemento.volumitotali} volumi · ` : ""}
          aggiunto il {dataIt(elemento.created_at) || "—"}
        </p>

        {elemento.dovecomprare && (
          <p className="text-xs text-ink-muted">
            <span className="text-ink-faint">Dove: </span>
            {elemento.dovecomprare}
          </p>
        )}

        {elemento.trama && (
          <p className="line-clamp-2 max-w-2xl pt-1 text-sm text-ink">{elemento.trama}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Bottone onClick={onComprato} title="Sposta in collezione">
          Comprato
        </Bottone>

        <Bottone variante="secondario" onClick={onModifica}>
          Modifica
        </Bottone>

        <Bottone variante="pericolo" onClick={onElimina}>
          Elimina
        </Bottone>
      </div>
    </div>
  );
}

/* ==================================================
   MODULO
   ================================================== */

function ModuloDesiderio({ valori, onSalva, onAnnulla }) {
  const [campi, setCampi] = useState(valori);
  const [compilando, setCompilando] = useState(false);
  const [avviso, setAvviso] = useState(null);

  const cambia = (chiave) => (e) =>
    setCampi((precedenti) => ({ ...precedenti, [chiave]: e.target.value }));

  /**
   * Compila da solo copertina, trama, generi e numero di volumi
   * partendo dal titolo. È lo stesso servizio usato per la collezione:
   * AniList per le immagini, Google Books per i dati d'edizione.
   */
  async function compila() {
    if (!campi.titolo.trim()) return;

    setCompilando(true);
    setAvviso(null);

    try {
      const dati = await enrichManga(campi.titolo, campi.autori);

      if (dati?.error) {
        setAvviso("Non ho trovato niente per questo titolo. Compila a mano.");
      } else {
        // I campi già scritti a mano non vengono sovrascritti: quello
        // che hai deciso tu vale più di quello che trova l'automatismo.
        setCampi((precedenti) => ({
          ...precedenti,
          autori: precedenti.autori || dati.autore || "",
          coverurl: precedenti.coverurl || dati.coverurl || "",
          trama: precedenti.trama || dati.trama || "",
          generi: precedenti.generi || dati.genere || "",
          volumitotali: precedenti.volumitotali || dati.volumitotali || ""
        }));
      }
    } catch {
      setAvviso("Il servizio non ha risposto. Riprova fra poco.");
    } finally {
      setCompilando(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalva(campi);
      }}
      className="space-y-5 rounded-panel border border-soft bg-glass-2 p-6 backdrop-blur-xl animate-rise-in"
    >
      <h2 className="font-display text-xl font-semibold text-ink-bright">
        {campi.id ? "Modifica desiderio" : "Nuovo desiderio"}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etichetta="Titolo"
          valore={campi.titolo}
          onChange={cambia("titolo")}
          required
          autoFocus
        />
        <Campo etichetta="Autore" valore={campi.autori} onChange={cambia("autori")} />
        <Campo
          etichetta="Volumi totali"
          tipo="number"
          valore={campi.volumitotali}
          onChange={cambia("volumitotali")}
          min="1"
        />
        <Campo etichetta="Generi" valore={campi.generi} onChange={cambia("generi")} />
        <Campo
          etichetta="URL copertina"
          valore={campi.coverurl}
          onChange={cambia("coverurl")}
          className="sm:col-span-2"
        />
        <Campo
          etichetta="Dove comprarlo"
          valore={campi.dovecomprare}
          onChange={cambia("dovecomprare")}
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
          className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright
                     outline-none transition-colors duration-quick placeholder:text-ink-faint
                     hover:border-soft focus:border-brass-400/60"
        />
      </label>

      {avviso && <p className="text-sm text-ember">{avviso}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Bottone type="submit">Salva</Bottone>

        <Bottone
          type="button"
          variante="secondario"
          onClick={compila}
          disabled={compilando || !campi.titolo.trim()}
        >
          {compilando ? "Cerco…" : "Compila dal titolo"}
        </Bottone>

        <Bottone type="button" variante="fantasma" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

function Campo({ etichetta, tipo = "text", valore, onChange, className = "", ...resto }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </span>

      <input
        type={tipo}
        value={valore ?? ""}
        onChange={onChange}
        className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright
                   outline-none transition-colors duration-quick placeholder:text-ink-faint
                   hover:border-soft focus:border-brass-400/60"
        {...resto}
      />
    </label>
  );
}
