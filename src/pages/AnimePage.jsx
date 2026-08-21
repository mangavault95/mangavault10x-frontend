import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import {
  getAnime,
  impostaVisione,
  rileggiAnime,
  urlCopertina,
  votaAnime,
  togliVotoAnime
} from "../services/api";
import PaginaVideoteca, {
  Blocco,
  Bottone,
  Caricamento,
  Errore,
  Pillola,
  Progresso,
  Scheda
} from "../ui/videoteca/Foglio";
import ListaEpisodi from "../ui/videoteca/ListaEpisodi";
import NoteAnime from "../ui/videoteca/NoteAnime";
import Stelle from "../ui/videoteca/Stelle";
import { NOMI_STATO, NOMI_STATO_SERIE, NOMI_TIPO, formattaVoto } from "../ui/videoteca/formati";

/**
 * La scheda di un anime.
 *
 * L'ordine risponde alle domande nell'ordine in cui uno se le fa:
 * a che punto sono, quando esce la prossima, cos'è questa roba, e solo
 * dopo l'elenco delle puntate e quello che ne abbiamo detto.
 */
export default function AnimePage() {
  const { id } = useParams();
  const { utente } = useSessione();

  const carica = useCallback(() => getAnime(id), [id]);
  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(carica);

  const [azione, setAzione] = useState(null);

  // Le spunte vivono qui e non dentro la lista: la barra di progresso
  // in cima e le caselle in basso devono raccontare la stessa cosa nel
  // momento stesso in cui tocchi.
  const spuntati = useMemo(
    () => new Set((dati?.episodi || []).filter((e) => e.visto).map((e) => e.numero)),
    [dati]
  );

  const puoiScrivere = Boolean(utente);

  function aggiornaSpunte(cambio) {
    if (cambio.ripristina) {
      ricarica();
      return;
    }

    setDati((precedente) => {
      if (!precedente) return precedente;

      const episodi = precedente.episodi.map((e) => {
        if (cambio.togli === e.numero) return { ...e, visto: false };
        if (cambio.aggiungi?.includes(e.numero)) return { ...e, visto: true };

        return e;
      });

      return { ...precedente, episodi };
    });
  }

  async function cambiaStato(stato) {
    setAzione("stato");

    try {
      await impostaVisione(id, stato);
      setDati((p) => (p ? { ...p, stato_visione: stato } : p));
    } finally {
      setAzione(null);
    }
  }

  async function cambiaVoto(voto) {
    setAzione("voto");

    try {
      if (voto === null) await togliVotoAnime(id);
      else await votaAnime(id, voto);

      await ricarica();
    } finally {
      setAzione(null);
    }
  }

  async function rileggi() {
    setAzione("rileggi");

    try {
      await rileggiAnime(id);
      await ricarica();
    } finally {
      setAzione(null);
    }
  }

  if (inCorso && !dati) return <Caricamento testo="Apro la scheda…" />;

  if (errore) {
    return (
      <PaginaVideoteca titolo="Scheda">
        <Errore errore={errore} riprova={ricarica} />
      </PaginaVideoteca>
    );
  }

  if (!dati) return null;

  const visti = spuntati.size;
  const disponibili = dati.episodi.filter((e) => e.numero > 0).length;
  const su = disponibili || Number(dati.episodi_totali) || null;

  const prossima = dati.episodi.find(
    (e) => e.uscita_italia && new Date(e.uscita_italia) > new Date()
  );

  return (
    <PaginaVideoteca
      occhiello={
        <Link to="/videoteca" className="hover:text-quaderno-inchiostro">
          ← Videoteca
        </Link>
      }
      titolo={dati.titolo}
      sommario={[
        dati.titolo_originale,
        [dati.anno_inizio, dati.anno_fine].filter(Boolean).join("–"),
        NOMI_STATO_SERIE[dati.stato]
      ]
        .filter(Boolean)
        .join(" · ")}
      azioni={
        puoiScrivere && (
          <Bottone onClick={rileggi} disabled={azione === "rileggi"}>
            {azione === "rileggi" ? "Rileggo…" : "Rileggi da AnimeClick"}
          </Bottone>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* ---------- Colonna sinistra: la copertina e i fatti ---------- */}
        <div className="space-y-4">
          <Scheda className="overflow-hidden">
            <div className="aspect-[3/4] bg-quaderno-carta">
              {dati.cover_url && (
                <img
                  src={urlCopertina(dati.cover_url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="space-y-3 p-3">
              <Progresso visti={visti} su={su} />

              {puoiScrivere ? (
                <Stelle
                  voto={dati.voto}
                  alVoto={cambiaVoto}
                  disabilitato={azione === "voto"}
                />
              ) : (
                dati.voto_medio && (
                  <p className="font-numeric text-sm text-quaderno-blu">
                    ★ {formattaVoto(dati.voto_medio)}
                  </p>
                )
              )}

              {puoiScrivere && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(NOMI_STATO).map(([chiave, nome]) => {
                    const acceso = dati.stato_visione === chiave;

                    return (
                      <button
                        key={chiave}
                        type="button"
                        onClick={() => cambiaStato(chiave)}
                        disabled={azione === "stato"}
                        aria-pressed={acceso}
                        className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors duration-quick
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                          ${
                            acceso
                              ? "bg-quaderno-blu text-white"
                              : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
                          }`}
                      >
                        {nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Scheda>

          <Scheda className="space-y-3 p-3 text-sm">
            <Fatto etichetta="Tipo" valore={NOMI_TIPO[dati.tipo] || dati.tipo} />
            <Fatto etichetta="Episodi" valore={dati.episodi_dichiarati} />
            <Fatto etichetta="Stagioni" valore={dati.stagioni} />
            <Fatto etichetta="In Italia" valore={dati.stato_italia} />

            {dati.generi?.length > 0 && (
              <div>
                <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
                  Generi
                </p>
                <div className="flex flex-wrap gap-1">
                  {dati.generi.map((g) => (
                    <Pillola key={g}>{g}</Pillola>
                  ))}
                </div>
              </div>
            )}

            {dati.distributori?.length > 0 && (
              <div>
                <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
                  Dove si vede
                </p>
                <div className="flex flex-wrap gap-1">
                  {dati.distributori.map((d) => (
                    <Pillola key={d} tono="contorno">
                      {d}
                    </Pillola>
                  ))}
                </div>
              </div>
            )}

            {/* Il ponte con la carta: il senso di avere le due cose
                nello stesso sito invece che in due app diverse. */}
            {dati.manga_id && (
              <Link
                to={`/serie/${dati.manga_id}`}
                className="block pt-1 text-sm font-medium text-quaderno-blu hover:underline"
              >
                Il manga è in collezione →
              </Link>
            )}
          </Scheda>
        </div>

        {/* ---------- Colonna destra ---------- */}
        <div className="space-y-6">
          {prossima && (
            <Scheda className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-[3px] border-l-quaderno-blu p-4">
              <span className="font-numeric text-xs font-semibold uppercase tracking-wider text-quaderno-blu">
                {new Date(prossima.uscita_italia).toLocaleString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Rome"
                })}
              </span>

              <span className="text-sm font-semibold text-quaderno-inchiostro">
                episodio {prossima.numero}
                {prossima.titolo ? ` · ${prossima.titolo}` : ""}
              </span>

              {prossima.piattaforma && <Pillola tono="contorno">{prossima.piattaforma}</Pillola>}
            </Scheda>
          )}

          {dati.trama && (
            <Blocco titolo="Trama">
              <Scheda className="p-4">
                <p className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-quaderno-inchiostro">
                  {dati.trama}
                </p>
              </Scheda>
            </Blocco>
          )}

          <Blocco
            titolo="Episodi"
            extra={
              <span className="font-numeric text-xs text-quaderno-tenue">
                {visti} di {disponibili}
              </span>
            }
          >
            <Scheda className="px-4 py-1">
              <ListaEpisodi
                animeId={id}
                episodi={dati.episodi}
                spuntati={spuntati}
                puoiScrivere={puoiScrivere}
                alCambio={aggiornaSpunte}
              />
            </Scheda>
          </Blocco>

          <Blocco titolo="Commenti">
            <NoteAnime
              animeId={id}
              note={dati.note}
              utente={utente}
              alCambio={ricarica}
            />
          </Blocco>

          {dati.voti?.length > 1 && (
            <Blocco titolo="I voti">
              <Scheda className="flex flex-wrap gap-4 p-4">
                {dati.voti.map((v) => (
                  <span key={v.utente_id} className="text-sm text-quaderno-inchiostro">
                    {v.nickname}{" "}
                    <span className="font-numeric font-semibold text-quaderno-blu">
                      ★ {formattaVoto(v.voto)}
                    </span>
                  </span>
                ))}
              </Scheda>
            </Blocco>
          )}
        </div>
      </div>
    </PaginaVideoteca>
  );
}

/** Una riga di anagrafica: sparisce quando non c'è niente da dire. */
function Fatto({ etichetta, valore }) {
  if (!valore) return null;

  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
        {etichetta}
      </p>
      <p className="text-sm text-quaderno-inchiostro">{valore}</p>
    </div>
  );
}
