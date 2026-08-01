import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "./Shell";
import RouteFallback from "./RouteFallback";
import { CollezioneProvider } from "../dati/CollezioneContext";
import { AccessoProvider } from "../dati/AccessoProvider";
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
  const location = useLocation();

  return (
    // La collezione sta sopra le rotte, non dentro una pagina: così
    // le 188 schede si scaricano una volta per visita invece che a
    // ogni passaggio fra Scaffale, Collezione e Numeri.
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
            <Suspense fallback={<RouteFallback />}>
              {/* La location come key fa ripartire l'animazione di entrata
                  a ogni cambio pagina, dando continuità spaziale. */}
              <Routes location={location} key={location.pathname}>
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
          </Shell>
        </BibliotecarioProvider>
      </AccessoProvider>
    </CollezioneProvider>
  );
}
