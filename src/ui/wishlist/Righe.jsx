import { useState } from "react";
import { Link } from "react-router-dom";
import Copertina from "../Copertina";
import { Bottone } from "../Controlli";
import Menu from "../Menu";
import { dopoIlRipiego, urlCopertina } from "../../services/api";
import Foglio from "../Foglio";
import { euro, intervalliVolumi, plurale } from "../../dati/serie";

/* ==================================================
   I MUCCHI DELLA SPESA
   ================================================== */

export function Mucchio({ titolo, children }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{titolo}</h2>
      <ul className="divide-y divide-hairline rounded-2xl bg-alcove px-3.5">{children}</ul>
    </section>
  );
}

/**
 * La copertina del volume, e se non arriva quella della serie: le
 * miniature delle edizioni su AnimeClick a volte non esistono ancora
 * per i volumi appena annunciati.
 */
function Miniatura({ src, ripiego = null }) {
  const [tentativo, setTentativo] = useState(0);
  const candidate = [src, ripiego].filter(Boolean);
  const indirizzo = urlCopertina(candidate[tentativo], 128);

  return indirizzo ? (
    <img
      key={indirizzo}
      src={indirizzo}
      alt=""
      loading="lazy"
      onError={dopoIlRipiego(() => setTentativo((t) => t + 1))}
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  ) : (
    <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-md bg-glass-2" />
  );
}

export function RigaSpesa({ a, copertina, ripiego, titolo, sotto, sottoColore = "text-ink-muted", avviso, prezzo, occupato, inAttesa = false, onAnnulla, onPreso }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link to={a} className={`flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-quick ${inAttesa ? "opacity-50" : ""}`}>
        <Miniatura src={copertina} ripiego={ripiego} />

        <div className="min-w-0 flex-1">
          <p className={`line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-bright ${inAttesa ? "line-through" : ""}`}>{titolo}</p>
          {/* Due righe e non una: «l'ultimo uscito, poi sei in p…» e «te ne
              mancano 2 per esse…» perdevano la parte che serve. */}
          <p className={`line-clamp-2 text-xs ${sottoColore}`}>{inAttesa ? "Preso: lo registro tra poco" : sotto}</p>
          {avviso && !inAttesa && <p className="line-clamp-2 text-xs text-ember">{avviso}</p>}
        </div>
      </Link>

      {prezzo ? <span className="shrink-0 font-numeric text-sm font-semibold text-ambra">{euro(prezzo)}</span> : null}

      {onPreso && (
        <button
          type="button"
          onClick={inAttesa ? onAnnulla : onPreso}
          disabled={occupato}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60 ${
            inAttesa ? "bg-brass-400 text-void" : "bg-glass-2 text-ink-bright"
          }`}
        >
          {occupato ? "…" : inAttesa ? "Annulla" : "Preso"}
        </button>
      )}
    </li>
  );
}

/**
 * Una serie, una riga: copertina, titolo e quanti/quali volumi mancano.
 * Il tocco apre il riquadro con i numeri da segnare.
 */
export function CartaMancanti({ serie, numeri, onApri }) {
  const tutti = numeri.length;

  return (
    <li>
      <button type="button" onClick={onApri} className="flex w-full items-center gap-3 py-2.5 text-left">
        <Miniatura src={serie.copertina} />

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-bright">{serie.titolo}</p>
          <p className="text-xs text-ink-muted">
            {tutti === 1 ? "Manca" : "Mancano"} {plurale(tutti, "volume", "volumi")}
            {": "}
            <span className="font-numeric text-ink-bright">{intervalliVolumi(numeri)}</span>
          </p>
        </div>

        {serie.costo ? (
          <span className="shrink-0 font-numeric text-sm font-semibold text-ambra">{euro(serie.costo * tutti)}</span>
        ) : null}
      </button>
    </li>
  );
}

/** Il riquadro con un tondino per numero: toccarlo vuol dire «preso». */
export function PopupVolumi({ serie, numeri, inAttesa, prendendo, soloLettura, onSegna, onAnnulla, onChiudere }) {
  return (
    <Foglio
      titolo={serie.titolo}
      sotto={soloLettura ? "Volumi che mancano" : "Tocca i volumi che hai preso"}
      larghezza="sm:max-w-sm"
      onChiudere={onChiudere}
    >
          <div className="mt-1 flex flex-wrap gap-2">
            {numeri.map((n) => {
              const chiave = `${serie.id}:${n}`;
              const inCoda = inAttesa.has(chiave);

              return (
                <button
                  key={n}
                  type="button"
                  disabled={soloLettura || prendendo === chiave}
                  onClick={() => (inCoda ? onAnnulla(chiave) : onSegna(n))}
                  title={inCoda ? "Annulla" : `Ho preso il ${n}`}
                  className={`grid h-11 min-w-11 place-items-center rounded-xl px-2 font-numeric text-sm font-semibold transition-transform duration-quick active:scale-95 disabled:opacity-60 ${
                    inCoda ? "bg-brass-400 text-void line-through" : "bg-glass-2 text-ink-bright"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-ink-faint">
            Il segno si registra dopo 5 secondi: tocca di nuovo il numero per annullare.
          </p>
    </Foglio>
  );
}

/* ==================================================
   RIGA DI UN DESIDERIO
   ================================================== */

export function RigaDesiderio({ elemento, onModifica, onElimina, onComprato, soloLettura }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link to={`/desiderio/${elemento.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-10 shrink-0">
          <Copertina src={elemento.coverurl} alt={elemento.titolo} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold text-ink-bright">{elemento.titolo}</p>
          <p className="truncate text-xs text-ink-muted">
            {[elemento.volumitotali ? `${elemento.volumitotali} ${Number(elemento.volumitotali) === 1 ? "volume" : "volumi"}` : null, elemento.autori].filter(Boolean).join(" · ")}
          </p>
          {elemento.dovecomprare ? (
            <p className="truncate text-xs text-ink-muted">Dove: {elemento.dovecomprare}</p>
          ) : null}
        </div>
      </Link>

      {!soloLettura && (
        <>
          <Bottone variante="secondario" onClick={onComprato} title="Sposta in collezione" className="shrink-0 !border-jade/40 !px-3 !py-2 !text-jade">
            Comprato
          </Bottone>

          <Menu
            etichetta={`Altro su ${elemento.titolo}`}
            voci={[
              { chiave: "modifica", etichetta: "Modifica", descrizione: "Titolo, volumi, dove comprarla.", onClick: onModifica },
              {
                chiave: "elimina",
                etichetta: "Togli dai desideri",
                conferma: "Sicuro? Tocca di nuovo",
                pericolo: true,
                onClick: onElimina
              }
            ]}
          />
        </>
      )}
    </div>
  );
}
