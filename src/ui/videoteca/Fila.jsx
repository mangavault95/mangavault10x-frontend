import { Link } from "react-router-dom";
import Icon from "../../app/Icon";
import CartaAnime from "./CartaAnime";

/**
 * Un ripiano: un titoletto e una fila di copertine che scorre.
 *
 * Scorre in orizzontale e non va a capo, ed è la scelta che fa
 * funzionare la pagina personale su un telefono. Una griglia di
 * quaranta copertine è una pagina sola alta due metri in cui «film» e
 * «preferiti» non si raggiungono mai; quattro ripiani che scorrono
 * stanno in una schermata e mostrano che esistono.
 *
 * LA QUARTA COPERTINA È TAGLIATA APPOSTA. Una fila che finisce esatta
 * sul bordo sembra finita, e nessuno prova a trascinarla: il pezzo di
 * copertina che sporge è l'unica cosa che dice «ce n'è dell'altro».
 * Per questo la larghezza delle schede è fissa e il contenitore
 * sborda oltre il margine della pagina invece di fermarsi prima.
 *
 * `scroll-snap` allinea il trascinamento alle schede: senza, una fila
 * scorsa col pollice si ferma quasi sempre a metà di una copertina.
 */
export default function Fila({ titolo, quante, tutto, vuoto, children, azione }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
          {titolo}
          {quante > 0 && (
            <span className="ml-2 font-numeric text-sm font-normal text-quaderno-tenue">
              {quante}
            </span>
          )}
        </h2>

        {tutto && (
          <Link
            to={tutto}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-quaderno-blu hover:underline"
          >
            Vedi tutto
            <Icon nome="avanti" dimensione={15} />
          </Link>
        )}
      </div>

      {children ? (
        <ul className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
          {children}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-quaderno-riga px-4 py-6 text-center text-sm text-quaderno-tenue">
          {vuoto}
          {azione && <span className="mt-3 block">{azione}</span>}
        </p>
      )}
    </section>
  );
}

/** Una scheda dentro un ripiano: larghezza fissa, o la fila non scorre. */
export function Posto({ children }) {
  return <li className="w-[8.5rem] shrink-0 snap-start sm:w-40">{children}</li>;
}

/** Il caso normale: una serie della videoteca dentro un ripiano. */
export function PostoSerie({ serie }) {
  return (
    <Posto>
      <CartaAnime anime={serie} />
    </Posto>
  );
}

/**
 * Il quadrato col «più» in fondo ai preferiti.
 *
 * Sta in fondo e non in testa: in testa spingerebbe via la prima
 * copertina ogni volta, e la vetrina si guarda per quello che c'è
 * dentro, non per il modo di aggiungerci roba.
 */
export function PostoAggiungi({ testo, onClick, to }) {
  const dentro = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-quaderno-riga text-quaderno-tenue">
        <Icon nome="plus" dimensione={20} />
      </span>
      <span className="text-xs font-medium text-quaderno-tenue">{testo}</span>
    </>
  );

  const stile =
    "flex aspect-[3/4.6] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-quaderno-riga text-center transition-colors duration-quick hover:border-quaderno-blu hover:text-quaderno-inchiostro";

  return (
    <Posto>
      {to ? (
        <Link to={to} className={stile}>
          {dentro}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={stile}>
          {dentro}
        </button>
      )}
    </Posto>
  );
}
