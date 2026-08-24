import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "./Shell";
import RouteFallback from "./RouteFallback";
import RouteErrore from "./RouteErrore";
import { CollezioneProvider } from "../dati/CollezioneContext";
import { AccessoProvider } from "../dati/AccessoProvider";
import { SessioneProvider } from "../dati/SessioneProvider";
import { useSessione } from "../dati/sessione";
import { BibliotecarioProvider } from "../bibliotecario/BibliotecarioProvider";

// Ogni pagina è un chunk separato: la prima apertura scarica solo
// quello che serve invece dell'intera applicazione. Three.js pesa più
// di tutto il resto del sito messo insieme, e la home lo scarica
// sempre: è la stanza d'ingresso, non un'ala facoltativa.
const Home = lazy(() => import("../pages/HomePage"));
const Collezione = lazy(() => import("../pages/CollezionePage"));
const Serie = lazy(() => import("../pages/SeriePage"));
const Wishlist = lazy(() => import("../pages/WishlistPage"));
const Desiderio = lazy(() => import("../pages/DesiderioPage"));
const Lettura = lazy(() => import("../pages/LetturaPage"));
const Statistiche = lazy(() => import("../pages/StatistichePage"));
const Admin = lazy(() => import("../pages/AdminPage"));
const Kachinuki = lazy(() => import("../pages/KachinukiPage"));
const Partita = lazy(() => import("../pages/PartitaPage"));
const NonTrovata = lazy(() => import("../pages/NonTrovataPage"));

// Le quattro vesti che si raggiungono dalla stanza. Stessi dati delle
// pagine qui sopra, altro racconto: il perché sta in `ui/Approdo.jsx`.
// Ognuna è un chunk suo — chi non passa mai dalla stanza non le scarica,
// e chi ci passa ne scarica una alla volta.
// La videoteca è un mondo a parte anche nel codice scaricato: chi non
// ci entra mai non porta a casa nemmeno un byte delle sue pagine.
const Cineforum = lazy(() => import("../pages/CineforumPage"));
const ProfiloVideoteca = lazy(() => import("../pages/ProfiloVideotecaPage"));
const ElencoVideoteca = lazy(() => import("../pages/ElencoVideotecaPage"));
const NumeriVideoteca = lazy(() => import("../pages/NumeriVideotecaPage"));
const CommentiVideoteca = lazy(() => import("../pages/CommentiVideotecaPage"));
const Confronto = lazy(() => import("../pages/ConfrontoPage"));
const Anime = lazy(() => import("../pages/AnimePage"));
const Calendario = lazy(() => import("../pages/CalendarioPage"));
const GestioneVideoteca = lazy(() => import("../pages/GestioneVideotecaPage"));

const Cassa = lazy(() => import("../pages/CassaPage"));
const Bacheca = lazy(() => import("../pages/BachecaPage"));
const Tavolino = lazy(() => import("../pages/TavolinoPage"));
const Banco = lazy(() => import("../pages/BancoPage"));

/**
 * Ogni schermata ha il suo indirizzo.
 *
 * Prima le sezioni erano finestre sovrapposte comandate da booleani:
 * il tasto Indietro non funzionava, non si poteva salvare un preferito
 * su una pagina, e riaprire il sito riportava sempre all'inizio.
 * Con rotte vere tutto questo funziona senza codice aggiuntivo.
 */
export default function AppRoutes() {
  return (
    // Chi sei sta sopra a tutto, collezione compresa: da quando i
    // lettori sono due, l'identità non decide solo cosa puoi salvare ma
    // quali voti e quali letture stai guardando. La collezione, che di
    // quei voti è piena, deve poterla leggere.
    <SessioneProvider>
      {/* La collezione sta sopra le rotte, non dentro una pagina: così
          le 188 schede si scaricano una volta per visita invece che a
          ogni passaggio fra Scaffale, Collezione e Numeri. */}
      <CollezioneProvider>
      {/* L'accesso protetto sta sopra le rotte quanto la collezione:
          un preferito segnato dallo Scaffale e uno dalla Collezione
          devono aprire lo stesso modulo, non uno per pagina. */}
      <AccessoProvider>
        {/* Stesso discorso per il banco: il bottone fluttuante di ogni
            pagina e il bancone dentro la stanza 3D devono aprire lo
            stesso pannello. */}
        <BibliotecarioProvider>
          <Shell>
            <Contenuto />
          </Shell>
          </BibliotecarioProvider>
        </AccessoProvider>
      </CollezioneProvider>
    </SessioneProvider>
  );
}

/**
 * Le pagine.
 *
 * Sta in un componente a parte per una ragione sola: `useSessione` si
 * può chiamare solo sotto il provider, e il provider lo apre il
 * componente qui sopra. Chi sei serve alla chiave delle rotte.
 */
function Contenuto() {
  const location = useLocation();
  const { idVisto } = useSessione();

  // La chiave rimette in piedi il muro a ogni cambio di pagina: una
  // sezione caduta non deve tenersi il posto quando si prova ad andare
  // altrove.
  return (
            <RouteErrore key={location.pathname}>
              <Suspense fallback={<RouteFallback />}>
                {/* La location come key fa ripartire l'animazione di entrata
                    a ogni cambio pagina, dando continuità spaziale.
                    Nella chiave c'è anche CHI GUARDA: entrare o uscire non
                    cambia il filtro di una pagina, cambia di chi sono le
                    letture che ci stanno dentro. Rimontarle è il modo più
                    corto di richiederle, e l'unico che non lascia in giro
                    pezzi della persona precedente. */}
                <Routes location={location} key={`${location.pathname}|${idVisto ?? "ospite"}`}>
                  <Route path="/" element={<Home />} />
                  <Route path="/collezione" element={<Collezione />} />
                  {/* La biblioteca non è più una pagina a sé: è lo scaffale
                      della stanza d'ingresso. Il vecchio indirizzo resta
                      valido, ma porta alla home. */}
                  <Route path="/biblioteca" element={<Navigate to="/" replace />} />
                  <Route path="/serie/:id" element={<Serie />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/desiderio/:id" element={<Desiderio />} />
                  <Route path="/lettura" element={<Lettura />} />
                  <Route path="/statistiche" element={<Statistiche />} />
                  <Route path="/admin" element={<Admin />} />

                  {/* ---- Videoteca ----
                      L'altra metà del sito: gli anime visti, il punto in
                      cui si è arrivati, e quando esce il prossimo
                      episodio in Italia. Ha i suoi colori e la sua barra
                      (vedi `navigation.js`), ma è lo stesso sito e le
                      stesse persone. */}
                  {/* La porta della videoteca è il Cineforum, non più
                      la griglia delle proprie copertine: si entra in
                      una piazza, e la propria pagina è una delle
                      pagine. */}
                  <Route path="/videoteca" element={<Cineforum />} />

                  {/* ---- Le pagine delle persone ----
                      `/videoteca/io` è un indirizzo fisso perché la
                      barra si disegna prima che il server abbia detto
                      chi sei; `/videoteca/chi/<soprannome>` è
                      l'indirizzo pubblico di ciascuno, quello che si
                      manda a qualcuno.

                      «Preferiti» e «Classifica» non hanno una rotta
                      loro: sono `/tutto` con un filtro e un ordine
                      nell'indirizzo, perché sono la stessa griglia
                      guardata da un'altra angolazione. */}
                  <Route path="/videoteca/io" element={<ProfiloVideoteca />} />
                  <Route path="/videoteca/io/tutto" element={<ElencoVideoteca />} />
                  <Route path="/videoteca/io/numeri" element={<NumeriVideoteca />} />
                  <Route path="/videoteca/io/commenti" element={<CommentiVideoteca />} />

                  <Route path="/videoteca/chi/:nickname" element={<ProfiloVideoteca />} />
                  <Route path="/videoteca/chi/:nickname/tutto" element={<ElencoVideoteca />} />
                  <Route path="/videoteca/chi/:nickname/numeri" element={<NumeriVideoteca />} />
                  <Route path="/videoteca/chi/:nickname/commenti" element={<CommentiVideoteca />} />

                  {/* Due soprannomi nell'indirizzo e non «io contro
                      lui»: un confronto è la tipica cosa che si manda,
                      e un indirizzo che dipende da chi lo apre
                      mostrerebbe a chi lo riceve un'altra pagina. */}
                  <Route path="/videoteca/confronto/:a/:b" element={<Confronto />} />

                  {/* La Gestione della videoteca sta sotto /videoteca e
                      non accanto a /admin: è la stessa parola, ma
                      corregge un'altra cosa — stagioni e collegamenti,
                      non i volumi di carta. Il segmento fisso vince sul
                      `:id` qui sotto, che è come deve andare. */}
                  <Route path="/videoteca/gestione" element={<GestioneVideoteca />} />
                  <Route path="/videoteca/:id" element={<Anime />} />
                  {/* «In visione» non ha più un indirizzo suo: è una
                      sezione della propria pagina (`/videoteca/io`).
                      Vecchio indirizzo mantenuto funzionante. */}
                  <Route path="/visione" element={<Navigate to="/videoteca/io" replace />} />
                  <Route path="/calendario" element={<Calendario />} />

                  {/* Il gioco e le partite già giocate. Una partita ha
                      un indirizzo suo perché è una cosa che si manda a
                      qualcuno — «guarda chi ha vinto» — e un tabellone
                      raggiungibile solo cliccando in cronologia non si
                      potrebbe mandare. */}
                  <Route path="/kachinuki" element={<Kachinuki />} />
                  <Route path="/kachinuki/:id" element={<Partita />} />

                  {/* Le porte della stanza. Non stanno nella barra
                      laterale apposta: ci si arriva camminandoci, e una
                      voce di menu che porta allo stesso posto toglierebbe
                      la ragione per cui esistono. Restano indirizzi veri —
                      condivisibili, salvabili, aggiornabili — e chi ci
                      arriva senza essere passato dalla stanza trova il
                      collegamento alla veste normale in alto a destra. */}
                  <Route path="/cassa" element={<Cassa />} />
                  <Route path="/bacheca" element={<Bacheca />} />
                  <Route path="/tavolino" element={<Tavolino />} />
                  <Route path="/banco" element={<Banco />} />

                  {/* Vecchi indirizzi mantenuti funzionanti */}
                  <Route path="/records" element={<Navigate to="/statistiche" replace />} />
                  <Route
                    path="/preferiti"
                    element={<Navigate to="/collezione?filtro=preferiti" replace />}
                  />

                  <Route path="*" element={<NonTrovata />} />
                </Routes>
              </Suspense>
            </RouteErrore>
  );
}
