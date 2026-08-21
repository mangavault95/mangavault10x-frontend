import { useId, useState } from "react";

/**
 * I volumi di una serie, in due modi a seconda di quanti sono.
 *
 * Prima erano quadratini numerati, sempre: uno per volume, 36 pixel
 * l'uno. Su Naruto sono 72 quadratini, su One Piece 110, su Conan
 * oltre cento — dieci righe di caselle che riempiono uno schermo e in
 * cui non si distingue più niente. E soprattutto: a quel punto il
 * numero scritto dentro non lo legge nessuno. Nessuno cerca «il 63»
 * scorrendo una griglia di cento numeri; si guarda la FORMA — fin dove
 * arriva il pieno, dove ci sono i buchi, quanto manca alla fine.
 *
 * Quindi due rese, una regola sola:
 *
 *   QUADRETTI (fino a 24 volumi) — il numero ci sta e serve: con
 *   dodici volumi «il 7» è un oggetto che si individua a colpo
 *   d'occhio, e i quadretti sono grandi abbastanza da premerli.
 *
 *   NASTRO (da 25 in su) — una tacca per volume, alta come una costa e
 *   larga due millimetri, raggruppate a decine come le tacche di un
 *   righello. Cento volumi stanno in tre righe invece di dieci, la
 *   forma si legge da lontano, e il numero — che a quella misura non
 *   ci starebbe — si legge sopra, uno alla volta, passandoci sopra.
 *
 * Gli stati sono tre e non due, in tutt'e due le rese:
 *
 *   letto      pieno d'ottone
 *   posseduto  ottone smorto: ce l'hai, non l'hai aperto
 *   mancante   quasi spento: non ce l'hai
 *
 * «Avere» e «aver letto» sono cose diverse, ed è la differenza fra le
 * due a dire cosa si legge stasera. Il segnalibro, dove c'è, sporge
 * sopra gli altri: è un nastro che esce dal libro, non un colore in
 * più da imparare.
 */

// Sopra questo numero i numeri scritti smettono di essere leggibili e
// diventano rumore: è lì che si passa al nastro.
const SOGLIA_NASTRO = 24;

// Le tacche si raggruppano a dieci. Non è una scelta grafica: è il
// modo in cui si contano i volumi di una serie — «sono al sessanta e
// qualcosa» — e un raggruppamento a otto o a dodici costringerebbe a
// fare i conti per capire dove si è.
const PER_BLOCCO = 10;

export default function ScaffaleVolumi({
  totali,
  letti = [],
  posseduti = null,
  corrente = null,
  onSelezionaVolume,
  compatto = false,
  riepilogo = true
}) {
  const insieme = new Set(letti.map(Number));
  const idAvviso = useId();

  // Quale volume si sta guardando adesso: serve solo al nastro, dove
  // il numero non è scritto sulla tacca.
  const [guardato, setGuardato] = useState(null);

  // Senza numero di volumi noto mostro solo fino al più alto letto:
  // inventare un totale darebbe un'informazione falsa.
  const quanti = totali && totali > 0 ? totali : Math.max(...letti.map(Number), 0);

  if (!quanti) return null;

  const interattivo = typeof onSelezionaVolume === "function";

  // `posseduti` a null vuol dire «tutto quello che vedi è roba tua»:
  // è il caso del tavolo di lettura, che disegna solo i volumi in casa.
  const statoDi = (n) =>
    insieme.has(n) ? "letto" : posseduti === null || n <= posseduti ? "posseduto" : "mancante";

  const descrizioneDi = (n) =>
    `Volume ${n}` +
    (corrente === n
      ? ", segnalibro qui"
      : {
          letto: ", letto",
          posseduto: ", in collezione, non ancora letto",
          mancante: ", non in collezione"
        }[statoDi(n)]);

  const comuni = { quanti, statoDi, descrizioneDi, corrente, interattivo, onSelezionaVolume };

  // Il riassunto è UNO, e si sposta a seconda della resa.
  //
  // Sopra il nastro, dove fa anche da display: la tacca sotto il dito
  // non può dire il proprio numero — è larga due millimetri — e la
  // risposta deve stare sopra, perché sotto finirebbe coperta dal
  // polpastrello che l'ha chiesta. Quando non si sta indicando niente
  // quella riga non resta vuota: dice il conto, che è quello che si
  // legge guardando lo scaffale da fermi.
  //
  // Sotto i quadretti, dove invece il numero è scritto su ogni casella
  // e la riga serve solo a fare il totale — tanto che lì `riepilogo` a
  // falso la toglie del tutto. Sul nastro non si può togliere: senza,
  // di una serie da cento volumi non resterebbe scritto da nessuna
  // parte a quanti sei arrivato.
  const riassunto = (
    <>
      {insieme.size} di {quanti} volumi
      {insieme.size > 0 && buchi(letti)}
    </>
  );

  return (
    <div className={compatto ? "space-y-1.5" : "space-y-2"}>
      {quanti > SOGLIA_NASTRO ? (
        <>
          <p id={idAvviso} className="font-numeric text-xs">
            {guardato ? (
              <span className="text-ink-bright">{descrizioneDi(guardato)}</span>
            ) : (
              <span className="text-ink-faint">{riassunto}</span>
            )}
          </p>

          <Nastro
            {...comuni}
            compatto={compatto}
            onGuarda={setGuardato}
            descritto={idAvviso}
          />
        </>
      ) : (
        <>
          <Quadretti {...comuni} compatto={compatto} descritto={idAvviso} />

          {riepilogo && !compatto && (
            <p id={idAvviso} className="font-numeric text-xs text-ink-faint">
              {riassunto}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ==================================================
   POCHI VOLUMI: I QUADRETTI NUMERATI
   ================================================== */

const ASPETTO_QUADRETTO = {
  letto: "border-brass-400/70 bg-brass-400/85 font-semibold text-void",
  posseduto: "border-brass-400/30 bg-brass-400/12 text-brass-300",
  mancante: "border-dashed border-soft text-ink-faint"
};

function Quadretti({
  quanti,
  statoDi,
  descrizioneDi,
  corrente,
  interattivo,
  onSelezionaVolume,
  compatto,
  descritto
}) {
  // Da toccare crescono, ma solo quando c'è davvero qualcosa da premere:
  // un quadratino di sei millimetri si legge benissimo e si centra male,
  // e allargare anche quelli che sono solo un disegno vorrebbe dire
  // sprecare mezzo schermo per una serie da dodici volumi.
  const perDito = interattivo
    ? compatto
      ? " [@media(hover:none)]:h-8 [@media(hover:none)]:w-8 [@media(hover:none)]:text-[0.7rem]"
      : " [@media(hover:none)]:h-10 [@media(hover:none)]:w-10 [@media(hover:none)]:text-sm"
    : "";

  const misura = (compatto ? "h-6 w-6 text-[0.6rem]" : "h-8 w-8 text-xs") + perDito;

  return (
    <div
      className={`flex flex-wrap ${compatto ? "gap-1" : "gap-1.5"}`}
      role="list"
      aria-describedby={descritto}
    >
      {Array.from({ length: quanti }, (_, i) => i + 1).map((n) => {
        const eCorrente = corrente === n;

        const aspetto = eCorrente
          ? "border-brass-300 bg-brass-300 font-semibold text-void shadow-brass"
          : ASPETTO_QUADRETTO[statoDi(n)];

        const Elemento = interattivo ? "button" : "span";

        return (
          <Elemento
            key={n}
            role="listitem"
            {...(interattivo
              ? { type: "button", onClick: () => onSelezionaVolume(n) }
              : {})}
            aria-label={descrizioneDi(n)}
            title={descrizioneDi(n)}
            aria-current={eCorrente ? "true" : undefined}
            className={`grid place-items-center rounded-lg border font-numeric transition-all duration-quick ease-spring ${misura} ${aspetto}
              ${
                interattivo
                  ? "cursor-pointer hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf"
                  : ""
              }`}
          >
            {n}
          </Elemento>
        );
      })}
    </div>
  );
}

/* ==================================================
   TANTI VOLUMI: IL NASTRO
   ================================================== */

const ASPETTO_TACCA = {
  letto: "bg-brass-400",
  posseduto: "bg-brass-400/30",
  mancante: "bg-white/[0.07]"
};

function Nastro({
  quanti,
  statoDi,
  descrizioneDi,
  corrente,
  interattivo,
  onSelezionaVolume,
  compatto,
  onGuarda,
  descritto
}) {
  // I blocchi restano interi andando a capo: una decina spezzata a
  // metà fra due righe farebbe perdere il conto proprio a chi il
  // righello lo sta usando per contare.
  const blocchi = [];

  for (let inizio = 1; inizio <= quanti; inizio += PER_BLOCCO) {
    blocchi.push({
      inizio,
      numeri: Array.from(
        { length: Math.min(PER_BLOCCO, quanti - inizio + 1) },
        (_, i) => inizio + i
      )
    });
  }

  const alta = compatto ? "h-5" : "h-7";
  const altaCorrente = compatto ? "h-7" : "h-9";

  // Col dito le tacche sono più larghe. Restano comunque strette — è
  // un righello, non una tastiera — e infatti il modo normale di
  // spostare il segnalibro col pollice resta il «+» accanto: qui si
  // salta lontano, e un salto approssimato si corregge con un tocco.
  //
  // Nella scheda compatta crescono meno: lì il nastro divide la riga
  // con la copertina, e a tacche larghe una decina per riga non ci
  // stava — quattro decine diventavano quattro righe, cioè cento
  // pixel di scheda in più proprio sul telefono, che è dove servivano
  // meno.
  const larga = !interattivo
    ? "w-1.5 [@media(hover:none)]:w-2"
    : compatto
      ? "w-2 [@media(hover:none)]:w-2.5"
      : "w-2 [@media(hover:none)]:w-3.5";

  const Elemento = interattivo ? "button" : "span";

  return (
    <div
      className={`flex flex-wrap ${compatto ? "gap-x-2.5 gap-y-2" : "gap-x-3 gap-y-2.5"}`}
      role="list"
      aria-describedby={descritto}
      onMouseLeave={() => onGuarda(null)}
    >
      {blocchi.map((blocco) => (
        <div key={blocco.inizio} className="space-y-1">
          <div className={`flex items-end ${compatto ? "gap-[2px]" : "gap-[3px]"}`}>
            {blocco.numeri.map((n) => {
              const eCorrente = corrente === n;

              return (
                <Elemento
                  key={n}
                  role="listitem"
                  {...(interattivo
                    ? { type: "button", onClick: () => onSelezionaVolume(n) }
                    : {})}
                  onMouseEnter={() => onGuarda(n)}
                  onFocus={() => onGuarda(n)}
                  aria-label={descrizioneDi(n)}
                  title={descrizioneDi(n)}
                  aria-current={eCorrente ? "true" : undefined}
                  className={`block rounded-full transition-all duration-quick ease-spring ${larga}
                    ${eCorrente ? `${altaCorrente} bg-brass-200 shadow-brass` : `${alta} ${ASPETTO_TACCA[statoDi(n)]}`}
                    ${
                      interattivo
                        ? "cursor-pointer hover:bg-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shelf"
                        : ""
                    }`}
                />
              );
            })}
          </div>

          {/* Il numero d'inizio sotto il bordo sinistro del blocco: è
              la tacca lunga del righello. Scritto per intero e non
              come «1–10», che a venti blocchi sarebbe una fila di
              didascalie invece di una scala. */}
          <span
            aria-hidden="true"
            className="block font-numeric text-[0.6rem] leading-none text-ink-faint"
          >
            {blocco.inizio}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ==================================================
   I BUCHI
   ================================================== */

/**
 * Segnala i volumi saltati in mezzo a quelli letti.
 *
 * Un buco fra il 5 e il 12 è un'informazione diversa dall'essere
 * semplicemente indietro: dice che ti sei perso qualcosa.
 */
function buchi(letti) {
  const numeri = letti.map(Number);
  const insieme = new Set(numeri);
  const massimo = Math.max(...numeri);

  const mancanti = [];
  for (let n = 1; n < massimo; n++) {
    if (!insieme.has(n)) mancanti.push(n);
  }

  if (mancanti.length === 0) return null;

  const elenco =
    mancanti.length <= 4
      ? mancanti.join(", ")
      : `${mancanti.slice(0, 3).join(", ")} e altri ${mancanti.length - 3}`;

  return <span className="text-ember/80"> · saltati: {elenco}</span>;
}
