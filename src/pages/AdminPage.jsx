import { useMemo, useState } from "react";
import Pagina from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { Errore } from "../ui/Stati";
import { useCollezione } from "../dati/collezione";
import {
  clearToken,
  eliminaManga,
  enrichManga,
  getToken,
  login as accedi,
  updateManga
} from "../services/api";
import { ETICHETTE_STATO } from "../dati/serie";

/**
 * Gestione: dove si correggono le schede.
 *
 * Rispetto a prima cambiano tre cose che contavano davvero.
 * Il modulo di accesso è un `form` vero, quindi Invio funziona e il
 * gestore delle password riconosce i campi. Le chiamate passano dal
 * layer API, che allega il token e ripulisce da solo quando scade —
 * prima l'indirizzo del server era scritto a mano in tre punti. E gli
 * esiti compaiono nella pagina invece che in una finestra `alert`,
 * che blocca tutto e sparisce senza lasciare traccia.
 */
export default function AdminPage() {
  const [autenticato, setAutenticato] = useState(() => Boolean(getToken()));

  if (!autenticato) {
    return <Accesso onEntrato={() => setAutenticato(true)} />;
  }

  return <Redazione onEsci={() => setAutenticato(false)} />;
}

/* ==================================================
   ACCESSO
   ================================================== */

function Accesso({ onEntrato }) {
  const [utente, setUtente] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  async function invia(e) {
    e.preventDefault();

    setInCorso(true);
    setErrore(null);

    try {
      const esito = await accedi(utente, password);

      if (esito?.token) {
        onEntrato();
      } else {
        setErrore("Credenziali non valide.");
      }
    } catch (e2) {
      setErrore(
        e2?.status === 401 ? "Credenziali non valide." : "Il server non risponde."
      );
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form
        onSubmit={invia}
        className="w-full max-w-sm space-y-5 rounded-panel border border-hairline bg-glass-2 p-8 backdrop-blur-xl animate-rise-in"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-bright">Gestione</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Serve l'accesso per modificare le schede.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Utente
          </span>

          <input
            value={utente}
            onChange={(e) => setUtente(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Password
          </span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        {errore && (
          <p role="alert" className="text-sm text-ember">
            {errore}
          </p>
        )}

        <Bottone type="submit" disabled={inCorso} className="w-full">
          {inCorso ? "Verifico…" : "Entra"}
        </Bottone>
      </form>
    </div>
  );
}

/* ==================================================
   REDAZIONE
   ================================================== */

function Redazione({ onEsci }) {
  const { serie, inCorso, errore, ricarica, aggiornaLocale, rimuoviLocale } = useCollezione();

  const [selezionataId, setSelezionataId] = useState(null);
  const [ricercaTesto, setRicerca] = useState("");
  // L'esito dell'eliminazione non può stare nella scheda: quella
  // sparisce insieme alla serie, e con lei il messaggio.
  const [eliminata, setEliminata] = useState(null);

  const ordinate = useMemo(
    () => [...serie].sort((a, b) => a.titolo.localeCompare(b.titolo, "it")),
    [serie]
  );

  const visibili = useMemo(() => {
    const testo = ricercaTesto.trim().toLowerCase();

    if (!testo) return ordinate;

    return ordinate.filter((s) =>
      `${s.titolo} ${s.autore || ""}`.toLowerCase().includes(testo)
    );
  }, [ordinate, ricercaTesto]);

  const selezionata = serie.find((s) => s.id === selezionataId) || null;

  function esci() {
    clearToken();
    onEsci();
  }

  if (errore) {
    return (
      <Pagina titolo="Gestione">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  return (
    <Pagina
      occhiello="Amministrazione"
      titolo="Gestione"
      sommario="Correggi le schede della collezione."
      azioni={
        <Bottone variante="fantasma" onClick={esci}>
          Esci
        </Bottone>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        {/* ---------- Elenco ---------- */}
        <div className="space-y-4">
          <CampoRicerca
            valore={ricercaTesto}
            onCambia={setRicerca}
            segnaposto="Filtra le schede…"
            risultati={visibili.length}
          />

          <div className="panel-scrollbar max-h-[32rem] overflow-y-auto rounded-panel border border-hairline bg-glass-1 backdrop-blur-xl lg:max-h-[calc(100dvh-16rem)]">
            {inCorso && !serie.length ? (
              <p className="px-4 py-6 text-sm text-ink-muted">Carico le schede…</p>
            ) : (
              <ul>
                {visibili.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelezionataId(s.id)}
                      aria-current={s.id === selezionataId ? "true" : undefined}
                      className={`flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left transition-colors duration-quick last:border-b-0 ${
                        s.id === selezionataId
                          ? "bg-brass-400/10 text-brass-300"
                          : "text-ink hover:bg-glass-2 hover:text-ink-bright"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{s.titolo}</span>

                      {/* Il pallino segnala le schede da finire: così
                          si vede da qui dove c'è lavoro da fare. */}
                      {(!s.trama || !s.editore || !s.totali) && (
                        <span
                          title="Scheda incompleta"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass-500"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------- Scheda ---------- */}
        {selezionata ? (
          <Scheda
            key={selezionata.id}
            serie={selezionata}
            tutteLeSerie={ordinate}
            onSalvata={(modifiche) => {
              aggiornaLocale(selezionata.id, modifiche);
              ricarica();
            }}
            onEliminata={(esito) => {
              rimuoviLocale(selezionata.id);
              setSelezionataId(null);
              setEliminata(esito);
              ricarica();
            }}
          />
        ) : (
          <div className="grid place-items-center rounded-panel border border-dashed border-soft bg-glass-1 p-12 text-center">
            {eliminata ? (
              <div role="status" className="space-y-1">
                <p className="text-sm text-ink-bright">
                  «{eliminata.eliminata}» è stata eliminata.
                </p>
                <p className="text-sm text-ink-muted">{riepilogoEliminazione(eliminata.insieme)}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                Scegli una scheda dall'elenco per modificarla.
              </p>
            )}
          </div>
        )}
      </div>
    </Pagina>
  );
}

/* ==================================================
   MODULO DI UNA SCHEDA
   ================================================== */

// I nomi che il server si aspetta nel corpo della richiesta. Non
// coincidono né con le colonne del database né con i nomi puliti che
// usa il resto del sito, quindi la traduzione sta qui, in un punto solo.
function corpoDaCampi(campi) {
  return {
    titolo: campi.titolo,
    autore: campi.autore,
    disegnatore: campi.disegnatore,
    editore: campi.editore,
    genere: campi.genere,
    coverurl: campi.coverurl,
    edizione: campi.edizione,
    trama: campi.trama,
    costo: campi.costo === "" ? null : Number(campi.costo),
    volumiposseduti: campi.volumiposseduti === "" ? null : Number(campi.volumiposseduti),
    volumitotali: campi.volumitotali === "" ? null : Number(campi.volumitotali),
    valutazione: campi.valutazione === "" ? null : Number(campi.valutazione),
    statoSerie: campi.statoSerie || null,
    preferito: campi.preferito
  };
}

/** «insieme a 3 acquisti e 2 letture» — al singolare quando è uno solo. */
function riepilogoEliminazione(insieme = {}) {
  const pezzi = [
    [insieme.acquisti, "acquisto", "acquisti"],
    [insieme.letture, "lettura", "letture"],
    [insieme.sessioni, "lettura in corso", "letture in corso"],
    [insieme.prezzi, "prezzo di mercato", "prezzi di mercato"]
  ]
    .filter(([quanti]) => quanti > 0)
    .map(([quanti, uno, molti]) => `${quanti} ${quanti === 1 ? uno : molti}`);

  if (pezzi.length === 0) return "Non c'era altro collegato.";

  return `Con lei se ne sono andati ${pezzi.join(", ").replace(/, ([^,]*)$/, " e $1")}.`;
}

function Scheda({ serie, tutteLeSerie, onSalvata, onEliminata }) {
  // Il collegamento si sceglie puntando a UNA sorella; quale delle
  // eventuali più sorelle è ininfluente, "salva" risolve comunque il
  // gruppo giusto (vedi sotto).
  const sorellaIniziale = tutteLeSerie.find(
    (s) => s.id !== serie.id && (s.operaId ?? s.id) === (serie.operaId ?? serie.id) && serie.operaId != null
  );

  const [campi, setCampi] = useState(() => ({
    titolo: serie.titolo || "",
    autore: serie.autore || "",
    disegnatore: serie.disegnatore || "",
    editore: serie.editore || "",
    genere: serie.generi.join(", "),
    coverurl: serie.copertina || "",
    edizione: serie.edizione || "",
    trama: serie.trama || "",
    costo: serie.costo ?? "",
    volumiposseduti: serie.posseduti ?? "",
    volumitotali: serie.totali ?? "",
    valutazione: serie.valutazione ?? "",
    statoSerie: serie.stato || "",
    preferito: serie.preferito,
    collegamento: sorellaIniziale ? String(sorellaIniziale.id) : ""
  }));

  const [stato, setStato] = useState(null); // { tipo, testo }
  const [salvando, setSalvando] = useState(false);
  const [compilando, setCompilando] = useState(false);

  const cambia = (chiave) => (e) =>
    setCampi((precedenti) => ({
      ...precedenti,
      [chiave]: e.target.type === "checkbox" ? e.target.checked : e.target.value
    }));

  async function salva(e) {
    e.preventDefault();

    setSalvando(true);
    setStato(null);

    try {
      // Il gruppo di un'edizione non è il suo id, è quello della
      // bersaglio scelta (o il proprio id, se la bersaglio non è
      // ancora collegata a nessuno): così due sorelle nuove finiscono
      // nello stesso gruppo di una terza già esistente, invece di
      // formarne uno separato.
      const bersaglio = tutteLeSerie.find((s) => String(s.id) === campi.collegamento);
      const operaId = bersaglio ? (bersaglio.operaId ?? bersaglio.id) : null;

      await updateManga(serie.id, { ...corpoDaCampi(campi), operaId });

      setStato({ tipo: "ok", testo: "Salvato." });

      onSalvata({
        titolo: campi.titolo,
        autore: campi.autore || null,
        copertina: campi.coverurl || null,
        trama: campi.trama || null,
        edizione: campi.edizione || null,
        operaId
      });
    } catch (e2) {
      setStato({
        tipo: "errore",
        testo:
          e2?.status === 401 || e2?.status === 403
            ? "Sessione scaduta: rientra dalla pagina Gestione."
            : e2?.message || "Salvataggio non riuscito."
      });
    } finally {
      setSalvando(false);
    }
  }

  /** Ricompila i campi vuoti dalle fonti esterne, senza toccare gli altri. */
  async function compila() {
    setCompilando(true);
    setStato(null);

    try {
      const dati = await enrichManga(campi.titolo, campi.autore);

      if (dati?.error) {
        setStato({ tipo: "errore", testo: "Nessun risultato dalle fonti esterne." });
      } else {
        setCampi((p) => ({
          ...p,
          autore: p.autore || dati.autore || "",
          disegnatore: p.disegnatore || dati.disegnatore || "",
          editore: p.editore || dati.editore || "",
          genere: p.genere || dati.genere || "",
          coverurl: p.coverurl || dati.coverurl || "",
          trama: p.trama || dati.trama || "",
          volumitotali: p.volumitotali || dati.volumitotali || "",
          statoSerie: p.statoSerie || dati.statoSerie || ""
        }));

        setStato({
          tipo: "ok",
          testo: "Campi vuoti compilati. Controlla e salva."
        });
      }
    } catch {
      setStato({ tipo: "errore", testo: "Il servizio di ricerca non ha risposto." });
    } finally {
      setCompilando(false);
    }
  }

  return (
    <div className="space-y-4">
    <form
      onSubmit={salva}
      className="space-y-6 rounded-panel border border-hairline bg-glass-1 p-6 backdrop-blur-xl"
    >
      <div className="flex flex-wrap gap-6">
        <div className="w-32 shrink-0">
          <Copertina src={campi.coverurl} alt={campi.titolo} inclina={false} />
        </div>

        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <CampoTesto etichetta="Titolo" valore={campi.titolo} onChange={cambia("titolo")} required />
          <CampoTesto etichetta="Autore" valore={campi.autore} onChange={cambia("autore")} />
          <CampoTesto etichetta="Disegnatore" valore={campi.disegnatore} onChange={cambia("disegnatore")} />
          <CampoTesto etichetta="Editore" valore={campi.editore} onChange={cambia("editore")} />
          <CampoTesto
            etichetta="Edizione"
            valore={campi.edizione}
            onChange={cambia("edizione")}
            placeholder="es. Perfect Edition — vuoto se standard/unica"
          />
          <CampoTesto
            etichetta="Generi"
            valore={campi.genere}
            onChange={cambia("genere")}
            className="sm:col-span-2"
          />
          <CampoTesto
            etichetta="URL copertina"
            valore={campi.coverurl}
            onChange={cambia("coverurl")}
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CampoTesto
          etichetta="Volumi posseduti"
          tipo="number"
          min="0"
          valore={campi.volumiposseduti}
          onChange={cambia("volumiposseduti")}
        />
        <CampoTesto
          etichetta="Volumi totali"
          tipo="number"
          min="0"
          valore={campi.volumitotali}
          onChange={cambia("volumitotali")}
        />
        <CampoTesto
          etichetta="Prezzo al volume"
          tipo="number"
          step="0.01"
          min="0"
          valore={campi.costo}
          onChange={cambia("costo")}
        />
        <CampoTesto
          etichetta="Voto"
          tipo="number"
          step="0.1"
          min="0"
          max="10"
          valore={campi.valutazione}
          onChange={cambia("valutazione")}
        />
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Stato serie
          </span>

          <select
            value={campi.statoSerie}
            onChange={cambia("statoSerie")}
            className="rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          >
            <option value="" className="bg-alcove">Non impostato</option>
            {Object.entries(ETICHETTE_STATO).map(([valore, etichetta]) => (
              <option key={valore} value={valore} className="bg-alcove">
                {etichetta}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Stessa opera di
          </span>

          <select
            value={campi.collegamento}
            onChange={cambia("collegamento")}
            className="max-w-xs rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          >
            <option value="" className="bg-alcove">Nessuna — edizione a sé</option>
            {tutteLeSerie
              .filter((s) => s.id !== serie.id)
              .map((s) => (
                <option key={s.id} value={s.id} className="bg-alcove">
                  {s.titolo}
                  {s.edizione ? ` (${s.edizione})` : ""}
                </option>
              ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 pb-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={campi.preferito}
            onChange={cambia("preferito")}
            className="h-4 w-4 accent-brass-400"
          />
          Preferito
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
          Trama
        </span>

        <textarea
          value={campi.trama}
          onChange={cambia("trama")}
          rows={7}
          className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm leading-relaxed text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
        />
      </label>

      {stato && (
        <p
          role="status"
          className={`text-sm ${stato.tipo === "ok" ? "text-jade" : "text-ember"}`}
        >
          {stato.testo}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Bottone type="submit" disabled={salvando}>
          {salvando ? "Salvo…" : "Salva"}
        </Bottone>

        <Bottone type="button" variante="secondario" onClick={compila} disabled={compilando}>
          {compilando ? "Cerco…" : "Compila i campi vuoti"}
        </Bottone>
      </div>
    </form>

    {/* Fuori dal modulo di proposito: un bottone che cancella non
        deve stare nella stessa cornice di uno che salva. */}
    <Eliminazione serie={serie} onEliminata={onEliminata} />
    </div>
  );
}

/* ==================================================
   ELIMINAZIONE
   ================================================== */

/**
 * Cancellare una scheda non ha un annulla: la riga sparisce e con lei
 * gli acquisti, le letture e i prezzi raccolti.
 *
 * Per questo il bottone non cancella: apre la domanda. Due gesti
 * separati, e in mezzo la frase che dice esattamente cosa si porta
 * via — che è più utile di una finestra `confirm` del browser, dove
 * il titolo non si può nemmeno leggere.
 */
function Eliminazione({ serie, onEliminata }) {
  const [chiesto, setChiesto] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState(null);

  async function elimina() {
    setInCorso(true);
    setErrore(null);

    try {
      onEliminata(await eliminaManga(serie.id));
    } catch (e) {
      setErrore(
        e?.status === 401 || e?.status === 403
          ? "Sessione scaduta: rientra dalla pagina Gestione."
          : e?.message || "Eliminazione non riuscita."
      );
      setInCorso(false);
    }
  }

  if (!chiesto) {
    return (
      <div className="flex justify-end">
        <Bottone type="button" variante="fantasma" onClick={() => setChiesto(true)}>
          Elimina questa scheda
        </Bottone>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-panel border border-ember/30 bg-ember/5 p-6">
      <div>
        <p className="text-sm font-semibold text-ink-bright">
          Eliminare «{serie.titolo}»?
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Spariscono anche gli acquisti registrati, le letture e i prezzi di mercato di
          questa serie. Non si può annullare.
        </p>
      </div>

      {errore && (
        <p role="alert" className="text-sm text-ember">
          {errore}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Bottone type="button" variante="pericolo" onClick={elimina} disabled={inCorso}>
          {inCorso ? "Elimino…" : "Sì, elimina"}
        </Bottone>

        <Bottone
          type="button"
          variante="fantasma"
          onClick={() => setChiesto(false)}
          disabled={inCorso}
        >
          Lascia stare
        </Bottone>
      </div>
    </div>
  );
}

function CampoTesto({ etichetta, tipo = "text", valore, onChange, className = "", ...resto }) {
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
