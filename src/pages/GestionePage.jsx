import { useState } from "react";
import { useSearchParams } from "react-router";
import { useSessione } from "../dati/sessione";
import { ModuloAccesso } from "../dati/AccessoProvider";
import { Bottone } from "../ui/Controlli";
import Icon from "../app/Icon";
import GestioneManga from "../ui/gestione/GestioneManga";
import GestioneAnime from "../ui/gestione/GestioneAnime";
import RichiesteAccesso from "../ui/RichiesteAccesso";
import AccessoBiblioteca from "../ui/AccessoBiblioteca";
import CopiaDati from "../ui/gestione/CopiaDati";

/**
 * GESTIONE — una sola, dal 05/10/2026.
 *
 * Ce n'erano due con lo stesso nome in due posti: `/admin` per le schede
 * dei manga (con un suo login a parte) e `/videoteca/gestione` per
 * stagioni e collegamenti degli anime. Chi cercava «dove correggo
 * questa cosa» doveva prima indovinare quale delle due, e se sbagliava
 * trovava una pagina che non c'entrava.
 *
 * Adesso è una pagina con quattro sezioni, in due gruppi (26/11/2026):
 *
 *   Manga    le schede della collezione: titolo, volumi, prezzo, trama
 *   Anime    le serie: stagioni da unire, manga collegato, serie da togliere
 *
 *   Sistema (solo il proprietario)
 *   Accessi  chi ha chiesto di entrare e chi c'è già
 *   Copia    scarica una copia dei dati
 *
 * Il gruppo «Sistema» non sta più nella stessa fila di Manga e Anime: le
 * prime due si usano ogni giorno per correggere quello che c'è, le altre
 * due amministrano il sito, e quattro linguette della stessa forma dicevano
 * che erano la stessa cosa. Da Manga e Anime si arriva al Sistema da un
 * tasto in cima; dentro, una freccia riporta alla Gestione.
 *
 * La linguetta sta nell'indirizzo (`?sezione=anime`), così i vecchi
 * indirizzi `/admin` e `/videoteca/gestione` — che ora rimandano qui —
 * aprono quella giusta, e tornando indietro si ritrova dov'eri.
 *
 * Il controllo dell'accesso è uno solo, in cima: senza un nome non si
 * corregge niente (le scritture sono di qualcuno). Chi è entrato ma non
 * ha la biblioteca vede solo gli anime, che sono suoi.
 */

const PRINCIPALI = ["manga", "anime"];
const DI_SISTEMA = ["accessi", "copia"];

const SEZIONI = [
  { id: "manga", etichetta: "Manga", sommario: "Correggi le schede della collezione." },
  { id: "anime", etichetta: "Anime", sommario: "Stagioni da unire, manga collegato, serie da togliere." },
  { id: "accessi", etichetta: "Accessi", sommario: "Chi ha chiesto di entrare e chi può scrivere." },
  { id: "copia", etichetta: "Copia", sommario: "Scarica una copia dei vostri dati." }
];

export default function GestionePage() {
  const { utente, bibliotecaSolaLettura, richieste } = useSessione();
  const [parametri, setParametri] = useSearchParams();
  const [accessoAperto, setAccessoAperto] = useState(false);

  const proprietario = Boolean(utente?.proprietario);

  // Chi vede cosa: i manga solo a chi può scrivere in biblioteca, gli
  // accessi solo al proprietario. Gli anime sono di tutti: sono tuoi.
  const disponibili = SEZIONI.filter((s) => {
    if (s.id === "manga") return !bibliotecaSolaLettura;
    if (s.id === "accessi" || s.id === "copia") return proprietario;

    return true;
  });

  const richiesta = parametri.get("sezione");
  const attiva = disponibili.find((s) => s.id === richiesta) ?? disponibili[0];

  function vai(id) {
    const nuovi = new URLSearchParams(parametri);
    nuovi.set("sezione", id);
    setParametri(nuovi, { replace: true });
  }

  if (!utente) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-14 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-bright">Gestione</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Per correggere schede, stagioni e collegamenti bisogna prima dire chi sei: quello che si
          scrive è sempre di qualcuno.
        </p>

        <Bottone onClick={() => setAccessoAperto(true)} className="mt-6">
          Entra o registrati
        </Bottone>

        {accessoAperto && (
          <ModuloAccesso
            motivo="Per correggere schede e serie."
            onRiuscito={() => setAccessoAperto(false)}
            onAnnulla={() => setAccessoAperto(false)}
          />
        )}
      </div>
    );
  }

  const inSistema = DI_SISTEMA.includes(attiva.id);
  const gruppo = disponibili.filter((s) => (inSistema ? DI_SISTEMA : PRINCIPALI).includes(s.id));
  const primaria = disponibili.find((s) => PRINCIPALI.includes(s.id));

  // Il numero delle richieste sta sul tasto «Sistema» e su «Accessi»: è
  // l'unica cosa di tutta la Gestione che aspetta una risposta da una
  // persona vera, e non deve poter passare inosservata.
  const pallino = (
    <span
      aria-label={`${richieste.length} in attesa`}
      className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1.5 align-middle font-numeric text-micro font-bold text-void"
    >
      {richieste.length}
    </span>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 sm:px-6">
      {inSistema && primaria && (
        <button
          type="button"
          onClick={() => vai(primaria.id)}
          className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 rounded-card pr-3 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <Icon nome="back" dimensione={20} />
          Gestione
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-ink-bright">
          {inSistema ? "Sistema" : "Gestione"}
        </h1>

        {proprietario && !inSistema && (
          <button
            type="button"
            onClick={() => vai(DI_SISTEMA[0])}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-hairline bg-alcove px-4 text-sm font-semibold text-ink-bright transition-colors duration-quick hover:border-soft
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
          >
            <Icon nome="settings" dimensione={16} />
            Sistema
            {richieste.length > 0 && pallino}
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-ink-muted">{attiva.sommario}</p>

      {/* Le linguette del gruppo in cui si è: Manga e Anime, oppure
          Accessi e Copia. */}
      <div
        role="tablist"
        aria-label={inSistema ? "Sezioni del sistema" : "Sezioni della gestione"}
        className="mt-5 grid gap-1 rounded-card bg-alcove p-1"
        style={{ gridTemplateColumns: `repeat(${gruppo.length}, minmax(0, 1fr))` }}
      >
        {gruppo.map((s) => {
          const accesa = s.id === attiva.id;

          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={accesa}
              onClick={() => vai(s.id)}
              className={`relative rounded-card py-2.5 text-sm font-semibold transition-colors duration-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 ${
                accesa ? "bg-ink-bright text-void" : "text-ink-muted hover:text-ink-bright"
              }`}
            >
              {s.etichetta}

              {s.id === "accessi" && richieste.length > 0 && <span className="ml-1.5">{pallino}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6" role="tabpanel">
        {attiva.id === "manga" && <GestioneManga />}

        {attiva.id === "anime" && <GestioneAnime />}

        {attiva.id === "copia" && <CopiaDati />}

        {attiva.id === "accessi" && (
          <div className="space-y-6">
            {/* Chi ha chiesto di entrare, se c'è qualcuno, e chi c'è già:
                iscriversi dà la videoteca, la biblioteca la apre il
                proprietario a mano, una persona alla volta. */}
            <RichiesteAccesso />

            <AccessoBiblioteca />
          </div>
        )}
      </div>
    </div>
  );
}
