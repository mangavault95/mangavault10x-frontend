import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import { GrigliaSerie } from "../ui/CartaSerie";
import { CaricamentoGriglia, Errore, Vuoto } from "../ui/Stati";
import { CampoRicerca, Bottone } from "../ui/Controlli";
import FiltriCollezione from "../ui/FiltriCollezione";
import Icon from "../app/Icon";
import { avvisa } from "../dati/avvisi";
import { vibra } from "../dati/tatto";
import { useCollezione } from "../dati/collezione";
import { usePaginaViva } from "../dati/paginaViva";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { annullaAcquisti, registraAcquisto } from "../services/api";
import { idDa, generiDiSerie, editoreCanonico } from "../dati/generi";
import IndiceLettere from "../ui/IndiceLettere";
import { idLettera, letteraDi } from "../dati/lettere";
import {
  FILTRI,
  ORDINAMENTI,
  filtroPerId,
  lettaDa,
  numeroIt,
  ordinamentoPerId,
  prossimoVolume
} from "../dati/serie";
import { RigaSerie } from "../ui/collezione/RigaSerie";
import { ModuloNuovaSerie } from "../ui/collezione/ModuloNuovaSerie";

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
const SCORCIATOIE = ["tutte", "mancanti", "in-corso", "preferiti"];

const CHIAVE_VISTA = "mangavault:collezione:vista";

function vistaSalvata() {
  try {
    const v = localStorage.getItem(CHIAVE_VISTA);

    return v === "elenco" || v === "compatta" ? v : "copertine";
  } catch {
    return "copertine";
  }
}

/**
 * Vero quando la barra in cima va tolta di mezzo: si scorre verso il
 * basso, quindi si sta leggendo la lista e non cercando. Torna da sola
 * appena si risale (il gesto di chi vuole cercare) o si è in cima.
 *
 * `bloccata` la tiene ferma mentre la si sta usando — il cursore nel
 * campo, il menu aperto — perché sparire sotto le dita sarebbe peggio
 * che occupare spazio.
 */
function useBarraChePare(bloccata) {
  const [nascosta, setNascosta] = useState(false);
  // Nascosta sotto una scheda (routes.jsx) non ascolta lo scorrimento della
  // scheda: ogni cambio di stato qui ridisegnerebbe duecento copertine.
  const inVista = usePaginaViva();

  useEffect(() => {
    if (!inVista) return undefined;

    let ultimo = window.scrollY;

    // Niente `requestAnimationFrame`: il calcolo è due confronti, e
    // `setNascosta` con lo stesso valore non ridisegna niente.
    //
    // ⚠️ Le soglie erano 8 pixel, e sull'iPhone la barra «ballava» (02/11/2026):
    // l'inerzia e il rimbalzo elastico in fondo alla lista invertono la
    // direzione da soli per qualche pixel, e ogni inversione la faceva
    // scattare. Adesso serve un movimento vero (`SOGLIA`), e durante il
    // rimbalzo — oltre la cima o oltre il fondo — non si decide niente.
    const SOGLIA = 28;

    function alScorrimento() {
      const ora = window.scrollY;
      const fondo = document.documentElement.scrollHeight - window.innerHeight;

      if (ora < 80) {
        setNascosta(false);
        ultimo = ora;
        return;
      }

      // Il rimbalzo del fondo: la pagina «torna su» da sola.
      if (ora >= fondo - 2) return;

      const scarto = ora - ultimo;

      if (scarto > SOGLIA) setNascosta(true);
      else if (scarto < -SOGLIA) setNascosta(false);

      // Il punto di riferimento si sposta solo quando ha deciso, o quando
      // si continua nella stessa direzione: i tremolii non lo azzerano.
      if (Math.abs(scarto) > SOGLIA) ultimo = ora;
    }

    window.addEventListener("scroll", alScorrimento, { passive: true });

    return () => window.removeEventListener("scroll", alScorrimento);
  }, [inVista]);

  return nascosta && !bloccata;
}

/**
 * Ordine e vista, dietro un solo tasto.
 *
 * Si cambiano di rado, e come due controlli fissi occupavano una fascia
 * intera sopra le copertine. Qui sono due scelte brevi in un menu piccolo
 * che si chiude da sé appena se ne fa una.
 */
function MenuOrdineVista({ aperto, onApri, ordine, onOrdine, vista, onVista }) {
  const radice = useRef(null);

  useEffect(() => {
    if (!aperto) return undefined;

    const fuori = (e) => {
      if (!radice.current?.contains(e.target)) onApri(false);
    };
    const esc = (e) => e.key === "Escape" && onApri(false);

    document.addEventListener("pointerdown", fuori);
    document.addEventListener("keydown", esc);

    return () => {
      document.removeEventListener("pointerdown", fuori);
      document.removeEventListener("keydown", esc);
    };
  }, [aperto, onApri]);

  return (
    <div ref={radice} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onApri(!aperto)}
        aria-label="Ordina e cambia vista"
        aria-haspopup="menu"
        aria-expanded={aperto}
        className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-quick active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
          ${aperto ? "bg-ink-bright text-void" : "bg-alcove text-ink hover:text-ink-bright"}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 20V4m0 16-3-3m3 3 3-3M17 4v16m0-16-3 3m3-3 3 3" />
        </svg>
      </button>

      {aperto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-overlay mt-2 w-60 rounded-card border border-hairline bg-alcove p-1.5 shadow-float animate-rise-in"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wider text-ink-faint">Ordina per</p>

          {ORDINAMENTI.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === ordine}
              onClick={() => {
                onOrdine(o.id);
                onApri(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-sm text-ink hover:bg-glass-2 hover:text-ink-bright"
            >
              {o.etichetta}
              {o.id === ordine && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
            </button>
          ))}

          <div className="mx-1 my-1.5 border-t border-hairline" />

          <div className="grid grid-cols-3 gap-1 p-0.5">
            {[
              { id: "copertine", nome: "grid", etichetta: "Copertine" },
              { id: "compatta", nome: null, etichetta: "Solo cover" },
              { id: "elenco", nome: "menu", etichetta: "Elenco" }
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                role="menuitemradio"
                aria-checked={vista === v.id}
                onClick={() => {
                  onVista(v.id);
                  onApri(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-medium transition-colors duration-quick
                  ${vista === v.id ? "bg-ink-bright text-void" : "text-ink hover:bg-glass-2 hover:text-ink-bright"}`}
              >
                {v.nome ? (
                  <Icon nome={v.nome} dimensione={18} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {[3, 9.5, 16].flatMap((x) =>
                      [3, 9.5, 16].map((y) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="5" rx="1.2" />)
                    )}
                  </svg>
                )}
                {v.etichetta}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const [problema, setProblema] = useState(null);
  const [menuVistaAperto, setMenuVistaAperto] = useState(false);
  const [campoAttivo, setCampoAttivo] = useState(false);
  const barraNascosta = useBarraChePare(menuVistaAperto || campoAttivo);

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
    vista !== "elenco" && ordineAttivo === "titolo" && !ricercaTesto.trim() && risultati.length > 24;

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
    const numero = prossimoVolume(s);

    vibra("conferma");

    setProblema(null);
    setPrendendo(s.id);

    try {
      const esito = await eseguiProtetto(() => registraAcquisto(s.id, { volumi: [numero] }));

      const acquisti = esito?.acquisti || [];

      // La ricevuta è un avviso di sistema (`dati/avvisi.js`): si toglie
      // da sola e porta con sé «Annulla», che sa quali acquisti disfare
      // senza che la pagina debba ricordarselo in uno stato.
      avvisa({
        testo: `${s.titolo} ${numero} registrato`,
        azione: acquisti.length ? { etichetta: "Annulla", alTocco: () => annulla(acquisti) } : null,
        durata: 6000
      });
      ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema(`${s.titolo} ${numero} non è stato registrato.`);
    } finally {
      setPrendendo(null);
    }
  }

  async function annulla(acquisti) {
    if (!acquisti?.length) return;

    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(acquisti));
      ricarica();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    }
  }

  const cornice = (corpo) => (
    <div className="mx-auto w-full max-w-[110rem] px-3 pb-10 pt-1 sm:px-8 md:pt-4 lg:px-12">{corpo}</div>
  );

  if (errore) {
    return cornice(<Errore errore={errore} riprova={ricarica} />);
  }

  return cornice(
    <>
      {/* Titolo e conteggio solo da computer. Sul telefono dire «Collezione»
          è ripetere la linguetta accesa qui sopra e la barra in basso, e
          costava un quarto di schermo prima della prima copertina: il
          numero di serie sta nel segnaposto della ricerca, e «Aggiungi»
          è il tondo in basso. */}
      <header className="hidden items-end justify-between gap-4 md:flex">
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
      {/* Due fasce, non cinque: la ricerca col tasto dei filtri, e sotto le
          scorciatoie di stato con in fondo ordine e vista. Scorrendo verso
          il basso si ritira (vedi `useBarraChePare`), e le copertine
          prendono tutto lo schermo; risalendo ritorna. */}
      <div
        // Solo il campo di ricerca blocca la barra: un pulsante appena
        // toccato resta col fuoco, e la terrebbe ferma anche scorrendo.
        onFocus={(e) => e.target.tagName === "INPUT" && setCampoAttivo(true)}
        onBlur={() => setCampoAttivo(false)}
        className={`sticky top-0 z-sticky -mx-3 mt-1 space-y-2 bg-shelf/95 px-3 pb-2 pt-2 backdrop-blur-xl transition-transform duration-base ease-settle will-change-transform sm:-mx-8 sm:px-8 md:mt-4 lg:-mx-12 lg:px-12
          ${barraNascosta ? "-translate-y-full" : ""}`}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 sm:max-w-lg">
            <CampoRicerca
              valore={ricercaTesto}
              onCambia={(v) => aggiornaParametro("q", v)}
              segnaposto={serie.length ? `Cerca tra ${numeroIt(serie.length)} serie` : "Cerca…"}
              risultati={risultati.length}
              larghezzaPiena
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltriAperti(true)}
            aria-label={filtriFini > 0 ? `Filtri, ${filtriFini} attivi` : "Filtri"}
            className="relative grid h-11 w-11 shrink-0 place-items-center rounded-card border border-hairline bg-glass-1 text-ink-bright transition-colors duration-quick hover:border-soft active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
          >
            <svg
              width="18"
              height="18"
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
            {filtriFini > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brass-400 px-1 font-numeric text-micro font-bold leading-none text-void">
                {filtriFini}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Stato"
            className="no-scrollbar -ml-0 flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
          >
            {scorciatoie.map((f) => {
              const accesa = f.id === filtroAttivo;

              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={accesa}
                  onClick={() => aggiornaParametro("filtro", f.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-quick active:scale-95
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

          <MenuOrdineVista
            aperto={menuVistaAperto}
            onApri={setMenuVistaAperto}
            ordine={ordineAttivo}
            onOrdine={(v) => aggiornaParametro("ordine", v)}
            vista={vista}
            onVista={scegliVista}
          />
        </div>

        {/* Cosa vuol dire il colore dell'anello, detto una volta sola:
            prima si leggeva solo se lo si sapeva già. */}
        <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 px-1 text-micro text-ink-muted sm:px-0">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-jade" />Completa</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-lapis" />In pari con le uscite</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-ember" />Mancano volumi</span>
        </p>
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

      {/* Una riga sola, e solo quando c'è qualcosa da dire: con ricerca o
          filtri attivi, quante serie restano e come tornare a tutte. Con la
          lista intera non c'è niente da spiegare. */}
      {!filtroPulito && (
        <div className="mb-3 mt-1 flex items-center justify-between gap-3 px-1 text-sm text-ink-muted sm:px-0" aria-live="polite">
          <p>
            <span className="font-numeric text-ink-bright">{numeroIt(risultati.length)}</span>{" "}
            serie
          </p>

          <button
            type="button"
            onClick={() => setParametri({}, { replace: true })}
            className="rounded-lg px-2 py-1 font-medium text-brass-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
          >
            Azzera
          </button>
        </div>
      )}

      {/* «Aggiungi» sul telefono è un tondo fisso sopra la barra in basso,
          dove arriva il pollice, e non una voce dell'intestazione. */}
      {!bibliotecaSolaLettura && (
        <button
          type="button"
          onClick={() => setModaleAperto(true)}
          aria-label="Aggiungi una serie"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-sticky grid h-14 w-14 place-items-center rounded-full insegna transition-transform duration-quick active:scale-90
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf md:hidden"
        >
          <Icon nome="plus" dimensione={24} />
        </button>
      )}

      {problema && (
        <p role="alert" className="mb-3 rounded-card bg-ember/10 px-3.5 py-2.5 text-sm text-ember">
          {problema}
        </p>
      )}

      {inCorso && !serie.length ? (
        <CaricamentoGriglia />
      ) : risultati.length ? (
        vista === "elenco" ? (
          <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">
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
          <div className="space-y-7 pr-5">
            {gruppi.map((g) => (
              <section
                key={g.lettera}
                id={idLettera(g.lettera)}
                aria-label={`Titoli con ${g.lettera}`}
                className="scroll-mt-28"
              >
                <h2 className="mb-3 flex items-center gap-3 px-1 sm:px-0">
                  <span className="font-pixel text-2xl leading-none text-viola">{g.lettera}</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[rgb(var(--c-riga))] to-transparent" />
                </h2>

                <GrigliaSerie serie={g.serie} riempi lettore={lettoreAttivo} compatta={vista === "compatta"} />
              </section>
            ))}
            <IndiceLettere lettere={gruppi.map((g) => g.lettera)} />
          </div>
        ) : (
          /* Il lettore attivo non filtra soltanto: dice anche di chi
             sono il voto e le letture da disegnare sulle copertine.
             Senza, la selezione era la sua e i dati sopra erano di
             chi guardava. */
          <GrigliaSerie serie={risultati} riempi lettore={lettoreAttivo} compatta={vista === "compatta"} />
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
    </>
  );
}
