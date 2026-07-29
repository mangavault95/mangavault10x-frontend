import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AppRoutes from "./app/routes";

/**
 * Il punto d'ingresso.
 *
 * Prima qui c'era `App.jsx`, che teneva in due booleani quale
 * schermata mostrare: nessun indirizzo, nessuna cronologia, nessun
 * link condivisibile. Adesso comanda il router, e ogni schermata ha
 * il suo indirizzo (vedi `app/routes.jsx`).
 */
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);
