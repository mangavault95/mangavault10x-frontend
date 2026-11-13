import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Pagina from "../ui/Pagina";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
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
  dopoIlRipiego,
  enrichManga,
  getUsciteManga,
  getWishlist,
  purchaseWishlistItem,
  registraAcquisto,
  updateWishlistItem,
  urlCopertina
} from "../services/api";
import { cercaFuori } from "../bibliotecario/esterni";
import Foglio from "../ui/Foglio";
import { chiudibile, euro, intervalliVolumi, numeriMancantiUsciti, plurale } from "../dati/serie";

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

  // Una carta per serie, con i numeri che mancano FRA QUELLI GIÀ USCITI.
  // I volumi in arrivo stanno solo in «Escono ora»: qui non compaiono,
  // né come mancanti né nel conto.
  const perChiudere = useMemo(() => {
    const inUscita = new Set(escono.map((u) => `${u.serie.id}:${u.numero}`));

    return (collezione || [])
      // Smessa = non la compriamo più: i buchi restano, ma non sono spesa.
      .filter((s) => !s.droppato && !s.smessa)
      .map((s) => ({
        serie: s,
        numeri: numeriMancantiUsciti(s).filter((n) => !presi.has(`${s.id}:${n}`) && !inUscita.has(`${s.id}:${n}`))
      }))
      .filter((c) => c.numeri.length > 0)
      // Le più vicine alla fine per prime, a parità quelle più avanti.
      .sort((a, b) => a.numeri.length - b.numeri.length || b.serie.posseduti - a.serie.posseduti);
  }, [collezione, escono, presi]);

  // La serie di cui è aperto il riquadro con i numeri da segnare.
  const [apertaId, setApertaId] = useState(null);

  // «Preso» non scrive subito: la riga si segna e per cinque secondi c'è
  // «Annulla». Un tocco sbagliato mentre si scorre la lista non registra
  // un acquisto che poi andrebbe tolto a mano dalla scheda.
  const [inAttesa, setInAttesa] = useState(() => new Set());
  const coda = useRef(new Map());

  const segna = (serieId, numero, titolo) => {
    const chiave = `${serieId}:${numero}`;

    if (coda.current.has(chiave)) return;

    setNota(null);
    setProblema(null);

    const esegui = async () => {
      coda.current.delete(chiave);
      await preso(serieId, numero, titolo);
      setInAttesa((a) => {
        const n = new Set(a);

        n.delete(chiave);

        return n;
      });
    };

    coda.current.set(chiave, { timer: setTimeout(esegui, 5000), esegui });
    setInAttesa((a) => new Set(a).add(chiave));
  };

  const annullaSegno = (chiave) => {
    const voce = coda.current.get(chiave);

    if (!voce) return;

    clearTimeout(voce.timer);
    coda.current.delete(chiave);
    setInAttesa((a) => {
      const n = new Set(a);

      n.delete(chiave);

      return n;
    });
  };

  // Lasciando la pagina con un «Preso» in sospeso lo registro subito:
  // perderlo in silenzio sarebbe peggio che anticiparlo di qualche secondo.
  useEffect(() => {
    const voci = coda.current;

    return () => {
      for (const voce of voci.values()) {
        clearTimeout(voce.timer);
        voce.esegui();
      }
    };
  }, []);

  const chiaveUscita = (u) => `${u.serie.id}:${u.numero}`;
  // I numeri già segnati «preso» (in attesa dei 5 secondi) non contano più.
  const ancoraDaPrendere = (c) => c.numeri.filter((n) => !inAttesa.has(`${c.serie.id}:${n}`));

  const daSpendere = {
    uscite: escono.filter((u) => !inAttesa.has(chiaveUscita(u))),
    chiudere: perChiudere.map((c) => ({ ...c, numeri: ancoraDaPrendere(c) }))
  };

  // Volumi, non righe: una carta può valerne molti.
  const volumiDaPrendere =
    daSpendere.uscite.length + daSpendere.chiudere.reduce((n, c) => n + c.numeri.length, 0);

  const totale =
    daSpendere.uscite.reduce((t, u) => t + (u.serie.prezzo_stimato || 0), 0) +
    daSpendere.chiudere.reduce((t, c) => t + (c.serie.costo || 0) * c.numeri.length, 0);

  // Le due specie di «ti mancano»: chiudere una serie e rimettersi in
  // pari su una in corso non sono la stessa spesa.
  const perCompletare = perChiudere.filter((c) => chiudibile(c.serie));
  const perEssereInPari = perChiudere.filter((c) => !chiudibile(c.serie));
  const serieAperta = perChiudere.find((c) => Number(c.serie.id) === apertaId) || null;

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

          {/* Sul telefono «Aggiungi» è il tondo in basso a destra, come
              nella Collezione e negli Anime: qui occupava una riga sua. */}
          {!bibliotecaSolaLettura && (
            <Bottone onClick={() => setModulo(VUOTO)} className="hidden md:inline-flex">
              Aggiungi
            </Bottone>
          )}
        </div>
      }
    >
      {!bibliotecaSolaLettura && (
        <button
          type="button"
          onClick={() => setModulo(VUOTO)}
          aria-label="Aggiungi un desiderio"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-sticky grid h-14 w-14 place-items-center rounded-full insegna transition-transform duration-quick active:scale-95 md:hidden
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf"
        >
          <Icon nome="plus" dimensione={24} />
        </button>
      )}

      <div className="space-y-8">
        {/* Il riepilogo sta in cima: i soldi sono la prima cosa che si
            vuole sapere prima di entrare in fumetteria, e i desideri
            stavano sotto tutto senza nessun segno che esistessero. */}
        {!ricercaTesto && (volumiDaPrendere > 0 || (dati || []).length > 0) && (
          <p className="-mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1 text-sm text-ink-muted">
            {volumiDaPrendere > 0 && (
              <>
                <span className="font-numeric text-2xl font-semibold text-ambra [text-shadow:0_0_18px_rgb(var(--c-ambra)/0.35)]">{euro(totale)}</span>
                <span>per {volumiDaPrendere === 1 ? "1 volume" : `${volumiDaPrendere} volumi`}</span>
              </>
            )}

            {(dati || []).length > 0 && (
              <>
                {volumiDaPrendere > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => document.getElementById("desideri")?.scrollIntoView({ block: "start" })}
                  className="underline decoration-ink-faint decoration-dotted underline-offset-4 hover:text-ink-bright"
                >
                  {(dati || []).length === 1 ? "1 desiderio" : `${(dati || []).length} desideri`}
                </button>
              </>
            )}
          </p>
        )}

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
                inAttesa={inAttesa.has(chiaveUscita(u))}
                onAnnulla={() => annullaSegno(chiaveUscita(u))}
                onPreso={bibliotecaSolaLettura ? null : () => segna(u.serie.id, u.numero, u.serie.titolo)}
              />
            ))}
          </Mucchio>
        )}

        {[
          { titolo: "Per completare", voci: perCompletare },
          { titolo: "Per essere in pari", voci: perEssereInPari }
        ].map(
          ({ titolo, voci }) =>
            !ricercaTesto &&
            voci.length > 0 && (
              <Mucchio key={titolo} titolo={titolo}>
                {voci.map((c) => (
                  <CartaMancanti key={`c${c.serie.id}`} serie={c.serie} numeri={c.numeri} onApri={() => setApertaId(Number(c.serie.id))} />
                ))}
              </Mucchio>
            )
        )}

        {serieAperta && (
          <PopupVolumi
            serie={serieAperta.serie}
            numeri={serieAperta.numeri}
            inAttesa={inAttesa}
            prendendo={prendendo}
            soloLettura={bibliotecaSolaLettura}
            onSegna={(n) => segna(Number(serieAperta.serie.id), n, serieAperta.serie.titolo)}
            onAnnulla={annullaSegno}
            onChiudere={() => setApertaId(null)}
          />
        )}

        {!ricercaTesto && (dati || []).length > 0 && (
          <h2 id="desideri" className="-mb-4 scroll-mt-4 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Desideri</h2>
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
  const indirizzo = urlCopertina(candidate[tentativo], 128);

  return indirizzo ? (
    <img
      key={indirizzo}
      src={indirizzo}
      alt=""
      loading="lazy"
      onError={dopoIlRipiego(() => setTentativo((t) => t + 1))}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-md bg-glass-2" />
  );
}

function RigaSpesa({ a, copertina, ripiego, titolo, sotto, sottoColore = "text-ink-muted", avviso, prezzo, occupato, inAttesa = false, onAnnulla, onPreso }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link to={a} className={`flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-quick ${inAttesa ? "opacity-50" : ""}`}>
        <Miniatura src={copertina} ripiego={ripiego} />

        <div className="min-w-0 flex-1">
          <p className={`line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-bright ${inAttesa ? "line-through" : ""}`}>{titolo}</p>
          {/* Due righe e non una: «l'ultimo uscito, poi sei in p…» e «te ne
              mancano 2 per esse…» perdevano la parte che serve. */}
          <p className={`line-clamp-2 text-xs ${sottoColore}`}>{inAttesa ? "Preso: lo registro tra poco" : sotto}</p>
          {avviso && !inAttesa && <p className="line-clamp-2 text-xs text-ember">{avviso}</p>}
        </div>
      </Link>

      {prezzo ? <span className="shrink-0 font-numeric text-sm font-semibold text-ambra">{euro(prezzo)}</span> : null}

      {onPreso && (
        <button
          type="button"
          onClick={inAttesa ? onAnnulla : onPreso}
          disabled={occupato}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60 ${
            inAttesa ? "bg-brass-400 text-void" : "bg-glass-2 text-ink-bright"
          }`}
        >
          {occupato ? "…" : inAttesa ? "Annulla" : "Preso"}
        </button>
      )}
    </li>
  );
}

/**
 * Una serie, una riga: copertina, titolo e quanti/quali volumi mancano.
 * Il tocco apre il riquadro con i numeri da segnare.
 */
function CartaMancanti({ serie, numeri, onApri }) {
  const tutti = numeri.length;

  return (
    <li>
      <button type="button" onClick={onApri} className="flex w-full items-center gap-3 py-2.5 text-left">
        <Miniatura src={serie.copertina} />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-bright">{serie.titolo}</p>
          <p className="text-xs text-ink-muted">
            {tutti === 1 ? "Manca" : "Mancano"} {plurale(tutti, "volume", "volumi")}
            {": "}
            <span className="font-numeric text-ink-bright">{intervalliVolumi(numeri)}</span>
          </p>
        </div>

        {serie.costo ? (
          <span className="shrink-0 font-numeric text-sm font-semibold text-ambra">{euro(serie.costo * tutti)}</span>
        ) : null}
      </button>
    </li>
  );
}

/** Il riquadro con un tondino per numero: toccarlo vuol dire «preso». */
function PopupVolumi({ serie, numeri, inAttesa, prendendo, soloLettura, onSegna, onAnnulla, onChiudere }) {
  return (
    <Foglio
      titolo={serie.titolo}
      sotto={soloLettura ? "Volumi che mancano" : "Tocca i volumi che hai preso"}
      larghezza="sm:max-w-sm"
      onChiudere={onChiudere}
    >
          <div className="mt-1 flex flex-wrap gap-2">
            {numeri.map((n) => {
              const chiave = `${serie.id}:${n}`;
              const inCoda = inAttesa.has(chiave);

              return (
                <button
                  key={n}
                  type="button"
                  disabled={soloLettura || prendendo === chiave}
                  onClick={() => (inCoda ? onAnnulla(chiave) : onSegna(n))}
                  title={inCoda ? "Annulla" : `Ho preso il ${n}`}
                  className={`grid h-11 min-w-11 place-items-center rounded-xl px-2 font-numeric text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60 ${
                    inCoda ? "bg-brass-400 text-void line-through" : "bg-glass-2 text-ink-bright"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Il segno si registra dopo 5 secondi: tocca di nuovo il numero per annullare.
          </p>
    </Foglio>
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
          <Bottone variante="secondario" onClick={onComprato} title="Sposta in collezione" className="shrink-0 !border-jade/40 !px-3 !py-2 !text-jade">
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
