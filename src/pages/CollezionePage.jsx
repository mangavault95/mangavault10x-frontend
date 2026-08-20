import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import Pagina from "../ui/Pagina";
import { GrigliaSerie } from "../ui/CartaSerie";
import { CaricamentoGriglia, Errore, Vuoto } from "../ui/Stati";
import { CampoRicerca, Tendina, Bottone } from "../ui/Controlli";
import FiltriCollezione from "../ui/FiltriCollezione";
import AnalisiCollezione from "../ui/AnalisiCollezione";
import ConsigliRail from "../ui/ConsigliRail";
import LibroVetrina from "../ui/LibroVetrina";
import Piegabile from "../ui/Piegabile";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import Sovrapposizione from "../ui/Sovrapposizione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import { useCollezione } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { creaManga, enrichManga } from "../services/api";
import { idDa, generiDiSerie, editoreCanonico } from "../dati/generi";
import {
  FILTRI,
  ORDINAMENTI,
  filtroPerId,
  lettaDa,
  numeroIt,
  ordinamentoPerId,
  plurale
} from "../dati/serie";

/**
 * La collezione intera, con i mezzi per studiarla per davvero.
 *
 * La Biblioteca è il posto per camminarci dentro e guardare; questa è
 * il posto per capire cosa c'è — cercare, restringere per genere o
 * editore, vedere quanto vale quello che hai appena filtrato, scoprire
 * cosa prendere dopo. Ricerca, filtri e ordinamento vivono nell'indirizzo,
 * non nello stato del componente: una vista si può salvare nei
 * preferiti o mandare a qualcuno, il tasto Indietro annulla un filtro
 * invece di buttarti fuori dalla pagina, e ricaricando resti dov'eri.
 */
export default function CollezionePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const [parametri, setParametri] = useSearchParams();
  const [modaleAperto, setModaleAperto] = useState(false);
  const [filtriMobileAperti, setFiltriMobileAperti] = useState(false);

  const ricercaTesto = parametri.get("q") || "";
  const filtroAttivo = filtroPerId(parametri.get("filtro")).id;
  const ordineAttivo = ordinamentoPerId(parametri.get("ordine")).id;
  const editoreAttivo = parametri.get("editore") || null;
  const categoriaAttiva = parametri.get("categoria") || null;
  const lettoreAttivo = parametri.get("lettore") || null;

  const generiSelezionati = useMemo(
    () => (parametri.get("generi") || "").split(",").filter(Boolean),
    [parametri]
  );

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

  // I generi sono una lista, non un valore solo: l'indirizzo li porta
  // come `?generi=adventure,drama` invece di un parametro per genere.
  function aggiornaGeneri(nuovi) {
    setParametri(
      (precedenti) => {
        const p = new URLSearchParams(precedenti);

        if (!nuovi.length) p.delete("generi");
        else p.set("generi", nuovi.join(","));

        return p;
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

    let filtrate = base.filter(filtroPerId(filtroAttivo).test);

    // Più generi selezionati si sommano in OR: cercare "Adventure" o
    // "Horror" deve allargare i risultati, non restringerli a chi ha
    // entrambi — è così che si esplora, non che si incastra.
    if (generiSelezionati.length) {
      filtrate = filtrate.filter((s) =>
        generiDiSerie(s).some((g) => generiSelezionati.includes(idDa(g)))
      );
    }

    if (editoreAttivo) {
      filtrate = filtrate.filter((s) => idDa(editoreCanonico(s.editore) || "") === editoreAttivo);
    }

    // La categoria è già un codice chiuso in tabella: nessuna
    // normalizzazione da fare, al contrario dell'editore digitato a
    // mano in momenti diversi.
    if (categoriaAttiva) {
      filtrate = filtrate.filter((s) => s.categoria === categoriaAttiva);
    }

    // "Letta" vuol dire almeno un volume, non finita: è la domanda che
    // ci si fa davvero davanti allo scaffale — questa l'hai letta tu? —
    // e una serie in corso non si finisce mai per definizione.
    if (lettoreAttivo) {
      filtrate = filtrate.filter((s) => lettaDa(s, lettoreAttivo));
    }

    // Con una ricerca attiva l'ordine di rilevanza di Fuse è più utile
    // dell'ordinamento scelto: il risultato migliore deve stare in cima.
    if (testo && ordineAttivo === "titolo") return filtrate;

    return [...filtrate].sort(ordinamentoPerId(ordineAttivo).confronta);
  }, [
    ricercaTesto,
    indice,
    serie,
    filtroAttivo,
    ordineAttivo,
    generiSelezionati,
    editoreAttivo,
    categoriaAttiva,
    lettoreAttivo
  ]);

  // Il numero accanto a ogni filtro si calcola sulla collezione intera,
  // non sui risultati: deve dire quante serie troverei premendolo.
  const conteggi = useMemo(() => {
    const mappa = {};

    for (const f of FILTRI) {
      mappa[f.id] = serie.filter(f.test).length;
    }

    return mappa;
  }, [serie]);

  // Quante serie ha letto ciascuno, sull'intera collezione: come per i
  // filtri qui sopra, il numero deve dire cosa troverei premendo, non
  // quante ne restano dopo gli altri filtri.
  const conteggiLettore = useMemo(() => {
    const mappa = {};

    for (const s of serie) {
      for (const l of s.lettori || []) {
        mappa[l.utenteId] = (mappa[l.utenteId] || 0) + 1;
      }
    }

    return mappa;
  }, [serie]);

  const filtroPulito =
    !ricercaTesto &&
    filtroAttivo === "tutte" &&
    !generiSelezionati.length &&
    !editoreAttivo &&
    !categoriaAttiva &&
    !lettoreAttivo;

  const filtriAttivi = [
    filtroAttivo !== "tutte",
    generiSelezionati.length > 0,
    Boolean(editoreAttivo),
    Boolean(categoriaAttiva),
    Boolean(lettoreAttivo)
  ].filter(Boolean).length;

  if (errore) {
    return (
      <Pagina titolo="Collezione">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  const propsFiltri = {
    serie,
    filtroAttivo,
    onCambiaFiltro: (v) => aggiornaParametro("filtro", v),
    conteggiFiltro: conteggi,
    generiSelezionati,
    onCambiaGeneri: aggiornaGeneri,
    editoreAttivo,
    onCambiaEditore: (v) => aggiornaParametro("editore", v),
    categoriaAttiva,
    onCambiaCategoria: (v) => aggiornaParametro("categoria", v),
    lettoreAttivo,
    onCambiaLettore: (v) => aggiornaParametro("lettore", v),
    conteggiLettore
  };

  return (
    <Pagina
      occhiello="Studia la tua collezione"
      titolo="Collezione"
      sommario={
        inCorso && !serie.length
          ? "Sto tirando giù le schede…"
          : `${plurale(serie.length, "serie in collezione", "serie in collezione")}, ${numeroIt(
              serie.reduce((t, s) => t + s.posseduti, 0)
            )} volumi.`
      }
      azioni={
        /* Sul telefono stanno su una riga sola: il campo prende lo spazio
           che avanza e i due bottoni restano icone. Su due righe erano
           quasi cento pixel di intestazione, cioè mezza fila di copertine
           in meno prima di dover scorrere. */
        <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-wrap sm:gap-3">
          <div className="min-w-0 flex-1 sm:flex-none">
            <CampoRicerca
              valore={ricercaTesto}
              onCambia={(v) => aggiornaParametro("q", v)}
              segnaposto="Titolo, autore, editore…"
              risultati={risultati.length}
            />
          </div>

          <button
            onClick={() => setFiltriMobileAperti(true)}
            aria-label="Filtri"
            className="inline-flex shrink-0 items-center gap-2 rounded-card border border-hairline bg-glass-1 px-3 py-2.5 text-sm font-semibold text-ink-bright backdrop-blur-xl transition-colors duration-quick hover:border-soft sm:px-4 lg:hidden"
          >
            <Icon nome="settings" dimensione={16} />
            <span className="hidden sm:inline">Filtri</span>
            {filtriAttivi > 0 && (
              <span className="rounded-full bg-brass-400 px-1.5 py-0.5 font-numeric text-[0.65rem] text-void">
                {filtriAttivi}
              </span>
            )}
          </button>

          <Bottone
            onClick={() => setModaleAperto(true)}
            aria-label="Nuova serie"
            className="shrink-0 px-3 sm:px-4"
          >
            <Icon nome="plus" dimensione={16} className="sm:hidden" />
            <span className="hidden sm:inline">Nuova serie</span>
          </Bottone>
        </div>
      }
    >
      {modaleAperto && (
        <ModuloNuovaSerie
          tutteLeSerie={serie}
          onChiuso={() => setModaleAperto(false)}
          onCreata={ricarica}
        />
      )}

      {filtriMobileAperti && (
        <FiltriCollezione {...propsFiltri} variante="sheet" onChiudere={() => setFiltriMobileAperti(false)} />
      )}

      {/* Su schermo largo stanno in cima aperti, come sono sempre stati.
          Su un telefono sono una riga sola da aprire: il perché, col conto
          dei pixel che costavano, sta in `ui/Piegabile.jsx`. */}
      {!inCorso && serie.length > 0 && (
        <Piegabile titolo="Vetrina, numeri e consigli">
          <div className="mb-4 space-y-5 lg:mb-8 lg:space-y-6">
            <LibroVetrina serie={serie} />
            <AnalisiCollezione serie={risultati} />
            <ConsigliRail serie={serie} />
          </div>
        </Piegabile>
      )}

      <div className="flex items-start gap-8">
        <FiltriCollezione {...propsFiltri} variante="sidebar" />

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            {!filtroPulito ? (
              <p className="text-sm text-ink-muted" aria-live="polite">
                {plurale(risultati.length, "serie trovata", "serie trovate")}
              </p>
            ) : (
              <span />
            )}

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
            <GrigliaSerie serie={risultati} riempi />
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
        </div>
      </div>
    </Pagina>
  );
}

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
function ModuloNuovaSerie({ tutteLeSerie, onChiuso, onCreata }) {
  const eseguiProtetto = useAccessoProtetto();
  const navigate = useNavigate();

  const [campi, setCampi] = useState(CAMPI_VUOTI);
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

  const velo = useChiusuraVelo(onChiuso);

  return (
    <Sovrapposizione>
    <div
      className="fixed inset-0 z-modal grid place-items-center overflow-y-auto bg-void/70 p-5 py-10 backdrop-blur-sm animate-rise-in"
      {...velo}
    >
      <form
        onSubmit={salva}
        className="w-full max-w-lg space-y-5 rounded-panel border border-hairline bg-glass-3 p-6 shadow-float backdrop-blur-2xl"
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
    </div>
    </Sovrapposizione>
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
