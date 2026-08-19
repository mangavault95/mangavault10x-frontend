import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppRoutes from "./app/routes";
import { agganciaServizio } from "./app/servizio";
import { anticipaCollezione } from "./dati/anticipo";
import { anticipaModelli } from "./tre/indirizzi";

/**
 * Il punto d'ingresso.
 *
 * Prima qui c'era `App.jsx`, che teneva in due booleani quale
 * schermata mostrare: nessun indirizzo, nessuna cronologia, nessun
 * link condivisibile. Adesso comanda il router, e ogni schermata ha
 * il suo indirizzo (vedi `app/routes.jsx`).
 *
 *
 * QUELLO CHE PARTE PRIMA DI REACT
 *
 * Le due righe qui sotto stanno prima di `createRoot` apposta. Sono
 * richieste di rete che prima partivano in fondo alla catena — quando
 * il JavaScript era già stato scaricato, interpretato ed eseguito e
 * React aveva montato tutto — e che invece possono viaggiare mentre il
 * browser fa il resto del lavoro. Non cambiano niente di quello che si
 * vede: cambiano quando lo si vede.
 */

// La collezione serve praticamente a ogni pagina.
anticipaCollezione();

// I modelli della stanza no: chi apre la Collezione o i Numeri non li
// vedrà mai, e chiederglieli sarebbe un megabyte buttato.
if (window.location.pathname === "/") anticipaModelli();

// Il guscio offline, per chi il sito se l'è messo sulla schermata Home
// del telefono. Aspetta il carico da sé, quindi non ruba niente a qui.
agganciaServizio();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
