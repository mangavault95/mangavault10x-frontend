import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../../app/Icon";
import { vaiAlConfronto } from "../../dati/cineforum";
import { salvaFaccia, salvaStriscione, togliFaccia } from "../../services/api";
import Sovrapposizione from "../Sovrapposizione";
import useChiusuraVelo from "../useChiusuraVelo";
import SceltaImmagine, { TastoModifica } from "./SceltaImmagine";
import Striscione from "./Striscione";
import Tondino from "./Tondino";

/**
 * La testata di una pagina personale.
 *
 * ---------------------------------------------------------------
 * COS'È CAMBIATO, E PERCHÉ
 *
 * Prima era una fascia bianca alta duecento pixel con dentro un
 * esagono, e sotto — su altre due righe — il nome e i numeri. Era
 * soprattutto vuota: tanta carta per dire un nome.
 *
 * Adesso è UNA cosa sola: lo striscione, con il nome e la faccia
 * scritti sopra. L'altezza totale è quella della fascia e basta, cioè
 * meno di prima, e non c'è più niente di bianco — chi non ha ancora
 * messo un'immagine vede il proprio colore, chi ne ha messe più d'una
 * le vede alternarsi.
 *
 * ---------------------------------------------------------------
 * IL TASTINO DEI COLLEGAMENTI
 *
 * Sta fuori dallo striscione, sotto a destra, e tiene le quattro cose
 * che non stanno nella pagina — preferiti, classifica, commenti,
 * confronto. Non è una barra di navigazione: sono modi diversi di
 * guardare la stessa persona, e stanno bene sotto un gesto solo.
 */

export default function TestaProfilo({
  persona,
  sommario,
  altrePersone = [],
  mia = false,
  alCambio
}) {
  const [menu, setMenu] = useState(false);
  const [cambiando, setCambiando] = useState(null);
  const [striscione, setStriscione] = useState(null);

  // Le immagini si mostrano da subito dopo il salvataggio, senza
  // aspettare che la pagina si ricarichi: cambiare foto e non vederla
  // cambiare è il modo più sicuro di farlo tre volte.
  const [faccia, setFaccia] = useState(null);

  const immagini = striscione ?? persona.striscione ?? [];
  const quandoFaccia = faccia === null ? persona.faccia : faccia;

  const base = `/videoteca/chi/${encodeURIComponent(persona.nickname)}`;

  async function scegliFaccia(dataUri) {
    setCambiando(null);

    const esito = await salvaFaccia(dataUri);

    setFaccia(esito.faccia);
    alCambio?.();
  }

  async function scegliImmagine(dataUri) {
    setCambiando(null);

    // Le immagini già lì si mandano come numeri: il server le tiene
    // dove sono invece di riceverle indietro e riscriverle.
    const esito = await salvaStriscione([...immagini, dataUri]);

    setStriscione(esito.striscione);
    alCambio?.();
  }

  async function togliImmagine(id) {
    const esito = await salvaStriscione(immagini.filter((x) => x !== id));

    setStriscione(esito.striscione);
    alCambio?.();
  }

  return (
    <>
      <header className="-mx-3 overflow-hidden border-y border-quaderno-riga sm:mx-0 sm:rounded-card sm:border">
        <Striscione immagini={immagini} colore={persona.colore}>
          {/* Sopra l'immagine: la faccia e il nome. In basso a
              sinistra, dove finisce lo sguardo dopo aver guardato la
              foto — e dove la velatura è più densa, quindi il bianco
              si legge. */}
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-3 sm:gap-4 sm:p-5">
            <div className="relative shrink-0">
              <Tondino
                utente={{ ...persona, faccia: quandoFaccia }}
                dimensione={72}
                anello
              />

              {mia && (
                <TastoModifica
                  etichetta="Cambia la foto"
                  onClick={() => setCambiando("faccia")}
                  className="absolute -bottom-1 -right-1"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">
                {persona.nickname}
              </h1>

              {sommario && (
                <p className="truncate text-sm text-white/80 drop-shadow">{sommario}</p>
              )}
            </div>
          </div>

          {mia && (
            <div className="absolute right-2 top-2 flex gap-1.5">
              <TastoModifica
                etichetta="Aggiungi un'immagine allo striscione"
                onClick={() => setCambiando("striscione")}
              />

              {immagini.length > 0 && (
                <button
                  type="button"
                  // Toglie l'ULTIMA e non apre un elenco: le immagini
                  // sono al massimo sei e si sostituiscono più spesso
                  // di quanto si riordinino. Un pannello di gestione
                  // per sei fotografie sarebbe più lavoro da usare che
                  // da rifare.
                  onClick={() => togliImmagine(immagini[immagini.length - 1])}
                  aria-label="Togli l'ultima immagine dello striscione"
                  title="Togli l'ultima immagine"
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-quick hover:bg-black/65
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Icon nome="cestino" dimensione={15} />
                </button>
              )}
            </div>
          )}
        </Striscione>
      </header>

      {/* Il tastino sporge sotto la fascia, allineato a destra: sta
          dove sta il pollice di chi tiene il telefono con una mano. */}
      <div className="-mt-4 mb-1 flex justify-end pr-1">
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-haspopup="dialog"
          aria-label={`Altro su ${persona.nickname}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-quaderno-riga bg-quaderno-foglio text-quaderno-tenue shadow-sm transition-colors duration-quick hover:text-quaderno-inchiostro
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-quaderno-blu"
        >
          <Icon nome="menu" dimensione={18} />
        </button>
      </div>

      {menu && (
        <MenuProfilo
          base={base}
          persona={persona}
          altrePersone={altrePersone}
          mia={mia}
          haFaccia={Boolean(quandoFaccia)}
          togliLaFaccia={async () => {
            await togliFaccia();
            setFaccia(false);
            alCambio?.();
          }}
          chiudi={() => setMenu(false)}
        />
      )}

      {cambiando && (
        <SceltaImmagine
          misura={cambiando === "faccia" ? "faccia" : "striscione"}
          titolo={cambiando === "faccia" ? "La tua foto" : "Un'immagine per lo striscione"}
          chiudi={() => setCambiando(null)}
          alScelto={cambiando === "faccia" ? scegliFaccia : scegliImmagine}
        />
      )}
    </>
  );
}

/**
 * Il foglio dei collegamenti.
 *
 * Passa da `Sovrapposizione` e non è un semplice `fixed inset-0`: in
 * questo sito `<main>` porta un'animazione con dentro un `transform`,
 * e un antenato trasformato fa smettere ai discendenti `fixed` di
 * ancorarsi allo schermo — il foglio comparirebbe a metà della pagina
 * invece che in fondo, lontano dal bottone appena premuto.
 *
 * Tre voci portano da qualche parte e una — il confronto — ha bisogno
 * di sapere CON CHI, quindi apre un secondo passo invece di
 * indovinare. Se al mondo c'è una persona sola oltre a questa, il
 * secondo passo si salta: chiedere di scegliere fra un'opzione è una
 * domanda inutile.
 */
function MenuProfilo({ base, persona, altrePersone, mia, haFaccia, togliLaFaccia, chiudi }) {
  const navigate = useNavigate();
  const velo = useChiusuraVelo(chiudi);
  const [scegliendo, setScegliendo] = useState(false);

  const candidati = altrePersone.filter((p) => p.id !== persona.id);

  function versoIlConfronto() {
    if (candidati.length === 1) {
      chiudi();
      navigate(vaiAlConfronto(persona.nickname, candidati[0].nickname));
      return;
    }

    setScegliendo(true);
  }

  const voci = [
    {
      id: "preferiti",
      etichetta: "Preferiti",
      spiega: "Le serie messe in vetrina",
      icona: "star",
      to: `${base}/tutto?filtro=preferiti`
    },
    {
      id: "classifica",
      etichetta: "Classifica",
      spiega: "Tutte, dal voto più alto",
      icona: "chart",
      to: `${base}/tutto?ordina=voto`
    },
    {
      id: "commenti",
      etichetta: "Commenti",
      spiega: "Cosa ha scritto, sulle serie e sulle puntate",
      icona: "cineforum",
      to: `${base}/commenti`
    },
    {
      id: "confronto",
      etichetta: "Confronto",
      spiega: "I numeri accanto a quelli di un altro, e cosa avete visto in due",
      icona: "confronto",
      onClick: versoIlConfronto
    }
  ];

  // Togliere la propria foto sta qui e non accanto alla matita: è una
  // cosa che si fa una volta ogni tanto, e un secondo tastino sopra
  // l'immagine avrebbe pesato su ogni apertura della pagina.
  if (mia && haFaccia) {
    voci.push({
      id: "togli-faccia",
      etichetta: "Togli la foto",
      spiega: "Si torna all'iniziale sul tuo colore",
      icona: "cestino",
      onClick: async () => {
        chiudi();
        await togliLaFaccia();
      }
    });
  }

  return (
    <Sovrapposizione>
      <div
        {...velo}
        role="dialog"
        aria-label={`Altro su ${persona.nickname}`}
        className="fixed inset-0 z-modal flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      >
        <div className="w-full rounded-t-sheet border-t border-quaderno-riga bg-quaderno-foglio p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-float sm:max-w-sm sm:rounded-panel sm:border">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-quaderno-riga sm:hidden" />

          {scegliendo ? (
            <>
              <p className="px-3 pb-2 text-sm font-semibold text-quaderno-inchiostro">
                Confronta {persona.nickname} con…
              </p>

              <ul>
                {candidati.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={vaiAlConfronto(persona.nickname, p.nickname)}
                      onClick={chiudi}
                      className="flex items-center gap-3 rounded-card px-3 py-3 hover:bg-quaderno-carta"
                    >
                      <Tondino utente={p} dimensione={30} />

                      <span className="text-sm font-medium text-quaderno-inchiostro">
                        {p.nickname}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {candidati.length === 0 && (
                <p className="px-3 pb-3 text-sm text-quaderno-tenue">
                  Per adesso non c'è nessun altro con cui confrontarsi.
                </p>
              )}
            </>
          ) : (
            <ul>
              {voci.map((v) => {
                const dentro = (
                  <>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-quaderno-carta text-quaderno-blu">
                      <Icon nome={v.icona} dimensione={18} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-quaderno-inchiostro">
                        {v.etichetta}
                      </span>
                      <span className="block text-xs text-quaderno-tenue">{v.spiega}</span>
                    </span>

                    <Icon nome="avanti" dimensione={16} className="shrink-0 text-quaderno-tenue" />
                  </>
                );

                const stile =
                  "flex w-full items-center gap-3 rounded-card px-3 py-3 text-left transition-colors duration-quick hover:bg-quaderno-carta";

                return (
                  <li key={v.id}>
                    {v.to ? (
                      <Link to={v.to} onClick={chiudi} className={stile}>
                        {dentro}
                      </Link>
                    ) : (
                      <button type="button" onClick={v.onClick} className={stile}>
                        {dentro}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Sovrapposizione>
  );
}
