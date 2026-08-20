import { useMemo } from "react";
import Icon from "../app/Icon";
import { Pastiglie, Tendina } from "./Controlli";
import { FILTRI, elencoCategorie } from "../dati/serie";
import { elencoGeneri, elencoEditori } from "../dati/generi";
import { coloreLettore } from "../dati/lettori";
import { useSessione } from "../dati/sessione";
import Sovrapposizione from "./Sovrapposizione";
import useChiusuraVelo from "./useChiusuraVelo";

/**
 * Il pannello dei filtri: sidebar fissa su schermo largo, lastra a
 * comparsa sul telefono. Stesso contenuto nei due casi — cambia solo
 * come lo si raggiunge, perché una barra laterale sempre visibile su
 * un telefono ruberebbe la metà dello schermo alla griglia.
 *
 * A differenza della Biblioteca, che si guarda camminandoci dentro,
 * qui si comincia a restringere: stato dell'editore, generi, casa
 * editrice. Un pilastro alla volta finché non resta solo quello che
 * cerchi davvero.
 */
export default function FiltriCollezione({
  serie,
  filtroAttivo,
  onCambiaFiltro,
  conteggiFiltro,
  generiSelezionati,
  onCambiaGeneri,
  editoreAttivo,
  onCambiaEditore,
  categoriaAttiva,
  onCambiaCategoria,
  lettoreAttivo,
  onCambiaLettore,
  conteggiLettore,
  variante = "sidebar",
  onChiudere
}) {
  const { lettori } = useSessione();
  const generi = useMemo(() => elencoGeneri(serie), [serie]);
  const editori = useMemo(() => elencoEditori(serie), [serie]);
  const categorie = useMemo(() => elencoCategorie(serie), [serie]);
  const velo = useChiusuraVelo(onChiudere);

  // Un filtro con zero risultati (oggi "Sospese" e "Annullate" non
  // hanno nessuna serie) è solo un bottone morto: si nasconde, a meno
  // che non sia quello scelto — altrimenti selezionarlo e vederlo
  // sparire sembrerebbe un errore.
  const filtriVisibili = FILTRI.filter(
    (f) => f.id === "tutte" || f.id === filtroAttivo || (conteggiFiltro?.[f.id] ?? 0) > 0
  );

  const opzioniEditore = [
    { id: "tutti", etichetta: "Tutti gli editori" },
    ...editori.map((e) => ({ id: e.id, etichetta: `${e.etichetta} · ${e.quante}` }))
  ];

  // Una tendina e non delle pastiglie come i generi, per la stessa
  // ragione dell'editore: si sceglie **una** categoria alla volta —
  // un manga è scritto per un pubblico solo — e sei bottoni sempre
  // aperti per una scelta singola sono sei bottoni che occupano posto
  // anche quando non servono.
  const opzioniCategoria = [
    { id: "tutte", etichetta: "Tutte le categorie" },
    ...categorie.map((c) => ({ id: c.id, etichetta: `${c.etichetta} · ${c.quante}` }))
  ];

  function alternaGenere(id) {
    onCambiaGeneri(
      generiSelezionati.includes(id)
        ? generiSelezionati.filter((g) => g !== id)
        : [...generiSelezionati, id]
    );
  }

  const contenuto = (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
          Stato
        </h3>
        <Pastiglie
          opzioni={filtriVisibili}
          attiva={filtroAttivo}
          onCambia={onCambiaFiltro}
          conteggi={conteggiFiltro}
        />
      </div>

      {/* Chi l'ha letta.
          Compare solo se i lettori sono almeno due: con un lettore solo
          "lette da lui" e "lette" sono la stessa domanda, e il filtro
          sarebbe un bottone che non toglie niente.
          Colorato col colore della persona, lo stesso delle sue note:
          due modi diversi di dire "questo è di Nanaki" sarebbero due
          cose da imparare invece di una. */}
      {lettori.length > 1 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Chi l'ha letta
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {lettori.map((l) => {
              const attivo = String(lettoreAttivo) === String(l.id);
              const colore = coloreLettore(l.colore);
              const quante = conteggiLettore?.[l.id] ?? 0;

              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={attivo}
                  onClick={() => onCambiaLettore(attivo ? null : String(l.id))}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 ${colore.anello}
                    ${
                      attivo
                        ? `${colore.bordo} ${colore.fondo} ${colore.testo}`
                        : "border-hairline bg-glass-1 text-ink-muted hover:border-soft hover:text-ink-bright"
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${colore.pallino}`}
                  />
                  {l.nickname}
                  <span className="font-numeric text-[0.65rem] text-ink-faint">
                    {quante}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* La categoria sta prima dell'editore perché parla dell'opera,
          come i generi qui sotto; l'editore parla di chi l'ha stampata.
          Sparisce finché la colonna non è stata riempita
          (`scripts/categorie.js` sul backend): un filtro che non
          filtra niente è solo una tendina vuota da aprire. */}
      {categorie.length > 1 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Categoria
          </h3>
          <Tendina
            etichetta="Categoria"
            mostraEtichetta={false}
            valore={categoriaAttiva || "tutte"}
            opzioni={opzioniCategoria}
            onCambia={(v) => onCambiaCategoria(v === "tutte" ? null : v)}
          />
        </div>
      )}

      {editori.length > 1 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Editore
          </h3>
          <Tendina
            etichetta="Editore"
            mostraEtichetta={false}
            valore={editoreAttivo || "tutti"}
            opzioni={opzioniEditore}
            onCambia={(v) => onCambiaEditore(v === "tutti" ? null : v)}
          />
        </div>
      )}

      {generi.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Generi
            {generiSelezionati.length > 0 && (
              <button
                onClick={() => onCambiaGeneri([])}
                className="normal-case tracking-normal text-brass-400 hover:text-brass-300"
              >
                azzera ({generiSelezionati.length})
              </button>
            )}
          </h3>

          {/* Una nuvola, non un elenco: l'ordine per frequenza fa già
              capire cosa domina la collezione, senza bisogno di barre o
              percentuali qui — quelle vivono nell'analisi qui sopra. */}
          <div className="flex flex-wrap gap-1.5">
            {generi.map((g) => {
              const attivo = generiSelezionati.includes(g.id);

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => alternaGenere(g.id)}
                  aria-pressed={attivo}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                    ${
                      attivo
                        ? "border-brass-400 bg-brass-400 text-void"
                        : "border-hairline bg-glass-1 text-ink-muted hover:border-soft hover:text-ink-bright"
                    }`}
                >
                  {g.etichetta}
                  <span
                    className={`ml-1.5 font-numeric text-[0.65rem] ${
                      attivo ? "text-void/60" : "text-ink-faint"
                    }`}
                  >
                    {g.quante}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (variante === "sheet") {
    return (
      <Sovrapposizione>
        <div
          className="fixed inset-0 z-overlay flex items-end justify-center bg-void/70 p-0 backdrop-blur-sm animate-rise-in sm:items-center sm:p-5"
          {...velo}
        >
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-sheet border border-hairline bg-glass-3 p-6 backdrop-blur-2xl sm:rounded-sheet">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-bright">Filtri</h2>

              <button
                onClick={onChiudere}
                aria-label="Chiudi filtri"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright"
              >
                <Icon nome="close" dimensione={18} />
              </button>
            </div>

            {contenuto}

            <div className="mt-6 border-t border-hairline pt-5">
              <button
                onClick={onChiudere}
                className="w-full rounded-card bg-brass-400 px-4 py-2.5 text-sm font-semibold text-void transition-all duration-quick ease-spring hover:brightness-110 active:scale-95"
              >
                Mostra i risultati
              </button>
            </div>
          </div>
        </div>
      </Sovrapposizione>
    );
  }

  return (
    <aside className="hidden shrink-0 lg:block lg:w-72">
      <div className="sticky top-8 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl">
        {contenuto}
      </div>
    </aside>
  );
}
