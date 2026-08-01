import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Approdo from "../ui/Approdo";
import Copertina from "../ui/Copertina";
import Icon from "../app/Icon";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { getReadingSessions, getStoricoPerSerie } from "../services/api";
import { dataIt, tettoLettura } from "../dati/serie";

/**
 * Il volume lasciato aperto sul tavolino.
 *
 * Stessi dati di `/lettura`, che resta quello che era: l'attrezzo, con i
 * più e i meno per segnare i volumi, lo storico, le serie droppate. Ci
 * si va per *aggiornare* le letture.
 *
 * Qui invece non si aggiorna niente, e non è una mancanza: è il punto.
 * Nella stanza si è cliccato un tavolino con sopra un libro aperto che
 * qualcuno ha lasciato a metà, e quello che si vuole sapere arrivandoci
 * è una cosa sola — **dov'ero rimasto**. Un volume aperto risponde a
 * quella domanda e a nessun'altra: a sinistra cosa stai leggendo, a
 * destra a che punto sei. Per tutto il resto c'è la pagina di là, e il
 * collegamento sta in alto a destra.
 *
 *
 * PERCHÉ SI SFOGLIA INVECE DI SCORRERE
 *
 * Perché è un libro. Con più letture in corso si passa da una all'altra
 * girando pagina, non facendo scorrere un elenco dentro un libro
 * disegnato — che sarebbe la peggiore delle due cose, né un elenco né un
 * volume. Le frecce stanno ai lati, dove stanno i pollici.
 */

export default function TavolinoPage() {
  const { serie } = useCollezione();
  const sessioni = useRisorsa(getReadingSessions);
  const perSerie = useRisorsa(getStoricoPerSerie);

  const [aperta, setAperta] = useState(0);
  // Il verso dell'ultima sfogliata: la pagina nuova entra dal lato da
  // cui è arrivata, o il gesto non si legge.
  const [verso, setVerso] = useState(1);

  /**
   * Le letture in corso.
   *
   * Le sessioni conservano una copia di titolo e copertina che col tempo
   * invecchia: se la serie è ancora in collezione vincono i dati veri, e
   * la copia resta come ripiego per le serie cancellate. È la stessa
   * regola di `LetturaPage`, e per la stessa ragione.
   */
  const letture = useMemo(() => {
    const storico = new Map(
      (perSerie.dati || []).map((s) => [String(s.manga_id), s])
    );

    return (sessioni.dati || []).map((s) => {
      const collegata = serie.find((m) => String(m.id) === String(s.manga_id));
      const letti = storico.get(String(s.manga_id));

      return {
        mangaId: s.manga_id,
        titolo: collegata?.titolo || s.titolo || "Senza titolo",
        autore: collegata?.autore || s.autore || null,
        editore: collegata?.editore || null,
        copertina: collegata?.copertina || s.coverurl || null,
        totali: collegata?.totali ?? (Number(s.volumitotali) || null),
        posseduti: Number(collegata?.posseduti) || 0,
        volume: Number(s.volume) || 1,
        volumiLetti: letti?.volumi || [],
        aggiornata: s.updated_at,
        inCollezione: Boolean(collegata)
      };
    });
  }, [sessioni.dati, perSerie.dati, serie]);

  const errore = sessioni.errore || perSerie.errore;
  const caricando = sessioni.inCorso && !sessioni.dati;

  // La pagina aperta si limita qui e non in uno stato corretto a
  // posteriori: se l'elenco si accorcia sotto i piedi — una lettura
  // chiusa da un'altra scheda — riportarlo dentro i margini con un
  // effetto costerebbe un fotogramma con il volume sbagliato aperto.
  const indice = Math.min(aperta, Math.max(0, letture.length - 1));
  const lettura = letture[indice];

  const sfoglia = (passo) => {
    const prossima = indice + passo;

    if (prossima < 0 || prossima >= letture.length) return;

    setVerso(passo);
    setAperta(prossima);
  };

  return (
    <Approdo
      titolo="Il volume aperto sul tavolino"
      elenco={{ percorso: "/lettura", etichetta: "Apri In lettura" }}
      className="bg-void"
      fondo={<Lampada />}
    >
      <div className="mx-auto flex min-h-dvh max-w-5xl items-center px-4 pb-16 pt-20 sm:px-8 sm:pt-24">
        {errore ? (
          <div className="mx-auto w-full max-w-md">
            <Errore
              errore={errore}
              riprova={() => {
                sessioni.ricarica();
                perSerie.ricarica();
              }}
            />
          </div>
        ) : caricando ? (
          <div className="mx-auto w-full max-w-md">
            <CaricamentoElenco quante={3} />
          </div>
        ) : !lettura ? (
          <div className="mx-auto w-full max-w-md">
            <Vuoto
              titolo="Il tavolino è sgombro"
              testo="Non c'è nessuna lettura in corso. Si comincia aprendo un volume dalla scheda di una serie."
            />
          </div>
        ) : (
          <Volume
            lettura={lettura}
            indice={indice}
            totale={letture.length}
            verso={verso}
            onSfogliare={sfoglia}
          />
        )}
      </div>
    </Approdo>
  );
}

/** La lampada da terra dell'angolo lettura, rimasta accesa di là. */
function Lampada() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -left-20 -top-24 h-[34rem] w-[34rem] rounded-full bg-brass-500/[0.13] blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(110%_85%_at_38%_28%,rgba(255,207,153,0.1),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_30%,rgba(6,7,11,0.86)_100%)]" />
    </div>
  );
}

/**
 * Il volume: due facciate e una costa in mezzo.
 *
 * Su schermo stretto le facciate si impilano e la costa sparisce — un
 * libro aperto largo trecento pixel non è un libro aperto, è due
 * rettangoli con una riga in mezzo.
 */
function Volume({ lettura, indice, totale, verso, onSfogliare }) {
  const letto = lettura.volumiLetti.length;

  // Il denominatore è quello che hai in mano, non quello che l'editore
  // ha pubblicato: la stessa regola con cui `/lettura` limita i suoi
  // bottoni (vedi `tettoLettura`). Col totale della serie una collana
  // di cui possiedi più volumi di quanti ne risultino a catalogo — e
  // capita, quando il totale è vecchio — diceva «13 di 12».
  const su = tettoLettura(lettura.posseduti, lettura.totali);
  const percentuale = su ? Math.min(100, Math.round((letto / su) * 100)) : null;

  return (
    <div className="flex w-full items-center gap-2 sm:gap-4">
      <Pollice
        verso="sinistra"
        etichetta="Lettura precedente"
        disabilitato={indice <= 0}
        onClick={() => onSfogliare(-1)}
      />

      <div className="min-w-0 flex-1">
        <div
          // La chiave sull'indice fa ripartire l'animazione a ogni
          // sfogliata: senza, il volume si apre una volta sola e poi il
          // contenuto cambia di scatto.
          key={indice}
          className="animate-[apri_540ms_cubic-bezier(0.16,1,0.3,1)_both] rounded-sm bg-carta shadow-float"
          style={{ transformOrigin: verso > 0 ? "left center" : "right center" }}
        >
          <div className="relative grid gap-0 md:grid-cols-2">
            {/* La costa: l'ombra della piega, che si scava verso il
                centro da tutte e due le parti. È l'unico pezzo che dice
                «sono due facciate dello stesso foglio» invece che «sono
                due schede affiancate». Solo dove le facciate stanno
                davvero affiancate: impilate, una piega orizzontale in
                mezzo sarebbe una crepa. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-raised hidden w-16 -translate-x-1/2
                         bg-[linear-gradient(90deg,transparent,rgba(42,33,24,0.16)_42%,rgba(255,255,255,0.5)_50%,rgba(42,33,24,0.16)_58%,transparent)]
                         md:block"
            />

            <FacciataSinistra lettura={lettura} />

            <FacciataDestra
              lettura={lettura}
              letto={letto}
              su={su}
              percentuale={percentuale}
            />
          </div>

          {/* Il taglio del libro, sotto: tre righe chiare sovrapposte
              danno lo spessore delle pagine sotto quella aperta. */}
          <div aria-hidden="true" className="mx-4 space-y-[2px] pb-2 pt-1">
            <div className="h-px bg-inchiostro/12" />
            <div className="h-px bg-inchiostro/8" />
            <div className="h-px bg-inchiostro/5" />
          </div>
        </div>

        {totale > 1 && (
          <p className="mt-4 text-center font-numeric text-xs text-ink-muted">
            {indice + 1} / {totale} letture aperte
          </p>
        )}
      </div>

      <Pollice
        verso="destra"
        etichetta="Lettura successiva"
        disabilitato={indice >= totale - 1}
        onClick={() => onSfogliare(1)}
      />
    </div>
  );
}

/** A sinistra: cosa stai leggendo. La copertina, incollata come una figurina. */
function FacciataSinistra({ lettura }) {
  return (
    <div className="relative border-inchiostro/10 p-6 sm:p-8 md:border-r">
      <Rigatura />

      <p className="relative text-[0.62rem] uppercase tracking-[0.24em] text-inchiostro/50">
        Stai leggendo
      </p>

      <div className="relative mt-5 flex gap-5">
        <div className="w-24 shrink-0 rotate-[-1.5deg] bg-white p-1 shadow-raised sm:w-28">
          <Copertina src={lettura.copertina} alt="" inclina={false} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight text-inchiostro sm:text-2xl">
            {lettura.titolo}
          </h2>

          {lettura.autore && (
            <p className="mt-1 text-sm italic text-inchiostro/65">{lettura.autore}</p>
          )}

          {lettura.editore && (
            <p className="mt-3 text-xs uppercase tracking-wider text-inchiostro/45">
              {lettura.editore}
            </p>
          )}
        </div>
      </div>

      {/* Il segnalibro: esce dal bordo alto della facciata, come un
          nastro infilato fra le pagine. */}
      <div
        aria-hidden="true"
        className="absolute -top-3 right-8 h-16 w-7 bg-ember shadow-lift
                   [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
      />

      {lettura.inCollezione && (
        <Link
          to={`/serie/${lettura.mangaId}`}
          className="relative mt-7 inline-flex items-center gap-1.5 border-b border-inchiostro/30 pb-0.5 text-sm text-inchiostro/75
                     transition-colors duration-quick hover:border-inchiostro hover:text-inchiostro
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
        >
          Apri la scheda
          <span className="rotate-180">
            <Icon nome="back" dimensione={14} />
          </span>
        </Link>
      )}
    </div>
  );
}

/** A destra: dove sei rimasto. */
function FacciataDestra({ lettura, letto, su, percentuale }) {
  return (
    <div className="relative p-6 sm:p-8">
      <Rigatura />

      <p className="relative text-[0.62rem] uppercase tracking-[0.24em] text-inchiostro/50">
        Sei rimasto qui
      </p>

      <p className="relative mt-4 font-display text-inchiostro">
        <span className="text-6xl font-semibold leading-none">{lettura.volume}</span>
        <span className="ml-2 text-lg text-inchiostro/55">
          {su ? `di ${su}` : "volume"}
        </span>
      </p>

      {/* I volumi come quadratini: quelli letti pieni, gli altri vuoti.
          Una barra direbbe la stessa percentuale, ma non quanti pezzi
          mancano — che su un manga da 34 volumi è tutta l'informazione. */}
      {su && su <= 60 && (
        <ul className="relative mt-6 flex flex-wrap gap-1.5">
          {Array.from({ length: su }, (_, i) => {
            const numero = i + 1;
            const finito = lettura.volumiLetti.includes(numero);
            const corrente = numero === lettura.volume;

            return (
              <li
                key={numero}
                title={`Volume ${numero}`}
                className={`h-6 w-4 rounded-[2px] border transition-colors
                  ${
                    corrente
                      ? "border-ember bg-ember"
                      : finito
                        ? "border-inchiostro/70 bg-inchiostro/70"
                        : "border-inchiostro/25 bg-transparent"
                  }`}
              />
            );
          })}
        </ul>
      )}

      <dl className="relative mt-7 space-y-2 text-sm text-inchiostro/75">
        <Riga voce="Volumi letti" valore={su ? `${letto} di ${su}` : String(letto)} />
        {percentuale !== null && <Riga voce="Avanzamento" valore={`${percentuale}%`} />}
        <Riga voce="In casa" valore={`${lettura.posseduti} volumi`} />
        {dataIt(lettura.aggiornata) && (
          <Riga voce="Ultima volta" valore={dataIt(lettura.aggiornata)} />
        )}
      </dl>

      <p className="relative mt-7 border-t border-inchiostro/15 pt-3 text-xs italic text-inchiostro/45">
        Per segnare un volume letto si passa da In lettura, qui sopra a destra.
      </p>
    </div>
  );
}

function Riga({ voce, valore }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-inchiostro/55">{voce}</dt>
      <dd className="font-numeric tabular-nums">{valore}</dd>
    </div>
  );
}

/** La rigatura leggera della carta, sotto tutto il resto. */
function Rigatura() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.045]
                 bg-[repeating-linear-gradient(0deg,transparent_0_27px,#2a2118_27px_28px)]"
    />
  );
}

function Pollice({ verso, etichetta, disabilitato, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabilitato}
      aria-label={etichetta}
      title={etichetta}
      className="grid h-12 w-9 shrink-0 place-items-center rounded-full text-ink-muted transition-all duration-quick
                 hover:bg-glass-1 hover:text-brass-300 active:scale-90
                 disabled:pointer-events-none disabled:opacity-0
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 sm:h-14 sm:w-12"
    >
      <span className={verso === "destra" ? "rotate-180" : ""}>
        <Icon nome="back" dimensione={20} />
      </span>
    </button>
  );
}
