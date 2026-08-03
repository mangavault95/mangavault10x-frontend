import { useMemo } from "react";
import Approdo from "../ui/Approdo";
import { Boiserie, Intonaco } from "../ui/materiali";
import legnoUrl from "../tre/assets/legno/legno_diffuse.webp";
import { CaricamentoGriglia, Errore } from "../ui/Stati";
import { useCollezione } from "../dati/collezione";
import { primati, riepilogo } from "../dati/numeri";
import { euro, numeroIt } from "../dati/serie";

/**
 * Lo scontrino del registratore di cassa.
 *
 * Stessi numeri della pagina Numeri (il conto è uno solo e sta in
 * `dati/numeri.js`), battuti come li batterebbe la cassa che si è appena
 * cliccata nella stanza. Non è un vezzo grafico: una collezione è una
 * cosa che è stata *comprata*, un pezzo per volta, e uno scontrino è
 * l'unico oggetto al mondo che dice quella cosa lì. Una tabella dice
 * quanto vale; uno scontrino dice quanto è costata.
 *
 *
 * PERCHÉ IL FONDO È CHIARO
 *
 * Tutto il sito è ottone su legno scuro, e questa pagina no. Perché qui
 * non si sta guardando una schermata: si sta guardando un pezzo di carta
 * termica, e la carta termica è grigia con sopra dell'inchiostro nero.
 * Il buio resta tutt'attorno — è la stanza, che è ancora lì.
 *
 *
 * COME SI STAMPA
 *
 * Lo scontrino esce dalla fessura: scorre dall'alto verso il basso
 * dentro un contenitore che lo taglia, e le righe compaiono man mano.
 * Il ritardo di ogni riga è il suo posto nell'elenco, come in una
 * stampante vera dove la carta avanza di un passo alla volta.
 */

const ORA = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

export default function CassaPage() {
  const { serie, inCorso, errore, ricarica } = useCollezione();

  const conti = useMemo(() => riepilogo(serie), [serie]);
  const record = useMemo(() => primati(serie), [serie]);

  // L'ora della battuta. Uno scontrino senza data e ora non è uno
  // scontrino, è un volantino.
  const battuto = useMemo(() => ORA.format(new Date()), []);

  return (
    <Approdo
      titolo="Lo scontrino della collezione"
      className="bg-legno"
      fondo={<Retrobanco />}
    >
      <div className="flex min-h-dvh items-start justify-center px-5 pb-16 pt-20 sm:pt-24">
        {errore ? (
          <div className="w-full max-w-md">
            <Errore errore={errore} riprova={ricarica} />
          </div>
        ) : !conti ? (
          <div className="w-full max-w-md">
            {inCorso ? (
              <CaricamentoGriglia quante={4} />
            ) : (
              <p className="text-center text-sm text-ink-muted">
                Non c'è niente da battere: la collezione è vuota.
              </p>
            )}
          </div>
        ) : (
          <Scontrino conti={conti} record={record} battuto={battuto} />
        )}
      </div>
    </Approdo>
  );
}

/**
 * Il retrobanco, e la fessura da cui esce la carta.
 *
 * Era un fondo nero con un alone caldo, e faceva sembrare lo scontrino
 * sospeso nel vuoto: si era appena usciti da una sala di legno e si
 * finiva da nessuna parte. Adesso dietro c'è la parete della sala —
 * intonaco e boiserie, le texture vere (vedi `ui/materiali.jsx`) — e in
 * basso il piano del banco su cui la carta va a posarsi.
 *
 * La fessura resta dov'era, in alto: è lei a spiegare il movimento, e
 * senza la carta scenderebbe dal nulla.
 */
function Retrobanco() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Intonaco className="inset-x-0 top-0 h-[74%]" />
      <Boiserie className="inset-x-0 top-[42%] h-[32%]" />

      {/* Il piano del banco, in basso: è lì che lo scontrino finisce */}
      <div
        className="absolute inset-x-0 bottom-0 top-[74%]"
        style={{
          backgroundImage: `url(${legnoUrl})`,
          backgroundSize: "300px auto"
        }}
      >
        <div className="absolute inset-0 bg-legno/40" />
        <div className="absolute inset-x-0 top-0 h-px bg-brass-400/30" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(6,7,11,0.55))]" />
      </div>

      {/* La luce della lampada sul banco, rimasta accesa di là */}
      <div className="absolute -top-32 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-brass-500/[0.14] blur-[120px]" />

      {/* La bocca del registratore */}
      <div className="absolute inset-x-0 top-0 z-sticky h-16 bg-gradient-to-b from-void via-void/85 to-transparent" />
      <div className="absolute inset-x-0 top-14 z-sticky mx-auto h-px w-[min(28rem,88vw)] bg-brass-400/30 shadow-[0_2px_18px_rgba(250,204,21,0.2)]" />

      <div className="absolute inset-0 bg-[radial-gradient(115%_95%_at_50%_40%,transparent_38%,rgba(6,7,11,0.72)_100%)]" />
    </div>
  );
}

function Scontrino({ conti, record, battuto }) {
  const righe = [
    { voce: "Serie a catalogo", valore: numeroIt(conti.serie) },
    { voce: "Volumi in casa", valore: numeroIt(conti.volumi) },
    { voce: "Serie complete", valore: numeroIt(conti.complete) },
    { voce: "Serie da completare", valore: numeroIt(conti.daCompletare) },
    { voce: "In corso dall'editore", valore: numeroIt(conti.inCorsoEditore) }
  ];

  const spesa = [
    { voce: "Prezzo medio a volume", valore: euro(conti.prezzoMedio) },
    {
      voce: "Voto medio",
      valore: conti.votoMedio ? `${conti.votoMedio.toFixed(1)} / 5` : "—"
    }
  ];

  // Ogni riga esce un pelo dopo quella sopra. Il contatore attraversa
  // blocchi diversi, quindi va tenuto qui e non dentro ciascuno.
  let passo = 0;
  const prossimo = () => passo++;

  return (
    <div
      className="w-full max-w-md animate-[stampa_1400ms_cubic-bezier(0.16,1,0.3,1)_both]
                 [--strappo:10px]"
    >
      <div
        className="relative bg-scontrino px-7 pb-12 pt-9 font-numeric text-[0.8rem] leading-relaxed text-inchiostro shadow-float
                   [clip-path:polygon(0_0,100%_0,100%_calc(100%-var(--strappo)),96%_100%,92%_calc(100%-var(--strappo)),88%_100%,84%_calc(100%-var(--strappo)),80%_100%,76%_calc(100%-var(--strappo)),72%_100%,68%_calc(100%-var(--strappo)),64%_100%,60%_calc(100%-var(--strappo)),56%_100%,52%_calc(100%-var(--strappo)),48%_100%,44%_calc(100%-var(--strappo)),40%_100%,36%_calc(100%-var(--strappo)),32%_100%,28%_calc(100%-var(--strappo)),24%_100%,20%_calc(100%-var(--strappo)),16%_100%,12%_calc(100%-var(--strappo)),8%_100%,4%_calc(100%-var(--strappo)),0_100%)]"
      >
        {/* La grana della carta termica: righe orizzontali larghe un
            pixel, come il passo della testina. Da vicino non si vedono,
            ma tolgono alla carta quell'aria di rettangolo pieno. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.055]
                     bg-[repeating-linear-gradient(0deg,#000_0_1px,transparent_1px_3px)]"
        />

        <Riga ritardo={prossimo()}>
          <p className="text-center font-display text-lg font-semibold tracking-[0.3em]">
            MANGAVAULT
          </p>
          <p className="mt-1 text-center text-[0.62rem] uppercase tracking-[0.22em] opacity-60">
            Deposito volumi · Scaffale 10X
          </p>
        </Riga>

        <Separatore ritardo={prossimo()} />

        {righe.map((r) => (
          <Riga key={r.voce} ritardo={prossimo()}>
            <Voce {...r} />
          </Riga>
        ))}

        <Separatore ritardo={prossimo()} />

        {spesa.map((r) => (
          <Riga key={r.voce} ritardo={prossimo()}>
            <Voce {...r} />
          </Riga>
        ))}

        <Separatore ritardo={prossimo()} doppio />

        <Riga ritardo={prossimo()}>
          <div className="flex items-baseline justify-between gap-3 text-base font-bold uppercase tracking-wide">
            <span>Totale</span>
            <span>{euro(conti.valore)}</span>
          </div>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] opacity-60">
            prezzo di copertina × volumi posseduti
          </p>
        </Riga>

        <Separatore ritardo={prossimo()} />

        <Riga ritardo={prossimo()}>
          <Voce voce="Da pagare ancora" valore={euro(conti.perCompletare)} />
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] opacity-60">
            {numeroIt(conti.volumiMancantiTotali)} volumi mancanti
          </p>
        </Riga>

        {record.length > 0 && (
          <>
            <Separatore ritardo={prossimo()} />

            <Riga ritardo={prossimo()}>
              <p className="mb-2 text-[0.62rem] uppercase tracking-[0.22em] opacity-60">
                Articoli in evidenza
              </p>
            </Riga>

            {record.map((p) => (
              <Riga key={p.etichetta} ritardo={prossimo()}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate uppercase opacity-70">{p.etichetta}</span>
                  <span className="shrink-0 text-right">{p.dettaglio}</span>
                </div>
                <p className="truncate text-[0.7rem] font-semibold">{p.serie.titolo}</p>
              </Riga>
            ))}
          </>
        )}

        <Separatore ritardo={prossimo()} doppio />

        <Riga ritardo={prossimo()}>
          <p className="text-center text-[0.68rem] uppercase tracking-[0.2em]">
            Grazie e arrivederci
          </p>
          <p className="mt-1 text-center text-[0.62rem] opacity-60">{battuto}</p>

          {/* Il codice a barre: non codifica niente e non finge di
              farlo — è la firma grafica di uno scontrino, come la riga
              tratteggiata. Le larghezze vengono da un conto stabile sui
              totali, così non ballano a ogni ridisegno. */}
          <Barre seme={conti.volumi + conti.serie} />
        </Riga>
      </div>
    </div>
  );
}

function Voce({ voce, valore }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate uppercase opacity-80">{voce}</span>

      {/* I puntini di guida: è quello che tiene insieme la colonna dei
          valori quando le voci hanno lunghezze diverse. */}
      <span
        aria-hidden="true"
        className="mx-1 min-w-4 flex-1 translate-y-[-0.2em] border-b border-dotted border-inchiostro/35"
      />

      <span className="shrink-0 font-semibold tabular-nums">{valore}</span>
    </div>
  );
}

function Separatore({ ritardo, doppio = false }) {
  return (
    <Riga ritardo={ritardo}>
      <div
        aria-hidden="true"
        className={`my-3 border-t border-dashed border-inchiostro/30 ${
          doppio ? "border-t-2 border-double" : ""
        }`}
      />
    </Riga>
  );
}

/**
 * Una riga che compare quando la carta è avanzata fino a lei.
 *
 * L'animazione è dichiarata inline e non in `index.css` perché il
 * ritardo cambia riga per riga: è l'unica cosa che varia, e vale la pena
 * tenerla accanto a chi la usa.
 */
function Riga({ ritardo, children }) {
  return (
    <div
      className="animate-[batti_320ms_ease-out_both]"
      style={{ animationDelay: `${360 + ritardo * 52}ms` }}
    >
      {children}
    </div>
  );
}

function Barre({ seme }) {
  // Un generatore deterministico: lo stesso totale dà sempre lo stesso
  // codice, così la carta non cambia disegno fra due ridisegni.
  const larghezze = [];
  let x = seme % 977;

  for (let i = 0; i < 44; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    larghezze.push(1 + (x % 4));
  }

  return (
    <div
      aria-hidden="true"
      className="mt-4 flex h-10 items-stretch justify-center gap-[2px]"
    >
      {larghezze.map((w, i) => (
        <span
          key={i}
          className="bg-inchiostro"
          style={{ width: `${w}px`, opacity: i % 2 ? 0.9 : 0.15 }}
        />
      ))}
    </div>
  );
}
