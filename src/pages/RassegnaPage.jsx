import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import useRisorsa from "../dati/useRisorsa";
import { useSessione } from "../dati/sessione";
import { euro, numeroIt } from "../dati/serie";
import { dopoIlRipiego, getRassegna, urlCopertina } from "../services/api";

/**
 * L'ANNO IN RASSEGNA (14/11/2026), alla Spotify.
 *
 * Una storia a schermo intero: si tocca a destra per andare avanti, a
 * sinistra per tornare, le barre in cima dicono dove si è. Una per
 * persona (`?u=<id>`, senza vale chi guarda), un anno per volta
 * (`?anno=2026`). I numeri li fa il server (`routes/rassegna.js`).
 *
 * Le schede sono SENZA FINZIONI: una scheda senza dati (nessun manga
 * letto, nessun voto) non c'è, invece di mostrare uno zero. E gli
 * acquisti, che sono della casa e non di una persona, lo dicono.
 * Il sito è nato nel 2026: se i dati dell'anno cominciano dopo l'inizio
 * dell'anno, la prima scheda lo scrive.
 */

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_BREVI = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];

const giornoEsteso = (aaaaMmGg) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${aaaaMmGg}T00:00:00Z`));

const SFONDI = [
  "from-viola/50 via-void to-void",
  "from-brass-400/40 via-void to-void",
  "from-ciano/35 via-void to-void",
  "from-ember/35 via-void to-void"
];

export default function RassegnaPage() {
  const [parametri] = useSearchParams();
  const { utente, lettori } = useSessione();

  const chi = parametri.get("u") || String(utente?.id || lettori.find((l) => l.proprietario)?.id || "");
  const anno = parametri.get("anno") || String(new Date().getFullYear());

  // Chiave sull'indirizzo: cambiando persona o anno la pagina riparte da zero.
  return <Storia key={`${chi}:${anno}`} chi={chi} anno={anno} />;
}

function Storia({ chi, anno }) {
  const navigate = useNavigate();
  const [, setParametri] = useSearchParams();
  const { lettori } = useSessione();
  const { dati, errore, inCorso } = useRisorsa(() => getRassegna(anno, chi), { chiave: `rassegna:${anno}:${chi}` });

  const { utente } = useSessione();
  const mio = String(utente?.id ?? "") === String(chi);
  const schede = useMemo(() => (dati ? costruisciSchede(dati, mio) : []), [dati, mio]);
  const [i, setI] = useState(0);

  const vai = useCallback((di) => setI((x) => Math.min(Math.max(x + di, 0), Math.max(schede.length - 1, 0))), [schede.length]);

  useEffect(() => {
    function tasto(e) {
      if (e.key === "ArrowRight") vai(1);
      else if (e.key === "ArrowLeft") vai(-1);
      else if (e.key === "Escape") navigate("/");
    }

    window.addEventListener("keydown", tasto);

    return () => window.removeEventListener("keydown", tasto);
  }, [vai, navigate]);

  const altri = lettori.filter((l) => String(l.id) !== String(chi) && l.biblioteca !== false);
  const scheda = schede[i];

  return (
    <div className={`fixed inset-0 z-modal flex flex-col bg-gradient-to-b ${SFONDI[i % SFONDI.length]} bg-void text-ink-bright`}>
      <div className="flex gap-1 px-4 pt-[max(1rem,env(safe-area-inset-top))]" aria-hidden="true">
        {schede.map((_, n) => (
          <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-ink-bright" : "bg-ink-bright/25"}`} />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brass-300">Anno in rassegna {anno}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Chiudi"
          className="grid h-10 w-10 place-items-center rounded-full bg-glass-2 text-ink-bright"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center px-6 pb-24 pt-4" aria-live="polite">
        {errore && <p className="text-sm text-ember">La rassegna non è arrivata. Riprova fra un attimo.</p>}
        {inCorso && !dati && <p className="text-sm text-ink-muted">Faccio i conti…</p>}
        {scheda && (
          <div key={i} className="mx-auto w-full max-w-md">
            {scheda.corpo({ altri, scegli: (id) => setParametri({ u: String(id), anno }) })}
          </div>
        )}

        {/* Il tocco: due metà invisibili, sinistra indietro e destra avanti. I bottoni dentro la scheda stanno sopra. */}
        {schede.length > 1 && (
          <>
            <button type="button" aria-label="Scheda precedente" onClick={() => vai(-1)} disabled={i === 0} className="absolute inset-y-0 left-0 w-1/3 disabled:cursor-default" />
            <button type="button" aria-label="Scheda successiva" onClick={() => vai(1)} disabled={i === schede.length - 1} className="absolute inset-y-0 right-0 w-2/3 disabled:cursor-default" />
          </>
        )}
      </div>
    </div>
  );
}

/** Le schede della storia: solo quelle che hanno qualcosa da dire. */
function costruisciSchede(d, mio) {
  const nome = d.utente?.nickname || "";
  // «Hai letto» per chi guarda la propria, «Sara ha letto» per quella di un'altra persona.
  const tu = (tuo, suo) => (mio ? tuo : suo.replace("{nome}", nome));
  const { manga, anime, casa } = d;
  const schede = [];

  schede.push({
    corpo: ({ altri, scegli }) => (
      <div>
        <p className="text-sm text-ink-muted">{mio ? `Ciao ${nome}, ecco` : `Ecco l'anno di ${nome}:`}</p>
        <h1 className="mt-1 font-display text-6xl font-extrabold leading-none">{mio ? "il tuo" : "il suo"} {d.anno}</h1>
        <p className="mt-4 text-ink-muted">in manga, anime e acquisti.</p>
        {d.parziale && d.primoGiorno && (
          <p className="mt-6 rounded-card bg-glass-2 p-3 text-sm text-ink">
            Quest&apos;anno i dati partono dal {giornoEsteso(d.primoGiorno)}: MangaVault è nato allora, quindi i numeri sono più piccoli del vero.
          </p>
        )}
        {altri.length > 0 && (
          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            Guarda quella di
            {altri.map((l) => (
              <button key={l.id} type="button" onClick={() => scegli(l.id)} className="relative z-raised rounded-full bg-glass-2 px-3 py-1.5 font-semibold text-ink-bright">
                {l.nickname}
              </button>
            ))}
          </p>
        )}
      </div>
    )
  });

  if (manga.volumiLetti > 0) {
    schede.push({
      corpo: () => (
        <Grande
          etichetta={tu("Hai letto", "{nome} ha letto")}
          numero={manga.volumiLetti}
          unita={manga.volumiLetti === 1 ? "volume" : "volumi"}
          riga={`di ${manga.serieLette} ${manga.serieLette === 1 ? "serie" : "serie diverse"}`}
        />
      )
    });

    schede.push({
      corpo: () => (
        <Classifica titolo={tu("Le serie che hai letto di più", "Le serie che {nome} ha letto di più")} righe={manga.topSerie.map((s) => ({ ...s, valore: `${s.volumi} ${s.volumi === 1 ? "vol." : "vol."}` }))} />
      )
    });
  }

  if (anime.puntate > 0) {
    schede.push({
      corpo: () => (
        <Grande
          etichetta={tu("Hai guardato", "{nome} ha guardato")}
          numero={anime.puntate}
          unita={anime.puntate === 1 ? "puntata" : "puntate"}
          riga={`${String(anime.ore).replace(".", ",")} ore, ${anime.serieViste} ${anime.serieViste === 1 ? "serie" : "serie"}${anime.serieFinite ? `, ${anime.serieFinite} ${anime.serieFinite === 1 ? "finita" : "finite"}` : ""}`}
        />
      )
    });

    schede.push({
      corpo: () => (
        <div>
          <Classifica titolo={tu("Gli anime che hai guardato di più", "Gli anime che {nome} ha guardato di più")} righe={anime.topSerie.map((s) => ({ ...s, valore: `${s.puntate} p.` }))} />
          {anime.generi.length > 0 && (
            <p className="mt-6 text-sm text-ink-muted">
              {mio ? "I tuoi generi:" : "I suoi generi:"} <span className="font-semibold text-ink-bright">{anime.generi.map((g) => g.genere).join(", ")}</span>
            </p>
          )}
        </div>
      )
    });
  }

  if (manga.volumiLetti > 0 || anime.puntate > 0) {
    schede.push({
      corpo: () => <Mesi manga={manga} anime={anime} fila={d.giorniDiFila} attivi={d.giorniAttivi} mio={mio} nome={nome} />
    });
  }

  const voti = [
    ...manga.votiAlti.map((v) => ({ ...v, tipo: "manga" })),
    ...anime.votiAlti.map((v) => ({ ...v, tipo: "anime" }))
  ]
    .sort((a, b) => b.voto - a.voto)
    .slice(0, 3);

  if (voti.length) {
    schede.push({
      corpo: () => <Classifica titolo={tu("I voti più alti che hai dato", "I voti più alti di {nome}")} righe={voti.map((v) => ({ ...v, valore: `${String(v.voto).replace(".", ",")} ★` }))} />
    });
  }

  if (casa.volumi > 0) {
    schede.push({
      corpo: () => (
        <div>
          <Grande
            etichetta="In casa sono entrati"
            numero={casa.volumi}
            unita={casa.volumi === 1 ? "volume" : "volumi"}
            riga={`per ${euro(casa.spesa)}, ${casa.serie} ${casa.serie === 1 ? "serie" : "serie"}`}
          />
          {casa.topSerie[0] && (
            <p className="mt-5 text-sm text-ink-muted">
              La più comprata: <span className="font-semibold text-ink-bright">{casa.topSerie[0].titolo}</span> ({casa.topSerie[0].volumi})
            </p>
          )}
          <p className="mt-2 text-xs text-ink-muted">Gli acquisti sono di casa, non di una persona: li vedete uguali tutti e due.</p>
        </div>
      )
    });
  }

  if (schede.length === 1) {
    schede.push({
      corpo: () => <p className="text-lg text-ink">Nel {d.anno} non ci sono ancora letture, puntate o acquisti segnati per {nome}.</p>
    });
  }

  schede.push({
    corpo: ({ altri, scegli }) => (
      <div>
        <h2 className="font-display text-4xl font-extrabold leading-tight">{mio ? "Il tuo" : "Il suo"} {d.anno}, in breve</h2>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-center">
          <Cifra n={manga.volumiLetti} t="volumi letti" />
          <Cifra n={anime.puntate} t="puntate viste" />
          <Cifra n={d.giorniDiFila} t="giorni di fila" />
          <Cifra n={casa.volumi} t="volumi in casa" />
        </dl>
        {altri.length > 0 && (
          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            Ora guarda quella di
            {altri.map((l) => (
              <button key={l.id} type="button" onClick={() => scegli(l.id)} className="relative z-raised rounded-full bg-glass-2 px-3 py-1.5 font-semibold text-ink-bright">
                {l.nickname}
              </button>
            ))}
          </p>
        )}
      </div>
    )
  });

  return schede;
}

function Grande({ etichetta, numero, unita, riga }) {
  return (
    <div>
      <p className="text-lg text-ink-muted">{etichetta}</p>
      <p className="mt-2 font-display text-[7rem] font-extrabold leading-[0.85]">{numeroIt(numero)}</p>
      <p className="font-display text-3xl font-bold">{unita}</p>
      {riga && <p className="mt-4 text-lg text-ink">{riga}</p>}
    </div>
  );
}

function Cifra({ n, t }) {
  return (
    <div className="rounded-panel bg-glass-2 p-4">
      <dd className="font-display text-3xl font-extrabold">{numeroIt(n)}</dd>
      <dt className="mt-1 text-xs text-ink-muted">{t}</dt>
    </div>
  );
}

function Copertina({ src, grande = false }) {
  const [rotta, setRotta] = useState(false);
  const indirizzo = urlCopertina(src, 256);
  const misura = grande ? "h-40 w-28" : "h-16 w-11";

  return indirizzo && !rotta ? (
    <img src={indirizzo} alt="" onError={dopoIlRipiego(() => setRotta(true))} className={`${misura} shrink-0 rounded-card object-cover shadow-raised`} />
  ) : (
    <span aria-hidden="true" className={`${misura} shrink-0 rounded-card bg-glass-2`} />
  );
}

function Classifica({ titolo, righe }) {
  const [primo, ...altri] = righe;

  return (
    <div>
      <h2 className="font-display text-3xl font-extrabold leading-tight">{titolo}</h2>
      {primo && (
        <div className="mt-6 flex items-center gap-4">
          <Copertina src={primo.copertina} grande />
          <div className="min-w-0">
            <p className="text-sm text-brass-300">N. 1</p>
            <p className="font-display text-2xl font-bold leading-tight">{primo.titolo}</p>
            <p className="mt-1 text-ink-muted">{primo.valore}</p>
          </div>
        </div>
      )}
      <ol start={2} className="mt-5 space-y-3">
        {altri.map((r, n) => (
          <li key={`${r.id}-${n}`} className="flex items-center gap-3">
            <span className="w-5 text-center font-display font-bold text-ink-muted">{n + 2}</span>
            <Copertina src={r.copertina} />
            <span className="min-w-0 flex-1 truncate font-semibold">{r.titolo}</span>
            <span className="text-sm text-ink-muted">{r.valore}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Il mese più intenso, due serie di barre (manga e anime) e i giorni di fila. */
function Mesi({ manga, anime, fila, attivi, mio, nome }) {
  const tot = manga.perMese.map((n, m) => n + anime.perMese[m]);
  const massimo = Math.max(1, ...tot);
  const top = tot.indexOf(Math.max(...tot));

  return (
    <div>
      <p className="text-lg text-ink-muted">{mio ? "Il tuo mese più intenso è stato" : `Il mese più intenso di ${nome} è stato`}</p>
      <h2 className="font-display text-5xl font-extrabold capitalize leading-none">{MESI[top]}</h2>
      <div className="mt-8 flex h-[7.5rem] items-end gap-1.5" role="img" aria-label="Letture e puntate mese per mese">
        {tot.map((n, m) => (
          <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className={`w-full rounded-t ${m === top ? "bg-brass-400" : "bg-ink-bright/40"}`} style={{ height: `${n ? Math.max(Math.round((n / massimo) * 100), 4) : 0}px` }} />
            <span className="text-[10px] text-ink-muted">{MESI_BREVI[m]}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-ink">
        <span className="font-numeric font-semibold">{attivi}</span> giorni con almeno una lettura o una puntata, la serie più lunga di fila: <span className="font-numeric font-semibold">{fila}</span>.
      </p>
      {manga.giornoTop && manga.giornoTop.n > 1 && (
        <p className="mt-2 text-sm text-ink-muted">{mio ? "Il giorno in cui hai letto di più:" : "Il giorno in cui ha letto di più:"} {giornoEsteso(manga.giornoTop.giorno)} ({manga.giornoTop.n} volumi).</p>
      )}
      {anime.giornoTop && anime.giornoTop.n > 1 && (
        <p className="mt-1 text-sm text-ink-muted">{mio ? "Il giorno in cui hai guardato di più:" : "Il giorno in cui ha guardato di più:"} {giornoEsteso(anime.giornoTop.giorno)} ({anime.giornoTop.n} puntate).</p>
      )}
    </div>
  );
}
