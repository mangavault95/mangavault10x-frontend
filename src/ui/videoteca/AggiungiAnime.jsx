import { useEffect, useMemo, useRef, useState } from "react";
import {
  agganciaAnime,
  cercaAnime,
  getAnteprimaAnime,
  getFranchiseAnime,
  urlCopertina
} from "../../services/api";
import { raggruppaCandidati } from "../../dati/videoteca";
import { NOMI_TIPO } from "./formati";
import { Bottone, Pillola, Scheda } from "./Foglio";
import Sovrapposizione from "../Sovrapposizione";

/**
 * Il pannello che mette una serie in videoteca.
 *
 * Ha due passi, e i due passi sono la risposta a due fatiche diverse.
 *
 * ① SI CERCA MENTRE SI SCRIVE. Prima c'era una casella e un bottone
 *    «Cerca»: si scriveva, si premeva, si aspettava, e se il titolo era
 *    sbagliato si ricominciava. Adesso i risultati arrivano da soli
 *    dopo una pausa di battitura, e i risultati che sono la stessa
 *    serie stanno in una riga sola — «mushoku tensei» dà una riga con
 *    scritto «3 parti», non tre righe che sembrano tre serie.
 *
 * ② SI SCEGLIE LA SERIE, NON LA STAGIONE. Toccando una riga il
 *    pannello va a chiedere ad AnimeClick di che parti è fatta quella
 *    serie e le mostra tutte, già spuntate quelle che servono: le
 *    stagioni, i film che continuano la storia, gli OAV. Un bottone
 *    solo, e in videoteca c'è tutto sotto una copertina.
 *
 * Perché la proposta si vede invece di prendere tutto in silenzio: la
 * pagina delle relazioni di AnimeClick è un sacco. Sotto Demon Slayer
 * ci sono le quattro stagioni vere, due film veri, tre film che sono
 * riassunti della prima stagione e una serie di corti comici. Quello
 * che il sito non sa decidere resta scritto e spento, con accanto il
 * perché: si accende con un tocco, e non arriva di nascosto.
 */
export default function AggiungiAnime({ chiudi, alFatto }) {
  const [titolo, setTitolo] = useState("");

  // L'ultima risposta arrivata, insieme alla domanda che l'ha
  // prodotta. Le due cose stanno in uno stato solo apposta: è `per`
  // che permette di sapere se quello che si vede risponde ancora a
  // quello che c'è scritto nella casella, senza tenere un secondo
  // stato «sto caricando» da rimettere d'accordo a ogni giro.
  const [esito, setEsito] = useState(null);

  // La serie scelta: `null` finché si sta cercando.
  const [scelta, setScelta] = useState(null);

  const annulla = useRef(null);

  const cercato = titolo.trim();

  // Sotto le due lettere non si cerca; sopra, si tiene in vista
  // l'ultima lista arrivata anche mentre ne sta arrivando una nuova.
  // Svuotarla a ogni lettera farebbe lampeggiare il pannello.
  const righe = cercato.length >= 2 ? (esito?.righe ?? null) : null;
  const errore = esito?.per === cercato ? esito.errore : null;
  const inCorso = cercato.length >= 2 && esito?.per !== cercato;

  /* ---------- ① la ricerca che si aggiorna mentre si scrive ---------- */

  useEffect(() => {
    // Aperto il secondo passo, la ricerca si ferma: si sta guardando
    // una serie, e continuare a interrogare AnimeClick alle sue spalle
    // sarebbe traffico per una lista che nessuno guarda.
    if (scelta || cercato.length < 2) return undefined;

    // La pausa di battitura. 300 ms è il punto in cui si smette di
    // scrivere una parola senza che si senta l'attesa: più corta vuol
    // dire una richiesta per lettera, più lunga vuol dire una casella
    // che sembra ferma.
    const aspetta = setTimeout(async () => {
      annulla.current?.abort();

      const mio = new AbortController();

      annulla.current = mio;

      try {
        const trovati = await cercaAnime(cercato, mio.signal);

        setEsito({ per: cercato, righe: raggruppaCandidati(trovati), errore: null });
      } catch (err) {
        // Annullata perché è arrivata una lettera in più: non è
        // successo niente, e la risposta buona sta arrivando.
        if (err?.name === "AbortError") return;

        setEsito({ per: cercato, righe: null, errore: err });
      }
    }, 300);

    return () => clearTimeout(aspetta);
  }, [cercato, scelta]);

  // Chiudendo il pannello a metà ricerca, la richiesta appesa non
  // serve più a nessuno.
  useEffect(() => () => annulla.current?.abort(), []);

  return (
    <Sovrapposizione>
      <div
        className="fixed inset-0 z-modal grid place-items-center p-3"
        role="dialog"
        aria-label="Aggiungi un anime"
      >
        <button
          type="button"
          aria-label="Chiudi"
          onClick={chiudi}
          className="absolute inset-0 bg-quaderno-inchiostro/40"
        />

        <Scheda className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden shadow-float">
          {scelta ? (
            <Proposta
              scelta={scelta}
              indietro={() => setScelta(null)}
              chiudi={chiudi}
              alFatto={alFatto}
            />
          ) : (
            <Ricerca
              titolo={titolo}
              setTitolo={setTitolo}
              righe={righe}
              // A quale domanda risponde la lista che si sta vedendo:
              // serve alla riga illuminata dalle frecce, che deve
              // tornare in cima quando la lista cambia sotto.
              per={esito?.per ?? null}
              inCorso={inCorso}
              errore={errore}
              scegli={setScelta}
              chiudi={chiudi}
            />
          )}
        </Scheda>
      </div>
    </Sovrapposizione>
  );
}

/* ==================================================
   ① LA RICERCA
   ================================================== */

function Ricerca({ titolo, setTitolo, righe, per, inCorso, errore, scegli, chiudi }) {
  // Quale riga è illuminata dalle frecce, e per quale lista.
  //
  // La lista a cui si riferisce si porta dietro, invece di azzerarla
  // quando cambia: si scrive una lettera in più, arrivano altri
  // risultati, e la terza riga di prima non è più la terza riga di
  // adesso. Chi premesse Invio in quel momento aggiungerebbe una
  // serie che non ha visto. Legata alla domanda, la mira torna in
  // cima da sé appena la risposta è un'altra.
  const [mirato, setMirato] = useState({ per: null, indice: 0 });

  const mira = mirato.per === per ? mirato.indice : 0;

  const punta = (indice) => setMirato({ per, indice });

  function daTastiera(e) {
    if (!righe?.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      punta(Math.min(mira + 1, righe.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      punta(Math.max(mira - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (righe[mira]) scegli(righe[mira]);
    }
  }

  return (
    <>
      <div className="border-b border-quaderno-riga p-4">
        <div className="relative">
          <input
            autoFocus
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            onKeyDown={daTastiera}
            placeholder="Scrivi il titolo — in italiano, in originale o in inglese"
            aria-label="Titolo da cercare"
            // La casella si comporta da elenco a comparsa anche per chi
            // non la vede: senza questi, chi naviga a voce sente una
            // casella di testo qualunque e non sa che sotto si sta
            // riempiendo una lista.
            role="combobox"
            aria-expanded={Boolean(righe?.length)}
            aria-controls="risultati-anime"
            aria-activedescendant={righe?.length ? `risultato-${mira}` : undefined}
            autoComplete="off"
            className="w-full rounded-lg border border-quaderno-riga bg-quaderno-carta px-3 py-2 pr-24 text-sm text-quaderno-inchiostro placeholder:text-quaderno-tenue
              focus:outline-none focus:ring-2 focus:ring-quaderno-blu"
          />

          <span
            aria-live="polite"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-quaderno-tenue"
          >
            {inCorso ? "cerco…" : righe?.length ? `${righe.length} serie` : ""}
          </span>
        </div>

        <p className="mt-2 text-xs text-quaderno-tenue">
          Basta il nome della serie: le stagioni e i film te li porto dietro io.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {errore && (
          <p className="mb-3 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
            {errore.message}
          </p>
        )}

        {righe === null && !inCorso && (
          <p className="py-8 text-center text-sm text-quaderno-tenue">
            Cerca «shingeki no kyojin» o «l&apos;attacco dei giganti»: rispondono tutte e due.
          </p>
        )}

        {righe?.length === 0 && !inCorso && (
          <p className="py-8 text-center text-sm text-quaderno-tenue">
            Nessun titolo. Prova con una parola sola, o col nome originale.
          </p>
        )}

        <ul id="risultati-anime" role="listbox" className="space-y-2">
          {righe?.map((riga, indice) => (
            <li key={riga.radice} id={`risultato-${indice}`} role="option" aria-selected={indice === mira}>
              <button
                type="button"
                onClick={() => scegli(riga)}
                onMouseEnter={() => punta(indice)}
                className={`flex w-full items-center gap-3 rounded-card border p-2 text-left transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                  ${
                    indice === mira
                      ? "border-quaderno-blu bg-quaderno-blu-tenue/40"
                      : "border-quaderno-riga hover:bg-quaderno-carta"
                  }`}
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-quaderno-carta">
                  {riga.copertina && (
                    <img
                      src={urlCopertina(riga.copertina)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
                    {riga.titolo}
                  </p>

                  <p className="font-numeric text-xs text-quaderno-tenue">
                    {[
                      riga.dal && (riga.al && riga.al !== riga.dal ? `${riga.dal}–${riga.al}` : riga.dal),
                      riga.parti.length > 1 ? `${riga.parti.length} parti` : null
                    ]
                      .filter(Boolean)
                      .join(" · ") || "anno ignoto"}
                  </p>

                  {/* Le parti scritte sotto: la riga accorpa, ma non
                      deve nascondere. Chi cercava proprio la seconda
                      stagione deve vedere che è lì dentro. */}
                  {riga.parti.length > 1 && (
                    <p className="mt-0.5 truncate text-[0.7rem] text-quaderno-tenue">
                      {riga.parti.map((p) => p.titolo).join(" · ")}
                    </p>
                  )}
                </div>

                {riga.gia > 0 && (
                  <Pillola tono="blu" className="shrink-0">
                    {riga.gia === riga.parti.length ? "in videoteca" : "in parte"}
                  </Pillola>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end border-t border-quaderno-riga p-3">
        <Bottone onClick={chiudi}>Chiudi</Bottone>
      </div>
    </>
  );
}

/* ==================================================
   ② LA PROPOSTA: di che parti è fatta la serie
   ================================================== */

const NOMI_RUOLO = {
  stagione: "Stagione",
  film: "Film",
  oav: "OAV",
  extra: "Extra",
  fuori: "Altra opera"
};

function Proposta({ scelta, indietro, chiudi, alFatto }) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [prese, setPrese] = useState(() => new Set());
  const [aggiungo, setAggiungo] = useState(null);

  // La parte di cui si sta leggendo la trama: `{ parte, dati, errore }`.
  const [guardata, setGuardata] = useState(null);

  // Le trame già lette. Una trama non cambia mentre il pannello è
  // aperto, e riaprirla deve essere immediato: senza questa, tornare
  // su una riga già guardata rifarebbe la richiesta e rimetterebbe
  // «sto leggendo…» al posto di un testo che avevamo già.
  const lette = useRef(new Map());
  const annullaTrama = useRef(null);

  const animeclickId = scelta.capo.animeclickId;

  async function apriAnteprima(parte) {
    annullaTrama.current?.abort();

    const ricordata = lette.current.get(parte.animeclick_id);

    if (ricordata) {
      setGuardata({ parte, dati: ricordata, errore: null });
      return;
    }

    setGuardata({ parte, dati: null, errore: null });

    const mio = new AbortController();
    annullaTrama.current = mio;

    try {
      const dati = await getAnteprimaAnime(parte.animeclick_id, mio.signal);

      lette.current.set(parte.animeclick_id, dati);
      setGuardata((precedente) =>
        precedente?.parte.animeclick_id === parte.animeclick_id
          ? { ...precedente, dati }
          : precedente
      );
    } catch (err) {
      if (err?.name === "AbortError") return;

      setGuardata((precedente) =>
        precedente?.parte.animeclick_id === parte.animeclick_id
          ? { ...precedente, errore: err }
          : precedente
      );
    }
  }

  useEffect(() => () => annullaTrama.current?.abort(), []);

  useEffect(() => {
    let vivo = true;
    const mio = new AbortController();

    (async () => {
      try {
        const esito = await getFranchiseAnime(animeclickId, mio.signal);

        if (!vivo) return;

        setDati(esito);
        setPrese(
          new Set(esito.parti.filter((p) => p.consigliato && !p.giaTua).map((p) => p.animeclick_id))
        );
      } catch (err) {
        if (err?.name === "AbortError" || !vivo) return;

        setErrore(err);
      }
    })();

    return () => {
      vivo = false;
      mio.abort();
    };
  }, [animeclickId]);

  // Un elenco nuovo a ogni render farebbe ricalcolare i due gruppi
  // qui sotto anche quando la proposta non è cambiata di una virgola.
  const parti = useMemo(() => dati?.parti ?? [], [dati]);

  // Le opere che AnimeClick considera parenti ma che serie non sono —
  // gli spin-off, i remake, i riassunti. Stanno chiuse in fondo: sono
  // la minoranza dei casi, e aperte farebbero sembrare Demon Slayer una
  // serie da dodici stagioni.
  const [mostraAltro, setMostraAltro] = useState(false);

  const dentro = useMemo(() => parti.filter((p) => p.ruolo !== "fuori"), [parti]);
  const altro = useMemo(() => parti.filter((p) => p.ruolo === "fuori"), [parti]);

  function spunta(parte) {
    setPrese((precedenti) => {
      const nuove = new Set(precedenti);

      if (nuove.has(parte.animeclick_id)) nuove.delete(parte.animeclick_id);
      else nuove.add(parte.animeclick_id);

      return nuove;
    });
  }

  // Le parti che si possono ancora scegliere: quelle che già si hanno
  // non contano né da spuntare né da togliere.
  const scegliibili = dentro.filter((p) => !p.giaTua);
  const tutteScelte = scegliibili.length > 0 && scegliibili.every((p) => prese.has(p.animeclick_id));

  /**
   * Prendi tutto, o niente.
   *
   * Serve alle serie che la regola automatica non riesce a coprire
   * tutta. Monogatari è il caso limite: sedici pezzi, ognuno con un
   * nome suo — Bakemonogatari, Owarimonogatari, Kizumonogatari — e
   * AnimeClick che non scrive nessun legame. Il sito ne riconosce
   * sette e mostra gli altri spenti; senza questo bottone, prenderli
   * tutti vorrebbe dire nove tocchi in fila.
   *
   * Tocca solo l'elenco principale: «Altro materiale dello stesso
   * mondo» sono gli spin-off e i remake, e un «tutte» che si portasse
   * dietro anche quelli sarebbe una trappola.
   */
  function spuntaTutte() {
    setPrese((precedenti) => {
      const nuove = new Set(precedenti);

      for (const parte of scegliibili) {
        if (tutteScelte) nuove.delete(parte.animeclick_id);
        else nuove.add(parte.animeclick_id);
      }

      return nuove;
    });
  }

  /**
   * Aggiunge le parti spuntate.
   *
   * Il giro si ripete finché il server non dice che non è rimasto
   * niente: una serie lunga non entra nel tempo di una richiesta, e la
   * risposta porta `restanti`. Le parti già scritte non si rileggono,
   * quindi ogni giro dopo il primo è quasi solo un salto.
   */
  async function aggiungi() {
    const scelte = [...prese];

    if (scelte.length === 0) return;

    setErrore(null);

    let esito = null;
    let giro = 0;

    try {
      do {
        setAggiungo({
          fatte: esito?.aggiunte?.length ?? 0,
          quante: scelte.length
        });

        esito = await agganciaAnime(animeclickId, {
          parti: scelte,
          nome: dati?.capo?.nome
        });

        giro++;
      } while (esito?.restanti?.length > 0 && giro < 8);

      alFatto?.(esito);
      chiudi?.();
    } catch (err) {
      setErrore(err);
      setAggiungo(null);
    }
  }

  const quante = prese.size;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-quaderno-riga p-4">
        <Bottone tono="nudo" onClick={indietro} disabled={aggiungo !== null}>
          ← Indietro
        </Bottone>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-quaderno-inchiostro">
            {dati?.capo?.nome || scelta.titolo}
          </p>
          <p className="text-xs text-quaderno-tenue">
            {dati
              ? `${dentro.length} parti trovate · tieni premuto su una per la trama`
              : "Guardo di che parti è fatta…"}
          </p>
        </div>

        {scegliibili.length > 1 && (
          <Bottone tono="nudo" onClick={spuntaTutte} disabled={aggiungo !== null}>
            {tutteScelte ? "Togli tutte" : "Spunta tutte"}
          </Bottone>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {errore && (
          <p className="mb-3 rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
            {errore.message}
          </p>
        )}

        {!dati && !errore && (
          <p className="py-8 text-center text-sm text-quaderno-tenue">
            Sto leggendo le opere legate a questa scheda…
          </p>
        )}

        <ul className="space-y-2">
          {dentro.map((parte) => (
            <RigaParte
              key={parte.animeclick_id}
              parte={parte}
              presa={prese.has(parte.animeclick_id)}
              spunta={() => spunta(parte)}
              bloccata={aggiungo !== null}
              anteprima={apriAnteprima}
            />
          ))}
        </ul>

        {altro.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setMostraAltro((m) => !m)}
              className="text-xs font-semibold text-quaderno-blu hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
            >
              {mostraAltro ? "Nascondi" : `Altro materiale dello stesso mondo (${altro.length})`}
            </button>

            {mostraAltro && (
              <>
                <p className="mt-2 text-xs text-quaderno-tenue">
                  Spin-off, remake e riassunti: AnimeClick li elenca insieme alla serie, ma sono
                  opere diverse. Si aggiungono solo se li vuoi in videoteca.
                </p>

                <ul className="mt-2 space-y-2">
                  {altro.map((parte) => (
                    <RigaParte
                      key={parte.animeclick_id}
                      parte={parte}
                      presa={prese.has(parte.animeclick_id)}
                      spunta={() => spunta(parte)}
                      bloccata={aggiungo !== null}
                      anteprima={apriAnteprima}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {guardata && (
        <Anteprima
          guardata={guardata}
          presa={prese.has(guardata.parte.animeclick_id)}
          spunta={() => spunta(guardata.parte)}
          bloccata={aggiungo !== null}
          chiudi={() => setGuardata(null)}
        />
      )}

      <div className="flex items-center gap-2 border-t border-quaderno-riga p-3">
        <p className="min-w-0 flex-1 truncate text-xs text-quaderno-tenue" aria-live="polite">
          {aggiungo
            ? `Aggiungo… ${aggiungo.fatte} di ${aggiungo.quante}`
            : quante > 0
              ? `${quante} ${quante === 1 ? "parte scelta" : "parti scelte"}`
              : "Non hai scelto niente"}
        </p>

        <Bottone onClick={chiudi} disabled={aggiungo !== null}>
          Annulla
        </Bottone>

        <Bottone tono="pieno" onClick={aggiungi} disabled={quante === 0 || aggiungo !== null}>
          {aggiungo ? "Aggiungo…" : quante > 1 ? `Aggiungi tutte e ${quante}` : "Aggiungi"}
        </Bottone>
      </div>
    </>
  );
}

/**
 * Cosa racconta una parte, prima di prendersela.
 *
 * Copre il pannello invece di aprirsi accanto: la proposta sta già in
 * una finestra, e una seconda finestra sopra la prima su un telefono
 * da 375 punti vuol dire due cornici e niente testo. Così la trama ha
 * tutta la larghezza che c'è, e il modo di tornare indietro è uno solo.
 *
 * Dentro c'è anche la casella: si legge, si decide, si spunta senza
 * dover ritrovare la riga giusta nell'elenco sotto. È il motivo per
 * cui si stava leggendo.
 */
function Anteprima({ guardata, presa, spunta, bloccata, chiudi }) {
  const { parte, dati, errore } = guardata;

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-quaderno-foglio"
      role="dialog"
      aria-label={`Trama: ${parte.titolo}`}
    >
      <div className="flex items-start gap-3 border-b border-quaderno-riga p-4">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-quaderno-carta">
          {(dati?.cover_url || parte.copertina) && (
            <img
              src={urlCopertina(dati?.cover_url || parte.copertina)}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-quaderno-inchiostro">{parte.titolo}</p>

          {dati?.titolo_originale && dati.titolo_originale !== parte.titolo && (
            <p className="truncate text-xs text-quaderno-tenue">{dati.titolo_originale}</p>
          )}

          <p className="mt-1 font-numeric text-xs text-quaderno-tenue">
            {[
              parte.anno || "in arrivo",
              NOMI_TIPO[parte.tipo] || parte.tipo,
              dati?.episodi_dichiarati ? `${dati.episodi_dichiarati} ep.` : null
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {dati?.stato_italia && (
            <p className="mt-1 text-xs text-quaderno-tenue">{dati.stato_italia}</p>
          )}
        </div>

        <Bottone tono="nudo" onClick={chiudi} aria-label="Chiudi la trama">
          ✕
        </Bottone>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {!dati && !errore && (
          <p className="py-6 text-center text-sm text-quaderno-tenue">Leggo la scheda…</p>
        )}

        {errore && (
          <p className="rounded-lg bg-quaderno-carta px-3 py-2 text-sm text-quaderno-inchiostro">
            {errore.message}
          </p>
        )}

        {dati?.generi?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dati.generi.map((g) => (
              <Pillola key={g}>{g}</Pillola>
            ))}
          </div>
        )}

        {dati && (
          <p className="max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-quaderno-inchiostro">
            {dati.trama || "Di questa AnimeClick non scrive la trama."}
          </p>
        )}

        {dati?.distributori?.length > 0 && (
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
      </div>

      <div className="flex items-center gap-2 border-t border-quaderno-riga p-3">
        {/* Cosa è, e basta: il perché della classificazione stava qui e
            se n'è andato con quello dell'elenco. */}
        <p className="min-w-0 flex-1 truncate text-xs text-quaderno-tenue">
          {[parte.anno, NOMI_TIPO[parte.tipo] || parte.tipo].filter(Boolean).join(" · ")}
        </p>

        {parte.giaTua ? (
          <Pillola tono="blu">ce l&apos;hai già</Pillola>
        ) : (
          <Bottone
            tono={presa ? "quieto" : "pieno"}
            onClick={spunta}
            disabled={bloccata}
          >
            {presa ? "Non prenderla" : "Prendila"}
          </Bottone>
        )}

        <Bottone onClick={chiudi}>Indietro</Bottone>
      </div>
    </div>
  );
}

/**
 * Tenere premuto su una riga.
 *
 * Un `pointer` solo per il dito e per il mouse: il gesto è lo stesso —
 * si preme, si aspetta, si guarda — e scriverlo due volte vorrebbe
 * dire due comportamenti da tenere d'accordo.
 *
 * Le tre cautele che lo rendono usabile invece che fastidioso:
 *
 *   - se il dito si sposta, non è una pressione ma uno **scorrimento**:
 *     l'attesa si annulla, o scorrere l'elenco aprirebbe anteprime a
 *     caso;
 *   - il **clic che arriva al rilascio** va soffocato, o dopo aver
 *     letto la trama si troverebbe anche la casella spuntata da sola;
 *   - il **menù contestuale** del browser (tasto destro, o pressione
 *     lunga su Android) va tolto, o comparirebbe sopra l'anteprima.
 */
function usePressioneLunga(apri, attesa = 450) {
  const conto = useRef(null);
  const partenza = useRef(null);
  const scattata = useRef(false);

  const ferma = () => {
    clearTimeout(conto.current);
    conto.current = null;
  };

  useEffect(() => ferma, []);

  return {
    onPointerDown: (e) => {
      // Solo il tasto principale: col destro si apre il menù, non
      // l'anteprima.
      if (e.button) return;

      partenza.current = { x: e.clientX, y: e.clientY };
      scattata.current = false;

      ferma();
      conto.current = setTimeout(() => {
        scattata.current = true;
        apri();
      }, attesa);
    },

    onPointerMove: (e) => {
      if (!conto.current || !partenza.current) return;

      const scarto =
        Math.abs(e.clientX - partenza.current.x) + Math.abs(e.clientY - partenza.current.y);

      if (scarto > 10) ferma();
    },

    onPointerUp: ferma,
    onPointerLeave: ferma,
    onPointerCancel: ferma,
    onContextMenu: (e) => e.preventDefault(),

    onClickCapture: (e) => {
      if (!scattata.current) return;

      e.preventDefault();
      e.stopPropagation();
      scattata.current = false;
    }
  };
}

/** Una parte della serie, da spuntare o no. */
function RigaParte({ parte, presa, spunta, bloccata, anteprima }) {
  const gia = parte.giaTua;

  const pressione = usePressioneLunga(() => anteprima(parte));

  return (
    <li>
      <label
        {...pressione}
        // `select-none`: tenere premuto col dito, senza, comincia a
        // selezionare il titolo e ci mette sopra le maniglie blu.
        className={`flex select-none items-center gap-3 rounded-card border p-2 transition-colors duration-quick
          ${gia ? "border-quaderno-riga opacity-60" : presa ? "border-quaderno-blu bg-quaderno-blu-tenue/30" : "border-quaderno-riga"}
          ${gia || bloccata ? "" : "cursor-pointer hover:bg-quaderno-carta"}`}
      >
        <input
          type="checkbox"
          checked={gia || presa}
          disabled={gia || bloccata}
          onChange={spunta}
          className="h-4 w-4 shrink-0 accent-quaderno-blu"
        />

        <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-quaderno-carta">
          {parte.copertina && (
            <img
              src={urlCopertina(parte.copertina)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-quaderno-inchiostro">{parte.titolo}</p>

          <p className="font-numeric text-xs text-quaderno-tenue">
            {[parte.anno || "in arrivo", NOMI_TIPO[parte.tipo] || parte.tipo]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/* Qui c'era il PERCHÉ di una casella spenta («legame vuoto,
              titolo imparentato, ma è un Film»). Era il ragionamento di
              chi ha scelto, non un'informazione sull'opera: davanti a
              undici parti di Demon Slayer diventavano undici righe di
              spiegazioni da leggere per trovare una riga di dati. Cosa
              sia lo dicono il tipo qui sopra e la targhetta qui a lato;
              se prenderla o no lo decide chi guarda. */}
        </div>

        {gia ? (
          <Pillola tono="blu" className="shrink-0">
            ce l&apos;hai
          </Pillola>
        ) : (
          <Pillola tono={parte.consigliato ? "blu" : "contorno"} className="shrink-0">
            {NOMI_RUOLO[parte.ruolo] || parte.ruolo}
          </Pillola>
        )}

        {/* La stessa anteprima, per chi non può tenere premuto.
            Una pressione lunga non si vede e non si raggiunge con la
            tastiera: da sola sarebbe una cosa che esiste solo per chi
            sa già che c'è. Sta dentro la `label`, quindi il clic va
            fermato a mano — altrimenti spunterebbe anche la casella. */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            anteprima(parte);
          }}
          aria-label={`Cosa racconta: ${parte.titolo}`}
          title="Tieni premuto sulla riga, o premi qui, per la trama"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-quaderno-riga font-display text-xs font-semibold text-quaderno-tenue
            transition-colors duration-quick hover:border-quaderno-blu hover:text-quaderno-blu
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          i
        </button>
      </label>
    </li>
  );
}
