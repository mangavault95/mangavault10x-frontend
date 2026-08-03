import { useMemo } from "react";
import { Link } from "react-router-dom";
import Approdo from "../ui/Approdo";
import Copertina from "../ui/Copertina";
import { CaricamentoElenco, Errore, Vuoto } from "../ui/Stati";
import useRisorsa from "../dati/useRisorsa";
import { getWishlist } from "../services/api";

/**
 * La bacheca dei desideri.
 *
 * Gli stessi dati di `/wishlist`, appesi al muro invece che messi in
 * fila. Di là sono un archivio — ricerca, moduli, «compila», elimina —
 * e ci si va per lavorarci; qui sono quello che sono davvero: fogli
 * appuntati sopra un pannello di sughero da qualcuno che passando ha
 * pensato «questo lo voglio».
 *
 * La differenza non è decorativa. Un elenco ordinato di dodici desideri
 * si legge riga per riga e non dice niente; dodici locandine storte su
 * un muro si vedono tutte insieme, e la prima cosa che si capisce è
 * *quante* sono. Che è la domanda che ci si fa guardando una bacheca.
 *
 *
 * PERCHÉ OGNI FOGLIO È STORTO IN MODO DIVERSO
 *
 * Perché nessuno appunta dritto. Ma l'inclinazione non è casuale: è
 * ricavata dall'identificativo, quindi lo stesso desiderio pende sempre
 * dallo stesso lato. Un'inclinazione sorteggiata a ogni ridisegno
 * farebbe ballare il muro a ogni cambio di stato, e sarebbe la cosa più
 * fastidiosa della pagina.
 */

// Quanto pendono, in gradi. Poco: sopra i tre gradi non sembra un
// foglio appuntato, sembra un errore di allineamento.
const PENDENZA = 2.6;

// Le puntine. Colori da cartoleria, non dalla tavolozza dell'interfaccia:
// una puntina d'ottone su una bacheca d'ottone sparisce.
const PUNTINE = ["#b23c32", "#3f6f9a", "#c98a2b", "#4e7d54", "#8a4f7d"];

const impronta = (elemento, indice) => {
  const chiave = String(elemento.id ?? elemento.titolo ?? indice);
  let n = 0;

  for (let i = 0; i < chiave.length; i++) n = (n * 31 + chiave.charCodeAt(i)) % 10007;

  return n;
};

export default function BachecaPage() {
  const { dati, inCorso, errore, ricarica } = useRisorsa(getWishlist);

  const fogli = useMemo(
    () =>
      (dati || []).map((elemento, indice) => {
        const n = impronta(elemento, indice);

        return {
          elemento,
          // Da −PENDENZA a +PENDENZA, stabile per elemento.
          angolo: ((n % 200) / 100 - 1) * PENDENZA,
          puntina: PUNTINE[n % PUNTINE.length],
          // Un filo di sfasamento verticale: una griglia perfetta è una
          // griglia, non un muro.
          scarto: (n % 7) - 3
        };
      }),
    [dati]
  );

  return (
    <Approdo
      titolo="La bacheca dei desideri"
      className="bg-legno"
      fondo={<Sughero />}
    >
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pt-24">
        <Targa quanti={fogli.length} />

        {errore ? (
          <Errore errore={errore} riprova={ricarica} />
        ) : inCorso && !dati ? (
          <CaricamentoElenco quante={6} />
        ) : !fogli.length ? (
          <Vuoto
            titolo="La bacheca è vuota"
            testo="Nessun desiderio appuntato. Si aggiungono dall'elenco, qui sopra a destra."
          />
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
            {fogli.map(({ elemento, angolo, puntina, scarto }, indice) => (
              <li
                key={elemento.id ?? indice}
                className="animate-[appunta_520ms_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ animationDelay: `${240 + indice * 45}ms` }}
              >
                <Locandina
                  elemento={elemento}
                  angolo={angolo}
                  puntina={puntina}
                  scarto={scarto}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Approdo>
  );
}

/**
 * Il pannello di sughero.
 *
 * Tre strati di puntini a scale diverse: uno solo si legge come una
 * trama regolare — cioè come una carta da parati — mentre tre a passi
 * che non vanno d'accordo fanno una granulosità che non si ripete
 * sott'occhio.
 */
function Sughero() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-sughero/90">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.5)_1px,transparent_0)] bg-[length:7px_7px]" />
      <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_1px_1px,rgba(255,240,200,0.6)_1px,transparent_0)] bg-[length:11px_13px]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.6)_2px,transparent_0)] bg-[length:23px_19px]" />

      {/* La luce della stanza, che entra da sinistra come là dentro, più
          la vignettatura che tiene lo sguardo al centro del muro. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_25%_10%,rgba(255,226,170,0.22),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(115%_100%_at_50%_45%,transparent_35%,rgba(6,7,11,0.72)_100%)]" />

      {/* La cornice di legno del pannello */}
      <div className="absolute inset-0 border-[14px] border-legno/90 shadow-[inset_0_0_40px_rgba(0,0,0,0.55)] sm:border-[22px]" />
    </div>
  );
}

/** La targhetta inchiodata in cima al pannello. */
function Targa({ quanti }) {
  return (
    <div className="mx-auto w-fit -rotate-1 rounded-sm bg-inchiostro px-8 py-3 shadow-float">
      <p className="text-center font-display text-2xl font-semibold tracking-[0.3em] text-brass-400">
        DESIDERI
      </p>
      <p className="mt-0.5 text-center text-[0.65rem] uppercase tracking-[0.24em] text-ink-muted">
        {quanti === 1 ? "un foglio appuntato" : `${quanti} fogli appuntati`}
      </p>
    </div>
  );
}

/**
 * Un desiderio, come manifesto.
 *
 * La copertina fa da locandina; sotto, una fascetta di carta con il
 * titolo scritto a mano. Passandoci sopra il foglio si raddrizza e si
 * solleva — il gesto di chi lo prende in mano per leggerlo meglio, ed è
 * anche il modo più economico per dire «questo si clicca».
 */
function Locandina({ elemento, angolo, puntina, scarto }) {
  const titolo = elemento.titolo || "Senza titolo";

  return (
    <Link
      to={`/desiderio/${elemento.id}`}
      className="group block focus-visible:outline-none"
      style={{ marginTop: `${scarto}px` }}
    >
      <div
        className="relative transition-transform duration-slow ease-settle will-change-transform
                   group-hover:!rotate-0 group-hover:-translate-y-2 group-focus-visible:!rotate-0
                   group-focus-visible:-translate-y-2"
        style={{ transform: `rotate(${angolo}deg)` }}
      >
        {/* Il foglio: carta con un margine, come una locandina stampata
            e ritagliata male. */}
        <div className="bg-carta p-2 pb-3 shadow-raised transition-shadow duration-slow group-hover:shadow-float">
          <div className="relative overflow-hidden bg-inchiostro/10">
            <Copertina src={elemento.coverurl} alt="" inclina={false} />

            {/* La fascetta: è quello che trasforma una copertina in un
                cartello. Senza, la bacheca sembra una griglia di
                copertine — cioè la collezione, che è un'altra cosa. */}
            <span className="absolute left-0 top-3 -rotate-2 bg-ember px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-void shadow-lift">
              Cercasi
            </span>

            {elemento.volumitotali > 0 && (
              <span className="absolute bottom-0 right-0 bg-inchiostro/85 px-2 py-1 font-numeric text-[0.62rem] text-carta">
                {elemento.volumitotali} vol.
              </span>
            )}
          </div>

          <p className="mt-2 truncate px-1 font-display text-sm font-semibold leading-tight text-inchiostro">
            {titolo}
          </p>

          <p className="truncate px-1 text-[0.68rem] text-inchiostro/60">
            {elemento.autori || elemento.dovecomprare || "—"}
          </p>
        </div>

        {/* La puntina, sopra il foglio e a cavallo del bordo: è lei a
            far leggere il foglio come appeso invece che come posato. */}
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full shadow-lift
                     after:absolute after:left-1/2 after:top-1 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-white/55"
          style={{ background: puntina }}
        />
      </div>
    </Link>
  );
}
