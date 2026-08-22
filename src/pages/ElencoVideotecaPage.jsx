import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { paginaDi } from "../dati/cineforum";
import { corrisponde, raggruppa } from "../dati/videoteca";
import {
  getIoVideoteca,
  getProfiloVideoteca,
  getVideoteca,
  preferisciAnime
} from "../services/api";
import { ModuloAccesso } from "../dati/AccessoProvider";
import Sovrapposizione from "../ui/Sovrapposizione";
import Icon from "../app/Icon";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Vuoto } from "../ui/videoteca/Foglio";
import { NOMI_STATO } from "../ui/videoteca/formati";
import CartaAnime from "../ui/videoteca/CartaAnime";
import AggiungiAnime from "../ui/videoteca/AggiungiAnime";

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

export default function ElencoVideotecaPage() {
  const { nickname } = useParams();
  const { utente } = useSessione();
  const navigate = useNavigate();
  const [parametri, setParametri] = useSearchParams();

  // Il pannello «aggiungi» sta NELL'INDIRIZZO, non in uno stato del
  // componente, e il testo cercato ci sta dentro insieme a lui.
  //
  // Non è la solita regola sugli indirizzi condivisibili: è quello che
  // rende possibile aggiungere tre serie di fila. Aprendolo si mette
  // una tappa nella cronologia; scelta la serie si finisce sulla sua
  // scheda; e il tasto Indietro riporta alla ricerca con ancora
  // scritto quello che si era cercato. Prima riportava alla videoteca
  // — un posto giusto, ma non quello da cui si era partiti — e
  // aggiungere la seconda serie voleva dire rifare tutto il giro.
  const [accesso, setAccesso] = useState(false);
  const [segnando, setSegnando] = useState(null);

  const aggiunta = parametri.has("aggiungi");
  const titoloCercato = parametri.get("aggiungi") || "";

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
  /**
   * Aprire mette una tappa; scrivere e chiudere no.
   *
   * È tutta qui la differenza fra un Indietro che funziona e uno che
   * fa perdere il posto: se ogni lettera scritta fosse una tappa,
   * tornare indietro da una scheda vorrebbe dire premere Indietro una
   * volta per lettera.
   */
  function apriAggiunta() {
    const nuovi = new URLSearchParams(parametri);
    nuovi.set("aggiungi", "");
    setParametri(nuovi);
  }

  function chiudiAggiunta() {
    const nuovi = new URLSearchParams(parametri);
    nuovi.delete("aggiungi");
    setParametri(nuovi, { replace: true });
  }

  function ricordaCercato(testo) {
    const nuovi = new URLSearchParams(parametri);
    nuovi.set("aggiungi", testo);
    setParametri(nuovi, { replace: true });
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
            <Bottone onClick={() => navigate(paginaDi(persona.nickname))}>
              <Icon nome="back" dimensione={16} />
              La pagina
            </Bottone>
          )}

          {/* Qui non c'è più: il comando per aggiungere è il tondo in
              basso, dove il pollice arriva senza risalire in cima alla
              pagina. */}

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
              <div className="flex flex-wrap gap-1.5">
                {FILTRI.map((f) => {
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
                            ? "bg-quaderno-blu text-white"
                            : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
                        }`}
                    >
                      {f.etichetta}
                      <span className="ml-1.5 font-numeric opacity-70">{quante}</span>
                    </button>
                  );
                })}
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

            <div className="flex items-center gap-2 text-xs text-quaderno-tenue">
              <span>Ordina per</span>

              {ORDINI.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => cambia("ordina", o.id)}
                  aria-pressed={ordina === o.id}
                  className={`rounded px-1.5 py-0.5 font-semibold transition-colors duration-quick ${
                    ordina === o.id
                      ? "text-quaderno-blu underline"
                      : "hover:text-quaderno-inchiostro"
                  }`}
                >
                  {o.etichetta}
                </button>
              ))}
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
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibili.map((serieIntera) => (
                <li key={serieIntera.chiave} className="relative">
                  <CartaAnime anime={serieIntera} />

                  {/* Il cuore sta SOPRA la scheda e fuori dal
                      collegamento: un bottone dentro un <a> non è
                      HTML valido, e il browser sceglierebbe da sé
                      quale dei due gesti eseguire. */}
                  {mia && (
                    <button
                      type="button"
                      onClick={() => preferisci(serieIntera)}
                      disabled={segnando === serieIntera.chiave}
                      aria-pressed={Boolean(serieIntera.preferito)}
                      aria-label={
                        serieIntera.preferito
                          ? `Togli ${serieIntera.titolo} dai preferiti`
                          : `Metti ${serieIntera.titolo} fra i preferiti`
                      }
                      className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition-colors duration-quick
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                        ${
                          serieIntera.preferito
                            ? "bg-quaderno-blu text-white"
                            : "bg-quaderno-foglio/85 text-quaderno-tenue hover:text-quaderno-inchiostro"
                        }`}
                    >
                      <Icon nome="cuore" dimensione={16} piena={Boolean(serieIntera.preferito)} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ---------- Il tondo ----------
          Il comando più usato della videoteca stava in cima a destra,
          della stessa forma e dello stesso colore di «La pagina»: per
          premerlo bisognava risalire tutta la griglia. Adesso sta in
          basso al centro, è l'unica cosa tonda del sito, e porta una
          lente perché quello che fa è cercare — la serie si aggiunge
          dopo, e solo se è quella giusta.

          Sopra la barra del telefono e non dentro: sotto md la
          navigazione occupa già il fondo dello schermo. Da md in su la
          barra laterale sposta il contenuto di 4.5rem, e il tondo la
          segue di metà — altrimenti sarebbe al centro dello schermo ma
          fuori centro rispetto alla griglia.

          ⚠️ E passa da «Sovrapposizione», cioè da un portale sul body,
          per la ragione già scritta in ui/Sovrapposizione.jsx: un
          «fixed» non si ancora allo schermo se un antenato ha un
          transform, e <main> ce l'ha per via di animate-rise-in.
          Messo qui dentro senza portale, il tondo si ancorava al
          fondo della PAGINA — misurato: duemila pixel sotto lo
          schermo, cioè invisibile finché non si scorreva tutta la
          griglia. Che è esattamente il difetto che doveva risolvere. */}
      {mia && !aggiunta && (
        <Sovrapposizione>
        <button
          type="button"
          onClick={apriAggiunta}
          aria-label="Aggiungi una serie"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-sticky grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-quaderno-blu text-white shadow-float
            transition-transform duration-quick ease-spring hover:scale-105 active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu focus-visible:ring-offset-2 focus-visible:ring-offset-quaderno-carta
            md:bottom-8 md:left-[calc(50%+2.25rem)]"
        >
          <Icon nome="search" dimensione={22} />
        </button>
        </Sovrapposizione>
      )}

      {aggiunta && (
        <AggiungiAnime
          titoloIniziale={titoloCercato}
          alTitolo={ricordaCercato}
          chiudi={chiudiAggiunta}
          alFatto={(esito) => {
            // Sulla scheda nuova SENZA togliere il pannello
            // dall'indirizzo: quella tappa è la ricerca, ed è lì che
            // il tasto Indietro deve riportare per aggiungere la
            // serie dopo. Il pannello sparisce da sé, perché la
            // pagina non è più questa.
            if (esito?.anime?.id) {
              navigate(`/videoteca/${esito.anime.id}`);
              return;
            }

            chiudiAggiunta();
            ricarica();
          }}
        />
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
