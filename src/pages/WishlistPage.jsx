import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagina from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import Menu from "../ui/Menu";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { useCollezione } from "../dati/collezione";
import {
  addToWishlist,
  deleteWishlistItem,
  enrichManga,
  getUsciteManga,
  getWishlist,
  purchaseWishlistItem,
  registraAcquisto,
  updateWishlistItem,
  urlCopertina
} from "../services/api";
import { cercaFuori } from "../bibliotecario/esterni";
import { euro, volumiMancanti } from "../dati/serie";

/**
 * DA COMPRARE — la lista della spesa (04/10/2026).
 *
 * Era la pagina dei desideri: una riga per serie con la trama, tre
 * bottoni e un «Elimina» rosso sempre a un millimetro da «Comprato».
 * Prometteva «con dove trovarle» e non lo diceva mai. Adesso risponde
 * a «cosa devo comprare?», in tre mucchi:
 *
 *   ESCONO ORA       i volumi delle vostre serie in uscita nelle due
 *                    settimane, nella vostra edizione (`/api/manga/uscite`)
 *   PER CHIUDERE     le serie a cui mancano uno, due o tre volumi
 *   DESIDERI         le serie che non avete ancora, come prima
 *
 * e in fondo quanto costano le prime due. «Preso» registra l'acquisto
 * come il bot di Telegram; Modifica ed Elimina stanno sotto i puntini.
 *
 * Dei desideri il modulo fa il lavoro pesante: basta il titolo, il resto
 * lo cerca il bottone «Compila» con lo stesso servizio delle schede.
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

  // I desideri sono la lista della spesa della collezione di carta:
  // si leggono da fuori, li scrive la casa. Da quando le registrazioni
  // valgono per la videoteca il server rifiuta le scritture di chi in
  // biblioteca sta solo guardando — e i comandi qui spariscono invece
  // di restare lì a promettere qualcosa.
  const { bibliotecaSolaLettura } = useSessione();
  const eseguiProtetto = useAccessoProtetto();

  const [modulo, setModulo] = useState(null); // null = chiuso
  const [ricercaTesto, setRicerca] = useState("");
  const [problema, setProblema] = useState(null);

  // La serie di cui si sta dicendo quanti volumi si sono presi, e la
  // riga di spiegazione che resta dopo (per esempio quando l'edizione
  // in collezione c'era già).
  const [daComprare, setDaComprare] = useState(null);
  const [nota, setNota] = useState(null);

  // Le uscite e le serie quasi complete. Quello che si segna «preso»
  // sparisce subito da qui, senza aspettare che tornino le liste.
  const { serie: collezione, ricarica: ricaricaCollezione } = useCollezione();
  const uscite = useRisorsa(() => getUsciteManga(14));
  const [presi, setPresi] = useState(() => new Set());
  const [prendendo, setPrendendo] = useState(null);

  const escono = useMemo(
    () => (uscite.dati?.uscite || []).filter((u) => u.stato !== "gia" && !presi.has(`${u.serie.id}:${u.numero}`)),
    [uscite.dati, presi]
  );

  const perChiudere = useMemo(() => {
    const inUscita = new Set(escono.map((u) => u.serie.id));

    return (collezione || [])
      .filter((s) => !s.droppato && !inUscita.has(Number(s.id)))
      .map((s) => ({ serie: s, mancanti: volumiMancanti(s) }))
      .filter((c) => c.mancanti > 0 && c.mancanti <= 3 && !presi.has(`${c.serie.id}:${c.serie.posseduti + 1}`))
      .sort((a, b) => a.mancanti - b.mancanti || b.serie.posseduti - a.serie.posseduti)
      .slice(0, 8);
  }, [collezione, escono, presi]);

  const totale =
    escono.reduce((t, u) => t + (u.serie.prezzo_stimato || 0), 0) +
    perChiudere.reduce((t, c) => t + (c.serie.costo || 0) * c.mancanti, 0);

  async function preso(serieId, numero, titolo) {
    const chiave = `${serieId}:${numero}`;

    setProblema(null);
    setNota(null);
    setPrendendo(chiave);

    try {
      await eseguiProtetto(() => registraAcquisto(serieId, { volumi: [numero] }));
      setPresi((p) => new Set(p).add(chiave));
      setNota(`${titolo} ${numero} registrato.`);
      ricaricaCollezione();
    } catch (e) {
      if (!e?.annullato) setProblema(`${titolo} ${numero} non è stato registrato.`);
    } finally {
      setPrendendo(null);
    }
  }

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
        await eseguiProtetto(() => updateWishlistItem(valori.id, corpo));
      } else {
        await eseguiProtetto(() => addToWishlist(corpo));
      }

      setModulo(null);
      ricarica();
    } catch {
      setProblema("Il salvataggio non è andato a buon fine.");
    }
  }

  // La conferma la chiede il menu (secondo tocco): niente finestra del browser.
  async function elimina(elemento) {
    setProblema(null);
    setDati((precedenti) => (precedenti || []).filter((e) => e.id !== elemento.id));

    try {
      await eseguiProtetto(() => deleteWishlistItem(elemento.id));
    } catch (e) {
      // «Annullato» vuol dire che l'accesso è stato chiuso o che la
      // biblioteca non è sua: l'ha già detto il riquadro, e un secondo
      // avviso rosso qui sotto direbbe che si è rotto qualcosa.
      if (!e?.annullato) setProblema("Non sono riuscito a eliminare la voce.");
      ricarica();
    }
  }

  async function comprato(elemento, dettagli) {
    setProblema(null);
    setNota(null);

    try {
      const esito = await eseguiProtetto(() =>
        purchaseWishlistItem(elemento.id, dettagli)
      );

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
      titolo="Da comprare"
      sommario="Uscite, ultimi volumi e desideri, in un posto solo."
      azioni={
        <div className="flex flex-wrap items-center gap-3">
          <CampoRicerca
            valore={ricercaTesto}
            onCambia={setRicerca}
            segnaposto="Cerca fra i desideri…"
            risultati={visibili.length}
          />

          {!bibliotecaSolaLettura && (
            <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi</Bottone>
          )}
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

        {!ricercaTesto && escono.length > 0 && (
          <Mucchio titolo="Escono ora">
            {escono.map((u) => (
              <RigaSpesa
                key={`u${u.serie.id}:${u.numero}`}
                a={`/serie/${u.serie.id}`}
                copertina={u.copertina}
                ripiego={u.serie.copertina}
                titolo={`${u.serie.titolo} ${u.numero}`}
                sotto={[giornoBreve(u.data), u.editore].filter(Boolean).join(" · ")}
                avviso={u.stato === "manca" ? `prima te ne ${u.mancanti === 1 ? "manca 1" : `mancano ${u.mancanti}`}` : null}
                prezzo={u.serie.prezzo_stimato}
                occupato={prendendo === `${u.serie.id}:${u.numero}`}
                onPreso={bibliotecaSolaLettura ? null : () => preso(u.serie.id, u.numero, u.serie.titolo)}
              />
            ))}
          </Mucchio>
        )}

        {!ricercaTesto && perChiudere.length > 0 && (
          <Mucchio titolo="Per chiudere una serie">
            {perChiudere.map(({ serie: s, mancanti }) => (
              <RigaSpesa
                key={`c${s.id}`}
                a={`/serie/${s.id}`}
                copertina={s.copertina}
                titolo={`${s.titolo} ${s.posseduti + 1}`}
                sotto={mancanti === 1 ? "l'ultimo, poi è completa" : mancanti === 2 ? "poi te ne manca 1" : `poi te ne mancano ${mancanti - 1}`}
                sottoColore={mancanti === 1 ? "text-jade" : undefined}
                prezzo={s.costo}
                occupato={prendendo === `${s.id}:${s.posseduti + 1}`}
                onPreso={bibliotecaSolaLettura ? null : () => preso(Number(s.id), s.posseduti + 1, s.titolo)}
              />
            ))}
          </Mucchio>
        )}

        {!ricercaTesto && totale > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-strong px-4 py-3.5">
            <span className="text-sm text-ink-muted">Uscite e ultimi volumi</span>
            <span className="font-numeric text-lg font-semibold text-ink-bright">{euro(totale)}</span>
          </div>
        )}

        {!ricercaTesto && (dati || []).length > 0 && (
          <h2 className="-mb-4 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Desideri</h2>
        )}

        {errore ? (
          <Errore errore={errore} riprova={ricarica} />
        ) : inCorso && !dati ? (
          <CaricamentoElenco />
        ) : visibili.length ? (
          <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">
            {visibili.map((e) => (
              <li key={e.id}>
                <RigaDesiderio
                  elemento={e}
                  soloLettura={bibliotecaSolaLettura}
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
              !ricercaTesto &&
              !bibliotecaSolaLettura && (
                <Bottone onClick={() => setModulo(VUOTO)}>Aggiungi la prima</Bottone>
              )
            }
          />
        )}
      </div>
    </Pagina>
  );
}

/* ==================================================
   I MUCCHI DELLA SPESA
   ================================================== */

const GIORNO = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", timeZone: "Europe/Rome" });

function giornoBreve(data) {
  return GIORNO.format(new Date(`${data}T12:00:00`));
}

function Mucchio({ titolo, children }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{titolo}</h2>
      <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">{children}</ul>
    </section>
  );
}

/**
 * La copertina del volume, e se non arriva quella della serie: le
 * miniature delle edizioni su AnimeClick a volte non esistono ancora
 * per i volumi appena annunciati.
 */
function Miniatura({ src, ripiego = null }) {
  const [tentativo, setTentativo] = useState(0);
  const candidate = [src, ripiego].filter(Boolean);
  const indirizzo = urlCopertina(candidate[tentativo]);

  return indirizzo ? (
    <img
      key={indirizzo}
      src={indirizzo}
      alt=""
      loading="lazy"
      onError={() => setTentativo((t) => t + 1)}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-md bg-glass-2" />
  );
}

function RigaSpesa({ a, copertina, ripiego, titolo, sotto, sottoColore = "text-ink-muted", avviso, prezzo, occupato, onPreso }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link to={a} className="flex min-w-0 flex-1 items-center gap-3">
        <Miniatura src={copertina} ripiego={ripiego} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">{titolo}</p>
          <p className={`truncate text-xs ${sottoColore}`}>{sotto}</p>
          {avviso && <p className="truncate text-xs text-ember">{avviso}</p>}
        </div>
      </Link>

      {prezzo ? <span className="shrink-0 font-numeric text-sm font-semibold text-ink-bright">{euro(prezzo)}</span> : null}

      {onPreso && (
        <button
          type="button"
          onClick={onPreso}
          disabled={occupato}
          className="shrink-0 rounded-xl bg-glass-2 px-3 py-2 text-sm font-semibold text-ink-bright transition-transform duration-quick active:scale-95 disabled:opacity-60"
        >
          {occupato ? "…" : "Preso"}
        </button>
      )}
    </li>
  );
}

/* ==================================================
   RIGA DI UN DESIDERIO
   ================================================== */

function RigaDesiderio({ elemento, onModifica, onElimina, onComprato, soloLettura }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link to={`/desiderio/${elemento.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-10 shrink-0">
          <Copertina src={elemento.coverurl} alt={elemento.titolo} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">{elemento.titolo}</p>
          <p className="truncate text-xs text-ink-muted">
            {[elemento.volumitotali ? `${elemento.volumitotali} ${Number(elemento.volumitotali) === 1 ? "volume" : "volumi"}` : null, elemento.autori].filter(Boolean).join(" · ")}
          </p>
          {elemento.dovecomprare ? (
            <p className="truncate text-xs text-ink-muted">Dove: {elemento.dovecomprare}</p>
          ) : null}
        </div>
      </Link>

      {!soloLettura && (
        <>
          <Bottone onClick={onComprato} title="Sposta in collezione" className="shrink-0 !px-3 !py-2">
            Comprato
          </Bottone>

          <Menu
            etichetta={`Altro su ${elemento.titolo}`}
            voci={[
              { chiave: "modifica", etichetta: "Modifica", descrizione: "Titolo, volumi, dove comprarla.", onClick: onModifica },
              {
                chiave: "elimina",
                etichetta: "Togli dai desideri",
                conferma: "Sicuro? Tocca di nuovo",
                pericolo: true,
                onClick: onElimina
              }
            ]}
          />
        </>
      )}
    </div>
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
