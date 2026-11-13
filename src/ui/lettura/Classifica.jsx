import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Copertina from "../Copertina";
import { Bottone } from "../Controlli";
import { Stella, VotoStelle } from "../AzioniSerie";
import Menu from "../Menu";
import NoteSerie from "../NoteSerie";
import Foglio from "../Foglio";
import { useCollezione } from "../../dati/collezione";
import { useAccessoProtetto } from "../../dati/accesso";
import { coloreLettore } from "../../dati/lettori";
import { plurale, votoDi, votoIt } from "../../dati/serie";
import { updateRating } from "../../services/api";

/* ==================================================
   DI CHI È LA CLASSIFICA
   ================================================== */

/**
 * Il tastino per guardare la classifica di un altro.
 *
 * Compare solo se i lettori sono almeno due: da solo, "la classifica
 * di Nicer" e "la classifica" sono la stessa cosa. I colori sono
 * quelli delle note — due modi diversi di dire "questo è di Nanaki"
 * sarebbero due cose da imparare invece di una.
 */
export function SceltaLettore({ lettori, scelto, onScegli }) {
  if (lettori.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {lettori.map((l) => {
        const attivo = l.id === scelto;
        const colore = coloreLettore(l.colore);

        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={attivo}
            onClick={() => onScegli(l.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-quick ease-settle active:scale-95
              focus-visible:outline-none focus-visible:ring-2 ${colore.anello}
              ${
                attivo
                  ? `${colore.bordo} ${colore.fondo} ${colore.testo}`
                  : "border-hairline bg-glass-1 text-ink-muted hover:border-soft hover:text-ink-bright"
              }`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${colore.pallino}`} />
            {l.nickname}
          </button>
        );
      })}
    </div>
  );
}

/* ==================================================
   UNA RIGA DI CLASSIFICA
   ================================================== */

/**
 * Una riga della classifica.
 *
 * PRIMA C'ERA UN TASTO SOLO, «Togli», scritto per esteso in fondo a
 * ogni riga. Occupava una colonna fissa su tutte per un gesto che si
 * fa due volte l'anno, ed era l'unica cosa che da qui si potesse fare
 * a una serie: per rimetterla in lettura, per rileggerne le note o per
 * correggerne il voto senza centrare una stella da sedici pixel,
 * bisognava andarsene da questa pagina.
 *
 * Adesso i comandi stanno sotto i tre puntini e la riga resta una
 * riga. Sono quattro, e ognuno vale una frase di spiegazione — cosa
 * che su una fila di tastini non ci sarebbe mai stata.
 *
 * LE STELLE QUI NON SI TOCCANO PIÙ, nemmeno sulla propria classifica.
 * Erano bersagli da otto pixel per mezza stella, incolonnati in un
 * elenco che sul telefono si scorre col pollice: bastava un tocco di
 * troppo mentre si scorreva per cambiare un voto senza accorgersene, e
 * per accorgersene bisognava ricordarsi cosa c'era prima. Il voto si
 * dà dal riquadro che apre il menu, dove le stelle sono grandi il
 * doppio e c'è scritto il numero. Qui restano quello che erano: un
 * dato, come il titolo.
 */
export function RigaClassifica({
  serie,
  posizione,
  lettore,
  mio,
  giaSulTavolo,
  onTogli,
  onRimetti,
  onApri
}) {
  const voto = votoDi(serie, lettore);
  const note = serie.note?.length ?? 0;

  const voci = [
    mio && {
      chiave: "voto",
      etichetta: voto ? "Modifica il voto" : "Dai un voto",
      descrizione: voto ? `Adesso è ${votoIt(voto)} su 5.` : "Cinque stelle, anche a metà.",
      onClick: () => onApri("voto")
    },

    {
      chiave: "note",
      etichetta: note ? `Note (${note})` : "Scrivi una nota",
      // Le note si leggono in due: quelle di un'altra persona si
      // aprono anche stando sulla sua classifica, ed è il motivo per
      // cui questa voce non sta dietro `mio`.
      descrizione: note ? "Rileggile o aggiungine una." : "Cosa vuoi ricordarti di questa serie.",
      onClick: () => onApri("note")
    },

    mio &&
      typeof onRimetti === "function" && {
        chiave: "rimetti",
        etichetta: "Rimetti in lettura",
        descrizione: giaSulTavolo
          ? "È già aperta sul tavolo."
          : "Torna sul tavolo, dal primo volume che non hai letto.",
        spenta: giaSulTavolo,
        onClick: onRimetti
      },

    mio &&
      typeof onTogli === "function" && {
        chiave: "togli",
        etichetta: "Togli dalle lette",
        descrizione: "Cancella tutti i volumi segnati: esce dalla classifica.",
        conferma: "Confermi? Si perde tutto",
        pericolo: true,
        onClick: onTogli
      }
  ];

  return (
    <li className="group flex items-center gap-3 rounded-card px-2 py-1.5 transition-colors duration-quick hover:bg-glass-1 sm:gap-3.5 sm:px-3 sm:py-2">
      {/* Il numero solo dove c'è una posizione: fra le non votate
          sarebbe una graduatoria inventata. */}
      <span className="w-6 shrink-0 text-right font-numeric text-sm text-ink-faint">
        {posizione ?? ""}
      </span>

      {/* La copertina porta alla scheda come il titolo. È l'oggetto più
          grosso e riconoscibile della riga: chi vuole aprire una serie
          ci va sopra per istinto, e trovarci un'immagine morta era una
          piccola smentita a ogni tentativo. Resta fuori dal percorso
          della tastiera perché il titolo accanto porta esattamente
          allo stesso posto: due fermate per la stessa destinazione
          raddoppiano la lunghezza dell'elenco senza aggiungere niente. */}
      <Link
        to={`/serie/${serie.id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="w-8 shrink-0 rounded-card transition-transform duration-quick ease-settle hover:scale-105"
      >
        <Copertina src={serie.copertina} alt="" inclina={false} />
      </Link>

      <Link
        to={`/serie/${serie.id}`}
        className="min-w-0 flex-1 truncate text-sm text-ink-bright transition-colors duration-quick hover:text-brass-300"
      >
        {serie.titolo}
      </Link>

      {/* Un pallino per nota: la classifica è anche il posto da cui ci
          si accorge che di una serie si era scritto qualcosa. */}
      {note > 0 && (
        <span
          aria-hidden="true"
          title={plurale(note, "nota", "note")}
          className="hidden shrink-0 gap-1 sm:flex"
        >
          {serie.note.map((n) => (
            <span
              key={n.id}
              className={`h-1.5 w-1.5 rounded-full ${coloreLettore(n.colore).pallino}`}
            />
          ))}
        </span>
      )}

      <span
        className="hidden shrink-0 items-center gap-0.5 sm:inline-flex"
        aria-label={voto ? `Voto ${votoIt(voto)} su 5` : "Non votato"}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Stella
            key={n}
            riempimento={Math.min(1, Math.max(0, (voto ?? 0) - n + 1))}
            dimensione={16}
          />
        ))}
      </span>

      <span className="w-8 shrink-0 text-right font-numeric text-sm text-ink-bright">
        {voto ? votoIt(voto) : "—"}
      </span>

      <Menu etichetta={`Altro su ${serie.titolo}`} voci={voci} larghezza="17rem" />
    </li>
  );
}

/* ==================================================
   IL RIQUADRO DI UNA SERIE: VOTO O NOTE
   ================================================== */

/**
 * Quello che dalla riga di classifica non ci stava.
 *
 * Due contenuti in una cornice sola, e non due finestre: la cornice
 * dice la stessa cosa — «questa serie, da vicino» — e cambia solo
 * quello che ci si viene a fare. Con due componenti separati le due
 * intestazioni avrebbero cominciato a divergere alla prima modifica.
 */
export function RiquadroSerie({ serie, cosa, onChiudi }) {

  // La serie può sparire sotto i piedi: succede togliendola dalle
  // lette mentre il riquadro è aperto.
  useEffect(() => {
    if (!serie) onChiudi();
  }, [serie, onChiudi]);

  if (!serie) return null;

  return (
    <Foglio titolo={`${cosa === "voto" ? "Voto" : "Note"}: ${serie.titolo}`} titoloNascosto senzaMargini larghezza="sm:max-w-lg" onChiudere={onChiudi}>
      <div className="px-5 pb-1">
          <div className="flex items-start gap-3.5">
            <div className="w-12 shrink-0 sm:w-14">
              <Copertina src={serie.copertina} alt="" inclina={false} />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                to={`/serie/${serie.id}`}
                className="block font-display text-lg font-semibold leading-tight text-ink-bright transition-colors duration-quick hover:text-brass-300"
              >
                {serie.titolo}
              </Link>

              {serie.autore && (
                <p className="mt-0.5 truncate text-sm text-ink-muted">{serie.autore}</p>
              )}
            </div>

            <button
              onClick={onChiudi}
              aria-label="Chiudi"
              className="bersaglio grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-quick hover:bg-glass-1 hover:text-ink-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
            >
              ✕
            </button>
          </div>

          {cosa === "voto" ? (
            <ModuloVoto serie={serie} />
          ) : (
            <div className="border-t border-hairline pt-5">
              <NoteSerie serie={serie} compatto />
            </div>
          )}
      </div>
    </Foglio>
  );
}

/** Le parole accanto al numero: un «3» secco non dice se è poco o tanto. */
const PAROLE_VOTO = {
  0.5: "da dimenticare",
  1: "no",
  1.5: "quasi no",
  2: "si legge",
  2.5: "nella media",
  3: "buona",
  3.5: "molto buona",
  4: "notevole",
  4.5: "quasi perfetta",
  5: "capolavoro"
};

/**
 * Il voto, con lo spazio che sulla riga non aveva.
 *
 * Stelle a trentadue pixel invece che a sedici: la mezza stella
 * diventa un bersaglio da mezzo centimetro invece che da un quarto, e
 * col dito `VotoStelle` le ingrandisce ancora di suo. Sotto, il numero
 * scritto — contare le stelle di un voto già dato è un lavoro che
 * nessuno dovrebbe fare — e il modo di ritirarlo.
 */
function ModuloVoto({ serie }) {
  const { aggiornaVoto } = useCollezione();
  const eseguiProtetto = useAccessoProtetto();
  const [problema, setProblema] = useState(null);

  const voto = serie.valutazione ?? null;

  async function togliIlVoto() {
    const precedente = voto;

    setProblema(null);
    aggiornaVoto(serie.id, null);

    try {
      await eseguiProtetto(() => updateRating(serie.id, null));
    } catch (e) {
      if (!e?.annullato) {
        aggiornaVoto(serie.id, precedente);
        setProblema("Il voto non è stato tolto.");
      }
    }
  }

  return (
    <div className="space-y-4 border-t border-hairline pt-5">
      <div className="flex flex-col items-center gap-3">
        <VotoStelle
          serie={serie}
          dimensione={32}
          onCambiato={(nuovo) => aggiornaVoto(serie.id, nuovo)}
        />

        <p className="text-center">
          <span className="font-numeric text-2xl font-semibold text-ink-bright">
            {voto ? votoIt(voto) : "—"}
          </span>
          <span className="ml-1 text-sm text-ink-faint">/ 5</span>

          <span className="mt-0.5 block text-sm text-ink-muted">
            {voto ? PAROLE_VOTO[voto] : "non l'hai ancora votata"}
          </span>
        </p>
      </div>

      {problema && (
        <p role="alert" className="text-center text-sm text-ember">
          {problema}
        </p>
      )}

      <p className="text-center text-xs text-ink-faint">
        Mezzo voto: la metà sinistra di ogni stella.
      </p>

      {voto && (
        <div className="flex justify-center">
          <Bottone variante="fantasma" onClick={togliIlVoto} className="!text-xs">
            Togli il voto
          </Bottone>
        </div>
      )}
    </div>
  );
}
