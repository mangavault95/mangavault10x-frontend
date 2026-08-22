import { useState } from "react";
import { Bottone } from "./Controlli";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { coloreLettore } from "../dati/lettori";
import { dataIt } from "../dati/serie";
import { creaNota, eliminaNota, modificaNota } from "../services/api";

/**
 * Le note su una serie, di tutti e due, riconoscibili dal colore.
 *
 * Lo stesso blocco compare in due posti diversi e non è un caso:
 * si SCRIVE dal libro aperto in "in lettura", dove la nota nasce, e si
 * RILEGGE dalla scheda della serie in collezione, dove resta anche
 * quando la lettura è finita o mollata. Un solo componente, o le due
 * viste finirebbero per dire le stesse cose in due modi.
 *
 * Le note si leggono in due ma si scrivono solo le proprie: il colore
 * serve proprio a questo — dice chi parla prima che si legga il nome.
 * Il nome resta comunque scritto, piccolo: chi il colore non lo
 * distingue non deve restare senza risposta.
 */
export default function NoteSerie({ serie, compatto = false }) {
  const { aggiornaNote } = useCollezione();
  const { utente, bibliotecaSolaLettura } = useSessione();
  const eseguiProtetto = useAccessoProtetto();

  const [inScrittura, setInScrittura] = useState(false);
  const [bozza, setBozza] = useState("");
  const [inModifica, setInModifica] = useState(null);
  const [problema, setProblema] = useState(null);
  const [occupato, setOccupato] = useState(false);

  const note = serie?.note || [];

  async function salvaNuova() {
    const testo = bozza.trim();
    if (!testo) return;

    setProblema(null);
    setOccupato(true);

    try {
      const risposta = await eseguiProtetto(() => creaNota(serie.id, testo));

      // La nota torna dal server con l'identificativo e il colore di chi
      // l'ha scritta: metterla in elenco a mano vorrebbe dire inventarli.
      aggiornaNote(serie.id, [...note, risposta.nota]);

      setBozza("");
      setInScrittura(false);
    } catch (e) {
      if (!e?.annullato) setProblema("La nota non è stata salvata.");
    } finally {
      setOccupato(false);
    }
  }

  async function salvaModifica(nota) {
    const testo = bozza.trim();

    if (!testo) return;

    if (testo === nota.testo) {
      setInModifica(null);
      return;
    }

    setProblema(null);
    setOccupato(true);

    try {
      await eseguiProtetto(() => modificaNota(nota.id, testo));

      aggiornaNote(
        serie.id,
        note.map((n) =>
          n.id === nota.id ? { ...n, testo, aggiornataIl: new Date().toISOString() } : n
        )
      );

      setInModifica(null);
      setBozza("");
    } catch (e) {
      if (!e?.annullato) setProblema("La correzione non è stata salvata.");
    } finally {
      setOccupato(false);
    }
  }

  async function togli(nota) {
    setProblema(null);

    // Sparisce subito: una nota che resta sullo schermo dopo che hai
    // premuto "togli" fa premere di nuovo.
    aggiornaNote(serie.id, note.filter((n) => n.id !== nota.id));

    try {
      await eseguiProtetto(() => eliminaNota(nota.id));
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito a togliere la nota.");
      aggiornaNote(serie.id, note);
    }
  }

  return (
    <div className={compatto ? "space-y-2.5" : "space-y-3"}>
      {problema && (
        <p role="alert" className="text-xs text-ember">
          {problema}
        </p>
      )}

      {note.length === 0 && !inScrittura && (
        <p className="text-sm text-ink-faint">
          {bibliotecaSolaLettura
            ? "Nessuna nota su questa serie: le note della biblioteca le scrive la casa."
            : "Nessuna nota su questa serie."}
        </p>
      )}

      <ul className={compatto ? "space-y-2" : "space-y-2.5"}>
        {note.map((nota) => {
          const colore = coloreLettore(nota.colore);
          const mia = utente?.id === nota.utenteId;
          const inCorrezione = inModifica === nota.id;

          return (
            <li
              key={nota.id}
              className={`rounded-card border ${colore.bordo} ${colore.fondo} px-3.5 py-2.5`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${colore.pallino}`}
                />
                <span className={`text-xs font-semibold ${colore.testo}`}>
                  {nota.nickname}
                </span>

                {nota.creataIl && (
                  <time dateTime={nota.creataIl} className="text-xs text-ink-faint">
                    {dataIt(nota.creataIl)}
                  </time>
                )}

                {mia && !inCorrezione && !bibliotecaSolaLettura && (
                  <span className="ml-auto flex shrink-0 gap-1">
                    <MiniAzione
                      onClick={() => {
                        setInModifica(nota.id);
                        setBozza(nota.testo);
                      }}
                    >
                      Modifica
                    </MiniAzione>
                    <MiniAzione pericolo onClick={() => togli(nota)}>
                      Togli
                    </MiniAzione>
                  </span>
                )}
              </div>

              {inCorrezione ? (
                <Compositore
                  valore={bozza}
                  onCambia={setBozza}
                  onSalva={() => salvaModifica(nota)}
                  onAnnulla={() => {
                    setInModifica(null);
                    setBozza("");
                  }}
                  occupato={occupato}
                  etichettaSalva="Salva"
                />
              ) : (
                // `whitespace-pre-wrap`: chi scrive una nota va a capo
                // dove vuole, e mangiargli gli a capo cambia quello che
                // ha scritto.
                <p className="whitespace-pre-wrap break-words text-sm text-ink">
                  {nota.testo}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Le note della biblioteca si leggono in tre e si scrivono in
          due: chi di qua sta guardando non ha un colore in questa
          stanza, e un pensiero senza un colore non si sa di chi è. */}
      {bibliotecaSolaLettura ? null : inScrittura ? (
        <Compositore
          valore={bozza}
          onCambia={setBozza}
          onSalva={salvaNuova}
          onAnnulla={() => {
            setInScrittura(false);
            setBozza("");
          }}
          occupato={occupato}
          fuocoSubito
          etichettaSalva="Salva la nota"
          segnaposto="Cosa vuoi ricordarti di questa serie?"
        />
      ) : (
        !inModifica && (
          <Bottone
            variante="secondario"
            onClick={() => {
              setInScrittura(true);
              setBozza("");
            }}
            className={compatto ? "!px-3 !py-1.5 !text-xs" : ""}
          >
            Scrivi una nota
          </Bottone>
        )
      )}
    </div>
  );
}

/* ==================================================
   IL CAMPO
   ================================================== */

function Compositore({
  valore,
  onCambia,
  onSalva,
  onAnnulla,
  occupato,
  fuocoSubito = false,
  etichettaSalva,
  segnaposto = "…"
}) {
  return (
    <div className="space-y-2">
      <textarea
        // Il fuoco va messo solo quando il campo è comparso perché l'hai
        // chiesto tu: è l'unico caso in cui aprire la tastiera del
        // telefono da sola non è un'invadenza.
        autoFocus={fuocoSubito}
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        onKeyDown={(e) => {
          // Invio va a capo, perché una nota è testo. Si salva col
          // tasto, o con Ctrl/⌘+Invio per chi scrive alla tastiera.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSalva();
          }

          if (e.key === "Escape") onAnnulla();
        }}
        rows={3}
        maxLength={2000}
        placeholder={segnaposto}
        aria-label="Testo della nota"
        className="w-full resize-y rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright
                   placeholder:text-ink-faint outline-none transition-colors duration-quick
                   hover:border-soft focus:border-brass-400/60 focus:bg-glass-2"
      />

      <div className="flex items-center gap-2">
        <Bottone
          onClick={onSalva}
          disabled={occupato || !valore.trim()}
          className="!px-3 !py-1.5 !text-xs"
        >
          {etichettaSalva}
        </Bottone>

        <Bottone
          variante="fantasma"
          onClick={onAnnulla}
          className="!px-3 !py-1.5 !text-xs"
        >
          Annulla
        </Bottone>
      </div>
    </div>
  );
}

function MiniAzione({ pericolo = false, children, ...resto }) {
  return (
    <button
      type="button"
      className={`rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2
                  ${
                    pericolo
                      ? "hover:text-ember focus-visible:ring-ember"
                      : "hover:text-ink-bright focus-visible:ring-brass-400"
                  }`}
      {...resto}
    >
      {children}
    </button>
  );
}
