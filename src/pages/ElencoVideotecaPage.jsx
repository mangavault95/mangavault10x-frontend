import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import IndiceLettere from "../ui/IndiceLettere";
import { idLettera, letteraDi } from "../dati/lettere";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { paginaDi } from "../dati/cineforum";
import { corrisponde, raggruppa } from "../dati/videoteca";
import {
  getIoVideoteca,
  getProfiloVideoteca,
  getVideoteca,
  preferisciAnime,
  urlCopertina
} from "../services/api";
import { ModuloAccesso } from "../dati/AccessoProvider";
import Icon from "../app/Icon";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Vuoto } from "../ui/videoteca/Foglio";
import { NOMI_STATO, formattaVoto } from "../ui/videoteca/formati";
import CartaAnime from "../ui/videoteca/CartaAnime";

/**
 * TUTTI I TITOLI DI UNA PERSONA.
 *
 * È la griglia che fino a ieri stava all'indirizzo `/videoteca` ed
 * era «la videoteca». Adesso è una delle viste della pagina di
 * qualcuno: ci si arriva da «Vedi tutto» sopra un ripiano, o dalle
 * voci del tastino — «Preferiti» e «Classifica» sono questa stessa
 * pagina con un filtro e un ordine diversi.
 *
 * Non sono tre pagine perché non sono tre cose: sono la stessa
 * griglia guardata da tre angolazioni, e tre file quasi identici
 * avrebbero significato correggere ogni difetto tre volte.
 *
 * ---------------------------------------------------------------
 * FILTRO E ORDINE STANNO NELL'INDIRIZZO
 *
 * Come in collezione (`useSearchParams`, non `useState`): così la
 * classifica di Nanaki si può mandare a qualcuno, il tasto Indietro
 * torna al filtro di prima, e il menu può puntare direttamente a
 * `?filtro=preferiti` senza che questa pagina esponga funzioni per
 * comandarsi da fuori.
 */

const FILTRI = [
  { id: "tutti", etichetta: "Tutti" },
  { id: "preferiti", etichetta: "Preferiti" },
  { id: "in_visione", etichetta: NOMI_STATO.in_visione },
  { id: "da_vedere", etichetta: NOMI_STATO.da_vedere },
  { id: "completa", etichetta: NOMI_STATO.completa },
  { id: "in_pausa", etichetta: NOMI_STATO.in_pausa },
  { id: "droppata", etichetta: NOMI_STATO.droppata }
];

const ORDINI = [
  { id: "titolo", etichetta: "Titolo" },
  { id: "voto", etichetta: "Voto" },
  { id: "episodi", etichetta: "Più viste" }
];

// Quattro pillole sempre in vista; «Finita», «In pausa» e «Mollata» si
// aprono da «Altri». Sette pillole facevano tre righe sul telefono, e
// quasi sempre se ne usano tre.
const PRINCIPALI = ["tutti", "in_visione", "da_vedere", "preferiti"];

// Schede (con titolo e barra) o solo copertine, tre per riga.
const CHIAVE_VISTA = "mangavault:videoteca:vista";

function vistaSalvata() {
  try {
    return localStorage.getItem(CHIAVE_VISTA) === "compatta" ? "compatta" : "schede";
  } catch {
    return "schede";
  }
}

export default function ElencoVideotecaPage() {
  const { nickname } = useParams();
  const { utente } = useSessione();
  const navigate = useNavigate();
  const [parametri, setParametri] = useSearchParams();

  const [accesso, setAccesso] = useState(false);
  const [segnando, setSegnando] = useState(null);
  const [vista, setVista] = useState(vistaSalvata);
  const [menuAperto, setMenuAperto] = useState(false);
  const [altriAperti, setAltriAperti] = useState(false);

  function scegliVista(v) {
    setVista(v);

    try {
      localStorage.setItem(CHIAVE_VISTA, v);
    } catch {
      /* senza memoria del browser la scelta vale solo per questa visita */
    }
  }

  const filtro = parametri.get("filtro") || "tutti";
  const ordina = parametri.get("ordina") || "titolo";
  const tipo = parametri.get("tipo") || "";
  const cerca = parametri.get("cerca") || "";

  function cambia(chiave, valore) {
    const nuovi = new URLSearchParams(parametri);

    // Il valore predefinito non si scrive nell'indirizzo: un indirizzo
    // con dentro «filtro=tutti&ordina=titolo» dice le stesse cose di
    // uno pulito, ma sembra che ci sia un filtro attivo.
    if (!valore || valore === "tutti" || valore === "titolo") nuovi.delete(chiave);
    else nuovi.set(chiave, valore);

    setParametri(nuovi, { replace: true });
  }

  const io = useRisorsa(getIoVideoteca, { attivo: !nickname });

  const nome = nickname ?? io.dati?.nickname ?? null;

  const profilo = useRisorsa(
    useCallback(() => getProfiloVideoteca(nome), [nome]),
    { attivo: Boolean(nome) }
  );

  const persona = profilo.dati?.utente ?? null;

  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(
    useCallback(() => getVideoteca(persona?.id), [persona?.id]),
    { attivo: Boolean(persona?.id) }
  );

  const mia = Boolean(utente && persona && utente.id === persona.id);

  const serie = useMemo(() => raggruppa(dati ?? []), [dati]);

  const visibili = useMemo(() => {
    const scelte = serie.filter((a) => {
      if (filtro === "preferiti" && !a.preferito) return false;
      if (filtro !== "tutti" && filtro !== "preferiti" && a.stato_visione !== filtro) return false;
      if (tipo === "film" && a.tipo !== "film") return false;
      if (tipo === "serie" && a.tipo === "film") return false;

      return corrisponde(a, cerca);
    });

    if (ordina === "voto") {
      // Le non votate in fondo e non a zero: «non votata» non è un
      // voto basso, e metterle in coda alle peggiori direbbe una cosa
      // che nessuno ha detto.
      return [...scelte].sort((a, b) => (Number(b.voto) || -1) - (Number(a.voto) || -1));
    }

    if (ordina === "episodi") {
      return [...scelte].sort(
        (a, b) => Number(b.episodi_visti || 0) - Number(a.episodi_visti || 0)
      );
    }

    // L'ordine di arrivo è già quello per titolo, e lo fa il server:
    // rifarlo qui vorrebbe dire due ordinamenti da tenere d'accordo.
    return scelte;
  }, [serie, filtro, ordina, tipo, cerca]);

  // Le lettere si mostrano solo con l'ordine alfabetico, senza ricerca e
  // su una lista abbastanza lunga da aver bisogno di capitoli.
  const gruppi = useMemo(() => {
    if (vista !== "compatta" || ordina !== "titolo" || cerca.trim() || visibili.length <= 24) {
      return null;
    }

    const out = [];

    for (const s of visibili) {
      const l = letteraDi(s.titolo);
      const ultimo = out[out.length - 1];

      if (ultimo && ultimo.lettera === l) ultimo.serie.push(s);
      else out.push({ lettera: l, serie: [s] });
    }

    return out;
  }, [vista, ordina, cerca, visibili]);

  const conteggi = useMemo(() => {
    const per = { tutti: serie.length, preferiti: 0 };

    for (const a of serie) {
      if (a.stato_visione) per[a.stato_visione] = (per[a.stato_visione] || 0) + 1;
      if (a.preferito) per.preferiti += 1;
    }

    return per;
  }, [serie]);

  /**
   * Il cuoricino: mette e toglie dalla vetrina.
   *
   * Si aggiorna sul posto invece di ricaricare tutta la videoteca:
   * ricaricare ottantuno schede per una stella vorrebbe dire che la
   * griglia sfarfalla a ogni tocco. La riga tocca TUTTE le stagioni
   * della serie, perché la vetrina è fatta di serie — e lasciarne
   * indietro una farebbe ricomparire la serie fra i preferiti al
   * ricaricamento.
   */
  // Il pannello vero e proprio ora vive nella cornice (`Shell.jsx`), e
  // si apre da qualunque pagina della videoteca: qui resta solo questa
  // scorciatoia per lo stato vuoto, che scrive lo stesso `?aggiungi=`
  // che la cornice legge — non serve altro per aprirlo.
  function apriAggiunta() {
    const nuovi = new URLSearchParams(parametri);
    nuovi.set("aggiungi", "");
    setParametri(nuovi);
  }

  async function preferisci(gruppo) {
    if (!utente || segnando) return;

    setSegnando(gruppo.chiave);

    const acceso = !gruppo.preferito;
    const ids = gruppo.stagioni.map((s) => s.id);

    setDati((precedenti) =>
      precedenti?.map((riga) => (ids.includes(riga.id) ? { ...riga, preferito: acceso } : riga))
    );

    try {
      // Le stagioni che sono già nello stato giusto non si toccano: la
      // rotta commuta, e chiamarla su una riga già accesa la
      // spegnerebbe.
      await Promise.all(
        gruppo.stagioni
          .filter((s) => Boolean(s.preferito) !== acceso)
          .map((s) => preferisciAnime(s.id))
      );
    } catch {
      await ricarica();
    } finally {
      setSegnando(null);
    }
  }

  const titolo =
    filtro === "preferiti"
      ? "Preferiti"
      : ordina === "voto"
        ? "Classifica"
        : tipo === "film"
          ? "Film"
          : "Tutti i titoli";

  return (
    <PaginaVideoteca
      occhiello={persona ? persona.nickname : "Videoteca"}
      titolo={titolo}
      sommario={
        persona
          ? `${visibili.length} ${visibili.length === 1 ? "titolo" : "titoli"}${
              mia ? "" : ` nella videoteca di ${persona.nickname}`
            }`
          : undefined
      }
      azioni={
        <div className="flex items-center gap-2">
          {persona && (
            <Bottone onClick={() => navigate(nickname ? paginaDi(persona.nickname) : "/videoteca/io")}>
              <Icon nome="back" dimensione={16} />
              La pagina
            </Bottone>
          )}

          {!utente && (
            <Bottone tono="pieno" onClick={() => setAccesso(true)}>
              Entra
            </Bottone>
          )}
        </div>
      }
    >
      {(inCorso || profilo.inCorso) && !dati && <Caricamento testo="Apro la videoteca…" />}

      {(errore || profilo.errore) && (
        <Errore errore={errore || profilo.errore} riprova={ricarica} />
      )}

      {dati && serie.length === 0 && (
        <Vuoto
          titolo={mia ? "Non c'è ancora niente" : "Questa videoteca è vuota"}
          sommario={
            mia
              ? "Aggiungi la prima serie: la cerco su AnimeClick e mi porto dietro trama, generi, episodi e dove si vede in Italia."
              : "Chi la tiene non ha ancora aggiunto niente."
          }
          azioni={
            mia && (
              <Bottone tono="pieno" onClick={apriAggiunta}>
                Aggiungi una serie
              </Bottone>
            )
          }
        />
      )}

      {dati && serie.length > 0 && (
        <>
          <div className="mb-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTRI.filter(
                  (f) => PRINCIPALI.includes(f.id) || altriAperti || filtro === f.id
                ).map((f) => {
                  const quante = conteggi[f.id] || 0;
                  const acceso = filtro === f.id;

                  if (f.id !== "tutti" && quante === 0 && !acceso) return null;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => cambia("filtro", f.id)}
                      aria-pressed={acceso}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-quick
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                        ${
                          acceso
                            ? "bg-quaderno-blu text-quaderno-su-blu"
                            : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
                        }`}
                    >
                      {f.etichetta}
                      <span className="ml-1.5 font-numeric opacity-70">{quante}</span>
                    </button>
                  );
                })}

                {FILTRI.some((f) => !PRINCIPALI.includes(f.id)) && (
                  <button
                    type="button"
                    onClick={() => setAltriAperti((a) => !a)}
                    aria-expanded={altriAperti}
                    className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-quaderno-tenue hover:text-quaderno-inchiostro"
                  >
                    {altriAperti ? "Meno" : "Altri…"}
                  </button>
                )}
              </div>

              <input
                value={cerca}
                onChange={(e) => cambia("cerca", e.target.value)}
                placeholder="Cerca — anche in originale"
                aria-label="Cerca fra i titoli"
                className="ml-auto w-full min-w-0 rounded-lg border border-quaderno-riga bg-quaderno-foglio px-3 py-1.5 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue sm:w-56
                  focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-quaderno-tenue">
              <span>
                Ordinati per{" "}
                <span className="font-semibold text-quaderno-inchiostro">
                  {ORDINI.find((o) => o.id === ordina)?.etichetta.toLowerCase()}
                </span>
              </span>

              <MenuOrdineVista
                aperto={menuAperto}
                onApri={setMenuAperto}
                ordina={ordina}
                onOrdina={(o) => cambia("ordina", o)}
                vista={vista}
                onVista={scegliVista}
              />
            </div>
          </div>

          {visibili.length === 0 ? (
            <Vuoto
              titolo="Nessun titolo con questo filtro"
              sommario={
                filtro === "preferiti"
                  ? mia
                    ? "La vetrina è vuota: il cuoricino su una copertina la mette qui."
                    : "Non ha ancora scelto niente."
                  : "Prova a togliere la ricerca o a guardare fra tutti."
              }
              azioni={
                <Bottone onClick={() => setParametri(new URLSearchParams(), { replace: true })}>
                  Mostra tutti
                </Bottone>
              }
            />
          ) : gruppi ? (
            <div className="space-y-6 pr-5">
              {gruppi.map((g) => (
                <section
                  key={g.lettera}
                  id={idLettera(g.lettera)}
                  aria-label={`Titoli con ${g.lettera}`}
                  className="scroll-mt-4"
                >
                  <h2 className="mb-2 px-1 font-display text-lg font-bold text-quaderno-tenue">
                    {g.lettera}
                  </h2>

                  <ElencoSerie serie={g.serie} compatta mia={mia} segnando={segnando} onPreferisci={preferisci} />
                </section>
              ))}

              <IndiceLettere
                lettere={gruppi.map((g) => g.lettera)}
                fondo="bg-quaderno-foglio/80"
                testo="text-quaderno-tenue"
                attivo="text-quaderno-blu"
              />
            </div>
          ) : (
            <ElencoSerie
              serie={visibili}
              compatta={vista === "compatta"}
              mia={mia}
              segnando={segnando}
              onPreferisci={preferisci}
            />
          )}
        </>
      )}

      {accesso && (
        <ModuloAccesso
          mondo="videoteca"
          motivo="Per avere la tua videoteca: le tue serie, le tue puntate, i tuoi voti."
          onRiuscito={() => setAccesso(false)}
          onAnnulla={() => setAccesso(false)}
        />
      )}
    </PaginaVideoteca>
  );
}

/* ==================================================
   LA GRIGLIA, IN DUE VISTE
   ================================================== */

function ElencoSerie({ serie, compatta, mia, segnando, onPreferisci }) {
  return (
    <ul
      className={
        compatta
          ? "grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-7 xl:grid-cols-9"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
      }
    >
      {serie.map((s) => (
        <li key={s.chiave} className="relative">
          {compatta ? <CartaCompatta anime={s} /> : <CartaAnime anime={s} />}

          {/* Il cuore sta SOPRA la scheda e fuori dal collegamento: un
              bottone dentro un <a> non è HTML valido, e il browser
              sceglierebbe da sé quale dei due gesti eseguire. */}
          {mia && (
            <button
              type="button"
              onClick={() => onPreferisci(s)}
              disabled={segnando === s.chiave}
              aria-pressed={Boolean(s.preferito)}
              aria-label={
                s.preferito ? `Togli ${s.titolo} dai preferiti` : `Metti ${s.titolo} fra i preferiti`
              }
              className={`absolute grid place-items-center rounded-full backdrop-blur-sm transition-colors duration-quick
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                ${compatta ? "right-1 top-1 h-7 w-7" : "right-2 top-2 h-8 w-8"}
                ${
                  s.preferito
                    ? "bg-quaderno-blu text-quaderno-su-blu"
                    : "bg-quaderno-foglio/85 text-quaderno-tenue hover:text-quaderno-inchiostro"
                }`}
            >
              <Icon nome="cuore" dimensione={compatta ? 14 : 16} piena={Boolean(s.preferito)} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Solo la copertina: il titolo si legge aprendola (o tornando alle
 * schede). Il voto in un angolo e una barra sottile in fondo dicono a
 * che punto sei, e basta.
 */
function CartaCompatta({ anime }) {
  const visti = Number(anime.episodi_visti || 0);
  const su = Number(anime.episodi_disponibili || 0) || Number(anime.episodi_totali) || null;
  const percento = su ? Math.min(100, Math.round((visti / su) * 100)) : null;

  return (
    <Link
      to={`/videoteca/${anime.id}`}
      title={anime.titolo}
      aria-label={`${anime.titolo}${percento !== null ? `, ${percento}% visto` : ""}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-card border border-quaderno-riga bg-quaderno-carta
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta"
    >
      {anime.cover_url ? (
        <img
          src={urlCopertina(anime.cover_url)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full place-items-center px-2 text-center text-micro text-quaderno-tenue">
          {anime.titolo}
        </span>
      )}

      {anime.voto && (
        <span className="absolute left-1 top-1 rounded-full bg-quaderno-foglio/90 px-1.5 py-0.5 font-numeric text-micro font-semibold text-quaderno-blu">
          ★ {formattaVoto(anime.voto)}
        </span>
      )}

      {percento !== null && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
          <span className="block h-full bg-quaderno-blu" style={{ width: `${percento}%` }} />
        </span>
      )}
    </Link>
  );
}

/** Ordine e vista dietro un solo tasto, come nella Collezione dei manga. */
function MenuOrdineVista({ aperto, onApri, ordina, onOrdina, vista, onVista }) {
  const radice = useRef(null);

  useEffect(() => {
    if (!aperto) return undefined;

    const fuori = (e) => {
      if (!radice.current?.contains(e.target)) onApri(false);
    };
    const esc = (e) => e.key === "Escape" && onApri(false);

    document.addEventListener("pointerdown", fuori);
    document.addEventListener("keydown", esc);

    return () => {
      document.removeEventListener("pointerdown", fuori);
      document.removeEventListener("keydown", esc);
    };
  }, [aperto, onApri]);

  const voce = "flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-sm text-quaderno-inchiostro hover:bg-quaderno-carta";

  return (
    <div ref={radice} className="relative shrink-0">
      <button
        type="button"
        onClick={() => onApri(!aperto)}
        aria-label="Ordina e cambia vista"
        aria-haspopup="menu"
        aria-expanded={aperto}
        className={`grid h-9 w-9 place-items-center rounded-full border border-quaderno-riga transition-colors duration-quick
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
          ${aperto ? "bg-quaderno-blu text-quaderno-su-blu" : "bg-quaderno-foglio text-quaderno-tenue hover:text-quaderno-inchiostro"}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 20V4m0 16-3-3m3 3 3-3M17 4v16m0-16-3 3m3-3 3 3" />
        </svg>
      </button>

      {aperto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-overlay mt-2 w-56 rounded-card border border-quaderno-riga bg-quaderno-foglio p-1.5 shadow-lift"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-micro font-semibold uppercase tracking-wider text-quaderno-tenue">
            Ordina per
          </p>

          {ORDINI.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={o.id === ordina}
              onClick={() => {
                onOrdina(o.id);
                onApri(false);
              }}
              className={voce}
            >
              {o.etichetta}
              {o.id === ordina && <span aria-hidden="true" className="text-quaderno-blu">✓</span>}
            </button>
          ))}

          <div className="mx-1 my-1.5 border-t border-quaderno-riga" />

          <div className="grid grid-cols-2 gap-1 p-0.5">
            {[
              { id: "schede", etichetta: "Schede" },
              { id: "compatta", etichetta: "Solo cover" }
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                role="menuitemradio"
                aria-checked={vista === v.id}
                onClick={() => {
                  onVista(v.id);
                  onApri(false);
                }}
                className={`rounded-lg py-2.5 text-sm font-semibold transition-colors duration-quick ${
                  vista === v.id
                    ? "bg-quaderno-blu text-quaderno-su-blu"
                    : "text-quaderno-inchiostro hover:bg-quaderno-carta"
                }`}
              >
                {v.etichetta}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
