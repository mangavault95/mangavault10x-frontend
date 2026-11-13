import { useEffect, useMemo, useRef, useState } from "react";
import Pagina from "../ui/Pagina";
import Icon from "../app/Icon";
import { Bottone, CampoRicerca } from "../ui/Controlli";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { useCollezione } from "../dati/collezione";
import {
  addToWishlist,
  deleteWishlistItem,
  getUsciteManga,
  getWishlist,
  purchaseWishlistItem,
  registraAcquisto,
  updateWishlistItem
} from "../services/api";
import { vibra } from "../dati/tatto";
import { chiudibile, euro, numeriMancantiUsciti } from "../dati/serie";
import {
  Mucchio,
  RigaSpesa,
  CartaMancanti,
  PopupVolumi,
  RigaDesiderio
} from "../ui/wishlist/Righe";
import { ModuloComprato, ModuloDesiderio } from "../ui/wishlist/Moduli";

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

const GIORNO = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", timeZone: "Europe/Rome" });

function giornoBreve(data) {
  return GIORNO.format(new Date(`${data}T12:00:00`));
}

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

    vibra("conferma");

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
          <ul className="divide-y divide-hairline rounded-card bg-alcove px-3.5">
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
