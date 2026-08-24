import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useRisorsa from "../dati/useRisorsa";
import { formattaMedia, paginaDi, tempoVisto } from "../dati/cineforum";
import { getConfronto, urlCopertina } from "../services/api";
import Icon from "../app/Icon";
import PaginaVideoteca, { Bottone, Caricamento, Errore, Scheda } from "../ui/videoteca/Foglio";
import { formattaVoto } from "../ui/videoteca/formati";
import Tondino from "../ui/videoteca/Tondino";

/**
 * VOI DUE, UNO ACCANTO ALL'ALTRO.
 *
 * La parte che vale non sono i due totali — quelli si leggerebbero
 * anche aprendo due pagine — ma LE SERIE IN COMUNE con i due voti
 * accanto. È la domanda che uno si fa guardando la videoteca di
 * qualcun altro: «l'hai visto anche tu, e cosa ne pensi?».
 *
 * La lista si può ridurre ai DISACCORDI, ed è la vista più
 * interessante che c'è: restano solo le serie su cui uno ha dato
 * cinque e l'altro due, cioè esattamente le cose di cui vale la pena
 * parlare. Provata sui dati veri, la distanza media fra i voti di
 * Nicer e Nanaki è 0,32 su 14 serie votate da entrambi — vanno
 * d'accordo quasi su tutto, e quel «quasi» è quello che si cerca.
 * Per questo è un filtro e non un ordinamento: mettere in cima i due
 * disaccordi lasciando sotto le altre dodici righe è una risposta che
 * bisogna ancora cercare.
 *
 * Il confronto sta sui GRUPPI e non sulle schede (`services/cineforum.js`):
 * se uno ha aggiunto Frieren come due stagioni e l'altra come una
 * sola, è comunque la stessa serie e deve comparire una volta.
 */

/**
 * Quanto devono distare due voti perché sia un disaccordo.
 *
 * Due stelle intere, non mezza. Sui dati veri la distanza media fra
 * Nicer e Nanaki è 0,32: con una soglia bassa «dove non siete
 * d'accordo» restituirebbe quasi tutta la lista, cioè non
 * risponderebbe alla domanda. Un 5 contro un 3 invece è una
 * conversazione.
 */
const SCARTO = 2;

const VISTE = [
  { id: "tutte", etichetta: "Tutte" },
  { id: "disaccordo", etichetta: `Dove non siete d'accordo` }
];

export default function ConfrontoPage() {
  const { a, b } = useParams();
  const [vista, setVista] = useState("tutte");

  const { dati, errore, inCorso, ricarica } = useRisorsa(
    useCallback(() => getConfronto(a, b), [a, b])
  );

  const righe = useMemo(() => {
    const elenco = dati?.inComune ?? [];

    if (vista !== "disaccordo") return elenco;

    // Filtra, non ordina soltanto. Ordinare lasciava in fondo alla
    // stessa lista tutte le serie su cui siete d'accordo e tutte
    // quelle che uno dei due non ha votato: la risposta c'era ma
    // bisognava scorrere per non vederla. Chi non ha votato non è «in
    // disaccordo» — non ha detto niente — e `distanza` gli dà -1,
    // quindi esce da sé.
    return elenco.filter((s) => distanza(s) >= SCARTO).sort((x, y) => distanza(y) - distanza(x));
  }, [dati, vista]);

  // Il piu' grande dei due decide l'unita' del tempo per entrambi.
  const tempoMassimo = Math.max(dati?.a?.minuti ?? 0, dati?.b?.minuti ?? 0);

  const personaA = dati?.personaA;
  const personaB = dati?.personaB;

  return (
    <PaginaVideoteca
      occhiello="Videoteca"
      titolo={personaA && personaB ? `${personaA.nickname} e ${personaB.nickname}` : "Confronto"}
      sommario={dati ? fraseAccordo(dati) : undefined}
      azioni={
        personaA && (
          <Link to={paginaDi(personaA.nickname)}>
            <Bottone>
              <Icon nome="back" dimensione={16} />
              La pagina di {personaA.nickname}
            </Bottone>
          </Link>
        )
      }
    >
      {inCorso && !dati && <Caricamento testo="Metto i numeri uno accanto all'altro…" />}

      {errore && <Errore errore={errore} riprova={ricarica} />}

      {dati && (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          {/* ---------- I due, in cima ---------- */}
          <div className="flex items-stretch gap-2 sm:gap-3">
            <Testa persona={personaA} statistiche={dati.a} riferimento={tempoMassimo} />

            <div className="grid w-10 shrink-0 place-items-center text-xs font-semibold uppercase tracking-wider text-quaderno-tenue">
              vs
            </div>

            <Testa persona={personaB} statistiche={dati.b} riferimento={tempoMassimo} />
          </div>

          {/* ---------- Riga per riga ---------- */}
          <Scheda className="divide-y divide-quaderno-riga">
            <Paragone etichetta="Serie" a={dati.a.serie} b={dati.b.serie} />
            <Paragone etichetta="Film" a={dati.a.film} b={dati.b.film} />
            <Paragone etichetta="Episodi" a={dati.a.episodi} b={dati.b.episodi} />
            <Paragone etichetta="Finite" a={dati.a.finite} b={dati.b.finite} />
            <Paragone etichetta="In visione" a={dati.a.in_visione} b={dati.b.in_visione} />
            <Paragone etichetta="Mollate" a={dati.a.droppate} b={dati.b.droppate} />
            <Paragone
              etichetta="Ore viste"
              a={Math.round(dati.a.minuti / 60)}
              b={Math.round(dati.b.minuti / 60)}
            />
            <Paragone
              etichetta="Voto medio"
              a={formattaMedia(dati.a.voto_medio)}
              b={formattaMedia(dati.b.voto_medio)}
            />
            <Paragone etichetta="Commenti" a={dati.a.commenti} b={dati.b.commenti} />
          </Scheda>

          {/* ---------- Cosa avete visto tutti e due ---------- */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-quaderno-inchiostro">
                Avete visto tutti e due
                <span className="ml-2 font-numeric text-sm font-normal text-quaderno-tenue">
                  {righe.length}
                  {vista === "disaccordo" && ` di ${dati.quanteInComune}`}
                </span>
              </h2>

              {dati.quanteInComune > 1 && (
                <div className="flex items-center gap-2 text-xs text-quaderno-tenue">
                  <span>Mostra</span>

                  {VISTE.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVista(v.id)}
                      aria-pressed={vista === v.id}
                      className={`rounded px-1.5 py-0.5 font-semibold transition-colors duration-quick ${
                        vista === v.id
                          ? "text-quaderno-blu underline"
                          : "hover:text-quaderno-inchiostro"
                      }`}
                    >
                      {v.etichetta}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {righe.length === 0 ? (
              <p className="rounded-card border border-dashed border-quaderno-riga px-4 py-8 text-center text-sm text-quaderno-tenue">
                {vista === "disaccordo"
                  ? `Nessuna serie su cui i vostri voti distino ${SCARTO} stelle o più: su quello che avete visto in due la pensate allo stesso modo.`
                  : "Per adesso non avete nessuna serie in comune."}
              </p>
            ) : (
              <Scheda className="divide-y divide-quaderno-riga">
                {righe.map((s) => (
                  <InComune key={s.chiave} serie={s} />
                ))}
              </Scheda>
            )}
          </section>
        </div>
      )}
    </PaginaVideoteca>
  );
}

/** Quanto distano i due voti. Senza due voti non c'è disaccordo: zero. */
function distanza(s) {
  if (s.votoA == null || s.votoB == null) return -1;

  return Math.abs(s.votoA - s.votoB);
}

/** La frase che riassume: quanto vi somigliate, detto a parole. */
function fraseAccordo(dati) {
  if (dati.quanteInComune === 0) return "Niente in comune, per ora.";

  const pezzi = [
    `${dati.quanteInComune} ${dati.quanteInComune === 1 ? "serie" : "serie"} in comune`
  ];

  if (dati.distanzaMedia != null) {
    // La soglia è mezza stella, che è il passo minimo che si può dare:
    // sotto quella, i due voti sono la stessa opinione scritta con un
    // numero diverso.
    const come =
      dati.distanzaMedia < 0.5
        ? "andate d'accordo quasi su tutto"
        : dati.distanzaMedia < 1
          ? "vi somigliate, con qualche eccezione"
          : "avete gusti diversi";

    pezzi.push(`${dati.votateInDue} votate da entrambi — ${come}`);
  }

  return pezzi.join(" · ");
}

function Testa({ persona, statistiche, riferimento }) {
  // L'unita' la scelgono insieme: vedi `tempoVisto`.
  const tempo = tempoVisto(statistiche.minuti, riferimento);

  return (
    <Link
      to={paginaDi(persona.nickname)}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-card border border-quaderno-riga bg-quaderno-foglio px-2 py-4 transition-colors duration-quick hover:border-quaderno-blu"
    >
      <Tondino utente={persona} dimensione={54} />

      <span className="text-sm font-semibold text-quaderno-inchiostro">{persona.nickname}</span>

      <span className="font-numeric text-xs text-quaderno-tenue">
        {tempo.valore} {tempo.unita}
      </span>
    </Link>
  );
}

/**
 * Una riga di confronto: il numero a sinistra, quello a destra, e la
 * barra in mezzo divisa in proporzione.
 *
 * La barra e non due numeri e basta: dieci righe di cifre non si
 * confrontano con l'occhio, si leggono una per una. La barra dice chi
 * sta avanti prima ancora di leggere.
 */
function Paragone({ etichetta, a, b }) {
  const na = Number(a);
  const nb = Number(b);
  const confrontabili = Number.isFinite(na) && Number.isFinite(nb) && na + nb > 0;
  const quota = confrontabili ? (na / (na + nb)) * 100 : 50;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
      <span
        className={`w-14 shrink-0 text-right font-numeric text-sm sm:w-20 ${
          confrontabili && na > nb
            ? "font-bold text-quaderno-inchiostro"
            : "text-quaderno-tenue"
        }`}
      >
        {typeof a === "number" ? a.toLocaleString("it-IT") : a}
      </span>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-center text-[0.7rem] uppercase tracking-wider text-quaderno-tenue">
          {etichetta}
        </p>

        <div className="flex h-1.5 overflow-hidden rounded-full bg-quaderno-carta">
          <div className="h-full bg-quaderno-blu" style={{ width: `${quota}%` }} />
          <div className="h-full flex-1 bg-quaderno-riga" />
        </div>
      </div>

      <span
        className={`w-14 shrink-0 font-numeric text-sm sm:w-20 ${
          confrontabili && nb > na
            ? "font-bold text-quaderno-inchiostro"
            : "text-quaderno-tenue"
        }`}
      >
        {typeof b === "number" ? b.toLocaleString("it-IT") : b}
      </span>
    </div>
  );
}

/** Una serie vista da tutti e due, con i due voti accanto. */
function InComune({ serie }) {
  const d = distanza(serie);

  return (
    <Link
      to={`/videoteca/${serie.animeId}`}
      className="flex items-center gap-3 px-3 py-2 transition-colors duration-quick hover:bg-quaderno-carta sm:px-4"
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-quaderno-carta">
        {serie.cover_url && (
          <img
            src={urlCopertina(serie.cover_url)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-quaderno-inchiostro">
        {serie.titolo}
      </span>

      <span className="flex shrink-0 items-center gap-1.5 font-numeric text-sm">
        <Voto valore={serie.votoA} />
        <span className="text-quaderno-riga">/</span>
        <Voto valore={serie.votoB} />
      </span>

      {/* Il numero del disaccordo solo quando c'è: una colonna piena di
          zeri e trattini non aggiunge niente. */}
      {d >= 1 && (
        <span className="shrink-0 rounded-full bg-quaderno-blu-tenue px-2 py-0.5 font-numeric text-[0.65rem] font-semibold text-quaderno-blu">
          {formattaVoto(d)} di scarto
        </span>
      )}
    </Link>
  );
}

/**
 * Un voto, a semaforo.
 *
 * Dal 4 in su verde, il 3 giallo, sotto rosso. Serve qui più che
 * altrove: in una colonna di «★4 / ★2» ripetuta venti volte i due
 * numeri si somigliano, e capire chi ha amato cosa vuol dire leggere
 * riga per riga. Col colore la lista si legge a colpo d'occhio.
 *
 * Il colore non è l'unica cosa che distingue i due voti — il numero
 * c'è e si legge — quindi chi non distingue rosso e verde non perde
 * niente.
 */
function tintaVoto(valore) {
  if (valore >= 4) return "text-quaderno-verde";
  if (valore >= 3) return "text-quaderno-giallo";

  return "text-quaderno-rosso";
}

function Voto({ valore }) {
  if (valore == null) {
    return <span className="w-8 text-center text-quaderno-riga">—</span>;
  }

  return (
    <span className={`w-8 text-center font-semibold ${tintaVoto(valore)}`}>
      ★{formattaVoto(valore)}
    </span>
  );
}
