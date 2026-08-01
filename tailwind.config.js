/**
 * Design system MangaVault — "ottone e legno scuro".
 *
 * L'idea guida: la collezione deve sembrare una libreria fisica.
 * Il giallo che usavi ovunque diventa una scala di ottone brunito
 * (le rifiniture, le targhette, la luce calda), il fondo diventa
 * il buio di una stanza di legno, e i pannelli di vetro acquistano
 * livelli di profondità invece di essere tutti uguali.
 *
 * Regola: nei componenti si usano SOLO questi token, mai valori
 * scritti a mano. Se serve un colore che non c'è, si aggiunge qui.
 */

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Fondali: dal più profondo al più vicino ----
        void: "#06070b", // il buio dietro tutto
        shelf: "#0b0d14", // il legno dello scaffale
        alcove: "#111524", // la nicchia illuminata
        legno: "#1a1410", // lo stesso legno della stanza 3D (`COLORE_LEGNO` in tre/scena.js)

        // ---- Ottone: l'accento. 400 è il tuo yellow-400 di sempre ----
        brass: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15", // ancora il colore firma
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12"
        },

        // ---- Inchiostro: la gerarchia del testo ----
        ink: {
          bright: "#f5f3ef", // titoli — leggermente caldo, non bianco puro
          DEFAULT: "#c9c7c2", // corpo
          muted: "#8b8a86", // metadati
          faint: "#5c5b58" // disabilitato, segnaposto
        },

        // ---- Semantici ----
        jade: "#34d399", // completato, confermato
        ember: "#fb7185", // mancante, distruttivo
        lapis: "#818cf8", // in corso, informativo

        // ---- Materiali ----
        // Le pagine che si raggiungono dalla stanza non sono pannelli di
        // vetro su fondo scuro: sono oggetti. Uno scontrino è di carta
        // termica, una bacheca è di sughero, un volume aperto è di carta
        // ingiallita — e su quelle superfici si scrive in nero, non in
        // avorio. Sono gli unici punti del sito in cui il fondo è chiaro,
        // ed è voluto: lì si sta guardando una cosa, non una schermata.
        carta: "#efe6d2", // la pagina di un volume
        scontrino: "#e9e7e0", // la carta termica del registratore
        sughero: "#8b6a45", // il pannello della bacheca
        inchiostro: "#2a2118" // quello che ci si scrive sopra
      },

      // Vetro a tre livelli: più un pannello è "vicino", più è denso.
      // Prima erano tutti rgba(24,30,56,0.42) e sembravano piatti.
      backgroundColor: {
        "glass-1": "rgba(20, 25, 44, 0.34)",
        "glass-2": "rgba(26, 32, 54, 0.52)",
        "glass-3": "rgba(32, 39, 64, 0.72)"
      },

      borderColor: {
        hairline: "rgba(255, 255, 255, 0.07)",
        soft: "rgba(255, 255, 255, 0.12)",
        strong: "rgba(255, 255, 255, 0.2)"
      },

      // Ombre profonde ma non nere piatte: la profondità si legge
      // meglio con ombre ampie e morbide che con bordi marcati.
      boxShadow: {
        lift: "0 2px 8px rgba(4, 5, 10, 0.5)",
        raised: "0 8px 24px -6px rgba(4, 5, 10, 0.7)",
        float: "0 20px 48px -12px rgba(4, 5, 10, 0.85)",
        brass:
          "0 0 0 1px rgba(250, 204, 21, 0.4), 0 4px 20px -4px rgba(250, 204, 21, 0.28)",
        "spine-l": "inset 8px 0 12px -8px rgba(0, 0, 0, 0.9)",
        "spine-r": "inset -8px 0 12px -8px rgba(0, 0, 0, 0.9)"
      },

      borderRadius: {
        card: "0.875rem",
        panel: "1.25rem",
        sheet: "1.75rem"
      },

      // Ritmo 4pt. Le misure fuori scala vanno aggiunte qui, non inline.
      spacing: {
        sidebar: "20rem",
        "sidebar-slim": "5.5rem",
        rail: "4.5rem"
      },

      // Il rapporto di una copertina manga (tankobon): serve a
      // riservare lo spazio prima che l'immagine carichi, così la
      // griglia non "salta" durante il caricamento.
      aspectRatio: {
        cover: "2 / 3",
        spine: "1 / 7"
      },

      transitionTimingFunction: {
        // Decelerazione decisa: l'elemento arriva e si posa.
        settle: "cubic-bezier(0.16, 1, 0.3, 1)",
        // Piccolo rimbalzo: per conferme e apparizioni.
        spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
        // Uscita rapida: sparire deve costare meno che apparire.
        exit: "cubic-bezier(0.4, 0, 1, 1)"
      },

      transitionDuration: {
        tap: "120ms",
        quick: "180ms",
        base: "240ms",
        slow: "420ms"
      },

      fontFamily: {
        // Il display serve per i titoli: dà il tono "editoriale".
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter Tight", "system-ui", "sans-serif"],
        // Cifre a larghezza fissa per prezzi e contatori: senza
        // questo i numeri "ballano" mentre si aggiornano.
        numeric: ["Roboto Mono", "ui-monospace", "monospace"]
      },

      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translate3d(0, 12px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" }
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" }
        },

        /* ---- Le pagine che si raggiungono dalla stanza ----
           Sono oggetti, non schermate, e arrivano come arriverebbe
           l'oggetto: la carta esce dalla fessura, la riga si stampa, la
           locandina cade sulla bacheca. */

        // Lo scontrino che scorre fuori dal registratore.
        stampa: {
          from: { transform: "translate3d(0, -100%, 0)" },
          to: { transform: "translate3d(0, 0, 0)" }
        },
        // Una riga che la testina ha appena battuto.
        batti: {
          from: { opacity: "0", transform: "translate3d(0, -6px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" }
        },
        // Una locandina appuntata: arriva da sopra e si assesta
        // attorno alla puntina. La rotazione finale la mette il
        // componente, che ne ha una diversa per ogni foglio.
        appunta: {
          from: { opacity: "0", transform: "translate3d(0, -22px, 0) scale(1.04)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" }
        },
        // Il volume che si apre sul tavolino.
        apri: {
          from: { opacity: "0", transform: "perspective(1400px) rotateX(9deg) scale(0.97)" },
          to: { opacity: "1", transform: "perspective(1400px) rotateX(0) scale(1)" }
        },
        // Il riquadro di dialogo della visual novel.
        battuta: {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" }
        }
      },

      animation: {
        "rise-in": "rise-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        battuta: "battuta 380ms cubic-bezier(0.16, 1, 0.3, 1) both"
      },

      zIndex: {
        base: "0",
        raised: "10",
        sticky: "20",
        drawer: "30",
        overlay: "40",
        modal: "50",
        toast: "60"
      }
    }
  },
  plugins: []
};
