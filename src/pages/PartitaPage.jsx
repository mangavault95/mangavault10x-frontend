import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Pagina, { Pannello, Sezione } from "../ui/Pagina";
import { Bottone } from "../ui/Controlli";
import Copertina from "../ui/Copertina";
import { CaricamentoElenco, Errore } from "../ui/Stati";
import { Strada, Tabellone } from "../ui/Tabellone";
import Icon from "../app/Icon";
import useRisorsa from "../dati/useRisorsa";
import { useCollezione } from "../dati/collezione";
import { useSessione } from "../dati/sessione";
import { useAccessoProtetto } from "../dati/accesso";
import { eliminaTorneo, getTorneo } from "../services/api";
import { dataIt } from "../dati/serie";
import { strada, turniPer } from "../dati/kachinuki";

/**
 * Una partita già giocata, per intero.
 *
 * È la pagina che si apre cliccando un vincitore in cronologia, e
 * risponde alla domanda che uno si fa guardandolo: chi ha incontrato,
 * chi ha battuto, e chi è arrivato fin dove. Prima la strada del
 * vincitore — cinque righe su trentuno — poi tutto il resto, che è la
 * storia degli altri e sta più giù.
 *
 * Ha un indirizzo suo perché una partita si manda a qualcuno. Chi ci
 * arriva da fuori non deve essere entrato: la cronologia è un albo, non
 * un diario.
 */
export default function PartitaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { serie } = useCollezione();
  const { utente } = useSessione();
  const eseguiProtetto = useAccessoProtetto();

  const caricamento = useCallback(() => getTorneo(id), [id]);
  const { dati: partita, errore, inCorso, ricarica } = useRisorsa(caricamento);

  const [cancellando, setCancellando] = useState(false);

  /**
   * Le serie che si possono ancora aprire.
   *
   * Il tabellone conserva titolo e copertina di chi ha giocato quel
   * giorno, anche di una scheda cancellata da allora: il verbale resta
   * leggibile, ma il collegamento a una scheda che non c'è più
   * porterebbe a una pagina vuota.
   */
  const collegabile = useMemo(() => new Set(serie.map((s) => s.id)), [serie]);

  const nomeDi = useCallback(
    (idSerie) => partita?.serie.find((s) => s.id === idSerie)?.titolo ?? null,
    [partita]
  );

  const cancella = useCallback(async () => {
    if (!window.confirm("Cancellare questa partita dalla cronologia?")) return;

    setCancellando(true);

    try {
      await eseguiProtetto(() => eliminaTorneo(partita.id));
      navigate("/kachinuki", { replace: true });
    } catch (e) {
      if (!e?.annullato) window.alert(`Non sono riuscito a cancellarla: ${e.message}`);
      setCancellando(false);
    }
  }, [partita, eseguiProtetto, navigate]);

  if (inCorso) {
    return (
      <Pagina titolo="Una partita">
        <CaricamentoElenco quante={4} />
      </Pagina>
    );
  }

  if (errore) {
    return (
      <Pagina titolo="Una partita">
        <Errore errore={errore} riprova={ricarica} />
      </Pagina>
    );
  }

  if (!partita) return null;

  const stradaDelVincitore = strada(partita.sfide, partita.vincitore.id);

  // Cancellare la propria partita, o qualunque se sei il padrone di
  // casa. La stessa regola vale sul server: qui si decide solo se
  // mostrare il bottone.
  const puoiCancellare =
    utente && (utente.proprietario || utente.id === partita.giocatore.id);

  return (
    <Pagina
      occhiello={`${partita.temaEtichetta} · torneo da ${partita.taglia}`}
      titolo={partita.vincitore.titolo}
      sommario={`Giocata da ${partita.giocatore.nickname} il ${dataIt(partita.giocatoIl)}.`}
      azioni={
        <Link
          to="/kachinuki"
          className="inline-flex items-center gap-2 rounded-card border border-soft bg-glass-2 px-4 py-2.5 text-sm font-semibold text-ink-bright transition-colors hover:bg-glass-3"
        >
          <Icon nome="torneo" dimensione={16} />
          Gioca una partita
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[20rem_1fr]">
        {/* ---- Il vincitore e la sua strada ---- */}
        <div className="space-y-5">
          <div className="flex gap-4 sm:gap-5 lg:block lg:space-y-5">
            <div className="w-28 shrink-0 sm:w-36 lg:w-full">
              <Copertina
                src={partita.vincitore.copertina}
                alt={partita.vincitore.titolo}
                inclina={false}
                priorita
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-brass-500/80">
                Vincitrice
              </p>

              <p className="mt-1 font-display text-lg font-semibold text-ink-bright">
                {partita.vincitore.titolo}
              </p>

              <p className="mt-1 text-xs text-ink-muted">
                {turniPer(partita.taglia)} turni vinti su {partita.taglia - 1} avversarie in
                gara.
              </p>

              {collegabile.has(partita.vincitore.id) && (
                <Link
                  to={`/serie/${partita.vincitore.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-brass-400 hover:text-brass-300"
                >
                  Apri la scheda →
                </Link>
              )}
            </div>
          </div>

          <Sezione titolo="La sua strada">
            <Strada
              sfide={stradaDelVincitore}
              id={partita.vincitore.id}
              taglia={partita.taglia}
              nomeDi={nomeDi}
              collegabile={collegabile}
            />
          </Sezione>

          {puoiCancellare && (
            <Bottone variante="pericolo" onClick={cancella} disabled={cancellando}>
              {cancellando ? "Cancello…" : "Cancella questa partita"}
            </Bottone>
          )}
        </div>

        {/* ---- Tutti gli scontri ---- */}
        <Sezione
          titolo="Tutti gli scontri"
          extra={
            <span className="font-numeric text-xs text-ink-faint">
              {partita.sfide.length} sfide
            </span>
          }
        >
          <Tabellone
            sfide={partita.sfide}
            taglia={partita.taglia}
            nomeDi={nomeDi}
            collegabile={collegabile}
            evidenzia={partita.vincitore.id}
          />

          <Pannello className="p-4">
            <p className="text-xs text-ink-faint">
              Chi ha perso è barrato. Il tabellone si legge dalla finale in giù: i turni
              lunghi restano chiusi finché non li apri.
            </p>
          </Pannello>
        </Sezione>
      </div>
    </Pagina>
  );
}
