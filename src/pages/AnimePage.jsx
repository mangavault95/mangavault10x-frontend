import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../app/Icon";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { etichettaStagione, stagioniDi } from "../dati/videoteca";
import {
  getAnime,
  impostaVisione,
  rileggiAnime,
  togliDallaVideoteca,
  urlCopertina,
  votaAnime,
  togliVotoAnime,
  preferisciAnime
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
import Stagione from "../ui/videoteca/Stagione";
import NoteAnime from "../ui/videoteca/NoteAnime";
import Sovrapposizione from "../ui/Sovrapposizione";
import { NOMI_STATO_SERIE, NOMI_TIPO, formattaVoto } from "../ui/videoteca/formati";

/**
 * La scheda di una serie — con tutte le sue stagioni.
 *
 * L'indirizzo porta l'id di una scheda di AnimeClick, ma quello che si
 * apre è la SERIE: se quella scheda appartiene a un gruppo, qui sotto
 * ci sono tutte le stagioni, una sotto l'altra. È il rimedio al
 * disordine che si vedeva prima — Isekai Farming occupava due pannelli
 * distinti in videoteca, con due progressi separati, mentre Frieren ne
 * occupava uno solo perché AnimeClick per lei tiene una scheda sola.
 *
 * L'ordine risponde alle domande nell'ordine in cui uno se le fa:
 * a che punto sono, quando esce la prossima, cos'è questa roba, e solo
 * dopo l'elenco delle puntate e quello che ne abbiamo detto.
 */
export default function AnimePage() {
  const { id } = useParams();
  const { utente } = useSessione();
  const navigate = useNavigate();

  const carica = useCallback(() => getAnime(id), [id]);
  const { dati, errore, inCorso, ricarica, setDati } = useRisorsa(carica);

  const [azione, setAzione] = useState(null);
  const [apertaScelta, setApertaScelta] = useState(null);
  // Cosa si sta per togliere: `null`, la serie intera (`{ tutto: true }`)
  // o una parte sola (`{ scheda }`). Era un booleano finché toglierne
  // una sola non era possibile.
  const [rimozione, setRimozione] = useState(null);
  const [guaio, setGuaio] = useState(null);

  // Le SCHEDE di AnimeClick che compongono questa serie: una sola per
  // le serie normali, più d'una quando AnimeClick apre una scheda per
  // stagione (Isekai Farming).
  const schede = useMemo(() => {
    if (!dati) return [];

    return dati.stagioni?.length ? dati.stagioni : [dati];
  }, [dati]);

  // Le stagioni vere. Non coincidono con le schede: Frieren è una
  // scheda sola con dentro 38 puntate che sono due stagioni, e il
  // taglio — la 29 — lo dà AniList (vedi `anime.tagli`). Chi disegna
  // la pagina riceve dei blocchi e non deve sapere da quale dei due
  // casi arrivano.
  const stagioni = useMemo(() => stagioniDi(schede), [schede]);

  const puoiScrivere = Boolean(utente);

  /**
   * Quale stagione si apre da sola.
   *
   * Quella cominciata e non finita, che è dove si torna nove volte su
   * dieci. Se sono tutte finite o tutte da cominciare, l'ultima: chi
   * apre una serie conclusa di solito vuole l'ultima puntata, non la
   * prima di dieci anni fa.
   */
  const apertaChiave = useMemo(() => {
    if (apertaScelta) return apertaScelta;

    // Le stagioni si contano a blocchi e non a schede, quindi si
    // guarda dentro l'elenco di ciascuno: due blocchi della stessa
    // scheda hanno lo stesso `episodi_visti` complessivo, e fidarsi di
    // quello aprirebbe sempre il primo.
    const contaVisti = (s) => (s.episodi || []).filter((e) => e.visto).length;
    const contaTutti = (s) => (s.episodi || []).filter((e) => e.numero > 0).length;

    const inCorsoOra = stagioni.find(
      (s) => contaVisti(s) > 0 && contaVisti(s) < contaTutti(s)
    );

    const daCominciare = stagioni.find((s) => contaVisti(s) === 0);

    return (inCorsoOra || daCominciare || stagioni[stagioni.length - 1])?.chiave ?? null;
  }, [apertaScelta, stagioni]);

  /** Aggiorna le spunte di una stagione senza ricaricare tutta la scheda. */
  function aggiornaSpunte(stagioneId, cambio) {
    if (cambio.ripristina) {
      ricarica();
      return;
    }

    setDati((precedente) => {
      if (!precedente) return precedente;

      const tocca = (lista) =>
        lista.map((e) => {
          if (cambio.togli === e.numero) return { ...e, visto: false };
          if (cambio.aggiungi?.includes(e.numero)) return { ...e, visto: true };

          return e;
        });

      const rifai = (s) => {
        if (Number(s.id) !== Number(stagioneId)) return s;

        const episodi = tocca(s.episodi || []);

        return {
          ...s,
          episodi,
          // Il conteggio va tenuto d'accordo a mano: è quello che decide
          // la barra in cima e quale stagione si apre da sola.
          episodi_visti: episodi.filter((e) => e.visto).length
        };
      };

      return {
        ...precedente,
        episodi: Number(precedente.id) === Number(stagioneId)
          ? tocca(precedente.episodi || [])
          : precedente.episodi,
        stagioni: (precedente.stagioni || []).map(rifai)
      };
    });
  }

  async function cambiaStato(stagioneId, stato) {
    setAzione(`stato-${stagioneId}`);

    try {
      await impostaVisione(stagioneId, stato);

      setDati((p) =>
        p
          ? {
              ...p,
              stato_visione: Number(p.id) === Number(stagioneId) ? stato : p.stato_visione,
              stagioni: (p.stagioni || []).map((s) =>
                Number(s.id) === Number(stagioneId) ? { ...s, stato_visione: stato } : s
              )
            }
          : p
      );
    } finally {
      setAzione(null);
    }
  }

  async function cambiaVoto(stagioneId, voto) {
    setAzione(`voto-${stagioneId}`);

    try {
      if (voto === null) await togliVotoAnime(stagioneId);
      else await votaAnime(stagioneId, voto);

      await ricarica();
    } finally {
      setAzione(null);
    }
  }

  /**
   * Il cuoricino: mette la serie in vetrina sulla propria pagina.
   *
   * Tocca TUTTE le schede della serie, non quella aperta: la vetrina
   * è fatta di serie, e segnare solo Isekai Farming II vorrebbe dire
   * ritrovarsi in vetrina mezza serie. Le schede già nello stato
   * giusto si saltano, perché la rotta commuta e chiamarla su una già
   * accesa la spegnerebbe.
   */
  async function preferisci() {
    const acceso = !schede.some((s) => s.preferito);

    setAzione("preferito");

    try {
      await Promise.all(
        schede.filter((s) => Boolean(s.preferito) !== acceso).map((s) => preferisciAnime(s.id))
      );

      setDati((p) =>
        p
          ? {
              ...p,
              preferito: acceso,
              stagioni: (p.stagioni || []).map((s) => ({ ...s, preferito: acceso }))
            }
          : p
      );
    } catch (e) {
      setGuaio(e);
    } finally {
      setAzione(null);
    }
  }

  async function rileggi() {
    setAzione("rileggi");

    try {
      // Tutte le stagioni, non solo quella aperta: sono la stessa serie
      // per chi guarda, e rileggerne una sola lascerebbe le altre
      // indietro senza che si capisca perché.
      for (const s of schede) await rileggiAnime(s.id);

      await ricarica();
    } finally {
      setAzione(null);
    }
  }

  async function togli() {
    setAzione("togli");
    setGuaio(null);

    try {
      for (const s of schede) await togliDallaVideoteca(s.id);

      navigate("/videoteca/io");
    } catch (e) {
      setGuaio(e);
      setAzione(null);
    }
  }

  /**
   * Togliere UNA parte: un OAV messo per sbaglio, un film che non
   * c'entra, una stagione che non si vuole tenere.
   *
   * Fino a qui l'unico rimedio era togliere la serie intera e
   * rifarla da capo, perdendo le spunte di tutto il resto.
   *
   * Due cose da fare bene, e sono la ragione per cui non è una
   * chiamata sola:
   *
   *   - se quella era l'ULTIMA parte, non c'è più una scheda da
   *     mostrare e si torna in videoteca;
   *   - se era la parte il cui identificativo sta nell'indirizzo, la
   *     pagina resta ma l'indirizzo no: va portato su una delle parti
   *     rimaste, altrimenti ricaricando si chiederebbe una scheda che
   *     per noi non esiste più.
   */
  async function togliParte(scheda) {
    setAzione(`togli-${scheda.id}`);
    setGuaio(null);

    try {
      await togliDallaVideoteca(scheda.id);

      const restano = schede.filter((s) => String(s.id) !== String(scheda.id));

      if (restano.length === 0) {
        navigate("/videoteca/io");
        return;
      }

      if (String(scheda.id) === String(id)) {
        navigate(`/videoteca/${restano[0].id}`, { replace: true });
        return;
      }

      await ricarica();
    } catch (e) {
      setGuaio(e);
    } finally {
      setAzione(null);
      setRimozione(null);
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

  const sola = stagioni.length === 1;
  const prima = stagioni[0];

  const titolo = dati.gruppo?.titolo || dati.titolo;
  const copertina = dati.gruppo?.cover_url || prima.cover_url || dati.cover_url;

  // I numeri della serie intera: la barra in cima somma le stagioni,
  // perché è la domanda che ci si fa aprendo — a che punto sono.
  const visti = stagioni.reduce(
    (somma, s) => somma + (s.episodi || []).filter((e) => e.visto).length,
    0
  );

  const disponibili = stagioni.reduce(
    (somma, s) => somma + (s.episodi || []).filter((e) => e.numero > 0).length,
    0
  );

  // Le puntate DICHIARATE si sommano sulle schede: due blocchi della
  // stessa scheda dichiarano lo stesso numero, e sommarlo due volte
  // raddoppierebbe il fondoscala della barra.
  const dichiarati = schede.reduce((somma, s) => somma + Number(s.episodi_totali || 0), 0);
  const su = disponibili || dichiarati || null;

  const adesso = new Date();

  const prossima = stagioni
    .flatMap((s) => (s.episodi || []).map((e) => ({ ...e, stagione: s })))
    .filter((e) => e.uscita_italia && new Date(e.uscita_italia) > adesso)
    .sort((a, b) => new Date(a.uscita_italia) - new Date(b.uscita_italia))[0];

  // I commenti sono della serie, non della stagione: si leggono tutti
  // insieme, e si scrivono sulla stagione aperta — che è quella di cui
  // si sta parlando.
  const note = schede.flatMap((s) => s.note || []);

  // In vetrina basta una scheda: la vetrina e' fatta di serie.
  const preferito = schede.some((s) => s.preferito);
  const anni = [schede[0].anno_inizio, schede[schede.length - 1].anno_fine].filter(Boolean);

  return (
    <PaginaVideoteca
      occhiello={
        <Link to="/videoteca/io" className="hover:text-quaderno-inchiostro">
          ← La mia videoteca
        </Link>
      }
      titolo={titolo}
      sommario={[
        // «3 stagioni e 1 film», non «4 stagioni»: da quando una serie
        // entra intera, i film e gli OAV stanno nella stessa scheda, e
        // contarli come stagioni direbbe una cosa falsa a colpo
        // d'occhio.
        sola ? dati.titolo_originale : composizioneDi(stagioni),
        [...new Set(anni)].join("–"),
        NOMI_STATO_SERIE[prima.stato]
      ]
        .filter(Boolean)
        .join(" · ")}
      azioni={
        puoiScrivere && (
          <>
            {/* La vetrina della propria pagina si riempie da qui: è il
                posto in cui uno si trova quando decide che una serie
                lo rappresenta, cioè guardandola. */}
            <Bottone
              onClick={preferisci}
              disabled={azione !== null}
              tono={preferito ? "pieno" : "quieto"}
              aria-pressed={preferito}
            >
              <Icon nome="cuore" dimensione={16} piena={preferito} />
              {preferito ? "Nei preferiti" : "Metti fra i preferiti"}
            </Bottone>

            <Bottone onClick={rileggi} disabled={azione !== null}>
              {azione === "rileggi" ? "Rileggo…" : "Rileggi da AnimeClick"}
            </Bottone>

            <Bottone onClick={() => setRimozione({ tutto: true })} disabled={azione !== null}>
              Togli dalla videoteca
            </Bottone>
          </>
        )
      }
    >
      {/* Le due colonne portano `min-w-0`, e non è una precauzione a
          caso: senza, la pagina diventa più larga dello schermo e i
          comandi sulla destra finiscono fuori.

          Il motivo è che i titoli delle puntate sono `truncate`, cioè
          `white-space: nowrap`. Troncare vale quando la larghezza è
          già decisa, ma qui è la griglia a doverla decidere, e per
          farlo chiede al contenuto quanto gli serve al minimo: una
          riga che non va a capo risponde con la lunghezza intera del
          titolo. «Diagnosi d'avventura del dottor Chopper ~L'ultimo
          messaggio lasciato dal genio~» pretende 507px e la colonna
          si allarga a 630 dentro una finestra da 375.

          `min-w-0` toglie quella pretesa: la colonna prende la
          larghezza che c'è e il troncamento torna a fare il suo
          mestiere. Serve su entrambe perché a telefono la colonna è
          una sola e le due schede se la dividono. */}
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* ---------- Colonna sinistra: la copertina e i fatti ---------- */}
        <div className="min-w-0 space-y-4">
          <Scheda className="overflow-hidden">
            <div className="aspect-[3/4] bg-quaderno-carta">
              {copertina && (
                <img src={urlCopertina(copertina)} alt="" className="h-full w-full object-cover" />
              )}
            </div>

            <div className="space-y-3 p-3">
              <Progresso visti={visti} su={su} />

              {!puoiScrivere && dati.voto_medio && (
                <p className="font-numeric text-sm text-quaderno-blu">
                  ★ {formattaVoto(dati.voto_medio)}
                </p>
              )}

              {/* Il voto e lo stato stanno dentro ogni stagione, qui
                  accanto: con più stagioni sono cose diverse, e una
                  sola coppia in cima direbbe la cosa sbagliata su
                  tutte tranne una. */}
            </div>
          </Scheda>

          <Scheda className="space-y-3 p-3 text-sm">
            <Fatto etichetta="Tipo" valore={NOMI_TIPO[prima.tipo] || prima.tipo} />
            <Fatto
              etichetta="Episodi"
              valore={
                sola ? prima.episodi_dichiarati : `${disponibili} in ${composizioneDi(stagioni)}`
              }
            />
            {/* `periodo` è la frase di AnimeClick — «Autunno (2023)
                [...] Inverno (2026)» — e non l'elenco delle stagioni,
                che qui sotto ha un blocco tutto suo. */}
            <Fatto etichetta="Stagioni" valore={sola ? prima.periodo : null} />
            <Fatto etichetta="In Italia" valore={prima.stato_italia} />

            {prima.generi?.length > 0 && (
              <div>
                <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
                  Generi
                </p>
                <div className="flex flex-wrap gap-1">
                  {prima.generi.map((g) => (
                    <Pillola key={g}>{g}</Pillola>
                  ))}
                </div>
              </div>
            )}

            {prima.distributori?.length > 0 && (
              <div>
                <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-quaderno-tenue">
                  Dove si vede
                </p>
                <div className="flex flex-wrap gap-1">
                  {prima.distributori.map((d) => (
                    <Pillola key={d} tono="contorno">
                      {d}
                    </Pillola>
                  ))}
                </div>
              </div>
            )}

            {/* Il ponte con la carta: il senso di avere le due cose
                nello stesso sito invece che in due app diverse. */}
            {stagioni.find((s) => s.manga_id) && (
              <Link
                to={`/serie/${stagioni.find((s) => s.manga_id).manga_id}`}
                className="block pt-1 text-sm font-medium text-quaderno-blu hover:underline"
              >
                Il manga è in collezione →
              </Link>
            )}
          </Scheda>
        </div>

        {/* ---------- Colonna destra ---------- */}
        <div className="min-w-0 space-y-6">
          {guaio && (
            <Scheda className="border-l-[3px] border-l-ember p-4">
              <p className="text-sm text-quaderno-inchiostro">{guaio.message}</p>
            </Scheda>
          )}

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

          {prima.trama && (
            <Blocco titolo="Trama">
              <Scheda className="p-4">
                <p className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-quaderno-inchiostro">
                  {prima.trama}
                </p>
              </Scheda>
            </Blocco>
          )}

          <Blocco
            titolo={sola ? "Episodi" : "Le stagioni"}
            extra={
              <span className="font-numeric text-xs text-quaderno-tenue">
                {visti} di {disponibili}
              </span>
            }
          >
            <div className="space-y-2">
              {stagioni.map((stagione, indice) => (
                <Stagione
                  key={stagione.chiave}
                  stagione={stagione}
                  indice={indice}
                  tutte={stagioni}
                  sola={sola}
                  aperta={stagione.chiave === apertaChiave}
                  apri={() =>
                    setApertaScelta(stagione.chiave === apertaChiave ? "nessuna" : stagione.chiave)
                  }
                  puoiScrivere={puoiScrivere}
                  azione={azione}
                  alCambio={(cambio) => aggiornaSpunte(stagione.id, cambio)}
                  alVoto={(voto) => cambiaVoto(stagione.id, voto)}
                  alStato={(stato) => cambiaStato(stagione.id, stato)}
                  // Solo con più di una parte: da sola, «togli questa
                  // parte» e «togli dalla videoteca» sarebbero lo
                  // stesso gesto scritto due volte.
                  alTogli={
                    schede.length > 1
                      ? () => setRimozione({ scheda: stagione })
                      : null
                  }
                />
              ))}
            </div>
          </Blocco>

          <Blocco titolo="Commenti">
            <NoteAnime
              // Il commento si scrive sulla scheda della stagione
              // aperta: è quella di cui si sta parlando. Chiuse tutte,
              // vale la prima.
              animeId={stagioni.find((s) => s.chiave === apertaChiave)?.id ?? prima.id}
              note={note}
              utente={utente}
              alCambio={ricarica}
            />
          </Blocco>
        </div>
      </div>

      {rimozione?.tutto && (
        <ConfermaRimozione
          titolo={titolo}
          stagioni={stagioni.length}
          inCorso={azione === "togli"}
          conferma={togli}
          annulla={() => setRimozione(null)}
        />
      )}

      {rimozione?.scheda && (
        <ConfermaParte
          parte={rimozione.scheda}
          nome={etichettaStagione(
            rimozione.scheda,
            stagioni.findIndex((s) => s.chiave === rimozione.scheda.chiave),
            stagioni
          )}
          // Frieren è UNA scheda con dentro due stagioni: il taglio lo
          // dà AniList, la riga del database è una sola. Togliendola se
          // ne vanno tutt'e due, e va detto prima invece che scoperto
          // dopo.
          blocchi={stagioni.filter((s) => String(s.id) === String(rimozione.scheda.id)).length}
          inCorso={azione === `togli-${rimozione.scheda.id}`}
          conferma={() => togliParte(rimozione.scheda)}
          annulla={() => setRimozione(null)}
        />
      )}
    </PaginaVideoteca>
  );
}

/**
 * «3 stagioni e 1 film»: di che cosa è fatta questa serie.
 *
 * Le parti si contano per famiglia invece che tutte insieme. Un
 * numero solo — «4 stagioni» per Chainsaw Man — sarebbe sbagliato da
 * quando la scheda contiene anche il film, ed è proprio il momento in
 * cui la riga in cima serve a qualcosa: dice in tre parole cosa si
 * troverà scorrendo.
 */
function composizioneDi(stagioni) {
  const pezzi = [
    ["stagione", "stagioni", (s) => !["film", "ova", "special"].includes(s.tipo)],
    ["film", "film", (s) => s.tipo === "film"],
    ["OAV", "OAV", (s) => s.tipo === "ova"],
    ["special", "special", (s) => s.tipo === "special"]
  ]
    .map(([uno, molti, quali]) => {
      const quante = stagioni.filter(quali).length;

      return quante > 0 ? `${quante} ${quante === 1 ? uno : molti}` : null;
    })
    .filter(Boolean);

  if (pezzi.length <= 1) return pezzi[0] || null;

  return `${pezzi.slice(0, -1).join(", ")} e ${pezzi[pezzi.length - 1]}`;
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

/**
 * «Sicuro?» prima di togliere una serie.
 *
 * Non è prudenza di maniera: insieme alla serie se ne vanno le spunte,
 * il voto e i commenti di chi preme, e sono l'unica cosa in questa
 * pagina che non si può riprendere da AnimeClick. Il riquadro lo dice
 * con quelle parole, invece di chiedere una conferma generica.
 */
/**
 * Togliere una parte sola.
 *
 * Dice tre cose e nessuna di più: quale parte, cosa se ne va con lei, e
 * che la serie resta. È la differenza che conta davanti a questo
 * bottone — chi lo preme ha aggiunto un OAV per sbaglio, non vuole
 * perdere le trentotto spunte del resto.
 */
function ConfermaParte({ parte, nome, blocchi, inCorso, conferma, annulla }) {
  const viste = (parte.episodi || []).filter((e) => e.visto).length;

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center bg-quaderno-inchiostro/40 p-5"
        role="dialog"
        aria-label="Togliere questa parte"
      >
        <Scheda className="w-full max-w-sm space-y-4 p-6 shadow-float">
          <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
            Togliere «{nome}»?
          </h2>

          <p className="text-sm text-quaderno-tenue">
            {blocchi > 1
              ? `AnimeClick la tiene in una scheda sola insieme alle altre ${blocchi - 1 === 1 ? "puntate di un'altra stagione" : "puntate delle altre stagioni"}: se ne vanno insieme.`
              : "Esce dalla tua videoteca; il resto della serie resta dov'è."}{" "}
            {viste > 0
              ? `Con lei se ne vanno ${viste === 1 ? "la puntata segnata" : `le ${viste} puntate segnate`}, il voto e i commenti che le avevi messo.`
              : "Non avevi segnato niente su questa parte."}
          </p>

          <div className="flex gap-2">
            <Bottone tono="pieno" onClick={conferma} disabled={inCorso} className="flex-1">
              {inCorso ? "Tolgo…" : "Togli"}
            </Bottone>

            <Bottone onClick={annulla} disabled={inCorso}>
              Annulla
            </Bottone>
          </div>
        </Scheda>
      </div>
    </Sovrapposizione>
  );
}

function ConfermaRimozione({ titolo, stagioni, inCorso, conferma, annulla }) {
  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center bg-quaderno-inchiostro/40 p-5"
        role="dialog"
        aria-label="Togliere la serie"
      >
        <Scheda className="w-full max-w-sm space-y-4 p-6 shadow-float">
          <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
            Togliere «{titolo}»?
          </h2>

          <p className="text-sm text-quaderno-tenue">
            Esce dalla tua videoteca
            {stagioni > 1 ? ` con tutte e ${stagioni} le stagioni` : ""}, e con lei se ne vanno
            le tue spunte, il tuo voto e i tuoi commenti. Gli altri lettori tengono i loro.
          </p>

          <div className="flex gap-2">
            <Bottone tono="pieno" onClick={conferma} disabled={inCorso} className="flex-1">
              {inCorso ? "Tolgo…" : "Togli"}
            </Bottone>

            <Bottone onClick={annulla} disabled={inCorso}>
              Annulla
            </Bottone>
          </div>
        </Scheda>
      </div>
    </Sovrapposizione>
  );
}
