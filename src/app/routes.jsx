import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "./Shell";
import RouteFallback from "./RouteFallback";
import { CollezioneProvider } from "../dati/CollezioneContext";

// Ogni pagina è un chunk separato: la prima apertura scarica solo
// quello che serve invece dell'intera applicazione.
const Home = lazy(() => import("../pages/HomePage"));
const Collezione = lazy(() => import("../pages/CollezionePage"));
// Three.js pesa più di tutto il resto del sito messo insieme: tenerlo
// in un chunk a parte significa che chi non entra in biblioteca non lo
// scarica nemmeno.
const BibliotecaTre = lazy(() => import("../pages/BibliotecaPage"));
const Serie = lazy(() => import("../pages/SeriePage"));
const Wishlist = lazy(() => import("../pages/WishlistPage"));
const Lettura = lazy(() => import("../pages/LetturaPage"));
const Statistiche = lazy(() => import("../pages/StatistichePage"));
const Admin = lazy(() => import("../pages/AdminPage"));
const NonTrovata = lazy(() => import("../pages/NonTrovataPage"));

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
      <Shell>
        <Suspense fallback={<RouteFallback />}>
          {/* La location come key fa ripartire l'animazione di entrata
              a ogni cambio pagina, dando continuità spaziale. */}
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/collezione" element={<Collezione />} />
            <Route path="/biblioteca" element={<BibliotecaTre />} />
            <Route path="/serie/:id" element={<Serie />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/lettura" element={<Lettura />} />
            <Route path="/statistiche" element={<Statistiche />} />
            <Route path="/admin" element={<Admin />} />

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
    </CollezioneProvider>
  );
}
