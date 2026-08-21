import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { useCollezione } from "../dati/collezione";
import { raggruppa, etichettaStagione } from "../dati/videoteca";
import { ModuloAccesso } from "../dati/AccessoProvider";
import {
  accorpaStagione,
  cercaTagliStagioni,
  collegaAnimeAlManga,
  impostaTagliStagioni,
  getVideoteca,
  rileggiAnime,
  rinominaGruppoAnime,
  rinominaStagione,
  staccaStagione,
  togliDallaVideoteca,
  urlCopertina
} from "../services/api";
import PaginaVideoteca, {
  Bottone,
  Caricamento,
  Errore,
  Pillola,
  Scheda,
  Vuoto
} from "../ui/videoteca/Foglio";
import { NOMI_TIPO } from "../ui/videoteca/formati";

/**
 * Gestione della videoteca.
 *
 * Fino a ieri «Gestione» era una parola sola per una cosa sola: le
 * schede della collezione di carta. Premuta dalla videoteca apriva
 * quelle — le uniche schede che non c'entravano niente con la pagina
 * da cui si arrivava. Adesso ogni mondo ha la sua, e questa corregge
 * quello che nella videoteca si può sbagliare:
 *
 *   le STAGIONI    quando AnimeClick non dice che due schede sono la
 *                  stessa serie (capita: «Chainsaw Man: Assassins Arc»
 *                  è elencata senza nessuna parola di relazione)
 *   il COLLEGAMENTO col manga in collezione, che è quello che fa dire
 *                  alla scheda «sei al volume 12, l'anime arriva al 9»
 *   le SERIE       da togliere, una stagione alla volta o tutte
 *
 * Quello che NON sta qui: i titoli, le trame, le puntate. Quelle si
 * rileggono da AnimeClick con un bottone — correggerle a mano avrebbe
 * vita corta, perché la rilettura successiva le riscrive.
 */
export default function GestioneVideotecaPage() {
  const { utente } = useSessione();
  const { dati, errore, inCorso, ricarica } = useRisorsa(getVideoteca);

  const [sceltaId, setSceltaId] = useState(null);
  const [cerca, setCerca] = useState("");
  const [tolta, setTolta] = useState(null);
  const [accesso, setAccesso] = useState(false);

  const serie = useMemo(() => raggruppa(dati ?? []), [dati]);

  const visibili = useMemo(() => {
    const testo = cerca.trim().toLowerCase();

    if (!testo) return serie;

    return serie.filter(
      (s) =>
        s.titolo.toLowerCase().includes(testo) ||
        s.stagioni.some((st) => st.titolo.toLowerCase().includes(testo))
    );
  }, [serie, cerca]);

  // La serie scelta si ricorda per ID di una stagione, non per chiave
  // del gruppo: unire o staccare cambia la chiave, e ricordarsi quella
  // vorrebbe dire vedersi chiudere il pannello proprio dopo aver
  // premuto il bottone che lo riguardava.
  const scelta =
    serie.find((s) => s.stagioni.some((st) => Number(st.id) === Number(sceltaId))) || null;

  if (!utente) {
    return (
      <PaginaVideoteca occhiello="Videoteca" titolo="Gestione">
        <Vuoto
          titolo="Serve l'accesso"
          sommario="La videoteca è di chi la guarda: per sistemare stagioni e collegamenti bisogna prima dire chi sei. Va bene l'account della biblioteca — è lo stesso."
          azioni={
            <Bottone tono="pieno" onClick={() => setAccesso(true)}>
              Entra o registrati
            </Bottone>
          }
        />

        {accesso && (
          <ModuloAccesso
            mondo="videoteca"
            motivo="Per sistemare la tua videoteca."
            onRiuscito={() => {
              setAccesso(false);
              ricarica();
            }}
            onAnnulla={() => setAccesso(false)}
          />
        )}
      </PaginaVideoteca>
    );
  }

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo="Gestione"
      sommario="Stagioni da unire, collegamenti al manga, serie da togliere."
      azioni={
        <Link
          to="/videoteca"
          className="text-sm font-medium text-quaderno-blu hover:underline"
        >
          Torna alla videoteca
        </Link>
      }
    >
      {inCorso && !dati && <Caricamento testo="Apro la videoteca…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && serie.length === 0 && (
        <Vuoto
          titolo="Non c'è niente da gestire"
          sommario="La tua videoteca è vuota: aggiungi una serie e torna qui."
          azioni={
            <Link to="/videoteca">
              <Bottone tono="pieno">Vai alla videoteca</Bottone>
            </Link>
          }
        />
      )}

      {dati && serie.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          {/* ---------- Elenco ----------
              Su schermo stretto si ritira quando una serie è aperta: è
              la stessa colonna che a turno mostra l'una o l'altra cosa,
              come fa un telefono con qualunque elenco. */}
          <div className={`space-y-3 ${scelta ? "hidden lg:block" : ""}`}>
            <input
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
              placeholder="Filtra le serie…"
              aria-label="Filtra le serie"
              className="w-full rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-2 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
            />

            <Scheda className="max-h-[32rem] overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
              <ul>
                {visibili.map((s) => (
                  <li key={s.chiave}>
                    <button
                      type="button"
                      onClick={() => setSceltaId(Number(s.stagioni[0].id))}
                      aria-current={s.chiave === scelta?.chiave ? "true" : undefined}
                      className={`flex w-full items-center gap-3 border-b border-quaderno-riga px-3 py-2.5 text-left transition-colors duration-quick last:border-b-0 ${
                        s.chiave === scelta?.chiave
                          ? "bg-quaderno-blu-tenue text-quaderno-blu"
                          : "text-quaderno-inchiostro hover:bg-quaderno-carta"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{s.titolo}</span>

                      {s.quanteStagioni > 1 && (
                        <span className="shrink-0 font-numeric text-xs text-quaderno-tenue">
                          {s.quanteStagioni} st.
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Scheda>
          </div>

          {/* ---------- La serie scelta ---------- */}
          {scelta ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSceltaId(null)}
                className="text-sm font-medium text-quaderno-tenue hover:text-quaderno-inchiostro lg:hidden"
              >
                ← Tutte le serie
              </button>

              <PannelloSerie
                key={scelta.chiave}
                serie={scelta}
                altre={serie.filter((s) => s.chiave !== scelta.chiave)}
                alFatto={ricarica}
                alTolta={(nome) => {
                  setSceltaId(null);
                  setTolta(nome);
                  ricarica();
                }}
              />
            </div>
          ) : (
            <Scheda className="grid place-items-center p-12 text-center">
              <p className="text-sm text-quaderno-tenue">
                {tolta
                  ? `«${tolta}» non è più nella tua videoteca.`
                  : "Scegli una serie dall'elenco."}
              </p>
            </Scheda>
          )}
        </div>
      )}
    </PaginaVideoteca>
  );
}

/* ==================================================
   UNA SERIE
   ================================================== */

function PannelloSerie({ serie, altre, alFatto, alTolta }) {
  const [inCorso, setInCorso] = useState(null);
  const [guaio, setGuaio] = useState(null);

  async function fai(chiave, azione) {
    setInCorso(chiave);
    setGuaio(null);

    try {
      await azione();
      await alFatto();
    } catch (e) {
      setGuaio(e);
    } finally {
      setInCorso(null);
    }
  }

  return (
    <div className="space-y-4">
      {guaio && (
        <Scheda className="border-l-[3px] border-l-ember p-3">
          <p className="text-sm text-quaderno-inchiostro">{guaio.message}</p>
        </Scheda>
      )}

      <NomeDellaSerie serie={serie} fai={fai} inCorso={inCorso} />

      <Sezione titolo="Le stagioni">
        <div className="space-y-2">
          {serie.stagioni.map((stagione, indice) => (
            <RigaStagione
              key={stagione.id}
              stagione={stagione}
              indice={indice}
              sola={serie.stagioni.length === 1}
              fai={fai}
              inCorso={inCorso}
              alTolta={() => alTolta(stagione.titolo)}
            />
          ))}
        </div>
      </Sezione>

      <Unione serie={serie} altre={altre} fai={fai} inCorso={inCorso} />

      <CollegamentoAlManga serie={serie} fai={fai} inCorso={inCorso} />

      <Sezione titolo="Togliere tutto">
        <Scheda className="flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="min-w-0 flex-1 text-sm text-quaderno-tenue">
            Toglie la serie intera dalla tua videoteca — tutte le stagioni, con le tue spunte, i
            tuoi voti e i tuoi commenti. Gli altri lettori tengono i loro.
          </p>

          <Bottone
            onClick={() =>
              fai("togli-tutto", async () => {
                for (const s of serie.stagioni) await togliDallaVideoteca(s.id);
                alTolta(serie.titolo);
              })
            }
            disabled={inCorso !== null}
          >
            {inCorso === "togli-tutto" ? "Tolgo…" : "Togli la serie"}
          </Bottone>
        </Scheda>
      </Sezione>
    </div>
  );
}

/** Il nome della serie: modificabile solo quando le stagioni sono più d'una. */
function NomeDellaSerie({ serie, fai, inCorso }) {
  const [titolo, setTitolo] = useState(serie.titolo);

  return (
    <Scheda className="flex flex-wrap items-center gap-3 p-3">
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-quaderno-carta">
        {serie.cover_url && (
          <img
            src={urlCopertina(serie.cover_url)}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {serie.gruppoId ? (
          <>
            <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
              Nome della serie
            </label>

            <div className="flex flex-wrap gap-2">
              <input
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
              />

              <Bottone
                tono="pieno"
                disabled={inCorso !== null || titolo.trim() === serie.titolo}
                onClick={() => fai("nome", () => rinominaGruppoAnime(serie.gruppoId, titolo.trim()))}
              >
                {inCorso === "nome" ? "Salvo…" : "Salva"}
              </Bottone>
            </div>

            <p className="text-xs text-quaderno-tenue">
              È il nome del pannello in videoteca. Nasce dal titolo della prima stagione col
              numero tolto in coda, che ogni tanto sbaglia.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-quaderno-inchiostro">{serie.titolo}</p>
            <p className="text-xs text-quaderno-tenue">
              Una scheda sola di AnimeClick: il nome è il suo, e si cambia solo lì. Unendola a
              un'altra scheda nasce un nome della serie, che si può riscrivere.
            </p>
          </>
        )}
      </div>
    </Scheda>
  );
}

/** Una stagione: come si chiama, dove sta in fila, e le due vie d'uscita. */
function RigaStagione({ stagione, indice, sola, fai, inCorso, alTolta }) {
  const [etichetta, setEtichetta] = useState(stagione.etichetta || "");

  const chiave = `stagione-${stagione.id}`;

  return (
    <Scheda className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-numeric text-xs text-quaderno-tenue">{stagione.ordine || indice + 1}</span>

        <Link
          to={`/videoteca/${stagione.id}`}
          className="min-w-0 flex-1 truncate text-sm font-medium text-quaderno-inchiostro hover:text-quaderno-blu"
        >
          {stagione.titolo}
        </Link>

        {stagione.tipo && stagione.tipo !== "serie_tv" && (
          <Pillola tono="contorno">{NOMI_TIPO[stagione.tipo] || stagione.tipo}</Pillola>
        )}

        <span className="font-numeric text-xs text-quaderno-tenue">
          {stagione.episodi_disponibili || 0} ep · {stagione.anno_inizio || "?"}
        </span>
      </div>

      {!sola && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={etichetta}
            onChange={(e) => setEtichetta(e.target.value)}
            placeholder={etichettaStagione(stagione, indice)}
            aria-label={`Come si chiama: ${stagione.titolo}`}
            className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-1.5 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          <Bottone
            disabled={inCorso !== null || (etichetta.trim() === (stagione.etichetta || ""))}
            onClick={() =>
              fai(`${chiave}-etichetta`, () =>
                rinominaStagione(stagione.id, { etichetta: etichetta.trim() })
              )
            }
          >
            {inCorso === `${chiave}-etichetta` ? "Salvo…" : "Rinomina"}
          </Bottone>

          <Bottone
            disabled={inCorso !== null}
            onClick={() => fai(`${chiave}-stacca`, () => staccaStagione(stagione.id))}
          >
            {inCorso === `${chiave}-stacca` ? "Stacco…" : "Stacca"}
          </Bottone>
        </div>
      )}

      {/* La chiave rimonta il campo quando i tagli cambiano da fuori:
          «Chiedi ad AniList» li riscrive, e un campo che continua a
          mostrare quello che c'era scritto prima farebbe credere che la
          richiesta non sia servita a niente. */}
      <Tagli
        key={(stagione.tagli || []).join(",")}
        stagione={stagione}
        chiave={chiave}
        fai={fai}
        inCorso={inCorso}
      />

      <div className="flex flex-wrap gap-2">
        <Bottone
          disabled={inCorso !== null}
          onClick={() => fai(`${chiave}-rileggi`, () => rileggiAnime(stagione.id))}
        >
          {inCorso === `${chiave}-rileggi` ? "Rileggo…" : "Rileggi da AnimeClick"}
        </Bottone>

        {!sola && (
          <Bottone
            disabled={inCorso !== null}
            onClick={() =>
              fai(`${chiave}-togli`, async () => {
                await togliDallaVideoteca(stagione.id);
                alTolta();
              })
            }
          >
            {inCorso === `${chiave}-togli` ? "Tolgo…" : "Togli questa stagione"}
          </Bottone>
        )}
      </div>
    </Scheda>
  );
}

/**
 * Le stagioni dentro una scheda sola.
 *
 * Frieren è una scheda di AnimeClick con dentro 38 puntate che sono
 * due stagioni, 28 + 10, numerate di seguito. AnimeClick il confine
 * non lo scrive da nessuna parte — nella sua tabella degli episodi non
 * c'è nessun separatore — e il sito lo va a chiedere ad AniList, che
 * tiene un media per stagione.
 *
 * L'automatismo accetta solo abbinamenti che tornano col conto delle
 * puntate, quindi quando non trova niente lascia l'elenco unico invece
 * di tagliare a caso. Questo campo è la via d'uscita: si scrivono i
 * numeri delle puntate da cui comincia una stagione nuova.
 */
function Tagli({ stagione, chiave, fai, inCorso }) {
  const attuali = (stagione.tagli || []).join(", ");
  const [testo, setTesto] = useState(attuali);

  const puntate = Number(stagione.episodi_disponibili || 0);

  // Sotto le due puntate non c'è niente da tagliare, e il campo
  // sarebbe solo un'altra cosa da leggere.
  if (puntate < 2) return null;

  const numeri = testo
    .split(/[,\s]+/)
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 1);

  return (
    <div className="space-y-2 border-t border-quaderno-riga pt-3">
      <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
        Le stagioni cominciano dalla puntata
      </label>

      <div className="flex flex-wrap gap-2">
        <input
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          inputMode="numeric"
          placeholder="es. 29"
          aria-label={`Puntate d'inizio stagione di ${stagione.titolo}`}
          className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-1.5 font-numeric text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
        />

        <Bottone
          disabled={inCorso !== null || testo.trim() === attuali}
          onClick={() =>
            fai(`${chiave}-tagli`, () => impostaTagliStagioni(stagione.id, numeri))
          }
        >
          {inCorso === `${chiave}-tagli` ? "Salvo…" : "Salva"}
        </Bottone>

        <Bottone
          disabled={inCorso !== null}
          onClick={() => fai(`${chiave}-cerca-tagli`, () => cercaTagliStagioni(stagione.id))}
        >
          {inCorso === `${chiave}-cerca-tagli` ? "Chiedo…" : "Chiedi ad AniList"}
        </Bottone>
      </div>

      <p className="text-xs text-quaderno-tenue">
        {stagione.tagli?.length
          ? `${stagione.tagli.length + 1} stagioni in questa scheda di ${puntate} puntate.`
          : `Un elenco unico di ${puntate} puntate. Se sono più stagioni, scrivi da quale numero comincia ognuna dopo la prima.`}
      </p>
    </div>
  );
}

/**
 * Unire due serie che sono la stessa.
 *
 * Il caso per cui questa pagina esiste. AnimeClick dice da sé che
 * «Isekai Farming 2» è il seguito di «Isekai Farming», e quelle si
 * uniscono da sole all'aggancio. Ma «Chainsaw Man: Assassins Arc» è
 * elencata senza nessuna parola di relazione: nessuna lettura di
 * quella pagina potrà mai dedurlo, e serve una persona.
 */
function Unione({ serie, altre, fai, inCorso }) {
  const [bersaglio, setBersaglio] = useState("");

  if (altre.length === 0) return null;

  return (
    <Sezione titolo="Unire a un'altra serie">
      <Scheda className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={bersaglio}
            onChange={(e) => setBersaglio(e.target.value)}
            aria-label="La serie a cui unire questa"
            className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          >
            <option value="">Scegli la serie…</option>

            {altre.map((a) => (
              <option key={a.chiave} value={a.stagioni[0].id}>
                {a.titolo}
              </option>
            ))}
          </select>

          <Bottone
            tono="pieno"
            disabled={inCorso !== null || !bersaglio}
            onClick={() =>
              fai("unisci", () => accorpaStagione(serie.stagioni[0].id, Number(bersaglio)))
            }
          >
            {inCorso === "unisci" ? "Unisco…" : "Unisci"}
          </Bottone>
        </div>

        <p className="text-xs text-quaderno-tenue">
          Le due diventano un pannello solo in videoteca, con le stagioni una sotto l'altra. Le
          spunte non si toccano: ogni stagione tiene le sue.
        </p>
      </Scheda>
    </Sezione>
  );
}

/** Il ponte con la collezione di carta. */
function CollegamentoAlManga({ serie, fai, inCorso }) {
  const { serie: collezione } = useCollezione();
  const [scelta, setScelta] = useState("");

  const prima = serie.stagioni[0];
  const collegato = collezione.find((m) => Number(m.id) === Number(serie.manga_id));

  const ordinate = useMemo(
    () => [...collezione].sort((a, b) => a.titolo.localeCompare(b.titolo, "it")),
    [collezione]
  );

  return (
    <Sezione titolo="Il manga in collezione">
      <Scheda className="space-y-3 p-3">
        {collegato ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-quaderno-inchiostro">
              Collegato a <span className="font-semibold">{collegato.titolo}</span>
            </p>

            <Bottone
              disabled={inCorso !== null}
              onClick={() => fai("scollega", () => collegaAnimeAlManga(prima.id, null))}
            >
              {inCorso === "scollega" ? "Stacco…" : "Stacca"}
            </Bottone>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <select
              value={scelta}
              onChange={(e) => setScelta(e.target.value)}
              aria-label="Il manga da collegare"
              className="min-w-0 flex-1 rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
            >
              <option value="">Nessun collegamento</option>

              {ordinate.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titolo}
                </option>
              ))}
            </select>

            <Bottone
              tono="pieno"
              disabled={inCorso !== null || !scelta}
              onClick={() =>
                fai("collega", () => collegaAnimeAlManga(prima.id, Number(scelta)))
              }
            >
              {inCorso === "collega" ? "Collego…" : "Collega"}
            </Bottone>
          </div>
        )}

        <p className="text-xs text-quaderno-tenue">
          È quello che permette alla scheda di dire «sei al volume 12, l'anime arriva al 9».
        </p>
      </Scheda>
    </Sezione>
  );
}

function Sezione({ titolo, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
        {titolo}
      </h2>

      {children}
    </section>
  );
}
