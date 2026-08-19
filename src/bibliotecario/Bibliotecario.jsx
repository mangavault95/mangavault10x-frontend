import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../app/Icon";
import useTocco from "../ui/tocco";
import { useBibliotecario } from "./contesto";

/**
 * Il banco del bibliotecario.
 *
 * Non è un assistente che finge di essere una persona: è un banco a cui
 * si fanno domande sulla collezione. Risponde leggendo i dati che il
 * sito ha già in memoria — istantaneo, senza chiamare nessuno — e solo
 * per i manga che non possiedi va a chiedere fuori, ad AniList.
 *
 * Questo è il motivo per cui non serve una chiave né un abbonamento: la
 * gran parte delle domande che si fanno a una collezione riguardano la
 * collezione, e quella è già qui.
 *
 * Qui c'è solo il bottone. Il pannello, con l'interprete e Fuse dentro,
 * si scarica al primo click: chi non chiede mai niente non lo paga.
 *
 * Lo stato di apertura vive in `BibliotecarioProvider`, non qui: anche
 * il bancone dentro la stanza 3D deve poter aprire lo stesso pannello.
 *
 * Sulla soglia il bottone non c'è. Lì il bibliotecario è una persona in
 * piedi dietro al banco, e un pulsante che fa la stessa cosa in un
 * angolo dello schermo toglie a chiunque la voglia di provare a
 * cliccarla — che è tutto quello che la stanza ha da offrire. Il
 * pannello resta comunque a un tasto di distanza ("b").
 *
 * Al banco (`/banco`) non c'è per una ragione più semplice: lì si sta
 * già parlando con lui, e un bottone che apre un cassetto per parlargli
 * di nuovo è la stessa conversazione in due finestre.
 *
 * **Col dito non c'è mai.** Su un telefono quel bottone galleggia sopra
 * ogni schermata, copre l'angolo in basso a destra — cioè proprio dove
 * finisce la griglia — e chiede spazio a uno schermo che ne ha poco. Col
 * mouse costa niente e sta in un angolo morto; col dito è ingombro. Il
 * banco resta dov'è sempre stato: dentro la stanza, cliccando il bancone,
 * e all'indirizzo `/banco`.
 */
const Pannello = lazy(() => import("./Banco"));

// Dove il bibliotecario è già in scena, e quindi non serve chiamarlo.
const IN_PERSONA = ["/", "/banco"];

export default function Bibliotecario() {
  const { aperto, apri, chiudi, alterna } = useBibliotecario();
  const { pathname } = useLocation();
  const alTocco = useTocco();

  const nellaStanza = IN_PERSONA.includes(pathname);

  // Scorciatoia: "b" da qualunque punto del sito. Non ruba il tasto a
  // chi sta scrivendo in un campo.
  useEffect(() => {
    function alTasto(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const dentroCampo = /^(input|textarea|select)$/i.test(e.target.tagName);
      if (dentroCampo || e.target.isContentEditable) return;

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        alterna();
      }
    }

    window.addEventListener("keydown", alTasto);

    return () => window.removeEventListener("keydown", alTasto);
  }, [alterna]);

  return (
    <>
      {!aperto && !nellaStanza && !alTocco && <BottoneBanco onApri={apri} />}

      {aperto && (
        <Suspense fallback={null}>
          <Pannello onChiudi={chiudi} />
        </Suspense>
      )}
    </>
  );
}

function BottoneBanco({ onApri }) {
  return (
    <button
      onClick={onApri}
      title="Chiedi al bibliotecario (b)"
      aria-label="Apri il banco del bibliotecario"
      className="group fixed bottom-24 right-5 z-drawer flex items-center gap-2.5 rounded-full border border-hairline bg-glass-3 py-3 pl-4 pr-5
                 shadow-float backdrop-blur-xl transition-all duration-base ease-settle
                 hover:border-brass-400/40 hover:bg-brass-400/10 active:scale-95
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                 md:bottom-6"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brass-400/15 text-brass-400 transition-transform duration-base ease-spring group-hover:scale-110">
        <Icon nome="search" dimensione={15} />
      </span>

      <span className="text-sm font-medium text-ink-bright">Chiedi</span>
    </button>
  );
}
