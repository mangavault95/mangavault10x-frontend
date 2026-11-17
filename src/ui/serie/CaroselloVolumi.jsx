import { useEffect, useRef, useState } from "react";
import Icon from "../../app/Icon";
import { Pastiglie } from "../Controlli";
import { indirizzoVolume, useFonteCopertine } from "../../dati/copertineVolumi";
import { urlCopertina } from "../../services/api";

/**
 * I volumi della scheda, come un carosello di copertine (17/11/2026).
 *
 * Il tabellone — dieci caselle numerate per riga — diceva «dove sei» solo
 * a chi si metteva a contare: con cento volumi occupava metà schermo e il
 * numero dentro ogni casella era rumore. Qui ogni volume è la sua
 * copertina, in fila, e la fila si apre già sul punto che interessa: il
 * segnalibro, o il primo volume in casa che non è ancora stato letto.
 *
 * Gli stati sono gli stessi tre di `ScaffaleVolumi`, scritti sulla carta
 * e non solo nel colore:
 *
 *   letto      copertina attenuata e spunta
 *   posseduto  copertina intera: è quello che c'è da leggere
 *   mancante   tratteggio rosso lanterna, senza copertina
 *
 * Le pastiglie in cima fanno da filtro e da legenda insieme, con il conto
 * di ciascuno stato: per questo `Volumi` toglie la sua legenda mentre
 * c'è il carosello. Per MODIFICARE quali volumi si hanno resta il
 * tabellone (`ScaffaleVolumi`, resa «tabellone»): cento tocchi veloci
 * vogliono una griglia, non una fila da far scorrere.
 *
 * Le copertine vengono da `dati/copertineVolumi` e si caricano pigre.
 * Dove non c'è quella del volume (serie non ancora letta dal backend,
 * immagine rotta) la carta mostra il numero grande: meglio una carta
 * onesta che la copertina del volume 1 ripetuta cento volte.
 */

const FILTRI = {
  tutti: () => true,
  letti: (stato) => stato === "letto",
  daleggere: (stato) => stato === "posseduto",
  mancano: (stato) => stato === "mancante"
};

// Il fondo c'è sempre: finché l'immagine arriva la carta è già una carta,
// non un buco nella fila.
const ASPETTO_CARTA = {
  letto: "border-brass-400/60 bg-glass-1",
  posseduto: "border-hairline bg-glass-1",
  mancante: "border-dashed border-ember/60 bg-glass-1"
};

const DESCRIZIONE_STATO = {
  letto: ", letto",
  posseduto: ", in collezione, non ancora letto",
  mancante: ", non in collezione"
};

const SENZA_RISULTATI = {
  letti: "Nessun volume letto, per ora.",
  daleggere: "Hai letto tutto quello che hai in casa.",
  mancano: "Non ti manca nessun volume."
};

export default function CaroselloVolumi({
  serieId,
  quanti,
  letti = [],
  posseduti = [],
  corrente = null,
  di = null,
  onSelezionaVolume
}) {
  const insiemeLetti = new Set(letti.map(Number));
  const inCasa = new Set(posseduti);
  const [filtro, setFiltro] = useState("tutti");

  const numeri = Array.from({ length: quanti }, (_, i) => i + 1);
  const statoDi = (n) => (insiemeLetti.has(n) ? "letto" : inCasa.has(n) ? "posseduto" : "mancante");

  const conteggio = (id) => numeri.filter((n) => FILTRI[id](statoDi(n))).length;
  const conteggi = {
    tutti: quanti,
    letti: conteggio("letti"),
    daleggere: conteggio("daleggere"),
    mancano: conteggio("mancano")
  };

  // «Mancano» compare solo se manca qualcosa: una pastiglia a zero
  // sarebbe un filtro che porta a una pagina vuota.
  const opzioni = [
    { id: "tutti", etichetta: "Tutti" },
    { id: "letti", etichetta: di ? `Letti da ${di}` : "Letti" },
    { id: "daleggere", etichetta: "Da leggere" },
    ...(conteggi.mancano > 0 ? [{ id: "mancano", etichetta: "Mancano" }] : [])
  ];

  const attivo = opzioni.some((o) => o.id === filtro) ? filtro : "tutti";
  const visibili = numeri.filter((n) => FILTRI[attivo](statoDi(n)));
  const prossimo = numeri.find((n) => statoDi(n) === "posseduto") ?? null;

  return (
    <div className="space-y-3">
      <Pastiglie opzioni={opzioni} attiva={attivo} onCambia={setFiltro} conteggi={conteggi} />

      {visibili.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">{SENZA_RISULTATI[attivo]}</p>
      ) : (
        // `key` a ogni filtro: la fila riparte dall'inizio (o dal punto
        // giusto) invece di restare dov'era, in mezzo a carte diverse.
        <Binario
          key={attivo}
          serieId={serieId}
          numeri={visibili}
          statoDi={statoDi}
          corrente={corrente}
          prossimo={prossimo}
          centraSu={attivo === "tutti" ? (corrente ?? prossimo) : null}
          onSelezionaVolume={onSelezionaVolume}
        />
      )}
    </div>
  );
}

function Binario({ serieId, numeri, statoDi, corrente, prossimo, centraSu, onSelezionaVolume }) {
  const lista = useRef(null);
  const fonte = useFonteCopertine();
  const interattivo = typeof onSelezionaVolume === "function";

  // Il punto di partenza si decide una volta, a fila appena montata:
  // se si ricalcolasse a ogni dato nuovo la fila scivolerebbe via da
  // sotto il dito di chi sta scorrendo.
  const [partenza] = useState(centraSu);

  useEffect(() => {
    const contenitore = lista.current;

    if (!contenitore) return;

    const carta = partenza ? contenitore.querySelector(`[data-volume="${partenza}"]`) : null;

    contenitore.scrollLeft = carta
      ? carta.offsetLeft - contenitore.clientWidth / 2 + carta.offsetWidth / 2
      : 0;
  }, [partenza]);

  function scorri(verso) {
    const contenitore = lista.current;

    if (!contenitore) return;

    const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    contenitore.scrollBy({ left: verso * contenitore.clientWidth * 0.8, behavior: ridotto ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={lista}
        role="list"
        aria-label="Volumi della serie"
        // Se le carte non sono bottoni la fila va comunque raggiunta
        // con la tastiera, altrimenti non si può scorrere.
        tabIndex={interattivo ? undefined : 0}
        className="-mx-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-4 pb-3 [scrollbar-width:thin] sm:mx-0 sm:px-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
      >
        {numeri.map((n) => (
          <Carta
            key={n}
            numero={n}
            serieId={serieId}
            fonte={fonte}
            stato={statoDi(n)}
            eCorrente={corrente === n}
            eProssimo={prossimo === n}
            interattivo={interattivo}
            onSeleziona={onSelezionaVolume}
          />
        ))}
      </div>

      {/* Le frecce servono dove c'è il mouse; col dito si scorre e basta. */}
      {["indietro", "avanti"].map((verso) => (
        <button
          key={verso}
          type="button"
          onClick={() => scorri(verso === "avanti" ? 1 : -1)}
          aria-label={verso === "avanti" ? "Scorri avanti" : "Scorri indietro"}
          className={`absolute top-[calc(50%-0.75rem)] hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-hairline bg-void/85 text-ink-bright backdrop-blur transition-colors duration-quick hover:border-soft
            [@media(hover:hover)]:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
            ${verso === "avanti" ? "right-1" : "left-1"}`}
        >
          <Icon nome={verso === "avanti" ? "avanti" : "back"} dimensione={16} />
        </button>
      ))}
    </div>
  );
}

function Carta({ numero, serieId, fonte, stato, eCorrente, eProssimo, interattivo, onSeleziona }) {
  const [rotta, setRotta] = useState(false);

  const percorso = stato === "mancante" ? null : indirizzoVolume(fonte, serieId, numero);
  const immagine = percorso && !rotta ? urlCopertina(percorso, 192) : null;

  const inEvidenza = eCorrente || eProssimo;
  const etichetta = eCorrente ? "Segnalibro" : eProssimo ? "Prossimo" : null;
  const descrizione = `Volume ${numero}${eCorrente ? ", segnalibro qui" : DESCRIZIONE_STATO[stato]}`;

  // Un volume che non si ha non si legge e non si segna: resta un
  // disegno anche quando il resto della fila si può premere.
  const premibile = interattivo && stato !== "mancante";
  const Elemento = premibile ? "button" : "div";

  return (
    <Elemento
      role="listitem"
      data-volume={numero}
      {...(premibile ? { type: "button", onClick: () => onSeleziona(numero) } : {})}
      aria-label={descrizione}
      title={descrizione}
      aria-current={eCorrente ? "true" : undefined}
      className={`relative aspect-[2/3] w-[5.5rem] shrink-0 snap-center overflow-hidden rounded-lg border text-left transition-all duration-quick sm:w-24
        ${inEvidenza ? "border-brass-300 shadow-brass ring-2 ring-brass-300/50" : ASPETTO_CARTA[stato]}
        ${
          premibile
            ? "cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
            : ""
        }`}
    >
      {immagine ? (
        <>
          <img
            src={immagine}
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={() => setRotta(true)}
            className={`h-full w-full object-cover ${stato === "letto" && !inEvidenza ? "opacity-50" : ""}`}
          />

          <span className="absolute bottom-1 left-1 rounded-md bg-void/85 px-1.5 py-0.5 font-numeric text-micro text-ink-bright">
            {numero}
          </span>
        </>
      ) : (
        <span className="grid h-full w-full place-content-center gap-1 text-center">
          <span className="text-micro tracking-widest text-ink-muted">VOL.</span>
          <span
            className={`font-numeric text-2xl font-semibold ${stato === "mancante" ? "text-ember/80" : "text-ink-bright"}`}
          >
            {numero}
          </span>
          {stato === "mancante" && <span className="text-micro text-ember/80">Manca</span>}
        </span>
      )}

      {stato === "letto" && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brass-400 text-void"
        >
          <Icon nome="spunta" dimensione={12} />
        </span>
      )}

      {etichetta && (
        <span className="absolute left-1 top-1 rounded-md bg-brass-300 px-1.5 py-0.5 text-micro font-semibold text-void">
          {etichetta}
        </span>
      )}
    </Elemento>
  );
}
