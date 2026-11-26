import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Copertina from "../Copertina";
import Icon from "../../app/Icon";
import { Bottone, CampoRicerca } from "../Controlli";
import { Errore } from "../Stati";
import { useCollezione } from "../../dati/collezione";
import { eliminaManga, enrichManga, setCopertinaVolume, updateManga } from "../../services/api";
import { ricaricaCopertineVolumi, useCopertinaVolume } from "../../dati/copertineVolumi";
import { CATEGORIE, ETICHETTE_STATO } from "../../dati/serie";
import { idLettera, letteraDi } from "../../dati/lettere";
import IndiceLettere from "../IndiceLettere";

/**
 * I manga: dove si correggono le schede della collezione.
 *
 * Dal 05/10/2026 è una linguetta della Gestione unica (`GestionePage`):
 * il login, il titolo e «Esci» stanno nella pagina sopra, e gli accessi
 * (richieste e persone) hanno la loro linguetta — erano in cima a questa,
 * a spingere giù l'elenco delle schede.
 *
 * Quello che cambia qui:
 *   - «Da finire»: un filtro che mostra solo le schede a cui manca la
 *     trama, l'editore o il numero di volumi. Prima c'era un pallino
 *     senza spiegazione, e su un telefono (dove non c'è il passaggio del
 *     mouse) nessuno poteva sapere cosa volesse dire;
 *   - la scheda ha una barra con «Salva» sempre a portata di pollice, che
 *     si accende solo quando c'è qualcosa da salvare. Prima «Salva» stava
 *     in fondo a un modulo di otto schermate;
 *   - i campi che si toccano di rado (disegnatore, edizione, copertina,
 *     categoria…) stanno dietro «Altri dati».
 */
export default function GestioneManga() {
  const { serie, inCorso, errore, ricarica, aggiornaLocale, rimuoviLocale } = useCollezione();

  const [parametri] = useSearchParams();
  const [selezionataId, setSelezionataId] = useState(() => parametri.get("serie") || null);
  const [ricercaTesto, setRicerca] = useState("");
  const [soloDaFinire, setSoloDaFinire] = useState(false);
  // L'esito dell'eliminazione non può stare nella scheda: quella
  // sparisce insieme alla serie, e con lei il messaggio.
  const [eliminata, setEliminata] = useState(null);

  const ordinate = useMemo(
    () => [...serie].sort((a, b) => a.titolo.localeCompare(b.titolo, "it")),
    [serie]
  );

  const quanteDaFinire = useMemo(() => ordinate.filter(daFinire).length, [ordinate]);

  const visibili = useMemo(() => {
    const testo = ricercaTesto.trim().toLowerCase();

    return ordinate.filter(
      (s) =>
        (!soloDaFinire || daFinire(s)) &&
        (!testo || `${s.titolo} ${s.autore || ""}`.toLowerCase().includes(testo))
    );
  }, [ordinate, ricercaTesto, soloDaFinire]);

  // L'elenco a capitoli, come la rubrica: una lettera, le sue schede. Si
  // cambia capitolo quando cambia la lettera e non per gruppi calcolati
  // prima — vedi `letteraDi`.
  const gruppi = useMemo(() => {
    const capitoli = [];

    for (const s of visibili) {
      const lettera = letteraDi(s.titolo);
      const ultimo = capitoli[capitoli.length - 1];

      if (ultimo?.lettera === lettera) ultimo.serie.push(s);
      else capitoli.push({ lettera, serie: [s] });
    }

    return capitoli;
  }, [visibili]);

  const selezionata = serie.find((s) => String(s.id) === String(selezionataId)) || null;

  if (errore) return <Errore errore={errore} riprova={ricarica} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      {/* ---------- Elenco ----------
          Su schermo largo l'elenco e la scheda stanno affiancati, e
          l'elenco resta lì mentre si corregge. Su uno stretto si ritira
          quando una scheda è aperta: è la stessa colonna che a turno
          mostra l'una o l'altra cosa, come un telefono con la posta. */}
      <div className={`space-y-3 ${selezionata ? "hidden lg:block" : ""}`}>
        <CampoRicerca
          valore={ricercaTesto}
          onCambia={setRicerca}
          segnaposto="Cerca una scheda…"
          risultati={visibili.length}
        />

        <div className="flex gap-2">
          {[
            { chiave: false, etichetta: "Tutte", quante: ordinate.length },
            { chiave: true, etichetta: "Da finire", quante: quanteDaFinire }
          ].map((f) => (
            <button
              key={String(f.chiave)}
              type="button"
              onClick={() => setSoloDaFinire(f.chiave)}
              aria-pressed={soloDaFinire === f.chiave}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-quick ${
                soloDaFinire === f.chiave ? "bg-ink-bright text-void" : "bg-alcove text-ink hover:text-ink-bright"
              }`}
            >
              {f.etichetta} <span className="font-numeric opacity-70">{f.quante}</span>
            </button>
          ))}
        </div>

        {/* Sul telefono l'elenco scorre con la pagina: una scatola con la
            sua barra dentro la pagina erano due scorrimenti uno nell'altro,
            e il pollice non sa quale dei due sta muovendo. Il riquadro
            scorrevole c'è solo dove l'elenco sta accanto alla scheda. */}
        <div className="panel-scrollbar rounded-card bg-alcove lg:max-h-[calc(100dvh-18rem)] lg:overflow-y-auto">
          {inCorso && !serie.length ? (
            <p className="px-4 py-6 text-sm text-ink-muted">Carico le schede…</p>
          ) : visibili.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">
              {soloDaFinire ? "Nessuna scheda da finire: è tutto a posto." : "Nessuna scheda con questo nome."}
            </p>
          ) : (
            gruppi.map((g) => (
              <section key={g.lettera} id={idLettera(g.lettera)}>
                <h3
                  aria-hidden="true"
                  className="sticky top-[env(safe-area-inset-top,0px)] z-[1] rounded-t-card bg-alcove px-4 pb-1 pt-3 font-numeric text-micro font-semibold tracking-[0.14em] text-brass-300 lg:top-0"
                >
                  {g.lettera}
                </h3>

                <ul>
                  {g.serie.map((s) => (
                    <li key={s.id}>
                      <RigaScheda
                        serie={s}
                        scelta={String(s.id) === String(selezionataId)}
                        onScegli={() => setSelezionataId(s.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* L'indice A–Z, solo dove l'elenco è a tutta pagina e solo quando
            c'è davvero da saltare: con una ricerca o un filtro acceso le
            lettere sarebbero poche e cambierebbero a ogni tasto. */}
        {!selezionata && !ricercaTesto && !soloDaFinire && gruppi.length > 4 && (
          <div className="lg:hidden">
            <IndiceLettere lettere={gruppi.map((g) => g.lettera)} />
          </div>
        )}
      </div>

      {/* ---------- Scheda ---------- */}
      {selezionata ? (
        <div className="min-w-0 space-y-4">
          {/* La via di ritorno all'elenco, solo dove l'elenco è stato
              tolto di mezzo: da schermo largo è ancora lì accanto. */}
          <button
            type="button"
            onClick={() => setSelezionataId(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright lg:hidden"
          >
            <Icon nome="back" dimensione={16} />
            Tutte le schede
          </button>

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
        </div>
      ) : (
        <div className="hidden place-items-center rounded-card border border-dashed border-soft p-12 text-center lg:grid">
          {eliminata ? (
            <div role="status" className="space-y-1">
              <p className="text-sm text-ink-bright">«{eliminata.eliminata}» è stata eliminata.</p>
              <p className="text-sm text-ink-muted">{riepilogoEliminazione(eliminata.insieme)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Scegli una scheda dall'elenco per modificarla.</p>
          )}
        </div>
      )}

      {/* Su telefono, dove l'elenco ha preso tutto lo schermo, l'esito
          di un'eliminazione compare sopra l'elenco. */}
      {!selezionata && eliminata && (
        <p role="status" className="rounded-card bg-alcove px-4 py-3 text-sm text-ink-muted lg:hidden">
          «{eliminata.eliminata}» è stata eliminata. {riepilogoEliminazione(eliminata.insieme)}
        </p>
      )}
    </div>
  );
}

/**
 * Una scheda è da finire quando le manca una delle tre cose che servono a una serie.
 *
 * Il totale non conta per le serie IN CORSO: finché l'autore non ha
 * finito non esiste, e chiederlo (o accettare uno 0) le lasciava per
 * sempre «da finire». Quanti ne sono usciti in Italia non si scrive a
 * mano: lo tiene aggiornato da solo il controllo settimanale.
 */
const daFinire = (s) => !s.trama || !s.editore || (s.stato !== "in_corso" && !s.totali);

/**
 * Cosa manca a una scheda, in parole: «trama», «editore», «totale».
 *
 * È la stessa regola di `daFinire` ma dice QUALE: un'etichetta «da finire»
 * costringeva ad aprire ogni scheda per scoprire cosa mancasse, e su un
 * telefono, dove non c'è un passaggio del mouse a spiegarlo, non c'era altro
 * modo di saperlo.
 */
function cosaManca(s) {
  const manca = [];

  if (!s.trama) manca.push("trama");
  if (!s.editore) manca.push("editore");
  if (s.stato !== "in_corso" && !s.totali) manca.push("totale");

  return manca;
}

/**
 * Una riga dell'elenco: copertina, titolo, una riga di numeri e — se
 * qualcosa manca — cosa.
 *
 * La copertina serve a riconoscere la scheda a colpo d'occhio: fra duecento
 * titoli, molti dei quali con lo stesso nome e un'edizione diversa, è la
 * cosa che si riconosce prima.
 */
function RigaScheda({ serie, scelta, onScegli }) {
  const manca = cosaManca(serie);

  const dettaglio = [
    serie.posseduti != null ? `${serie.posseduti}${serie.totali ? `/${serie.totali}` : ""} vol.` : null,
    serie.editore
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onScegli}
      aria-current={scelta ? "true" : undefined}
      className={`flex w-full items-center gap-3 border-b border-hairline py-2.5 pl-4 pr-10 text-left transition-colors duration-quick last:border-b-0 lg:pr-4 ${
        scelta ? "bg-brass-400/10 text-brass-300" : "text-ink hover:bg-glass-2 hover:text-ink-bright"
      }`}
    >
      <span className="w-10 shrink-0">
        <Copertina src={serie.copertina} alt="" inclina={false} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{serie.titolo}</span>

        {dettaglio && <span className="block truncate text-xs text-ink-muted">{dettaglio}</span>}

        {manca.length > 0 && (
          <span className="mt-1 inline-block rounded-md bg-brass-400/15 px-2 py-0.5 font-numeric text-micro font-medium text-brass-300">
            manca {manca[0]}
            {manca.length > 1 ? ` +${manca.length - 1}` : ""}
          </span>
        )}
      </span>

      <Icon nome="back" dimensione={16} className="shrink-0 rotate-180 text-ink-muted" />
    </button>
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
    // Vuota significa «non lo so», non «nessuna»: il server traduce la
    // stringa vuota in NULL, che è quello che il vincolo si aspetta.
    categoria: campi.categoria,
    coverurl: campi.coverurl,
    edizione: campi.edizione,
    trama: campi.trama,
    costo: campi.costo === "" ? null : Number(campi.costo),
    volumiposseduti: campi.volumiposseduti === "" ? null : Number(campi.volumiposseduti),
    volumitotali: campi.volumitotali === "" ? null : Number(campi.volumitotali),
    // Il voto non è più un campo della scheda: è di una persona, e si
    // dà dalle stelle della serie. Qui non ha più senso — quale dei due
    // voti sarebbe?
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
    categoria: serie.categoria || "",
    coverurl: serie.copertina || "",
    edizione: serie.edizione || "",
    trama: serie.trama || "",
    costo: serie.costo ?? "",
    volumiposseduti: serie.posseduti ?? "",
    volumitotali: serie.totali ?? "",
    statoSerie: serie.stato || "",
    preferito: serie.preferito,
    collegamento: sorellaIniziale ? String(sorellaIniziale.id) : ""
  }));

  // Com'era l'ultima volta che è stato salvato: «Salva» si accende solo
  // quando i campi sono diversi da questo.
  const [salvato, setSalvato] = useState(() => JSON.stringify(campi));
  const sporco = JSON.stringify(campi) !== salvato;

  const [stato, setStato] = useState(null); // { tipo, testo }
  const [salvando, setSalvando] = useState(false);
  const [compilando, setCompilando] = useState(false);

  const cambia = (chiave) => (e) => {
    setStato(null);
    setCampi((precedenti) => ({
      ...precedenti,
      [chiave]: e.target.type === "checkbox" ? e.target.checked : e.target.value
    }));
  };

  // Per i contatori (+ e −), che non hanno un evento da leggere.
  const imposta = (chiave, valore) => {
    setStato(null);
    setCampi((precedenti) => ({ ...precedenti, [chiave]: valore }));
  };

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

      setSalvato(JSON.stringify(campi));
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
            ? "Sessione scaduta: esci e rientra da «Tu»."
            : e2?.message || "Salvataggio non riuscito."
      });
    } finally {
      setSalvando(false);
    }
  }

  // I campi che «Completa dai dati online» sa riempire, con il nome che
  // hanno per chi legge. Sono quelli di `compila` qui sotto: se se ne
  // aggiunge uno là, va scritto anche qui.
  const vuoti = [
    ["autore", "autore"],
    ["disegnatore", "disegnatore"],
    ["editore", "editore"],
    ["genere", "generi"],
    ["coverurl", "copertina"],
    ["trama", "trama"],
    ["volumitotali", "totale"],
    ["statoSerie", "stato"]
  ]
    .filter(([chiave]) => !campi[chiave])
    .map(([, nome]) => nome);

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
      <form onSubmit={salva} className="space-y-5 rounded-card bg-alcove p-4 sm:p-6">
        <div className="flex gap-4 sm:gap-6">
          <div className="w-24 shrink-0 sm:w-32">
            <Copertina src={campi.coverurl} alt={campi.titolo} inclina={false} />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 content-start gap-4">
            <CampoTesto etichetta="Titolo" valore={campi.titolo} onChange={cambia("titolo")} required />
            <CampoTesto etichetta="Autore" valore={campi.autore} onChange={cambia("autore")} />
          </div>
        </div>

        {/* Il completamento automatico sta qui e non nella barra in fondo:
            nella barra accanto a «Salva» era un secondo bottone pieno, e
            quando «Salva» è spento (cioè quasi sempre) era l'unico acceso, e
            sembrava lui il comando principale. Dice anche cosa riempirà. */}
        <button
          type="button"
          onClick={compila}
          disabled={compilando || vuoti.length === 0}
          className="flex w-full items-center gap-3 rounded-card bg-brass-400/10 px-4 py-3 text-left transition-colors duration-quick hover:bg-brass-400/15
            disabled:pointer-events-none disabled:bg-glass-1 disabled:opacity-70
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <span aria-hidden="true" className="text-brass-300">
            <Icon nome="scintilla" dimensione={22} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink-bright">
              {compilando ? "Cerco…" : "Completa dai dati online"}
            </span>
            <span className="block text-xs text-ink-muted">
              {vuoti.length === 0 ? "Nessun campo vuoto" : `Compila solo i campi vuoti: ${vuoti.join(", ")}`}
            </span>
          </span>
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoTesto etichetta="Editore" valore={campi.editore} onChange={cambia("editore")} />

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Stato serie
            </span>

            <select
              value={campi.statoSerie}
              onChange={cambia("statoSerie")}
              className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
            >
              <option value="" className="bg-alcove">Non impostato</option>
              {Object.entries(ETICHETTE_STATO).map(([valore, etichetta]) => (
                <option key={valore} value={valore} className="bg-alcove">
                  {etichetta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Contatore
            etichetta="Posseduti"
            valore={campi.volumiposseduti}
            onCambia={(v) => imposta("volumiposseduti", v)}
            // «Completa» solo quando il totale è noto e raggiunto: per una
            // serie in corso il totale è 0 o vuoto, e non si completa mai.
            segno={
              Number(campi.volumitotali) > 0 && Number(campi.volumiposseduti) >= Number(campi.volumitotali)
                ? "Completa"
                : null
            }
          />
          <Contatore
            etichetta="Totali"
            valore={campi.volumitotali}
            onCambia={(v) => imposta("volumitotali", v)}
          />
          <CampoTesto
            etichetta="Prezzo €"
            tipo="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            valore={campi.costo}
            onChange={cambia("costo")}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
            Trama
          </span>

          <textarea
            value={campi.trama}
            onChange={cambia("trama")}
            rows={5}
            // Cresce con il testo: una trama lunga non si legge dentro cinque
            // righe con una barra dentro la scheda, che a sua volta scorre.
            style={{ fieldSizing: "content" }}
            className="w-full min-h-32 rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm leading-relaxed text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />
        </label>

        {/* Quello che si tocca di rado. Chiuso, per non mettere otto
            campi davanti a chi viene solo a correggere un numero. */}
        <details className="group rounded-card border border-hairline">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-bright">
            <span>
              Altri dati{" "}
              <span className="font-normal text-ink-muted">· disegnatore, edizione, copertina, generi…</span>
            </span>
            <span aria-hidden="true" className="text-ink-muted transition-transform duration-quick group-open:rotate-180">
              ▾
            </span>
          </summary>

          <div className="grid grid-cols-1 gap-4 border-t border-hairline p-4 sm:grid-cols-2">
            <CampoTesto etichetta="Disegnatore" valore={campi.disegnatore} onChange={cambia("disegnatore")} />
            <CampoTesto
              etichetta="Edizione"
              valore={campi.edizione}
              onChange={cambia("edizione")}
              placeholder="es. Perfect Edition — vuoto se standard"
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

            {/* La categoria è il PUBBLICO dell'opera, non il genere: la
                riempie `scripts/categorie.js` sul backend leggendola da
                AnimeClick, e qui si corregge quando la scheda altrui
                sbaglia o quando manca del tutto. */}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
                Categoria
              </span>

              <select
                value={campi.categoria}
                onChange={cambia("categoria")}
                className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
              >
                <option value="" className="bg-alcove">Non impostata</option>
                {Object.entries(CATEGORIE).map(([valore, { etichetta }]) => (
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
                className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
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

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={campi.preferito}
                onChange={cambia("preferito")}
                className="h-4 w-4 accent-brass-400"
              />
              Preferito
            </label>
          </div>
        </details>

        {/* La barra delle azioni resta attaccata al fondo dello schermo
            mentre si scorre il modulo: «Salva» non va cercato in fondo, e
            si accende solo quando c'è davvero qualcosa da salvare. Sopra
            la barra di navigazione del telefono, non dietro. */}
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-raised md:bottom-4">
          <div className="flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-shelf/95 p-2.5 shadow-raised backdrop-blur-xl">
            <Bottone type="submit" disabled={salvando || !sporco}>
              {salvando ? "Salvo…" : "Salva"}
            </Bottone>

            <p
              role="status"
              className={`ml-auto text-xs ${
                stato ? (stato.tipo === "ok" ? "text-jade" : "text-ember") : sporco ? "text-brass-300" : "text-ink-muted"
              }`}
            >
              {stato ? stato.testo : sporco ? "Modifiche non salvate" : "Niente da salvare"}
            </p>
          </div>
        </div>
      </form>

      {/* Fuori dal modulo di proposito: un bottone che cancella non
          deve stare nella stessa cornice di uno che salva. */}
      <CopertineVolumi serie={serie} />

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
/**
 * La copertina di ogni volume, a mano.
 *
 * Quelle che il sito mostra nelle letture, in «Da comprare» e in «Adesso» le
 * legge da sole il giro di AnimeClick, e per le serie che hanno cambiato
 * edizione (Yu-Gi-Oh!, Stella cadente in pieno giorno) ne prende a volte una
 * sbagliata o quella vecchia. Qui si sceglie l'indirizzo di quella giusta,
 * volume per volume: una scelta a mano il giro non la riscrive più, e
 * «Togli» la rimette a AnimeClick. I volumi che non si toccano restano come
 * sono, quindi la copertina della vecchia edizione resta sui vecchi e la
 * nuova va solo sui nuovi.
 */
function CopertineVolumi({ serie }) {
  const [tutti, setTutti] = useState(false);

  const massimo = Math.max(serie.totali || 0, ...(serie.numeri || []), 0);
  const elenco = tutti
    ? Array.from({ length: Math.min(massimo, 200) }, (_, i) => i + 1)
    : [...(serie.numeri || [])].sort((a, b) => a - b);

  return (
    <details className="group rounded-card bg-alcove">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink-bright sm:px-6">
        <span>
          Copertine dei volumi{" "}
          <span className="font-normal text-ink-muted">· correggi quella di un volume</span>
        </span>
        <span aria-hidden="true" className="text-ink-muted transition-transform duration-quick group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-3 border-t border-hairline p-4 sm:p-6">
        <p className="text-xs leading-relaxed text-ink-muted">
          Incolla l'indirizzo dell'immagine (https, da qualsiasi sito). Quella
          scelta qui il giro automatico non la cambia più; «Togli» la rimette a AnimeClick.
        </p>

        {elenco.length === 0 && <p className="text-sm text-ink-muted">Nessun volume in casa.</p>}

        <ul className="space-y-3">
          {elenco.map((n) => (
            <RigaCopertinaVolume key={n} serie={serie} numero={n} />
          ))}
        </ul>

        {massimo > 0 && (
          <button
            type="button"
            onClick={() => setTutti((v) => !v)}
            className="bersaglio text-sm font-semibold text-brass-300"
          >
            {tutti ? "Solo i volumi in casa" : "Mostra tutti i volumi"}
          </button>
        )}
      </div>
    </details>
  );
}

function RigaCopertinaVolume({ serie, numero }) {
  const attuale = useCopertinaVolume(serie.id, numero, serie.copertina, 128);
  const [indirizzo, setIndirizzo] = useState("");
  const [lavoro, setLavoro] = useState(false);
  const [stato, setStato] = useState(null);

  async function manda(valore) {
    setLavoro(true);
    setStato(null);

    try {
      await setCopertinaVolume(serie.id, numero, valore);
      ricaricaCopertineVolumi();
      setIndirizzo("");
      setStato({ tipo: "ok", testo: valore ? "Copertina salvata." : "Tolta: torna quella di AnimeClick al prossimo giro." });
    } catch (e) {
      setStato({ tipo: "errore", testo: e?.message || "Non è stato possibile salvare." });
    } finally {
      setLavoro(false);
    }
  }

  return (
    <li className="flex items-start gap-3">
      <div className="w-12 shrink-0">
        <Copertina src={attuale} alt={`${serie.titolo}, volume ${numero}`} inclina={false} />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-ink-bright">Volume {numero}</p>

        <div className="flex flex-wrap gap-2">
          <input
            type="url"
            inputMode="url"
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder="https://…"
            aria-label={`Indirizzo della copertina del volume ${numero}`}
            className="min-w-0 flex-1 rounded-card border border-hairline bg-glass-1 px-3 py-2 text-sm text-ink-bright outline-none transition-colors duration-quick hover:border-soft focus:border-brass-400/60"
          />

          <Bottone type="button" disabled={lavoro || !indirizzo.trim()} onClick={() => manda(indirizzo.trim())}>
            Usa
          </Bottone>

          <Bottone type="button" variante="secondario" disabled={lavoro} onClick={() => manda(null)}>
            Togli
          </Bottone>
        </div>

        {stato && (
          <p role="status" className={`text-xs ${stato.tipo === "ok" ? "text-jade" : "text-ember"}`}>
            {stato.testo}
          </p>
        )}
      </div>
    </li>
  );
}

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
          ? "Sessione scaduta: esci e rientra da «Tu»."
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

/**
 * Un numero di volumi con il − e il + ai lati.
 *
 * Posseduti e Totali si correggono di uno alla volta («ho comprato il 14»),
 * e su un telefono la tastiera numerica per aggiungere un'unità è più
 * lenta del tocco. Il campo resta scrivibile per i salti grandi.
 */
function Contatore({ etichetta, valore, onCambia, segno = null }) {
  const n = valore === "" || valore == null ? null : Number(valore);

  const bottone =
    "grid h-11 place-items-center text-brass-300 transition-colors duration-quick hover:bg-glass-2 active:bg-glass-3 " +
    "disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-400";

  return (
    <div className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
        {segno && (
          <span className="rounded-md bg-brass-400/15 px-1.5 py-0.5 font-numeric text-micro font-semibold tracking-[0.06em] text-brass-300">
            {segno}
          </span>
        )}
      </span>

      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center overflow-hidden rounded-card border border-hairline bg-glass-1 transition-colors duration-quick focus-within:border-brass-400/60 hover:border-soft">
        <button
          type="button"
          aria-label={`Diminuisci: ${etichetta.toLowerCase()}`}
          disabled={!n}
          onClick={() => onCambia(String(Math.max(0, (n ?? 0) - 1)))}
          className={bottone}
        >
          <Icon nome="meno" dimensione={18} />
        </button>

        <input
          type="number"
          inputMode="numeric"
          min="0"
          aria-label={etichetta}
          value={valore ?? ""}
          onChange={(e) => onCambia(e.target.value)}
          className="w-full min-w-0 bg-transparent px-1 py-2.5 text-center font-numeric text-sm text-ink-bright outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <button
          type="button"
          aria-label={`Aumenta: ${etichetta.toLowerCase()}`}
          onClick={() => onCambia(String((n ?? 0) + 1))}
          className={bottone}
        >
          <Icon nome="plus" dimensione={18} />
        </button>
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
