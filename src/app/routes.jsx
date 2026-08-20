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
