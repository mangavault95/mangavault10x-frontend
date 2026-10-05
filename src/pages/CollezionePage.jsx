import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import { GrigliaSerie } from "../ui/CartaSerie";
import { CaricamentoGriglia, Errore, Vuoto } from "../ui/Stati";
import { CampoRicerca, Tendina, Bottone } from "../ui/Controlli";
import FiltriCollezione from "../ui/FiltriCollezione";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import Sovrapposizione from "../ui/Sovrapposizione";
import useChiusuraVelo from "../ui/useChiusuraVelo";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import {
  annullaAcquisti,
  creaManga,
  dopoIlRipiego,
  enrichManga,
  registraAcquisto,
  urlCopertina
} from "../services/api";
import { idDa, generiDiSerie, editoreCanonico } from "../dati/generi";
import {
  FILTRI,
  ORDINAMENTI,
  filtroPerId,
  lettaDa,
  numeroIt,
  ordinamentoPerId,
  totaleDisponibile,
  volumiMancanti,
  votoDi,
  votoIt
} from "../dati/serie";

/**
 * COLLEZIONE — rifatta il 05/10/2026.
 *
 * Prima era una pagina «da studiare»: occhiello, un riquadro di Consigli,
 * una barra laterale di filtri, una carta con barra di progresso per ogni
 * serie anche quando era già completa. Bella da guardare, lenta da usare.
 *
 * Adesso serve a tre cose, nell'ordine in cui si fanno:
 *
 *   TROVARE   la ricerca e le scorciatoie di stato stanno ferme in cima
 *             mentre si scorre (Ti mancano · In corso · Concluse ·
 *             Preferiti); i filtri fini (genere, editore, chi l'ha letta)
 *             stanno dietro un solo tasto «Filtri»
 *   SFOGLIARE copertine, con le lettere dell'alfabeto a fare da capitoli;
 *             oppure un elenco compatto, per scorrere più titoli
 *   AGGIORNARE nell'elenco ogni serie a cui manca qualcosa ha il suo
 *             «+ N»: preso il volume N, un tocco, con Annulla
 *
 * I Consigli sono spariti: dicevano «prendi questa» mentre per sapere
 * cosa comprare c'è già «Da comprare».
 *
 * Ricerca, filtri e ordine vivono nell'indirizzo, non nello stato del
 * componente: una vista si salva nei preferiti, il tasto Indietro annulla
 * un filtro invece di buttarti fuori, e ricaricando resti dov'eri.
 */

// Le scorciatoie di stato sempre in vista. Le altre (sospese, brevi,
// autoconclusive…) restano nel foglio dei filtri.
const SCORCIATOIE = ["tutte", "mancanti", "in-corso", "concluse", "preferiti"];

const CHIAVE_VISTA = "mangavault:collezione:vista";

function vistaSalvata() {
  try {
    return localStorage.getItem(CHIAVE_VISTA) === "elenco" ? "elenco" : "copertine";
  } catch {
    return "copertine";
  }
}

// «A» per «Àncora», «#» per tutto ciò che non è una lettera («20th
// Century Boys»). Si cambia lettera quando cambia, non per gruppi
// calcolati prima: se l'ordine avesse un'eccezione il titolo non sparisce.
function letteraDi(titolo) {
  const prima = String(titolo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .charAt(0)
    .toUpperCase();

  return /[A-Z]/.test(prima) ? prima : "#";
}

export default function CollezionePage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();
  const { bibliotecaSolaLettura } = useSessione();
  const eseguiProtetto = useAccessoProtetto();
  const [parametri, setParametri] = useSearchParams();
  // `?nuova=<titolo>` apre il modulo già compilato col titolo: ci arriva
  // la pagina Cerca quando una serie in collezione non c'è.
  const [modaleAperto, setModaleAperto] = useState(() => parametri.has("nuova"));
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [vista, setVista] = useState(vistaSalvata);
  const [prendendo, setPrendendo] = useState(null);
  const [registrato, setRegistrato] = useState(null);
  const [problema, setProblema] = useState(null);

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

  // Il «Registrato» si toglie da solo: è una ricevuta, non una pagina.
  useEffect(() => {
    if (!registrato) return undefined;

    const t = setTimeout(() => setRegistrato(null), 9000);

    return () => clearTimeout(t);
  }, [registrato]);

  function scegliVista(v) {
    setVista(v);

    try {
      localStorage.setItem(CHIAVE_VISTA, v);
    } catch {
      /* senza memoria del browser la scelta vale solo per questa visita */
    }
  }

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

  // Azzera i filtri ma tiene la ricerca scritta e l'ordine scelto.
  function azzeraFiltri() {
    setParametri(
      (precedenti) => {
        const p = new URLSearchParams();

        for (const chiave of ["q", "ordine"]) {
          if (precedenti.get(chiave)) p.set(chiave, precedenti.get(chiave));
        }

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

  const volumiTotali = useMemo(() => serie.reduce((t, s) => t + s.posseduti, 0), [serie]);

  // I filtri «fini» sono quelli dietro il tasto: lo stato è già nelle
  // scorciatoie, e conta come attivo solo se non è «Tutte».
  const filtriFini = [
    generiSelezionati.length > 0,
    Boolean(editoreAttivo),
    Boolean(categoriaAttiva),
    Boolean(lettoreAttivo)
  ].filter(Boolean).length;

  const filtroPulito = !ricercaTesto && filtroAttivo === "tutte" && filtriFini === 0;

  // Le scorciatoie senza serie dentro si nascondono (oggi «Preferiti»
  // finché non ne segni uno), a meno che non sia quella scelta; se il
  // filtro scelto sta nel foglio, compare accanto alle altre.
  const scorciatoie = FILTRI.filter(
    (f) =>
      f.id === filtroAttivo ||
      f.id === "tutte" ||
      (SCORCIATOIE.includes(f.id) && (conteggi[f.id] ?? 0) > 0)
  ).sort((a, b) => {
    const pos = (f) => (SCORCIATOIE.includes(f.id) ? SCORCIATOIE.indexOf(f.id) : SCORCIATOIE.length);

    return pos(a) - pos(b);
  });

  // Le lettere si mostrano solo quando l'ordine è l'alfabeto, senza una
  // ricerca (che ha un suo ordine) e su una lista abbastanza lunga da
  // aver bisogno di capitoli.
  const conLettere =
    vista === "copertine" && ordineAttivo === "titolo" && !ricercaTesto.trim() && risultati.length > 24;

  const gruppi = useMemo(() => {
    if (!conLettere) return null;

    const out = [];

    for (const s of risultati) {
      const l = letteraDi(s.titolo);
      const ultimo = out[out.length - 1];

      if (ultimo && ultimo.lettera === l) ultimo.serie.push(s);
      else out.push({ lettera: l, serie: [s] });
    }

    return out;
  }, [conLettere, risultati]);

  async function preso(s) {
    const numero = s.posseduti + 1;

    setProblema(null);
    setPrendendo(s.id);

    try {
      const esito = await eseguiProtetto(() => registraAcquisto(s.id, { volumi: [numero] }));

      setRegistrato({ titolo: s.titolo, numero, acquisti: esito?.acquisti || [] });
      ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema(`${s.titolo} ${numero} non è stato registrato.`);
    } finally {
      setPrendendo(null);
    }
  }

  async function annulla() {
    if (!registrato?.acquisti?.length) return;

    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    }
  }

  const cornice = (corpo) => (
    <div className="mx-auto w-full max-w-[110rem] px-3 pb-10 pt-4 sm:px-8 lg:px-12">{corpo}</div>
  );

  if (errore) {
    return cornice(<Errore errore={errore} riprova={ricarica} />);
  }

  return cornice(
    <>
      <header className="flex items-end justify-between gap-4 px-1 sm:px-0">
        <div className="min-w-0">
          <h1 className="font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-ink-bright">
            Collezione
          </h1>

          <p className="mt-2 text-sm text-ink-muted">
            {inCorso && !serie.length ? (
              "Sto tirando giù le schede…"
            ) : (
              <>
                <span className="font-numeric">{numeroIt(serie.length)}</span> serie ·{" "}
                <span className="font-numeric">{numeroIt(volumiTotali)}</span> volumi
              </>
            )}
          </p>
        </div>

        {/* Aggiungere una serie vuol dire dire «questa ce l'abbiamo
            in casa»: è la cosa più di casa che ci sia, e chi di qua
            guarda soltanto non ha niente da aggiungere. */}
        {!bibliotecaSolaLettura && (
          <Bottone onClick={() => setModaleAperto(true)} className="shrink-0">
            <Icon nome="plus" dimensione={16} />
            Aggiungi
          </Bottone>
        )}
      </header>

      {/* La barra che resta in cima mentre si scorre: cercare e restringere
          sono le cose che si fanno a metà lista, non solo all'inizio. */}
      <div className="sticky top-0 z-sticky -mx-3 mt-4 space-y-2.5 bg-shelf/90 px-3 pb-2.5 pt-2 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 sm:max-w-lg">
            <CampoRicerca
              valore={ricercaTesto}
              onCambia={(v) => aggiornaParametro("q", v)}
              segnaposto="Titolo, autore, editore…"
              risultati={risultati.length}
              larghezzaPiena
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltriAperti(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm font-semibold text-ink-bright transition-colors duration-quick hover:border-soft active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2" />
              <circle cx="9" cy="17" r="2" />
            </svg>
            Filtri
            {filtriFini > 0 && (
              <span className="rounded-full bg-brass-400 px-1.5 py-0.5 font-numeric text-[0.65rem] leading-none text-void">
                {filtriFini}
              </span>
            )}
          </button>
        </div>

        <div
          role="group"
          aria-label="Stato"
          className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0"
        >
          {scorciatoie.map((f) => {
            const accesa = f.id === filtroAttivo;

            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={accesa}
                onClick={() => aggiornaParametro("filtro", f.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-quick active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                  ${accesa ? "bg-ink-bright text-void" : "bg-alcove text-ink hover:text-ink-bright"}`}
              >
                {f.etichetta}
                <span
                  className={`ml-1.5 font-numeric text-xs ${accesa ? "text-void/60" : "text-ink-faint"}`}
                >
                  {conteggi[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {modaleAperto && (
        <ModuloNuovaSerie
          tutteLeSerie={serie}
          titoloIniziale={parametri.get("nuova") || ""}
          onChiuso={() => {
            setModaleAperto(false);

            if (parametri.has("nuova")) {
              const altri = new URLSearchParams(parametri);
              altri.delete("nuova");
              setParametri(altri, { replace: true });
            }
          }}
          onCreata={ricarica}
        />
      )}

      {filtriAperti && (
        <FiltriCollezione
          serie={serie}
          filtroAttivo={filtroAttivo}
          onCambiaFiltro={(v) => aggiornaParametro("filtro", v)}
          conteggiFiltro={conteggi}
          generiSelezionati={generiSelezionati}
          onCambiaGeneri={aggiornaGeneri}
          editoreAttivo={editoreAttivo}
          onCambiaEditore={(v) => aggiornaParametro("editore", v)}
          categoriaAttiva={categoriaAttiva}
          onCambiaCategoria={(v) => aggiornaParametro("categoria", v)}
          lettoreAttivo={lettoreAttivo}
          onCambiaLettore={(v) => aggiornaParametro("lettore", v)}
          conteggiLettore={conteggiLettore}
          onAzzera={azzeraFiltri}
          risultati={risultati.length}
          onChiudere={() => setFiltriAperti(false)}
        />
      )}

      <div className="mb-4 mt-1 flex items-center justify-between gap-3 px-1 sm:px-0">
        <p className="whitespace-nowrap text-sm text-ink-muted" aria-live="polite">
          {filtroPulito ? null : (
            <>
              <span className="font-numeric">{numeroIt(risultati.length)}</span>{" "}
              serie
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <Tendina
            etichetta="Ordina"
            mostraEtichetta={false}
            className="w-36 sm:w-44"
            valore={ordineAttivo}
            opzioni={ORDINAMENTI}
            onCambia={(v) => aggiornaParametro("ordine", v)}
          />

          <div
            role="group"
            aria-label="Vista"
            className="flex rounded-card border border-hairline bg-glass-1 p-0.5"
          >
            {[
              { id: "copertine", nome: "grid", etichetta: "Copertine" },
              { id: "elenco", nome: "menu", etichetta: "Elenco" }
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={vista === v.id}
                aria-label={v.etichetta}
                title={v.etichetta}
                onClick={() => scegliVista(v.id)}
                className={`grid h-9 w-9 place-items-center rounded-[0.6rem] transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                  ${vista === v.id ? "bg-ink-bright text-void" : "text-ink-muted hover:text-ink-bright"}`}
              >
                <Icon nome={v.nome} dimensione={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {problema && (
        <p role="alert" className="mb-3 rounded-xl bg-ember/10 px-3.5 py-2.5 text-sm text-ember">
          {problema}
        </p>
      )}

      {inCorso && !serie.length ? (
        <CaricamentoGriglia />
      ) : risultati.length ? (
        vista === "elenco" ? (
          <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">
            {risultati.map((s) => (
              <RigaSerie
                key={s.id}
                serie={s}
                lettore={lettoreAttivo}
                occupata={prendendo === s.id}
                onPreso={bibliotecaSolaLettura ? null : () => preso(s)}
              />
            ))}
          </ul>
        ) : gruppi ? (
          <div className="space-y-7">
            {gruppi.map((g) => (
              <section key={g.lettera} aria-label={`Titoli con ${g.lettera}`}>
                <h2 className="mb-3 px-1 font-display text-lg font-bold text-ink-faint sm:px-0">
                  {g.lettera}
                </h2>

                <GrigliaSerie serie={g.serie} riempi lettore={lettoreAttivo} />
              </section>
            ))}
          </div>
        ) : (
          /* Il lettore attivo non filtra soltanto: dice anche di chi
             sono il voto e le letture da disegnare sulle copertine.
             Senza, la selezione era la sua e i dati sopra erano di
             chi guardava. */
          <GrigliaSerie serie={risultati} riempi lettore={lettoreAttivo} />
        )
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

      {registrato && (
        <div
          role="status"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-toast flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink-bright px-4 py-3 text-void shadow-lg md:bottom-6"
        >
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">
            {registrato.titolo} {registrato.numero} registrato
          </p>

          {registrato.acquisti.length > 0 && (
            <button
              type="button"
              onClick={annulla}
              className="shrink-0 text-sm font-bold underline underline-offset-2"
            >
              Annulla
            </button>
          )}

          <button
            type="button"
            onClick={() => setRegistrato(null)}
            aria-label="Chiudi"
            className="shrink-0 text-void/60"
          >
            <Icon nome="close" dimensione={16} />
          </button>
        </div>
      )}
    </>
  );
}

/* ==================================================
   LA RIGA DELL'ELENCO
   ================================================== */

function Miniatura({ src }) {
  const indirizzo = urlCopertina(src, 128);

  return indirizzo ? (
    <img
      src={indirizzo}
      alt=""
      loading="lazy"
      onError={dopoIlRipiego(() => {})}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-md bg-glass-2" />
  );
}

/**
 * Una serie in elenco: a colpo d'occhio titolo, quanti ne hai e cosa
 * manca; a destra, se manca qualcosa, il tasto per segnare che l'hai
 * preso. Una serie completa non ha tasti: non c'è niente da aggiornare.
 */
function RigaSerie({ serie, lettore, occupata, onPreso }) {
  const mancanti = volumiMancanti(serie);
  const totale = totaleDisponibile(serie);
  const completa = mancanti === 0;
  const voto = lettore ? votoDi(serie, lettore) : serie.valutazione;
  const numero = serie.posseduti + 1;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        to={lettore ? `/serie/${serie.id}?lettore=${lettore}` : `/serie/${serie.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      >
        <Miniatura src={serie.copertina} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">
            {serie.titolo}
            {serie.edizione && <span className="font-normal text-ink-muted"> · {serie.edizione}</span>}
          </p>

          <p className="truncate text-xs text-ink-muted">
            <span className="font-numeric">
              {serie.posseduti}
              {totale ? `/${totale}` : ""}
            </span>{" "}
            vol.
            {completa && (
              <span className="ml-1.5 font-medium text-jade">
                {serie.stato === "conclusa" ? "completa" : "in pari"}
              </span>
            )}
            {mancanti > 0 && (
              <span className="ml-1.5 font-medium text-ember">ne mancano {mancanti}</span>
            )}
            {serie.editore && <span> · {serie.editore}</span>}
          </p>
        </div>

        {voto > 0 && (
          <span className="shrink-0 font-numeric text-xs font-medium text-brass-300">
            {votoIt(voto)}★
          </span>
        )}
      </Link>

      {onPreso && !completa && (
        <button
          type="button"
          onClick={onPreso}
          disabled={occupata}
          aria-label={`Segna come preso il volume ${numero} di ${serie.titolo}`}
          className="shrink-0 rounded-xl bg-glass-2 px-3 py-2 font-numeric text-sm font-semibold text-ink-bright transition-transform duration-quick active:scale-95 disabled:opacity-60"
        >
          {occupata ? "…" : `+ ${numero}`}
        </button>
      )}
    </li>
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
function ModuloNuovaSerie({ tutteLeSerie, titoloIniziale = "", onChiuso, onCreata }) {
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
