import { useMemo } from "react";
import { Bottone, Pastiglie, Tendina } from "./Controlli";
import { FILTRI, elencoCategorie } from "../dati/serie";
import { elencoGeneri, elencoEditori } from "../dati/generi";
import { coloreLettore } from "../dati/lettori";
import { useSessione } from "../dati/sessione";
import Foglio from "./Foglio";

/**
 * Il foglio dei filtri, dietro il tasto «Filtri» della Collezione.
 *
 * Fino al 05/10/2026 su schermo largo c'era anche una barra laterale
 * fissa con lo stesso contenuto: via, ruba un quarto della pagina alla
 * griglia e i due modi di arrivarci erano due cose da tenere uguali.
 * Ora è un foglio solo, sul telefono come sul computer.
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
  onAzzera,
  risultati,
  onChiudere
}) {
  const { lettoriBiblioteca: lettori } = useSessione();
  const generi = useMemo(() => elencoGeneri(serie), [serie]);
  const editori = useMemo(() => elencoEditori(serie), [serie]);
  const categorie = useMemo(() => elencoCategorie(serie), [serie]);

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
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95 [@media(hover:none)]:min-h-11 [@media(hover:none)]:px-3.5 [@media(hover:none)]:text-sm
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
          {/* Col dito ogni pastiglia è alta 44 px (le classi `hover:none` qui
              sotto) e un poco più distante dalle vicine: a 26 px, fitte
              così, si prendeva quella accanto. */}
          <div className="flex flex-wrap gap-1.5 [@media(hover:none)]:gap-2">
            {generi.map((g) => {
              const attivo = generiSelezionati.includes(g.id);

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => alternaGenere(g.id)}
                  aria-pressed={attivo}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95 [@media(hover:none)]:min-h-11 [@media(hover:none)]:px-3.5 [@media(hover:none)]:text-sm
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

  // Le due azioni stanno in fondo al foglio, sotto il pollice, e non più
  // in cima (13/11/2026): «Azzera» era accanto alla ×, nel punto più
  // lontano dalla mano, e il bottone che chiude era in fondo a un elenco
  // da scorrere tutto. Adesso restano ferme mentre i filtri scorrono, e
  // «Mostra N serie» dice il risultato prima ancora di chiudere.
  return (
    <Foglio
      titolo="Filtri"
      onChiudere={onChiudere}
      azioni={
        <>
          {onAzzera && (
            <Bottone variante="secondario" onClick={onAzzera} className="min-h-12">
              Azzera
            </Bottone>
          )}

          <Bottone onClick={onChiudere} className="min-h-12 flex-1">
            {risultati != null ? `Mostra ${risultati} serie` : "Mostra i risultati"}
          </Bottone>
        </>
      }
    >
      {contenuto}
    </Foglio>
  );
}
