import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Copertina from "../ui/Copertina";
import { tornaIndietroConVolo } from "../dati/volo";
import Progresso from "../ui/Progresso";
import ScaffaleVolumi from "../ui/ScaffaleVolumi";
import TitoliSimili from "../ui/TitoliSimili";
import OpereAutore from "../ui/OpereAutore";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import { Sezione } from "../ui/Pagina";
import { BottonePreferito } from "../ui/AzioniSerie";
import VotiPersone from "../ui/VotiPersone";
import NoteSerie from "../ui/NoteSerie";
import Icon from "../app/Icon";
import { edizioniSorelle, useCollezione, useSerie } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { useSessione } from "../dati/sessione";
import { coloreDi, nomeDi } from "../dati/lettori";
import {
  annullaAcquisti,
  getMarketPrice,
  getReadingSessions,
  getStoricoPerSerie,
  registraAcquisto,
  riprendiSerie,
  saveReadingSession,
  updateManga,
  urlCopertina
} from "../services/api";
import { generiDiSerie, idDa } from "../dati/generi";
import { nomiAutori } from "../dati/autore";
import useRisorsa from "../dati/useRisorsa";
import {
  CATEGORIE,
  ETICHETTE_STATO,
  completamento,
  droppataDa,
  euro,
  intervalliVolumi,
  numeriMancanti,
  plurale,
  prossimoVolume as primoDaComprare,
  tettoLettura,
  totaleDisponibile,
  valoreSerie,
  volumiMancanti,
  votoIt
} from "../dati/serie";

/**
 * La scheda di una serie.
 *
 * Prima era una finestra sovrapposta: non aveva un indirizzo, il
 * tasto Indietro chiudeva tutto il sito e non si poteva mandare a
 * nessuno. Adesso è una pagina vera, `/serie/12`, con un titolo nella
 * scheda del browser e la cronologia che funziona.
 */
export default function SeriePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [parametri, setParametri] = useSearchParams();

  const { serie, inCorso, errore } = useSerie(id);
  const { lettoriBiblioteca: lettori, idVisto, bibliotecaSolaLettura } = useSessione();

  // Quale autore si sta guardando nel pannello delle opere: `null`
  // quando è chiuso.
  const [autoreAperto, setAutoreAperto] = useState(null);

  /* -------------------- Di chi sono queste letture --------------------
   *
   * QUESTA PAGINA LEGGEVA SOLO LE PROPRIE, e da quando i lettori sono
   * due era un errore che si vedeva: filtrando la collezione per «lette
   * da Nanaki» e aprendo una delle sue serie, i volumi comparivano
   * tutti spenti e l'etichetta diceva «Non letto». Non era un caso
   * limite — era esattamente quello che succedeva ogni volta che si
   * guardava la collezione dell'altra persona, cioè il motivo per cui
   * quel filtro esiste.
   *
   * La regola è la stessa del resto del sito: in lettura chi guarda lo
   * può dire l'indirizzo (`?lettore=3`), in scrittura lo dice solo il
   * token. Per questo, quando si stanno guardando le letture di un
   * altro, i volumi diventano un disegno e non un comando.
   */
  const lettoreChiesto = Number(parametri.get("lettore")) || null;
  const lettoreVisto = lettoreChiesto ?? idVisto;
  const diUnAltro = Boolean(lettoreChiesto) && lettoreChiesto !== idVisto;
  const nomeLettore = nomeDi(lettori, lettoreVisto);

  // Quali volumi ha già finito. Lo storico è raggruppato per serie,
  // quindi basta pescare la riga di questa: è una sola richiesta e
  // vale anche per le sezioni sotto.
  const storico = useRisorsa(() => getStoricoPerSerie(lettoreVisto));

  // `useRisorsa` tiene la funzione di caricamento in un ref apposta —
  // altrimenti una arrow inline farebbe ripartire la richiesta a ogni
  // render — e quindi non si accorge da sola che è cambiato DI CHI
  // sono i dati da chiedere. Stesso rimedio e stesso motivo di
  // `CollezioneProvider`: il primo valore non conta, è il caricamento
  // normale già in corso.
  const ricaricaStorico = storico.ricarica;
  const primoLettore = useRef(lettoreVisto);

  useEffect(() => {
    if (primoLettore.current === lettoreVisto) return;

    primoLettore.current = lettoreVisto;
    ricaricaStorico();
  }, [lettoreVisto, ricaricaStorico]);

  // Se la serie è già sul tavolo di lettura, il tasto principale
  // dice «continua» e non «inizia»: stessa richiesta che fa `Volumi`
  // per il segnalibro, e serve prima dei ritorni anticipati qui sotto.
  const sessioni = useRisorsa(() => getReadingSessions());

  const volumiLetti = useMemo(() => {
    const riga = (storico.dati || []).find(
      (s) => String(s.manga_id) === String(id)
    );

    return (riga?.volumi || []).map(Number);
  }, [storico.dati, id]);
  const { serie: tutte, ricarica, aggiornaLocale, aggiornaDroppato } = useCollezione();

  // Riprendere una serie droppata scrive due cose sul server: da quando
  // i lettori sono due, scrivere vuol dire dire chi sei.
  const eseguiProtetto = useAccessoProtetto();

  if (errore) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Errore errore={errore} riprova={ricarica} />
      </div>
    );
  }

  // Finché la collezione sta arrivando, "non trovata" sarebbe una
  // bugia: la serie potrebbe esserci eccome.
  if (inCorso && !serie) return <ScheletroScheda />;

  if (!serie) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <Vuoto
          titolo="Questa serie non è in collezione"
          testo="L'indirizzo punta a una scheda che non esiste più, o che non è mai esistita."
          azione={
            <Link to="/collezione">
              <Bottone>Torna alla collezione</Bottone>
            </Link>
          }
        />
      </div>
    );
  }

  const pct = completamento(serie);
  const mancanti = volumiMancanti(serie);
  const totaleAttuale = totaleDisponibile(serie);
  const sorelle = edizioniSorelle(serie, tutte);

  // Letto/in lettura/non letto guarda cosa ha davvero finito chi
  // stiamo guardando, non quanti volumi ci sono in casa: sono due
  // domande diverse (vedi Volumi).
  const statoLettura =
    volumiLetti.length === 0
      ? "non_letto"
      : serie.totali && volumiLetti.length >= serie.totali
        ? "letto"
        : "in_lettura";

  // Guardando le letture di un altro l'etichetta porta il suo nome:
  // «Non letto» senza dire da chi, su una scheda aperta apposta per
  // vedere cos'ha letto lei, è la frase che faceva sembrare tutto rotto.
  const chi = diUnAltro && nomeLettore ? ` da ${nomeLettore}` : "";

  const ETICHETTE_LETTURA = {
    letto: { testo: `Letto${chi}`, tono: "jade" },
    in_lettura: { testo: diUnAltro ? `In lettura${chi}` : "In lettura", tono: "lapis" },
    non_letto: { testo: `Non letto${chi}`, tono: "neutro" }
  };

  // Mollata da CHI si sta guardando: `serie.droppato` è ricavato per
  // chi ha fatto l'accesso, e sulla scheda di un'altra persona
  // direbbe la cosa sbagliata.
  const droppata = diUnAltro ? droppataDa(serie, lettoreVisto) : serie.droppato;

  // Riprendere in mano una serie droppata: click su un volume, togli
  // la tua riga fra le droppate e riapri la lettura esattamente lì.
  // "La tua": dal 011 mollare è di chi legge, quindi riprendere
  // riguarda te e non rimette la serie in mano anche all'altra persona.
  async function riprendi(numero) {
    try {
      await eseguiProtetto(() =>
        Promise.all([
          riprendiSerie(serie.id),
          saveReadingSession({
            manga_id: serie.id,
            titolo: serie.titolo,
            autore: serie.autore || "",
            coverurl: serie.copertina || "",
            volume: numero,
            volumitotali: serie.totali ?? null
          })
        ])
      );

      aggiornaDroppato(serie.id, false);
      // `/letture` non è mai esistito: la rotta è `/lettura`, e il
      // plurale finiva sulla pagina "non trovata" proprio nel momento
      // in cui si stava riprendendo una serie.
      navigate("/lettura");
    } catch {
      // Un tentativo fallito qui non è grave: si può sempre riaprire
      // la lettura dalla pagina Letture. Non serve un banner d'errore
      // per un click su un quadratino.
    }
  }

  /* -------------------- Il gesto principale --------------------
   *
   * Cosa si vuole fare, aprendo la scheda di una serie, è quasi sempre
   * una cosa sola: leggerla. Il tasto sta in cima e cambia parole
   * secondo lo stato, ma la regola per scegliere il volume è quella di
   * `LetturaPage.primoNonLetto`: il primo non letto, fermandosi al tetto
   * di quelli che si hanno in casa.
   */
  const tetto = tettoLettura(serie.posseduti, serie.totali);
  const insiemeLetti = new Set(volumiLetti);

  let prossimoVolume = 1;
  while (insiemeLetti.has(prossimoVolume) && (!tetto || prossimoVolume < tetto)) prossimoVolume += 1;

  const tuttoLetto = Boolean(tetto) && insiemeLetti.has(tetto) && prossimoVolume === tetto;
  const sessioneAperta = (sessioni.dati || []).find((s) => String(s.manga_id) === String(serie.id));

  // Chi guarda le letture di un altro, o sta solo guardando la
  // biblioteca, non ha niente da avviare: il tasto non c'è, come non ci
  // sono i comandi sui volumi.
  const puoiLeggere = !diUnAltro && !bibliotecaSolaLettura && serie.posseduti > 0 && !tuttoLetto;

  async function iniziaLettura() {
    try {
      await eseguiProtetto(() =>
        saveReadingSession({
          manga_id: serie.id,
          titolo: serie.titolo,
          autore: serie.autore || "",
          coverurl: serie.copertina || "",
          volume: prossimoVolume,
          volumitotali: serie.totali ?? null
        })
      );

      sessioni.ricarica();
      navigate("/lettura");
    } catch {
      // Come in `riprendi`: un tentativo andato a vuoto non merita un
      // banner, il tasto resta lì e si può ripremere.
    }
  }

  // Una frase sola per «come sto messo con questa serie»: prima erano
  // quattro pillole («In corso», «Serie completa», «mancano 2 volumi»,
  // «Non letto») che si contraddicevano senza dire a cosa si riferivano.
  //
  // Dal 02/11/2026 la frase dice anche QUALI mancano, a gruppi: «Ti
  // mancano 7 volumi: 6–10, 12, 13» per un Yu-gi-oh comprato a salti.
  const buchi = numeriMancanti(serie) ?? [];

  const fraseVolumi = !serie.posseduti
    ? "Non ne hai ancora"
    : mancanti > 0
      ? mancanti === 1
        ? `Ti manca il vol. ${buchi[0]}`
        : `Ti mancano ${mancanti} volumi: ${intervalliVolumi(buchi)}`
      : totaleAttuale
        ? `Hai tutti i ${serie.posseduti} volumi`
        : `${plurale(serie.posseduti, "volume", "volumi")} in casa`;

  return (
    <article>
      {/* ---------- Testata con la copertina come sfondo ----------
          Il colore dominante della copertina diventa l'atmosfera della
          pagina: ogni serie ha la sua luce invece di un fondo uguale
          per tutte. La sfocatura pesante evita che l'immagine competa
          con il testo. */}
      <div className="relative">
        {serie.copertina && (
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
            <img
              src={urlCopertina(serie.copertina)}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-25 blur-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-shelf/40 via-shelf/80 to-shelf" />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
          <button
            onClick={() => tornaIndietroConVolo(navigate, id)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright sm:mb-8"
          >
            <Icon nome="back" dimensione={16} />
            Indietro
          </button>

          {/* Chi stai guardando, scritto una volta in cima. Senza,
              questa scheda e la propria sono identiche a vedersi ma
              dicono cose diverse — ed è come si finiva per credere che
              i volumi fossero spenti per un errore. */}
          {diUnAltro && (
            <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-hairline bg-glass-1 px-3.5 py-2 text-sm text-ink-muted sm:mb-8">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${coloreDi(lettori, lettoreVisto).pallino}`}
              />
              Letture di{" "}
              <span className={`font-semibold ${coloreDi(lettori, lettoreVisto).testo}`}>
                {nomeLettore || "un altro lettore"}
              </span>
              <button
                onClick={() => {
                  const nuovi = new URLSearchParams(parametri);
                  nuovi.delete("lettore");
                  setParametri(nuovi, { replace: true });
                }}
                className="ml-auto rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors duration-quick hover:text-ink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
              >
                mostra le mie
              </button>
            </p>
          )}

          {/* Sul telefono copertina e titolo stanno affiancati e tutto il
              resto scende a larghezza piena: prima la copertina da sola,
              centrata, alta 190 pixel, spingeva il titolo e ogni comando
              sotto la piega. Da `md` si torna alla colonna a sinistra, con
              la copertina che occupa le due righe. */}
          <div className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-5 sm:grid-cols-[11rem_1fr] sm:gap-x-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-x-12">
            <div className="md:row-span-2">
              <Copertina src={serie.copertina} alt={serie.titolo} priorita nomeTransizione="copertina-serie" />
            </div>

            <div className="min-w-0 space-y-2 sm:space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-display text-xl font-semibold leading-tight tracking-tight text-ink-bright sm:text-4xl lg:text-5xl">
                  {serie.titolo}
                </h1>

                {/* Preferito e voto qui: è il posto dove prima
                    servivano il pannello Gestione, adesso bastano
                    un click e — se serve — un accesso al volo. */}
                <BottonePreferito
                  serie={serie}
                  dimensione={26}
                  className="mt-0.5 shrink-0 [@media(hover:none)]:h-10 [@media(hover:none)]:w-10"
                  onCambiato={(nuovo) => aggiornaLocale(serie.id, { preferito: nuovo })}
                />
              </div>

              <Autori serie={serie} onScegli={setAutoreAperto} />

              {/* Come sta messa la serie, in una frase: i volumi in casa
                  e, accanto, se esce ancora. Il verde è «niente da
                  comprare», il rosso «manca qualcosa». */}
              <p className="text-sm">
                <span className={mancanti > 0 ? "text-ember" : "text-jade"}>{fraseVolumi}</span>
                {serie.stato && (
                  <span className="text-ink-muted"> · {ETICHETTE_STATO[serie.stato] || serie.stato}</span>
                )}
              </p>
            </div>

            <div className="col-span-2 min-w-0 space-y-4 sm:space-y-6 md:col-span-1">
              <div className="space-y-3">
                {/* Il gesto che si fa più spesso aprendo una scheda:
                    leggerla. Largo quanto lo schermo, raggiungibile col
                    pollice. */}
                {puoiLeggere &&
                  (droppata ? (
                    <Bottone onClick={() => riprendi(prossimoVolume)} className="min-h-12 w-full sm:w-auto">
                      Riprendi dal vol. {prossimoVolume}
                    </Bottone>
                  ) : sessioneAperta ? (
                    <Bottone onClick={() => navigate("/lettura")} className="min-h-12 w-full sm:w-auto">
                      Continua dal vol. {Number(sessioneAperta.volume) || prossimoVolume}
                    </Bottone>
                  ) : (
                    <Bottone onClick={iniziaLettura} className="min-h-12 w-full sm:w-auto">
                      Inizia a leggere · vol. {prossimoVolume}
                    </Bottone>
                  ))}

                {/* Un voto per persona, con il nome accanto: sulla
                    stessa serie ci sono due giudizi e nessuno dei due
                    è "il" voto. Il proprio si tocca, l'altro si legge. */}
                <VotiPersone serie={serie} />

                {/* Sul telefono le etichette scorrono in orizzontale su
                    una riga sola invece di andare a capo su tre: erano
                    il blocco più alto della testata e dicono cose di
                    secondo piano (pubblico, generi). */}
                <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pt-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0">
                  {serie.edizione && <Etichetta tono="brass">{serie.edizione}</Etichetta>}

                  {/* Il pubblico dell'opera. Sta prima dei generi e non
                      in mezzo a loro perché è una cosa diversa: i
                      generi dicono di cosa parla, questo per chi è
                      stata scritta. Porta al suo filtro come i generi,
                      ma sta di là in una tendina: di categoria ce n'è
                      una sola per serie, di generi tante. */}
                  {serie.categoria && CATEGORIE[serie.categoria] && (
                    <Link
                      to={`/collezione?categoria=${serie.categoria}`}
                      title={CATEGORIE[serie.categoria].descrizione}
                      className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
                    >
                      {CATEGORIE[serie.categoria].etichetta}
                    </Link>
                  )}

                  {droppata ? (
                    <Etichetta tono="ember">Droppato{chi}</Etichetta>
                  ) : (
                    <Etichetta tono={ETICHETTE_LETTURA[statoLettura].tono}>
                      {ETICHETTE_LETTURA[statoLettura].testo}
                    </Etichetta>
                  )}

                  {generiDiSerie(serie).map((g) => (
                    <Link
                      key={g}
                      to={`/collezione?generi=${idDa(g)}`}
                      className="rounded-full border border-hairline bg-glass-1 px-3 py-1 text-xs text-ink-muted transition-colors duration-quick hover:border-soft hover:text-ink-bright"
                    >
                      {g}
                    </Link>
                  ))}
                </div>

                {sorelle.length > 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                    Altre edizioni:
                    {sorelle.map((s) => (
                      <Link
                        key={s.id}
                        to={`/serie/${s.id}`}
                        className="text-lapis underline decoration-lapis/30 underline-offset-2 hover:decoration-lapis"
                      >
                        {s.edizione || s.titolo}
                      </Link>
                    ))}
                  </p>
                )}
              </div>

              {/* ---------- Progresso ----------
                  Il contatore − N + non c'è più (02/11/2026): diceva
                  quanti, non quali. Quanti si legge qui; il gesto di
                  tutti i giorni, comprarne uno, è «Ho comprato il vol. N»
                  qui sotto; il resto si sistema da «Modifica volumi». */}
              <div className="max-w-md space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-numeric text-sm text-ink-faint">
                    <span className="text-lg font-semibold text-ink-bright">{serie.posseduti}</span>{" "}
                    {totaleAttuale ? `su ${totaleAttuale}` : serie.posseduti === 1 ? "volume" : "volumi"}
                  </p>

                  {pct !== null && (
                    <span className="font-numeric text-sm text-ink-muted">{pct}%</span>
                  )}
                </div>

                <Progresso
                  valore={pct}
                  etichetta={
                    pct !== null
                      ? `${serie.titolo} completa al ${pct}%`
                      : `${serie.titolo}: in corso, volumi totali non ancora noti`
                  }
                />

                {totaleAttuale === null && (
                  <p className="text-xs text-ink-faint">
                    Numero totale di volumi non registrato: il completamento non è calcolabile.
                  </p>
                )}

                {!bibliotecaSolaLettura && (!totaleAttuale || mancanti > 0) && (
                  <AcquistoProssimo serie={serie} onCambiato={ricarica} />
                )}
              </div>

              {/* ---------- I dati secchi ---------- */}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-hairline pt-6 sm:grid-cols-4">
                <Dato etichetta="Editore" valore={serie.editore} />
                {/* Le stelle qui sopra dicono chi ha dato cosa; questo
                    numero dice come sta messa la serie in casa. Con un
                    voto solo sarebbe la stessa cosa scritta due volte,
                    e infatti compare solo quando i giudizi sono due. */}
                <Dato
                  etichetta="Voto medio"
                  valore={
                    serie.voti?.length > 1
                      ? `${votoIt(
                          Math.round(
                            (serie.voti.reduce((t, v) => t + v.voto, 0) / serie.voti.length) * 10
                          ) / 10
                        )} / 5`
                      : null
                  }
                />
                <Dato
                  etichetta="Prezzo al volume"
                  valore={serie.costo ? euro(serie.costo) : null}
                />
                <Dato
                  etichetta="Valore in casa"
                  valore={serie.costo ? euro(valoreSerie(serie)) : null}
                />
              </dl>

              {!bibliotecaSolaLettura && (
                <Link
                  to={`/gestione?sezione=manga&serie=${serie.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brass-300"
                >
                  <Icon nome="matita" dimensione={16} />
                  Correggi nella gestione
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Corpo ---------- */}
      <div className="mx-auto w-full max-w-[80rem] space-y-8 px-4 pb-16 sm:space-y-14 sm:px-8 lg:px-12">
        {serie.trama && (
          <Sezione titolo="Trama">
            <Trama testo={serie.trama} />
          </Sezione>
        )}

        {(serie.totali > 0 || serie.posseduti > 0 || !bibliotecaSolaLettura) && (
          <Volumi
            serie={serie}
            letti={volumiLetti}
            // Il segnalibro viene dalla richiesta già fatta in testa
            // alla pagina: una seconda copia era la stessa chiamata due volte.
            corrente={Number(sessioneAperta?.volume) || null}
            droppata={droppata}
            // Le letture di un altro si guardano e basta: un click qui
            // riaprirebbe la lettura a NOME DI CHI HA IL TOKEN, cioè
            // rimetterebbe in mano a te una serie di lei.
            // …e lo stesso vale per chi in biblioteca sta solo
            // guardando: quello che vede è già di un altro.
            onRiprendi={diUnAltro || bibliotecaSolaLettura ? undefined : riprendi}
            di={diUnAltro ? nomeLettore : bibliotecaSolaLettura ? nomeDi(lettori, lettoreVisto) : null}
            // Quali volumi ci sono in casa è in comune, come la collezione:
            // li sistema chiunque abbia la biblioteca, anche guardando le
            // letture dell'altra persona.
            modificabile={!bibliotecaSolaLettura}
            onSalvati={(numeri) => aggiornaLocale(serie.id, { numeri, posseduti: numeri.length })}
          />
        )}

        {/* Le note si scrivono dal tavolo di lettura, ma è qui che
            restano: finita o mollata una serie, il libro aperto non
            c'è più e questo diventa l'unico posto dove rileggerle. */}
        <SezioneChiudibile
          titolo="Note"
          // Aperta solo se ce n'è almeno una: «Nessuna nota» non merita
          // lo spazio di una sezione intera, il bottone per scriverne
          // una resta a un tocco.
          apertaDiPartenza={Boolean(serie.note?.length)}
          extra={
            serie.note?.length ? (
              <span className="font-numeric text-sm text-ink-muted">
                {plurale(serie.note.length, "nota", "note")}
              </span>
            ) : null
          }
        >
          <div className="max-w-3xl">
            <NoteSerie serie={serie} />
          </div>
        </SezioneChiudibile>

        <QuotazioneMercato serie={serie} sorelle={sorelle} />

        {/* La chiave rimonta la sezione quando si passa da una serie a
            un'altra senza uscire dalla pagina (i titoli simili portano
            proprio lì): senza, resterebbero appesi i consigli della
            scheda precedente. */}
        <TitoliSimili key={serie.id} serie={serie} />
      </div>

      {autoreAperto && (
        <OpereAutore
          nome={autoreAperto}
          // La scheda AnimeClick di questa serie: se il nome dell'autore
          // com'è scritto qui non trova niente da loro, la sua grafia
          // giusta si legge da lì.
          riferimento={serie.animeClickId}
          onChiudere={() => setAutoreAperto(null)}
        />
      )}
    </article>
  );
}

/* ==================================================
   PEZZI DELLA PAGINA
   ================================================== */

/**
 * Chi l'ha fatta, un nome alla volta e cliccabile.
 *
 * Sono bottoni e non link: aprono un pannello sulla stessa pagina,
 * senza portare via da quello che si stava guardando. Il sottolineato
 * tratteggiato è il modo di dire che c'è dell'altro sotto senza fare la
 * figura di un link che porta fuori.
 */
function Autori({ serie, onScegli }) {
  const nomi = nomiAutori(serie.autore, serie.disegnatore);

  if (!nomi.length) {
    return <p className="text-ink-muted">Autore non registrato</p>;
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-muted">
      {nomi.map((nome, i) => (
        <span key={nome} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">·</span>}

          <button
            type="button"
            onClick={() => onScegli(nome)}
            title={`Tutte le opere di ${nome}`}
            className="underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors duration-quick hover:text-ink-bright hover:decoration-brass-400"
          >
            {nome}
          </button>
        </span>
      ))}
    </p>
  );
}

function Etichetta({ tono = "neutro", children }) {
  const toni = {
    neutro: "border-hairline bg-glass-1 text-ink-muted",
    jade: "border-jade/25 bg-jade/10 text-jade",
    lapis: "border-lapis/25 bg-lapis/10 text-lapis",
    ember: "border-ember/25 bg-ember/10 text-ember",
    brass: "border-brass-400/25 bg-brass-400/10 text-brass-300"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toni[tono]}`}>
      {children}
    </span>
  );
}

function Dato({ etichetta, valore }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-faint">{etichetta}</dt>
      <dd className="mt-1 text-sm text-ink-bright">{valore || "—"}</dd>
    </div>
  );
}

/**
 * I volumi della serie.
 *
 * Il disegno vero sta in `ui/ScaffaleVolumi`, che è lo stesso usato
 * dal tavolo di lettura: qui c'era una seconda copia — quadratini
 * numerati, tre stati, gli stessi colori — scritta a mano e divergente
 * di qualche pixel da quella di là. Due implementazioni della stessa
 * cosa vogliono dire due posti in cui correggere ogni volta, e un
 * giorno in cui una delle due si dimentica.
 *
 * Quello che resta qui è il contorno: il titolo della sezione, il
 * conto, e la frase che spiega quando i volumi si possono premere.
 *
 * Dal 02/11/2026 è anche il posto dove si dice QUALI volumi si hanno
 * («Modifica volumi»), e la mensola dei dorsi ha lasciato il posto al
 * tabellone: con tanti volumi i dorsi diventavano un codice a barre.
 */
function Volumi({
  serie,
  letti = [],
  droppata = false,
  onRiprendi,
  di = null,
  corrente = null,
  modificabile = false,
  onSalvati
}) {
  const insiemeLetti = new Set(letti.map(Number));
  const eseguiProtetto = useAccessoProtetto();

  // Cliccabili solo se la serie è droppata: altrimenti sarebbe un
  // quadratino che sembra un bottone ma non fa niente in nessun altro
  // stato, e cliccarlo per sbaglio riaprirebbe una lettura non voluta.
  const riprendibile = Boolean(droppata) && typeof onRiprendi === "function";

  // In modifica i tocchi cambiano una copia, e si salva tutto con «Fatto».
  // Salvare a ogni tocco vorrebbe dire una richiesta per volume, e due
  // tocchi veloci potrebbero arrivare al server nell'ordine sbagliato.
  const [bozza, setBozza] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [problema, setProblema] = useState(null);

  const inModifica = bozza !== null;
  const numeri = inModifica ? bozza : serie.numeri;
  const presenti = new Set(numeri);

  // Il tabellone arriva fin dove serve: al totale, o più in là se in
  // casa c'è un volume oltre il totale noto (Rocky Joe, 13 su 12).
  const quanti = Math.max(serie.totali ?? 0, ...numeri, 0);
  const mancano = Array.from({ length: quanti }, (_, i) => i + 1).filter((n) => !presenti.has(n)).length;

  const tocca = (n) =>
    setBozza((b) => (b.includes(n) ? b.filter((x) => x !== n) : [...b, n].sort((a, c) => a - c)));

  async function fatto() {
    const uguali = bozza.length === serie.numeri.length && bozza.every((n, i) => n === serie.numeri[i]);

    if (uguali) return setBozza(null);

    setSalvando(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => updateManga(serie.id, { numeriposseduti: bozza }));
      onSalvati?.(bozza);
      setBozza(null);
    } catch (e) {
      if (!e?.annullato) setProblema("I volumi non sono stati salvati. Riprova fra un attimo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!quanti && !modificabile) return null;

  return (
    <Sezione
      titolo="Volumi"
      extra={
        // Due numeri con due nomi: prima «0 di 38» non diceva se erano
        // letti o posseduti, e sopra la mensola ce n'erano due diversi.
        <span className="font-numeric text-sm text-ink-muted">
          {presenti.size}
          {serie.totali ? ` di ${serie.totali}` : ""} nella collezione
        </span>
      }
    >
      {riprendibile && !inModifica && (
        <p className="mb-3 text-xs text-ink-faint">
          Serie droppata — clicca un volume per riprendere da lì.
        </p>
      )}

      {inModifica && (
        <p className="mb-3 text-sm text-brass-300">Tocca i volumi che hai: si accendono e si spengono.</p>
      )}

      {quanti > 0 && (
        <ScaffaleVolumi
          totali={quanti}
          letti={letti}
          posseduti={numeri}
          corrente={inModifica ? null : corrente}
          onSelezionaVolume={inModifica ? tocca : riprendibile ? onRiprendi : undefined}
          resa="tabellone"
          riepilogo={false}
        />
      )}

      {/* La legenda: i tre stati del tabellone, con il conto di ciascuno. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-brass-400/60 bg-brass-400/25" />
          Letti{di ? ` da ${di}` : ""} <span className="font-numeric">{insiemeLetti.size}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-ink-bright/15 bg-ink-bright/[0.1]" />
          Da leggere <span className="font-numeric">{numeri.filter((n) => !insiemeLetti.has(n)).length}</span>
        </li>
        {mancano > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm border border-dashed border-ember/60" />
            Mancano <span className="font-numeric">{mancano}</span>
          </li>
        )}
      </ul>

      {modificabile && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {inModifica ? (
            <>
              <Bottone
                variante="secondario"
                onClick={() => setBozza(Array.from({ length: quanti }, (_, i) => i + 1))}
              >
                Li ho tutti
              </Bottone>
              <Bottone variante="secondario" onClick={() => setBozza([])}>
                Nessuno
              </Bottone>
              <Bottone onClick={fatto} disabled={salvando}>
                {salvando ? "Salvo…" : "Fatto"}
              </Bottone>
              <Bottone variante="fantasma" onClick={() => setBozza(null)} disabled={salvando}>
                Annulla
              </Bottone>
            </>
          ) : (
            <Bottone variante="secondario" onClick={() => setBozza([...serie.numeri])}>
              Modifica volumi
            </Bottone>
          )}
        </div>
      )}

      {problema && (
        <p role="alert" className="mt-3 text-sm text-ember">
          {problema}
        </p>
      )}
    </Sezione>
  );
}

/**
 * «Ho comprato il vol. 6»: il gesto di tutti i giorni, a un tocco.
 *
 * Prende il primo che MANCA, non quello dopo il più alto: per un
 * Yu-gi-oh con 1-5 e 11 è il 6. È un acquisto vero — passa dalla stessa
 * rotta della casella Cerca e del bot, entra nella spesa del mese col
 * prezzo della scheda — quindi resta a portata di mano anche l'Annulla.
 */
function AcquistoProssimo({ serie, onCambiato }) {
  const eseguiProtetto = useAccessoProtetto();
  const [inCorso, setInCorso] = useState(false);
  const [registrato, setRegistrato] = useState(null);
  const [problema, setProblema] = useState(null);

  const numero = primoDaComprare(serie);
  const prezzo = serie.grezzo?.PrezzoCopertina ? Number(serie.grezzo.PrezzoCopertina) : serie.costo;

  async function compra() {
    setInCorso(true);
    setProblema(null);

    try {
      const esito = await eseguiProtetto(() => registraAcquisto(serie.id, { volumi: [numero] }));

      setRegistrato({ numero, acquisti: esito?.acquisti || [] });
      onCambiato?.();
    } catch (e) {
      if (!e?.annullato) setProblema(`Il vol. ${numero} non è stato registrato. Riprova fra un attimo.`);
    } finally {
      setInCorso(false);
    }
  }

  async function annulla() {
    setInCorso(true);
    setProblema(null);

    try {
      await eseguiProtetto(() => annullaAcquisti(registrato.acquisti));
      setRegistrato(null);
      onCambiato?.();
    } catch (e) {
      if (!e?.annullato) setProblema("Non sono riuscito ad annullarlo: riprova.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="pt-1">
      {registrato ? (
        <p className="flex items-center justify-between gap-3 rounded-card border border-jade/30 bg-jade/10 px-3.5 py-2.5 text-sm text-jade" role="status">
          Vol. {registrato.numero} registrato
          <button
            type="button"
            onClick={annulla}
            disabled={inCorso}
            className="rounded-lg px-2 py-1 font-semibold text-ink-bright hover:underline disabled:opacity-50"
          >
            Annulla
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={compra}
          disabled={inCorso}
          className="flex w-full items-center justify-between gap-3 rounded-card border border-hairline bg-glass-2 px-3.5 py-2.5 text-left text-sm transition-colors duration-quick hover:border-soft disabled:opacity-60
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          <span className="flex items-center gap-2 font-semibold text-ink-bright">
            <Icon nome="plus" dimensione={16} />
            {inCorso ? "Registro…" : <>Ho comprato il vol. <span className="font-numeric">{numero}</span></>}
          </span>
          {prezzo ? <span className="font-numeric text-xs text-ink-muted">{euro(prezzo)}</span> : null}
        </button>
      )}

      {problema && (
        <p role="alert" className="mt-2 text-xs text-ember">
          {problema}
        </p>
      )}
    </div>
  );
}

/**
 * Quanto chiedono su eBay per questa serie, adesso.
 *
 * Non è "quanto si è venduta": l'API gratuita di eBay vede solo gli
 * annunci attivi, non le vendite concluse — quella vera richiede
 * un'approvazione speciale che eBay non concede ai piccoli sviluppatori.
 * Dire "prezzo medio degli annunci attivi" è meno impressionante di
 * "media delle vendite", ma è quello che il dato è davvero.
 *
 * Il caricamento parte solo al click: interrogare eBay per ogni
 * scheda aperta sarebbe lento e inutile nella maggior parte dei casi.
 */
function QuotazioneMercato({ serie, sorelle }) {
  const [stato, setStato] = useState("fermo");
  const [dati, setDati] = useState(null);

  async function chiedi() {
    setStato("caricamento");

    try {
      const risposta = await getMarketPrice({
        titolo: serie.titolo,
        edizione: serie.edizione,
        // Le etichette delle edizioni sorelle: servono al server per
        // scartare gli annunci che nominano l'edizione sbagliata.
        altreEdizioni: sorelle.map((s) => s.edizione).filter(Boolean),
        volumiTotali: serie.totali
      });

      setDati(risposta);
      setStato("fatto");
    } catch (e) {
      setStato(e?.status === 501 ? "non_configurato" : "errore");
    }
  }

  const nonConfigurato = stato === "non_configurato";
  const scartati = dati?.campioneGrezzo > dati?.campione ? dati.campioneGrezzo - dati.campione : 0;

  return (
    <SezioneChiudibile titolo="Prezzo su eBay" apertaDiPartenza={false}>
      <div className="flex flex-wrap items-center gap-4 rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl">
        {stato === "fatto" && dati ? (
          <div className="space-y-1">
            {/* La mediana, non la media: un lotto completo o un
                esemplare da collezione messo in vendita insieme ai
                singoli volumi sposterebbe la media di decine di euro. */}
            <p className="font-numeric text-2xl font-semibold text-ink-bright">
              {dati.mediana ? euro(dati.mediana) : "Nessun dato"}
            </p>

            <p className="text-xs text-ink-muted">
              {dati.mediana
                ? `Mediana di ${dati.campione} annunci di serie completa su eBay Italia${
                    serie.edizione ? ` (edizione ${serie.edizione})` : ""
                  }${dati.media ? ` — media ${euro(dati.media)}` : ""}.`
                : dati.campioneGrezzo > 0
                  ? `Trovati ${dati.campioneGrezzo} annunci, ma nessuno sembrava la serie completa nell'edizione giusta.`
                  : "Nessun annuncio attivo trovato per questo titolo."}
            </p>

            {/* Trasparenza sul filtro: se il campione si è ridotto molto
                è giusto dirlo, invece di far sembrare il numero più
                solido di quanto sia. */}
            {scartati > 0 && (
              <p className="text-xs text-ink-faint">
                Scartati {scartati} annunci su {dati.campioneGrezzo}: volumi singoli o edizione diversa.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            {stato === "errore"
              ? "La ricerca su eBay non ha risposto. Riprova fra poco."
              : nonConfigurato
                ? "Questa funzione non è ancora attivata: servono le credenziali eBay sul server."
                : "Cerca su eBay quanto chiedono adesso per la serie completa."}
          </p>
        )}

        {!nonConfigurato && (
          <Bottone
            variante="secondario"
            onClick={chiedi}
            disabled={stato === "caricamento"}
            className="ml-auto"
          >
            {stato === "caricamento" ? "Cerco…" : stato === "fatto" ? "Aggiorna" : "Cerca"}
          </Bottone>
        )}
      </div>
    </SezioneChiudibile>
  );
}

/**
 * Una sezione che si apre e si chiude dal titolo.
 *
 * Note ed eBay sono cose che si cercano di rado: aperte per tutte le
 * serie allungavano la scheda di due schermi su qualunque telefono. Il
 * titolo resta, con la freccia, così si sa che c'è e dove.
 */
function SezioneChiudibile({ titolo, extra, apertaDiPartenza = false, children }) {
  const [aperta, setAperta] = useState(apertaDiPartenza);

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setAperta((a) => !a)}
        aria-expanded={aperta}
        // Aperta, l'intestazione resta attaccata in alto: per richiudere
        // la sezione non serve tornare su a cercarla.
        className={`flex w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 ${
          aperta ? "sticky top-0 z-sticky -mx-4 bg-shelf/90 px-4 py-2 backdrop-blur-md sm:-mx-0 sm:px-0" : ""
        }`}
      >
        <h2 className="font-display text-xl font-semibold text-ink-bright">{titolo}</h2>

        <span className="flex items-center gap-3">
          {extra}
          <Icon
            nome="back"
            dimensione={18}
            className={`text-ink-faint transition-transform duration-quick ${aperta ? "rotate-90" : "-rotate-90"}`}
          />
        </span>
      </button>

      {aperta && children}
    </section>
  );
}

/** La trama, raccolta in quattro righe quando è lunga. */
function Trama({ testo }) {
  const [aperta, setAperta] = useState(false);
  const lunga = testo.length > 280;

  return (
    <div className="max-w-3xl">
      <p
        className={`whitespace-pre-line text-[0.95rem] leading-relaxed text-ink ${
          lunga && !aperta ? "line-clamp-4" : ""
        }`}
      >
        {testo}
      </p>

      {lunga && (
        <button
          type="button"
          onClick={() => setAperta((a) => !a)}
          className="mt-2 text-sm font-medium text-brass-300 hover:underline"
        >
          {aperta ? "Mostra meno" : "Leggi tutto"}
        </button>
      )}
    </div>
  );
}

function ScheletroScheda() {
  return (
    <div className="mx-auto w-full max-w-[80rem] px-5 py-12 sm:px-8 lg:px-12" role="status">
      <div className="grid gap-8 md:grid-cols-[minmax(0,15rem)_1fr] lg:gap-12">
        <div className="aspect-cover w-44 rounded-card border border-hairline bg-glass-1 md:w-full" />

        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded-lg bg-glass-1" />
          <div className="h-4 w-1/3 rounded bg-glass-1" />
          <div className="h-2 w-full max-w-md rounded bg-glass-1" />
        </div>
      </div>

      <span className="sr-only">Caricamento della scheda in corso</span>
    </div>
  );
}
