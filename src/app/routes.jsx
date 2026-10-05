import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "./Shell";
import RouteFallback from "./RouteFallback";
import RouteErrore from "./RouteErrore";
import { CollezioneProvider } from "../dati/CollezioneContext";
import { AccessoProvider } from "../dati/AccessoProvider";
import { SessioneProvider } from "../dati/SessioneProvider";
import { useSessione } from "../dati/sessione";
import { useTema } from "../dati/tema";
import { BibliotecarioProvider } from "../bibliotecario/BibliotecarioProvider";

// Ogni pagina è un chunk separato: la prima apertura scarica solo
// quello che serve invece dell'intera applicazione. La videoteca è un
// mondo a parte anche nel codice scaricato: chi non ci entra mai non
// porta a casa nemmeno un byte delle sue pagine.
const Adesso = lazy(() => import("../pages/AdessoPage"));
const Cerca = lazy(() => import("../pages/CercaPage"));
const Mese = lazy(() => import("../pages/MesePage"));
const Gestione = lazy(() => import("../pages/GestionePage"));
const Collezione = lazy(() => import("../pages/CollezionePage"));
const Serie = lazy(() => import("../pages/SeriePage"));
const Wishlist = lazy(() => import("../pages/WishlistPage"));
const Desiderio = lazy(() => import("../pages/DesiderioPage"));
const Lettura = lazy(() => import("../pages/LetturaPage"));
const Statistiche = lazy(() => import("../pages/StatistichePage"));
const Kachinuki = lazy(() => import("../pages/KachinukiPage"));
const Partita = lazy(() => import("../pages/PartitaPage"));
const NonTrovata = lazy(() => import("../pages/NonTrovataPage"));

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

  // Il tema segue chi è entrato: ardesia per Nicer, lilla per Sara.
  useTema();

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
                  <Route path="/" element={<Adesso />} />
                  <Route path="/gestione" element={<Gestione />} />
                  <Route path="/cerca" element={<Cerca />} />
                  <Route path="/mese" element={<Mese />} />
                  <Route path="/collezione" element={<Collezione />} />
                  <Route path="/biblioteca" element={<Navigate to="/collezione" replace />} />
                  <Route path="/serie/:id" element={<Serie />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/desiderio/:id" element={<Desiderio />} />
                  <Route path="/lettura" element={<Lettura />} />
                  <Route path="/statistiche" element={<Statistiche />} />

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

                  {/* Vecchi indirizzi mantenuti funzionanti. La stanza in 3D e
                      le sue quattro porte (scontrino, bacheca, tavolino,
                      banco) sono state tolte il 05/10/2026: chi ha un
                      segnalibro finisce su Adesso, che le sostituisce. Le
                      due Gestioni sono diventate una (`/gestione`). */}
                  <Route path="/sala" element={<Navigate to="/" replace />} />
                  <Route path="/cassa" element={<Navigate to="/mese" replace />} />
                  <Route path="/bacheca" element={<Navigate to="/wishlist" replace />} />
                  <Route path="/tavolino" element={<Navigate to="/lettura" replace />} />
                  <Route path="/banco" element={<Navigate to="/cerca" replace />} />
                  <Route path="/admin" element={<Navigate to="/gestione?sezione=manga" replace />} />
                  <Route
                    path="/videoteca/gestione"
                    element={<Navigate to="/gestione?sezione=anime" replace />}
                  />
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
