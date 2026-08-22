import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../app/Icon";
import { vaiAlConfronto } from "../../dati/cineforum";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";
import Esagono from "./Esagono";

/**
 * La testata di una pagina personale.
 *
 * Una fascia con dentro l'esagono e il soprannome, e sotto — a destra
 * — il tastino che apre i collegamenti. È il disegno che è stato
 * chiesto, e le due parti fanno due lavori diversi:
 *
 *   LA FASCIA dice DI CHI è questa pagina. Su un sito dove si guarda
 *   la videoteca degli altri è la prima cosa da sapere, e va detta in
 *   grande: senza, una pagina di copertine sembra sempre la propria.
 *
 *   IL TASTINO tiene le quattro cose che non stanno nella pagina —
 *   preferiti, classifica, commenti, confronto — senza occupare
 *   quattro righe di schermo. Non è una barra di navigazione: sono
 *   modi diversi di guardare la stessa persona, e stanno bene sotto un
 *   gesto solo.
 */

export default function TestaProfilo({ persona, sommario, altrePersone = [], mia = false }) {
  const [menu, setMenu] = useState(false);

  const base = `/videoteca/chi/${encodeURIComponent(persona.nickname)}`;

  return (
    <>
      <header className="-mx-3 border-y border-quaderno-riga bg-quaderno-foglio px-3 py-7 text-center sm:mx-0 sm:rounded-card sm:border">
        <Esagono
          nickname={persona.nickname}
          colore={persona.colore}
          dimensione={92}
          className="mx-auto"
        />

        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-quaderno-inchiostro">
          {persona.nickname}
        </h1>

        {sommario && <p className="mt-1 text-sm text-quaderno-tenue">{sommario}</p>}

        {mia && (
          <p className="mt-1 text-xs text-quaderno-tenue">
            Questa è la tua pagina — gli altri la vedono così
          </p>
        )}
      </header>

      {/* Il tastino sporge sotto la fascia, allineato a destra: sta
          dove sta il pollice di chi tiene il telefono con una mano. */}
      <div className="-mt-4 mb-1 flex justify-end pr-1">
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-haspopup="dialog"
          aria-label={`Altro su ${persona.nickname}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-quaderno-riga bg-quaderno-foglio text-quaderno-tenue shadow-sm transition-colors duration-quick hover:text-quaderno-inchiostro
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          <Icon nome="menu" dimensione={18} />
        </button>
      </div>

      {menu && (
        <MenuProfilo
          base={base}
          persona={persona}
          altrePersone={altrePersone}
          chiudi={() => setMenu(false)}
        />
      )}
    </>
  );
}

/**
 * Il foglio dei collegamenti.
 *
 * Passa da `Sovrapposizione` e non è un semplice `fixed inset-0`: in
 * questo sito `<main>` porta un'animazione con dentro un `transform`,
 * e un antenato trasformato fa smettere ai discendenti `fixed` di
 * ancorarsi allo schermo — il foglio comparirebbe a metà della pagina
 * invece che in fondo, lontano dal bottone appena premuto.
 *
 * Tre voci portano da qualche parte e una — il confronto — ha bisogno
 * di sapere CON CHI, quindi apre un secondo passo invece di
 * indovinare. Se al mondo c'è una persona sola oltre a questa, il
 * secondo passo si salta: chiedere di scegliere fra un'opzione è una
 * domanda inutile.
 */
function MenuProfilo({ base, persona, altrePersone, chiudi }) {
  const navigate = useNavigate();
  const velo = useChiusuraVelo(chiudi);
  const [scegliendo, setScegliendo] = useState(false);

  const candidati = altrePersone.filter((p) => p.id !== persona.id);

  function versoIlConfronto() {
    if (candidati.length === 1) {
      chiudi();
      navigate(vaiAlConfronto(persona.nickname, candidati[0].nickname));
      return;
    }

    setScegliendo(true);
  }

  const voci = [
    {
      id: "preferiti",
      etichetta: "Preferiti",
      spiega: "Le serie messe in vetrina",
      icona: "star",
      to: `${base}/tutto?filtro=preferiti`
    },
    {
      id: "classifica",
      etichetta: "Classifica",
      spiega: "Tutte, dal voto più alto",
      icona: "chart",
      to: `${base}/tutto?ordina=voto`
    },
    {
      id: "commenti",
      etichetta: "Commenti",
      spiega: "Cosa ha scritto, sulle serie e sulle puntate",
      icona: "cineforum",
      to: `${base}/commenti`
    },
    {
      id: "confronto",
      etichetta: "Confronto",
      spiega: "I numeri accanto a quelli di un altro, e cosa avete visto in due",
      icona: "confronto",
      onClick: versoIlConfronto
    }
  ];

  return (
    <Sovrapposizione>
      <div
        {...velo}
        role="dialog"
        aria-label={`Altro su ${persona.nickname}`}
        className="fixed inset-0 z-modal flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      >
        <div className="w-full rounded-t-sheet border-t border-quaderno-riga bg-quaderno-foglio p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-float sm:max-w-sm sm:rounded-panel sm:border">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-quaderno-riga sm:hidden" />

          {scegliendo ? (
            <>
              <p className="px-3 pb-2 text-sm font-semibold text-quaderno-inchiostro">
                Confronta {persona.nickname} con…
              </p>

              <ul>
                {candidati.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={vaiAlConfronto(persona.nickname, p.nickname)}
                      onClick={chiudi}
                      className="flex items-center gap-3 rounded-card px-3 py-3 hover:bg-quaderno-carta"
                    >
                      <Esagono nickname={p.nickname} colore={p.colore} dimensione={30} />

                      <span className="text-sm font-medium text-quaderno-inchiostro">
                        {p.nickname}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {candidati.length === 0 && (
                <p className="px-3 pb-3 text-sm text-quaderno-tenue">
                  Per adesso non c'è nessun altro con cui confrontarsi.
                </p>
              )}
            </>
          ) : (
            <ul>
              {voci.map((v) => {
                const dentro = (
                  <>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-quaderno-carta text-quaderno-blu">
                      <Icon nome={v.icona} dimensione={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-quaderno-inchiostro">
                        {v.etichetta}
                      </span>
                      <span className="block text-xs text-quaderno-tenue">{v.spiega}</span>
                    </span>

                    <Icon nome="avanti" dimensione={16} className="shrink-0 text-quaderno-tenue" />
                  </>
                );

                const stile =
                  "flex w-full items-center gap-3 rounded-card px-3 py-3 text-left transition-colors duration-quick hover:bg-quaderno-carta";

                return (
                  <li key={v.id}>
                    {v.to ? (
                      <Link to={v.to} onClick={chiudi} className={stile}>
                        {dentro}
                      </Link>
                    ) : (
                      <button type="button" onClick={v.onClick} className={stile}>
                        {dentro}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Sovrapposizione>
  );
}
