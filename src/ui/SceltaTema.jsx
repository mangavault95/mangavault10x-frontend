import { useState } from "react";
import { useSessione } from "../dati/sessione";
import { accentoDi, kanaDi, scegliAccento, scegliKana, scegliTema, temaDi } from "../dati/tema";

/**
 * L'aspetto: le impostazioni di come si vede il sito.
 *
 * Sta in due posti — il foglio «Tu» del telefono e il menu del proprio
 * nome su schermo largo — e quindi è un componente solo: due copie degli
 * stessi interruttori finirebbero per dire cose diverse.
 *
 * Tre scelte, ricordate per persona (vedi `dati/tema.js`): la modalità,
 * la palette e i kanji. Ogni scelta si vede subito, senza un «Salva».
 */
const MODALITA = [
  { id: "notte", etichetta: "Notte", kana: "夜", segno: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
  {
    id: "giorno",
    etichetta: "Giorno",
    kana: "昼",
    segno: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
  }
];

// Il colore del campione è scritto qui e non preso dal tema: deve
// mostrare la palette anche quando quella accesa è un'altra.
const PALETTE = [
  { id: "sakura", nome: "Sakura", kana: "桜", colore: "#ff4fa3", detto: "Il rosa dei ciliegi al neon" },
  { id: "lanterna", nome: "Lanterna", kana: "提灯", colore: "#ffb547", detto: "L'ambra delle lanterne di carta" },
  { id: "viola", nome: "Glicine", kana: "藤", colore: "#a07cff", detto: "Il viola dei glicini di sera" }
];

function Titoletto({ children }) {
  return <p className="mb-1.5 px-1 font-numeric text-[0.62rem] uppercase tracking-[0.16em] text-ink-muted">{children}</p>;
}

export default function SceltaTema({ className = "" }) {
  const { utente } = useSessione();
  const [tema, setTema] = useState(() => temaDi(utente));
  const [accento, setAccento] = useState(() => accentoDi(utente));
  const [kana, setKana] = useState(() => kanaDi(utente));

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <Titoletto>Modalità</Titoletto>
        <div role="group" aria-label="Modalità" className="grid grid-cols-2 gap-1 rounded-card bg-shelf p-1">
          {MODALITA.map((v) => {
            const acceso = tema === v.id;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  scegliTema(utente, v.id);
                  setTema(v.id);
                }}
                aria-pressed={acceso}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                  ${acceso ? "insegna" : "text-ink-muted hover:text-ink-bright"}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={v.segno} />
                </svg>
                {v.etichetta}
                <span aria-hidden="true" className="kana font-pixel text-[0.7rem] font-normal opacity-70">{v.kana}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Titoletto>Palette</Titoletto>
        <div role="group" aria-label="Palette" className="grid grid-cols-3 gap-1.5">
          {PALETTE.map((p) => {
            const acceso = accento === p.id;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  scegliAccento(utente, p.id);
                  setAccento(p.id);
                }}
                aria-pressed={acceso}
                title={p.detto}
                className={`flex flex-col items-center gap-1.5 rounded-card border px-1 py-2.5 text-xs font-semibold transition-colors duration-quick
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400
                  ${acceso ? "border-ink-bright/40 bg-glass-2 text-ink-bright" : "border-hairline text-ink-muted hover:text-ink-bright"}`}
              >
                <span
                  aria-hidden="true"
                  className="h-6 w-6 rounded-full"
                  style={{ background: p.colore, boxShadow: acceso ? `0 0 14px ${p.colore}` : "none" }}
                />
                <span>
                  {p.nome}
                  <span aria-hidden="true" className="kana ml-1 font-pixel text-[0.65rem] font-normal opacity-70">{p.kana}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card bg-shelf px-3 py-2.5">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink-bright">Kanji</span>
          <span className="block text-xs text-ink-muted">Le scritte giapponesi accanto alle voci</span>
        </span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={kana}
          onChange={(e) => {
            scegliKana(utente, e.target.checked);
            setKana(e.target.checked);
          }}
        />
        <span
          aria-hidden="true"
          className="relative h-6 w-11 shrink-0 rounded-full bg-[rgb(var(--c-riga))] transition-colors duration-quick
            after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-ink-bright after:transition-transform after:duration-quick
            peer-checked:bg-brass-400 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brass-400"
        />
      </label>
    </div>
  );
}
