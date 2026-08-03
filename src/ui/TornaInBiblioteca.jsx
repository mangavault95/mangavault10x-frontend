import Icon from "../app/Icon";

/**
 * La via di ritorno alla sala.
 *
 * Sta in un file suo perché compare in due posti che non si somigliano
 * per niente — le quattro pagine di DOM che si raggiungono dalla stanza,
 * e lo scaffale, che è WebGL — e in tutti e due deve essere *la stessa
 * cosa*: stesso colore, stessa misura, stesso angolo dello schermo.
 *
 * È il punto: da qualunque schermata, la strada per tornare indietro è
 * sempre il bottone giallo in alto a sinistra. Due bottoni che fanno la
 * stessa cosa ma si vedono diversi sono due bottoni da imparare.
 *
 * Cosa succede al click lo decide chi lo usa, e le due cose non
 * c'entrano niente l'una con l'altra: dalle pagine si torna neri e si
 * naviga, dallo scaffale si arretra fino alla soglia senza cambiare
 * indirizzo. Da qui non si vede la differenza, ed è giusto così.
 */
export default function TornaInBiblioteca({ onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`pointer-events-auto flex items-center gap-2.5 rounded-full bg-brass-400 py-3 pl-4 pr-5 text-base font-semibold text-void
                  shadow-brass transition-all duration-quick ease-settle
                  hover:-translate-y-0.5 hover:brightness-110 active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-200 focus-visible:ring-offset-2 focus-visible:ring-offset-void
                  ${className}`}
    >
      <Icon nome="kanjiLibro" dimensione={20} />
      Torna in biblioteca
      {/* Esc funziona in tutti e due i posti, ed è scritto perché
          nessuno prova un tasto che non gli è stato promesso. */}
      <kbd className="ml-1 rounded border border-void/25 px-1.5 py-0.5 font-numeric text-[0.65rem] text-void/70">
        Esc
      </kbd>
    </button>
  );
}
