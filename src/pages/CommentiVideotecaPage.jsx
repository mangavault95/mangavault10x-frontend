import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { paginaDi, quandoPerEsteso, quandoBreveDa } from "../dati/cineforum";
import { getCommentiDi, getIoVideoteca, urlCopertina } from "../services/api";
import Icon from "../app/Icon";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Scheda, Vuoto } from "../ui/videoteca/Foglio";
import Tondino from "../ui/videoteca/Tondino";

/**
 * TUTTO QUELLO CHE UNA PERSONA HA SCRITTO.
 *
 * I commenti esistono da sempre, ma solo dentro la scheda della serie
 * a cui appartengono: per leggerne dieci bisognava aprire dieci
 * schede. Leggerli in fila è un altro modo di conoscere qualcuno —
 * più della griglia delle copertine, che dice cosa ha guardato e non
 * cosa ne pensa.
 *
 * Gli spoiler restano coperti finché non si tocca, come nel Cineforum
 * e come nella scheda: chi è indietro di due stagioni non deve
 * scoprire il finale scorrendo col pollice.
 */

export default function CommentiVideotecaPage() {
  const { nickname } = useParams();

  const io = useRisorsa(getIoVideoteca, { attivo: !nickname });
  const nome = nickname ?? io.dati?.nickname ?? null;

  const { dati, errore, inCorso, ricarica } = useRisorsa(
    useCallback(() => getCommentiDi(nome), [nome]),
    { attivo: Boolean(nome) }
  );

  const persona = dati?.utente ?? null;
  const commenti = dati?.commenti ?? [];

  return (
    <PaginaVideoteca
      occhiello={persona?.nickname ?? "Videoteca"}
      titolo="Commenti"
      sommario={
        commenti.length
          ? `${commenti.length} ${commenti.length === 1 ? "commento" : "commenti"}, dal più recente`
          : undefined
      }
      azioni={
        persona && (
          <Link to={paginaDi(persona.nickname)}>
            <Bottone>
              <Icon nome="back" dimensione={16} />
              La pagina
            </Bottone>
          </Link>
        )
      }
    >
      {inCorso && !dati && <Caricamento />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && commenti.length === 0 && (
        <Vuoto
          titolo="Non ha ancora scritto niente"
          sommario="I commenti si scrivono dalla scheda di una serie, sulla serie intera o su una puntata sola."
        />
      )}

      <ul className="mx-auto w-full max-w-2xl space-y-3">
        {commenti.map((c) => (
          <li key={c.id}>
            <Commento commento={c} persona={persona} />
          </li>
        ))}
      </ul>
    </PaginaVideoteca>
  );
}

function Commento({ commento, persona }) {
  const [scoperto, setScoperto] = useState(false);

  const dove =
    commento.numeroEpisodio == null
      ? commento.anime.titolo
      : `${commento.anime.titolo} · episodio ${commento.numeroEpisodio}${
          commento.titoloEpisodio ? ` — ${commento.titoloEpisodio}` : ""
        }`;

  return (
    <Scheda className="flex gap-3 p-3">
      <Link
        to={`/videoteca/${commento.anime.id}`}
        className="h-24 w-16 shrink-0 overflow-hidden rounded bg-quaderno-carta"
        aria-hidden="true"
        tabIndex={-1}
      >
        {commento.anime.cover_url && (
          <img
            src={urlCopertina(commento.anime.cover_url)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={`/videoteca/${commento.anime.id}`}
          className="block text-sm font-semibold leading-snug text-quaderno-inchiostro hover:text-quaderno-blu"
        >
          {dove}
        </Link>

        <p className="mb-1.5 flex items-center gap-1.5 text-xs text-quaderno-tenue">
          {persona && (
            <Tondino utente={persona} dimensione={16} />
          )}

          <span title={quandoPerEsteso(commento.creata_il)}>
            {quandoBreveDa(commento.creata_il)}
            {commento.aggiornata_il &&
              commento.aggiornata_il !== commento.creata_il &&
              " · modificato"}
          </span>
        </p>

        {commento.spoiler && !scoperto ? (
          <button
            type="button"
            onClick={() => setScoperto(true)}
            className="rounded bg-quaderno-carta px-2 py-1 text-xs font-semibold text-quaderno-tenue hover:text-quaderno-inchiostro"
          >
            Contiene spoiler — tocca per leggere
          </button>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-quaderno-inchiostro">
            {commento.testo}
          </p>
        )}
      </div>
    </Scheda>
  );
}
