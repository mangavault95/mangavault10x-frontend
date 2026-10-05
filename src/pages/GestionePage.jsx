import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSessione } from "../dati/sessione";
import { ModuloAccesso } from "../dati/AccessoProvider";
import { Bottone } from "../ui/Controlli";
import GestioneManga from "../ui/gestione/GestioneManga";
import GestioneAnime from "../ui/gestione/GestioneAnime";
import RichiesteAccesso from "../ui/RichiesteAccesso";
import AccessoBiblioteca from "../ui/AccessoBiblioteca";

/**
 * GESTIONE — una sola, dal 05/10/2026.
 *
 * Ce n'erano due con lo stesso nome in due posti: `/admin` per le schede
 * dei manga (con un suo login a parte) e `/videoteca/gestione` per
 * stagioni e collegamenti degli anime. Chi cercava «dove correggo
 * questa cosa» doveva prima indovinare quale delle due, e se sbagliava
 * trovava una pagina che non c'entrava.
 *
 * Adesso è una pagina con tre linguette:
 *
 *   Manga    le schede della collezione: titolo, volumi, prezzo, trama
 *   Anime    le serie: stagioni da unire, manga collegato, serie da togliere
 *   Accessi  chi ha chiesto di entrare e chi c'è già (solo il proprietario)
 *
 * La linguetta sta nell'indirizzo (`?sezione=anime`), così i vecchi
 * indirizzi `/admin` e `/videoteca/gestione` — che ora rimandano qui —
 * aprono quella giusta, e tornando indietro si ritrova dov'eri.
 *
 * Il controllo dell'accesso è uno solo, in cima: senza un nome non si
 * corregge niente (le scritture sono di qualcuno). Chi è entrato ma non
 * ha la biblioteca vede solo gli anime, che sono suoi.
 */

const SEZIONI = [
  { id: "manga", etichetta: "Manga", sommario: "Correggi le schede della collezione." },
  { id: "anime", etichetta: "Anime", sommario: "Stagioni da unire, manga collegato, serie da togliere." },
  { id: "accessi", etichetta: "Accessi", sommario: "Chi ha chiesto di entrare e chi può scrivere." }
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
    if (s.id === "accessi") return proprietario;

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 sm:px-6">
      <h1 className="font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-ink-bright">
        Gestione
      </h1>
      <p className="mt-2 text-sm text-ink-muted">{attiva.sommario}</p>

      {/* Le linguette. Il numero delle richieste sta su «Accessi»: è
          l'unica cosa di tutta la Gestione che aspetta una risposta da
          una persona vera, e non deve poter passare inosservata. */}
      <div
        role="tablist"
        aria-label="Sezioni della gestione"
        className="mt-5 grid gap-1 rounded-2xl bg-alcove p-1"
        style={{ gridTemplateColumns: `repeat(${disponibili.length}, minmax(0, 1fr))` }}
      >
        {disponibili.map((s) => {
          const accesa = s.id === attiva.id;

          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={accesa}
              onClick={() => vai(s.id)}
              className={`relative rounded-xl py-2.5 text-sm font-semibold transition-colors duration-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 ${
                accesa ? "bg-ink-bright text-void" : "text-ink-muted hover:text-ink-bright"
              }`}
            >
              {s.etichetta}

              {s.id === "accessi" && richieste.length > 0 && (
                <span
                  aria-label={`${richieste.length} in attesa`}
                  className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1.5 align-middle font-numeric text-[0.7rem] font-bold text-void"
                >
                  {richieste.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6" role="tabpanel">
        {attiva.id === "manga" && <GestioneManga />}

        {attiva.id === "anime" && <GestioneAnime />}

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
