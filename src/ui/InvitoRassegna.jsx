import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import Foglio from "./Foglio";
import { useSessione } from "../dati/sessione";
import { annoInvito, invitoVisto, segnaInvitoVisto } from "../dati/rassegna";

/**
 * L'invito dell'anno in rassegna: una finestra che compare aprendo il sito
 * dal 31 dicembre (e per la settimana dopo), una volta sola per anno.
 * Accanto c'è il messaggio di Telegram che parte a mezzanotte
 * (`routes/rassegna.js` del backend): quello arriva sul telefono anche col
 * sito chiuso, questo accoglie chi lo apre.
 *
 * Né «Guardala» né «Più tardi» la fanno ricomparire: la rassegna resta nel
 * foglio «Tu».
 */
export default function InvitoRassegna() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { utente } = useSessione();
  const [anno] = useState(() => annoInvito());
  const [aperto, setAperto] = useState(() => anno !== null && !invitoVisto(anno));

  if (!aperto || anno === null || pathname.startsWith("/rassegna")) return null;

  function chiudi(vai) {
    segnaInvitoVisto(anno);
    setAperto(false);

    if (vai) navigate(`/rassegna?anno=${anno}${utente?.id ? `&u=${utente.id}` : ""}`);
  }

  return (
    <Foglio titolo={`Il tuo ${anno} in rassegna`} titoloNascosto onChiudere={() => chiudi(false)} sopra>
      <div className="px-5 pb-8 pt-2 text-center">
        <p className="text-5xl" aria-hidden="true">🎁</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-bright">Il tuo {anno} in rassegna è pronto</h2>
        <p className="mt-3 text-ink-muted">Quanti manga hai letto, quanti anime guardato, i mesi più intensi e le serie dell&apos;anno.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={() => chiudi(true)} className="h-12 rounded-card bg-brass-400 font-semibold text-void">
            Guardala
          </button>
          <button type="button" onClick={() => chiudi(false)} className="h-11 rounded-card text-ink-muted">
            Più tardi
          </button>
        </div>
      </div>
    </Foglio>
  );
}
