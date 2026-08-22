import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { getCineforum, getPersone } from "../services/api";
import { ModuloAccesso } from "../dati/AccessoProvider";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Vuoto } from "../ui/videoteca/Foglio";
import ComponiMessaggio from "../ui/videoteca/ComponiMessaggio";
import Tondino from "../ui/videoteca/Tondino";
import Post from "../ui/videoteca/Post";

/**
 * IL CINEFORUM — la porta della videoteca.
 *
 * Fino a ieri aprendo questo mondo si arrivava sul proprio scaffale
 * di copertine: una stanza con dentro una persona sola, in un sito
 * che di persone ne ha tre. Adesso si entra da qui — cosa hanno fatto
 * tutti — e la griglia è diventata la propria pagina personale, che è
 * *una* delle pagine e non più IL posto.
 *
 * ---------------------------------------------------------------
 * NESSUNO SEGUE NESSUNO
 *
 * Non c'è un bottone «segui» e non ce ne sarà uno. Siete in tre e vi
 * conoscete: seguirsi sarebbe una cerimonia da compiere una volta
 * per poi dimenticarsene, e l'unico effetto pratico sarebbe che chi
 * si iscrive per ultimo non vede niente finché qualcuno non se ne
 * accorge. Chi entra vede tutto, punto.
 *
 * ---------------------------------------------------------------
 * COSA C'È IN PAGINA, IN ORDINE
 *
 *   le persone   poche, quindi in chiaro invece che dietro una
 *                ricerca: si va sulla pagina di qualcuno cliccando
 *                la sua faccia, non ricordandosi come si scrive il
 *                suo soprannome
 *   la casella   quello che si scrive apposta
 *   il feed      giornate e messaggi mescolati, dal più recente
 */

export default function CineforumPage() {
  const { utente } = useSessione();
  const [accesso, setAccesso] = useState(false);

  // Le pagine successive si accumulano qui e non dentro `useRisorsa`:
  // quello sa ricaricare, non concatenare — e mescolare le due cose
  // avrebbe voluto dire che un «riprova» dopo tre pagine ne mostrasse
  // una sola.
  const [altri, setAltri] = useState([]);
  const [ancora, setAncora] = useState(null);
  const [caricando, setCaricando] = useState(false);

  const primaPagina = useCallback(() => getCineforum(), []);

  const { dati, errore, inCorso, ricarica } = useRisorsa(primaPagina);

  const persone = useRisorsa(getPersone);

  const post = [...(dati?.post ?? []), ...altri];

  // Da dove riprendere: l'istante lo dà il server invece di leggerlo
  // dall'ultimo post che si ha in mano — due post possono cadere nello
  // stesso millisecondo, e ripartire da «l'ultimo che ho visto» ne
  // salterebbe uno.
  const prossimo = ancora ?? (altri.length === 0 ? dati?.prossimo : null);
  const ceneSonoAltri = altri.length ? Boolean(ancora) : Boolean(dati?.ancora);

  async function altroAncora() {
    if (!prossimo || caricando) return;

    setCaricando(true);

    try {
      const pagina = await getCineforum({ prima: prossimo });

      setAltri((precedenti) => [...precedenti, ...(pagina.post ?? [])]);
      setAncora(pagina.ancora ? pagina.prossimo : null);
    } finally {
      setCaricando(false);
    }
  }

  // Dopo aver scritto si ricomincia da capo: il messaggio nuovo è il
  // primo post, e appenderlo in coda a quello che c'è vorrebbe dire
  // trovarlo in fondo alla pagina.
  function daCapo() {
    setAltri([]);
    setAncora(null);
    ricarica();
  }

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="Cineforum"
      sommario="Cosa hanno guardato tutti, dal più recente. Non c'è nessuno da seguire: si vede tutto."
      azioni={
        !utente && (
          <Bottone tono="pieno" onClick={() => setAccesso(true)}>
            Entra
          </Bottone>
        )
      }
    >
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Persone elenco={persone.dati} />

        <ComponiMessaggio alFatto={daCapo} chiediAccesso={() => setAccesso(true)} />

        {inCorso && !dati && <Caricamento testo="Guardo cosa è successo…" />}

        {errore && <Errore errore={errore} riprova={ricarica} />}

        {dati && post.length === 0 && (
          <Vuoto
            titolo="Non è ancora successo niente"
            sommario={
              dati.daMigrare
                ? "Il server non ha ancora la tabella dei messaggi: manca l'ultima migrazione."
                : "Appena qualcuno aggiunge una serie o spunta una puntata, comparirà qui."
            }
            azioni={
              <Link to="/videoteca/io">
                <Bottone tono="pieno">Vai alla tua videoteca</Bottone>
              </Link>
            }
          />
        )}

        <ul className="space-y-4">
          {post.map((p) => (
            <li key={p.chiave}>
              <Post post={p} alCambio={daCapo} />
            </li>
          ))}
        </ul>

        {ceneSonoAltri && (
          <div className="flex justify-center pb-4">
            <Bottone onClick={altroAncora} disabled={caricando}>
              {caricando ? "Un momento…" : "Carica altro"}
            </Bottone>
          </div>
        )}
      </div>

      {accesso && (
        <ModuloAccesso
          mondo="videoteca"
          motivo="Per scrivere nel Cineforum, mettere un cuore e rispondere."
          onRiuscito={() => {
            setAccesso(false);
            daCapo();
          }}
          onAnnulla={() => setAccesso(false)}
        />
      )}
    </PaginaVideoteca>
  );
}

/**
 * Chi c'è.
 *
 * In chiaro e non dietro una casella di ricerca: siete tre, e una
 * ricerca per soprannome davanti a tre nomi è un modulo da compilare
 * per sapere una cosa che si vede. La casella compare da sola quando
 * le facce non stanno più in una riga — a quel punto scorrere
 * diventa più lento che scrivere.
 */
const TROPPE = 7;

function Persone({ elenco }) {
  const [cerca, setCerca] = useState("");

  if (!elenco?.length) return null;

  const molte = elenco.length > TROPPE;

  const visibili = molte
    ? elenco.filter((p) => p.nickname.toLowerCase().includes(cerca.trim().toLowerCase()))
    : elenco;

  return (
    <section aria-label="Le persone">
      {molte && (
        <input
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
          placeholder="Cerca una persona…"
          aria-label="Cerca una persona per soprannome"
          className="mb-2 w-full rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
            focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
        />
      )}

      {/* Scorre in orizzontale invece di andare a capo: una riga di
          facce che diventa due sposta in basso tutto il resto della
          pagina ogni volta che entra qualcuno di nuovo. */}
      <ul className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {visibili.map((p) => (
          <li key={p.id}>
            <Link
              to={`/videoteca/chi/${encodeURIComponent(p.nickname)}`}
              className="flex w-24 flex-col items-center gap-1.5 rounded-card border border-quaderno-riga bg-quaderno-foglio px-2 py-3 transition-colors duration-quick hover:border-quaderno-blu"
            >
              <Tondino utente={p} dimensione={42} />

              <span className="w-full truncate text-center text-xs font-semibold text-quaderno-inchiostro">
                {p.nickname}
              </span>

              <span className="font-numeric text-[0.65rem] text-quaderno-tenue">
                {p.serie} serie
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
