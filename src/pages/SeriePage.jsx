import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Copertina from "../ui/Copertina";
import { tornaIndietroConVolo } from "../dati/volo";
import Progresso from "../ui/Progresso";
import TitoliSimili from "../ui/TitoliSimili";
import OpereAutore from "../ui/OpereAutore";
import { Bottone } from "../ui/Controlli";
import { Errore, Vuoto } from "../ui/Stati";
import { Sezione } from "../ui/Pagina";
import { BottonePreferito, BottoneSmessa } from "../ui/AzioniSerie";
import VotiPersone from "../ui/VotiPersone";
import NoteSerie from "../ui/NoteSerie";
import Icon from "../app/Icon";
import { edizioniSorelle, useCollezione, useSerie } from "../dati/collezione";
import { useAccessoProtetto } from "../dati/accesso";
import { useSessione } from "../dati/sessione";
import { coloreDi, nomeDi } from "../dati/lettori";
import {
  getReadingSessions,
  getStoricoPerSerie,
  riprendiSerie,
  saveReadingSession,
  urlCopertina
} from "../services/api";
import { generiDiSerie, idDa } from "../dati/generi";
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
  tettoLettura,
  totaleDisponibile,
  valoreSerie,
  volumiMancanti,
  votoIt
} from "../dati/serie";
import { Volumi, AcquistoProssimo } from "../ui/serie/Volumi";
import { QuotazioneMercato } from "../ui/serie/QuotazioneMercato";
import { Autori, Etichetta, Dato, SezioneChiudibile, Trama, ScheletroScheda } from "../ui/serie/Pezzi";

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
  const sessioni = useRisorsa(() => getReadingSessions(), { chiave: "sessioni" });

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
              src={urlCopertina(serie.copertina, 128)}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-25 blur-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-shelf/40 via-shelf/80 to-shelf" />
          </div>
        )}

        <div className="relative mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-12">
          <button
            onClick={() => tornaIndietroConVolo(navigate, id)}
            className="bersaglio mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors duration-quick hover:text-ink-bright sm:mb-8"
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
                {serie.smessa && <span className="text-brass-300"> · non la comprate più</span>}
              </p>

              {/* Comprarla o no è della casa, non di chi legge: per
                  questo sta qui accanto ai volumi e non fra i comandi
                  della lettura (dove c'è «Droppa»). */}
              <BottoneSmessa serie={serie} onCambiato={(smessa) => aggiornaLocale(serie.id, { smessa })} />
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
                  className="bersaglio mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brass-300"
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
