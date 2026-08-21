import { Pillola, Progresso, Scheda } from "./Foglio";
import { NOMI_STATO, NOMI_TIPO, formattaVoto } from "./formati";
import { etichettaStagione } from "../../dati/videoteca";
import ListaEpisodi from "./ListaEpisodi";
import Stelle from "./Stelle";

/**
 * Una stagione dentro la scheda di una serie.
 *
 * Nasce da un problema concreto: AnimeClick tiene Frieren in una scheda
 * sola (38 puntate su due stagioni) e Isekai Farming in due, e in
 * videoteca la seconda diventava due pannelli della stessa serie. Ora
 * le stagioni stanno tutte nella stessa scheda, una sotto l'altra, e
 * questo è il pezzo che ne disegna una.
 *
 * Ogni stagione tiene il SUO stato e il SUO voto, e non è pignoleria:
 * sono righe diverse nel database perché sono opere diverse per
 * AnimeClick, e capita davvero di aver finito la prima, mollato la
 * seconda e non aver ancora cominciato il film.
 *
 * Si apre una alla volta. Con tre stagioni da ventiquattro puntate,
 * settantadue caselle aperte insieme sono un muro: si apre quella su
 * cui si è, le altre si chiedono con un tocco.
 */
export default function Stagione({
  stagione,
  indice,
  sola = false,
  aperta,
  apri,
  puoiScrivere,
  azione,
  alCambio,
  alVoto,
  alStato
}) {
  const episodi = stagione.episodi || [];
  const spuntati = new Set(episodi.filter((e) => e.visto).map((e) => e.numero));

  // I comandi stanno solo sul primo blocco di ogni scheda: lo stato
  // della visione e il voto appartengono alla RIGA, non al pezzo di
  // elenco — Frieren è una scheda sola con dentro due stagioni, e due
  // file di stelle che cambiano insieme sarebbero una promessa falsa.
  const comandi = puoiScrivere && stagione.comandi !== false;

  const disponibili = episodi.filter((e) => e.numero > 0).length;
  const su = disponibili || Number(stagione.episodi_totali) || null;

  const nome = etichettaStagione(stagione, indice);
  const altrui = (stagione.voti || []).filter((v) => Number(v.voto) > 0);

  return (
    <Scheda className="overflow-hidden">
      {/* L'intestazione è tutta cliccabile ma non è un bottone solo:
          dentro ci stanno le stelle e gli stati, che sono comandi loro.
          Il bottone copre il titolo e i numeri, il resto sta accanto. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <button
          type="button"
          onClick={apri}
          aria-expanded={aperta}
          // Il nome scritto a parte: dentro il bottone ci sono un titolo,
          // una barra e delle percentuali, e messi in fila fanno
          // un'etichetta che nessuno vorrebbe sentirsi leggere.
          aria-label={sola ? "Gli episodi" : `${nome}: ${stagione.sottotitolo || stagione.titolo}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          <span
            aria-hidden="true"
            className={`shrink-0 text-quaderno-tenue transition-transform duration-quick ${aperta ? "rotate-90" : ""}`}
          >
            ›
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              {!sola && (
                <span className="text-sm font-semibold text-quaderno-inchiostro">{nome}</span>
              )}

              <span
                className={
                  sola
                    ? "text-sm font-semibold text-quaderno-inchiostro"
                    : "min-w-0 truncate text-xs text-quaderno-tenue"
                }
              >
                {sola ? "Episodi" : stagione.sottotitolo || stagione.titolo}
              </span>

              {stagione.tipo && stagione.tipo !== "serie_tv" && (
                <Pillola tono="contorno">{NOMI_TIPO[stagione.tipo] || stagione.tipo}</Pillola>
              )}
            </span>

            <span className="mt-1 block max-w-xs">
              <Progresso visti={spuntati.size} su={su} />
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {comandi ? (
            <Stelle
              voto={stagione.voto}
              alVoto={alVoto}
              disabilitato={azione === `voto-${stagione.id}`}
            />
          ) : (
            !puoiScrivere &&
            stagione.voto_medio && (
              <span className="font-numeric text-sm text-quaderno-blu">
                ★ {formattaVoto(stagione.voto_medio)}
              </span>
            )
          )}

          {stagione.comandi !== false && altrui.length > 1 && (
            <span className="font-numeric text-xs text-quaderno-tenue">
              {altrui.map((v) => `${v.nickname} ★${formattaVoto(v.voto)}`).join(" · ")}
            </span>
          )}
        </div>
      </div>

      {comandi && (
        <div className="flex flex-wrap gap-1.5 border-t border-quaderno-riga px-3 py-2">
          {Object.entries(NOMI_STATO).map(([chiave, etichetta]) => {
            const acceso = stagione.stato_visione === chiave;

            return (
              <button
                key={chiave}
                type="button"
                onClick={() => alStato(chiave)}
                disabled={azione === `stato-${stagione.id}`}
                aria-pressed={acceso}
                className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu
                  ${
                    acceso
                      ? "bg-quaderno-blu text-white"
                      : "border border-quaderno-riga text-quaderno-tenue hover:text-quaderno-inchiostro"
                  }`}
              >
                {etichetta}
              </button>
            );
          })}
        </div>
      )}

      {aperta && (
        <div className="border-t border-quaderno-riga px-4 py-1">
          <ListaEpisodi
            animeId={stagione.id}
            episodi={episodi}
            spuntati={spuntati}
            puoiScrivere={puoiScrivere}
            alCambio={alCambio}
          />
        </div>
      )}
    </Scheda>
  );
}
