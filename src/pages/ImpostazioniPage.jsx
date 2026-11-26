import { useLocation, useNavigate } from "react-router";
import Icon from "../app/Icon";
import { useSessione } from "../dati/sessione";
import SceltaTema from "../ui/SceltaTema";
import NotifichePush from "../ui/NotifichePush";

/**
 * IMPOSTAZIONI — le preferenze di chi guarda (26/11/2026).
 *
 * Tema, palette, kanji e notifiche. Prima stavano dentro il foglio «Tu» del
 * telefono, sotto il nome e sopra le pagine da aprire; il foglio era più alto
 * dello schermo e chi veniva solo a cercare «Il vostro mese» doveva scorrere
 * via quattro controlli che non c'entravano. Adesso il foglio ha una riga
 * («Impostazioni») e le scelte hanno una pagina, con un indirizzo: si può
 * salvare, e Indietro riporta dov'eri.
 *
 * I controlli sono gli stessi del menu del proprio nome su schermo largo
 * (`SceltaTema`, `NotifichePush`): ogni scelta si vede subito e si ricorda per
 * persona (`dati/tema.js`), senza un «Salva». Anche chi non è entrato può
 * cambiare aspetto, perché la scelta resta sul suo dispositivo; le notifiche
 * invece hanno un destinatario, e senza un nome non ci sono.
 */
export default function ImpostazioniPage() {
  const { utente } = useSessione();
  const navigate = useNavigate();
  const location = useLocation();

  // Se la pagina è la prima della visita (indirizzo aperto a mano, o salvato)
  // non c'è un «indietro» a cui tornare: si va alla Home.
  const haStoria = location.key !== "default";

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8 pt-3 sm:px-6">
      <button
        type="button"
        onClick={() => (haStoria ? navigate(-1) : navigate("/"))}
        className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-card pr-3 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      >
        <Icon nome="back" dimensione={20} />
        Indietro
      </button>

      <h1 className="mt-1 font-display text-[2.1rem] font-extrabold leading-none tracking-tight text-ink-bright">
        Impostazioni
      </h1>

      <section aria-labelledby="impostazioni-aspetto" className="mt-7">
        <h2
          id="impostazioni-aspetto"
          // Solo per i lettori di schermo: a vista «Modalità» e «Palette»
          // qui sotto dicono già di cosa si tratta, e un titoletto sopra
          // un titoletto sono due etichette per la stessa cosa.
          className="sr-only"
        >
          Aspetto
        </h2>

        <SceltaTema />
      </section>

      {utente && (
        <section className="mt-6">
          <NotifichePush />
        </section>
      )}
    </div>
  );
}
