import { Link } from "react-router-dom";
import { Bottone } from "../ui/Controlli";

/**
 * L'indirizzo sbagliato.
 *
 * Una pagina 404 che dice solo "404" lascia in mezzo alla strada.
 * Questa dice cos'è successo e offre le due uscite che servono:
 * tornare allo scaffale o cercare quello che si stava cercando.
 */
export default function NonTrovataPage() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-5 text-center">
      <div className="max-w-md space-y-5">
        <p className="font-numeric text-6xl font-semibold text-brass-400/30">404</p>

        <h1 className="font-display text-2xl font-semibold text-ink-bright">
          Questo scaffale è vuoto
        </h1>

        <p className="text-sm text-ink-muted">
          L'indirizzo non corrisponde a nessuna pagina del sito. Può essere un
          link vecchio, o un refuso.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/">
            <Bottone>Torna allo scaffale</Bottone>
          </Link>

          <Link to="/collezione">
            <Bottone variante="secondario">Sfoglia la collezione</Bottone>
          </Link>
        </div>
      </div>
    </div>
  );
}
