import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagina from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import {
  addToWishlist,
  deleteWishlistItem,
  enrichManga,
  getWishlist,
  purchaseWishlistItem,
  updateWishlistItem
} from "../services/api";
import { cercaFuori } from "../bibliotecario/esterni";
import { dataIt } from "../dati/serie";

/**
 * I desideri: le serie che non hai ancora.
 *
 * La differenza con la collezione è che qui i dati li scrive una
 * persona, non un import. Quindi il modulo fa il lavoro pesante:
 * basta il titolo, il resto lo cerca il bottone "Compila" chiamando
 * lo stesso servizio che arricchisce le schede della collezione.
 */

const VUOTO = {
  titolo: "",
  autori: "",
  coverurl: "",
  trama: "",
  generi: "",
  volumitotali: "",
  dovecomprare: ""
};

export default function WishlistPage() {
  const { dati, inCorso, errore, ricarica, setDati } = useRisorsa(getWishlist);

  const [modulo, setModulo] = useState(null); // null = chiuso
  const [ricercaTesto, setRicerca] = useState("");
  const [problema, setProblema] = useState(null);

  // La serie di cui si sta dicendo quanti volumi si sono presi, e la
  // riga di spiegazione che resta dopo (per esempio quando l'edizione
  // in collezione c'era già).
  const [daComprare, setDaComprare] = useState(null);
  const [nota, setNota] = useState(null);

  // `dati || []` sta dentro il useMemo: fuori creerebbe un array nuovo
  // a ogni render, e il filtro si rifarebbe da capo anche quando non
  // è cambiato niente.
  const visibili = useMemo(() => {
    const elementi = dati || [];
    const testo = ricercaTesto.trim().toLowerCase();

    if (!testo) return elementi;

    return elementi.filter((e) =>
      [e.titolo, e.autori, e.generi, e.dovecomprare]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(testo))
    );
  }, [dati, ricercaTesto]);

  /* -------------------- Azioni -------------------- */

  async function salva(valori) {
    setProblema(null);

    const corpo = {
      ...valori,
      volumitotali: valori.volumitotali === "" ? null : Number(valori.volumitotali)
    };

    try {
      if (valori.id) {
        await updateWishlistItem(valori.id, corpo);
      } else {
        await addToWishlist(corpo);
      }

      setModulo(null);
      ricarica();
    } catch {
      setProblema("Il salvataggio non è andato a buon fine.");
    }
  }

  async function elimina(elemento) {
    if (!window.confirm(`Togliere «${elemento.titolo}» dai desideri?`)) return;

    setProblema(null);
    setDati((precedenti) => (precedenti || []).filter((e) => e.id !== elemento.id));

    try {
      await deleteWishlistItem(elemento.id);
    } catch {
      setProblema("Non sono riuscito a eliminare la voce.");
      ricarica();
    }
  }

  async function comprato(elemento, dettagli) {
    setProblema(null);
    setNota(null);

    try {
      const esito = await purchaseWishlistItem(elemento.id, dettagli);

      setDaComprare(null);

      // Il server risponde così quando quell'edizione in collezione c'era
      // già: la voce sparisce comunque dalla wishlist, ed è bene dire
      // perché invece di lasciar credere di averla appena aggiunta.
      if (esito?.duplicated) {
        setNota(`«${elemento.titolo}» era già in collezione: ho tolto solo il desiderio.`);
      }

      ricarica();
    } catch (errore) {
      console.error("Spostamento in collezione fallito:", errore);

      // Col solo "non ci sono riuscito" un vincolo del database sembra
      // un problema di quella serie lì. Dirlo cambia la domanda che ci
      // si fa davanti all'avviso.
      setProblema(
        errore?.dettagli
          ? `Non sono riuscito a spostare la serie in collezione: ${errore.dettagli}`
          : "Non sono riuscito a spostare la serie in collezione."
      );
    }
  }

  return (
    <Pagina
      occhiello="Da comprare"
      titolo="Wishlist"
      sommario="Le serie che vuoi, con dove trovarle."
      azioni={
        <div className="flex flex-wrap items-center gap-3">
          <CampoRicerca
            valore={ricercaTesto}
            onCambia={setRicerca}
            segnaposto="Cerca fra i desideri…"
            risultati={visibili.length}
          />

          <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi</Bottone>
        </div>
      }
    >
      <div className="space-y-8">
        {problema && (
          <p
            role="alert"
            className="rounded-card border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember"
          >
            {problema}
          </p>
        )}

        {nota && (
          <p
            role="status"
            className="rounded-card border border-lapis/25 bg-lapis/10 px-4 py-3 text-sm text-lapis"
          >
            {nota}
          </p>
        )}

        {modulo && (
          <ModuloDesiderio
            valori={modulo}
            onSalva={salva}
            onAnnulla={() => setModulo(null)}
          />
        )}

        {daComprare && (
          <ModuloComprato
            elemento={daComprare}
            onConferma={(dettagli) => comprato(daComprare, dettagli)}
            onAnnulla={() => setDaComprare(null)}
          />
        )}

        {errore ? (
          <Errore errore={errore} riprova={ricarica} />
        ) : inCorso && !dati ? (
          <CaricamentoElenco />
        ) : visibili.length ? (
          <ul className="space-y-3">
            {visibili.map((e) => (
              <li key={e.id}>
                <RigaDesiderio
                  elemento={e}
                  onModifica={() =>
                    setModulo({
                      ...VUOTO,
                      ...e,
                      volumitotali: e.volumitotali ?? ""
                    })
                  }
                  onElimina={() => elimina(e)}
                  onComprato={() => {
                    setNota(null);
                    setProblema(null);
                    setDaComprare(e);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Vuoto
            titolo={ricercaTesto ? "Nessun desiderio corrisponde" : "La lista è vuota"}
            testo={
              ricercaTesto
                ? "Prova con meno parole."
                : "Aggiungi le serie che vuoi comprare: quando le prendi, un click le sposta in collezione."
            }
            azione={
              !ricercaTesto && <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi la prima</Bottone>
            }
          />
        )}
      </div>
    </Pagina>
  );
}

/* ==================================================
   RIGA
   ================================================== */

function RigaDesiderio({ elemento, onModifica, onElimina, onComprato }) {
  // Fermare la propagazione sui bottoni: la riga intera è un Link,
  // altrimenti "Elimina" aprirebbe anche la scheda del desiderio.
  const fermaEAgisci = (azione) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    azione();
  };

  return (
    <Link
      to={`/desiderio/${elemento.id}`}
      className="flex flex-wrap items-start gap-x-5 gap-y-4 rounded-panel border border-hairline bg-glass-1 p-4 backdrop-blur-xl transition-colors duration-base hover:border-soft"
    >
      <div className="w-16 shrink-0">
        <Copertina src={elemento.coverurl} alt={elemento.titolo} />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-medium text-ink-bright">{elemento.titolo}</h3>

        {elemento.autori && (
          <p className="text-sm text-ink-muted">{elemento.autori}</p>
        )}

        <p className="font-numeric text-xs text-ink-faint">
          {elemento.volumitotali ? `${elemento.volumitotali} volumi · ` : ""}
          aggiunto il {dataIt(elemento.created_at) || "—"}
        </p>

        {elemento.dovecomprare && (
          <p className="text-xs text-ink-muted">
            <span className="text-ink-faint">Dove: </span>
            {elemento.dovecomprare}
          </p>
        )}

        {elemento.trama && (
          <p className="line-clamp-2 max-w-2xl pt-1 text-sm text-ink">{elemento.trama}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Bottone onClick={fermaEAgisci(onComprato)} title="Sposta in collezione">
          Comprato
        </Bottone>

        <Bottone variante="secondario" onClick={fermaEAgisci(onModifica)}>
          Modifica
        </Bottone>

        <Bottone variante="pericolo" onClick={fermaEAgisci(onElimina)}>
          Elimina
        </Bottone>
      </div>
    </Link>
  );
}

/* ==================================================
   MODULO — L'HO PRESO
   ================================================== */

/**
 * Cosa si chiede a chi ha appena comprato una serie.
 *
 * Prima "Comprato" spostava e basta, e la serie arrivava in collezione
 * con zero volumi in casa e nessuna edizione: due cose da correggere
 * subito dopo, a mano, sulla scheda. Sono le uniche due che il desiderio
 * non può sapere da solo — e l'edizione conta più di quanto sembri,
 * perché "Berserk" sono 42 volumi nella serie rossa e 14 nella Deluxe,
 * cioè due scaffali diversi con lo stesso titolo.
 *
 * Il numero parte già scritto sul totale che il desiderio conosce: chi
 * compra una serie finita la compra quasi sempre tutta, e a chi ne ha
 * presi tre resta un campo da correggere invece che uno da riempire.
 */
function ModuloComprato({ elemento, onConferma, onAnnulla }) {
  const totaliNoti = Number(elemento.volumitotali) || 0;

  const [campi, setCampi] = useState({
    volumiPosseduti: totaliNoti ? String(totaliNoti) : "1",
    volumiTotali: totaliNoti ? String(totaliNoti) : "",
    edizione: ""
  });

  const [inCorso, setInCorso] = useState(false);

  const cambia = (chiave) => (e) =>
    setCampi((precedenti) => ({ ...precedenti, [chiave]: e.target.value }));

  async function invia(e) {
    e.preventDefault();

    if (inCorso) return;

    setInCorso(true);

    try {
      await onConferma({
        volumiPosseduti: Number(campi.volumiPosseduti) || 0,
        volumiTotali: Number(campi.volumiTotali) || 0,
        edizione: campi.edizione.trim()
      });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <form
      onSubmit={invia}
      className="rounded-panel border border-brass-400/25 bg-glass-2 p-4 backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 shrink-0 sm:w-20">
          <Copertina src={elemento.coverurl} alt={elemento.titolo} inclina={false} />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass-500/90">
              L'hai preso
            </p>

            <h2 className="truncate font-display text-lg font-semibold text-ink-bright sm:text-xl">
              {elemento.titolo}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              etichetta="Volumi che hai"
              tipo="number"
              min="0"
              valore={campi.volumiPosseduti}
              onChange={cambia("volumiPosseduti")}
              required
              autoFocus
            />

            <Campo
              etichetta="Volumi in tutto"
              tipo="number"
              min="0"
              valore={campi.volumiTotali}
              onChange={cambia("volumiTotali")}
            />

            <Campo
              etichetta="Edizione"
              valore={campi.edizione}
              onChange={cambia("edizione")}
              placeholder="es. Serie rossa, Deluxe, Maximum"
              className="col-span-2"
            />
          </div>

          <p className="text-xs text-ink-faint">
            L'edizione tiene separate due versioni della stessa serie: senza, la
            seconda che compri sembrerebbe quella che hai già.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Bottone type="submit" disabled={inCorso}>
              {inCorso ? "Sposto…" : "Sposta in collezione"}
            </Bottone>

            <Bottone type="button" variante="fantasma" onClick={onAnnulla}>
              Annulla
            </Bottone>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ==================================================
   MODULO
   ================================================== */

function ModuloDesiderio({ valori, onSalva, onAnnulla }) {
  const [campi, setCampi] = useState(valori);
  const [compilando, setCompilando] = useState(false);
  const [avviso, setAvviso] = useState(null);

  const [suggerimenti, setSuggerimenti] = useState([]);
  const [cercandoSuggerimenti, setCercandoSuggerimenti] = useState(false);
  const [mostraSuggerimenti, setMostraSuggerimenti] = useState(false);

  const cambia = (chiave) => (e) =>
    setCampi((precedenti) => ({ ...precedenti, [chiave]: e.target.value }));

  /**
   * Compila da solo copertina, trama, generi e numero di volumi
   * partendo dal titolo. È lo stesso servizio usato per la collezione:
   * AniList per le immagini, Google Books per i dati d'edizione.
   *
   * Titolo e autore passati esplicitamente quando arrivano da un
   * suggerimento scelto in tendina: leggerli da `campi` in quel momento
   * darebbe un valore ancora vecchio, perché l'aggiornamento dello
   * stato che li ha appena impostati non si è ancora applicato.
   */
  async function compila(titoloScelto, autoreScelto) {
    const titolo = (titoloScelto ?? campi.titolo).trim();
    if (!titolo) return;

    setCompilando(true);
    setAvviso(null);

    try {
      const dati = await enrichManga(titolo, autoreScelto ?? campi.autori);

      if (dati?.error) {
        setAvviso("Non ho trovato niente per questo titolo. Compila a mano.");
      } else {
        // I campi già scritti a mano non vengono sovrascritti: quello
        // che hai deciso tu vale più di quello che trova l'automatismo.
        setCampi((precedenti) => ({
          ...precedenti,
          autori: precedenti.autori || dati.autore || "",
          coverurl: precedenti.coverurl || dati.coverurl || "",
          trama: precedenti.trama || dati.trama || "",
          generi: precedenti.generi || dati.genere || "",
          volumitotali: precedenti.volumitotali || dati.volumitotali || ""
        }));
      }
    } catch {
      setAvviso("Il servizio non ha risposto. Riprova fra poco.");
    } finally {
      setCompilando(false);
    }
  }

  // Suggerimenti dal vivo mentre si scrive il titolo — solo per un
  // desiderio nuovo: modificarne uno già salvato non deve rimettere in
  // discussione un titolo già deciso.
  useEffect(() => {
    const testo = campi.titolo.trim();

    if (campi.id || testo.length < 3) {
      // Titolo troppo corto o desiderio già esistente: si svuota la
      // tendina invece di lasciarla con l'ultima ricerca fatta.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggerimenti([]);
      setCercandoSuggerimenti(false);
      return;
    }

    let annullato = false;

    setCercandoSuggerimenti(true);

    const timeout = setTimeout(async () => {
      try {
        const risultati = await cercaFuori(testo, 5);
        if (!annullato) setSuggerimenti(risultati);
      } catch {
        if (!annullato) setSuggerimenti([]);
      } finally {
        if (!annullato) setCercandoSuggerimenti(false);
      }
    }, 450);

    return () => {
      annullato = true;
      clearTimeout(timeout);
    };
  }, [campi.titolo, campi.id]);

  function selezionaSuggerimento(risultato) {
    setMostraSuggerimenti(false);
    setSuggerimenti([]);
    setCampi((precedenti) => ({ ...precedenti, titolo: risultato.titolo }));
    compila(risultato.titolo, risultato.autore);
  }

  const tendinaAperta =
    mostraSuggerimenti && (cercandoSuggerimenti || suggerimenti.length > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSalva(campi);
      }}
      className="relative overflow-hidden rounded-panel border border-soft bg-glass-2 backdrop-blur-xl animate-rise-in"
    >
      {/* Lo stesso glow ambientale della porta della biblioteca: rende
          il modulo un posto in cui "entrare", non un form piatto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 15%, rgba(217,163,80,0.12), transparent 45%), radial-gradient(circle at 88% 90%, rgba(99,102,241,0.10), transparent 50%)"
        }}
      />

      <div className="relative grid gap-6 p-6 sm:grid-cols-[11rem_1fr]">
        {/* COLONNA COPERTINA */}
        <div className="mx-auto w-32 space-y-2 sm:mx-0 sm:w-full">
          <Copertina
            src={campi.coverurl}
            alt={campi.titolo || "Anteprima copertina"}
            inclina={false}
          />

          <p className="truncate text-center text-xs text-ink-faint sm:text-left">
            {campi.titolo || "In attesa di un titolo"}
          </p>
        </div>

        {/* COLONNA CAMPI */}
        <div className="space-y-5">
          <h2 className="font-display text-xl font-semibold text-ink-bright">
            {campi.id ? "Modifica desiderio" : "Nuovo desiderio"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <Campo
                etichetta="Titolo"
                valore={campi.titolo}
                onChange={cambia("titolo")}
                onFocus={() => setMostraSuggerimenti(true)}
                onBlur={() => setTimeout(() => setMostraSuggerimenti(false), 150)}
                autoComplete="off"
                required
                autoFocus
              />

              {tendinaAperta && (
                <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-card border border-soft bg-glass-3 shadow-raised backdrop-blur-xl">
                  {cercandoSuggerimenti && suggerimenti.length === 0 && (
                    <li className="px-3.5 py-2.5 text-sm text-ink-faint">Cerco su AniList…</li>
                  )}

                  {suggerimenti.map((r) => (
                    <li key={r.idEsterno}>
                      <button
                        type="button"
                        onClick={() => selezionaSuggerimento(r)}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-quick hover:bg-glass-2"
                      >
                        <span className="h-10 w-7 shrink-0 overflow-hidden rounded bg-void">
                          {r.copertina && (
                            <img src={r.copertina} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink-bright">
                            {r.titolo}
                          </span>
                          {r.autore && (
                            <span className="block truncate text-xs text-ink-faint">{r.autore}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Campo etichetta="Autore" valore={campi.autori} onChange={cambia("autori")} />
            <Campo
              etichetta="Volumi totali"
              tipo="number"
              valore={campi.volumitotali}
              onChange={cambia("volumitotali")}
              min="1"
            />
            <Campo etichetta="Generi" valore={campi.generi} onChange={cambia("generi")} />
            <Campo
              etichetta="URL copertina"
              valore={campi.coverurl}
              onChange={cambia("coverurl")}
              className="sm:col-span-2"
            />
            <Campo
              etichetta="Dove comprarlo"
              valore={campi.dovecomprare}
              onChange={cambia("dovecomprare")}
              className="sm:col-span-2"
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
              Trama
            </span>

            <textarea
              value={campi.trama}
              onChange={cambia("trama")}
              rows={4}
              className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright
                         outline-none transition-colors duration-quick placeholder:text-ink-faint
                         hover:border-soft focus:border-brass-400/60"
            />
          </label>

          {avviso && <p className="text-sm text-ember">{avviso}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Bottone type="submit">Salva</Bottone>

            <Bottone
              type="button"
              variante="secondario"
              onClick={() => compila()}
              disabled={compilando || !campi.titolo.trim()}
            >
              {compilando ? "Cerco…" : "Compila dal titolo"}
            </Bottone>

            <Bottone type="button" variante="fantasma" onClick={onAnnulla}>
              Annulla
            </Bottone>
          </div>
        </div>
      </div>
    </form>
  );
}

function Campo({ etichetta, tipo = "text", valore, onChange, className = "", ...resto }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-muted">
        {etichetta}
      </span>

      <input
        type={tipo}
        value={valore ?? ""}
        onChange={onChange}
        className="w-full rounded-card border border-hairline bg-glass-1 px-3.5 py-2.5 text-sm text-ink-bright
                   outline-none transition-colors duration-quick placeholder:text-ink-faint
                   hover:border-soft focus:border-brass-400/60"
        {...resto}
      />
    </label>
  );
}
