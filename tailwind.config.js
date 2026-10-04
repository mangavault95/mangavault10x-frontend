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

/**
 * ⚠️ DAL 04/10/2026 I COLORI SONO VARIABILI, NON VALORI.
 *
 * Il sito ha un tema per persona — «ardesia e ottone» per Nicer, «carta
 * e lilla» per Sara — e il tema lo sceglie chi è entrato (vedi
 * `dati/tema.js`). I valori veri stanno in `index.css`, sotto `:root`
 * e `[data-tema="lilla"]`; qui ogni token punta alla sua variabile.
 *
 * Due regole che reggono tutto:
 *
 *   1. I NOMI SONO RUOLI, NON COLORI. `ink-bright` è «il testo più
 *      forte», che su ardesia è quasi bianco e su carta quasi nero.
 *      `brass-300` è «l'accento usato come testo su fondo», giallo
 *      chiaro su ardesia e lilla scuro su carta: per questo nel tema
 *      chiaro la scala è rovesciata, e i componenti non se ne accorgono.
 *
 *   2. ANCHE LA VIDEOTECA PASSA DI QUI. Il «Quaderno» era un secondo
 *      tema, chiaro e blu, fisso. Adesso i suoi token puntano alle
 *      stesse variabili: la videoteca segue il tema di chi guarda senza
 *      che un solo componente sia stato riscritto.
 *
 * La forma `rgb(var(--x) / <alpha-value>)` è quella che fa funzionare
 * le trasparenze di Tailwind (`bg-brass-400/10`) anche su una variabile.
 */
const v = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Fondali: dal più profondo al più vicino ----
        void: v("c-void"), // il fondo più profondo
        shelf: v("c-shelf"), // il fondo della pagina
        alcove: v("c-alcove"), // le schede appoggiate sopra
        legno: "#1a1410", // lo stesso legno della stanza 3D (`COLORE_LEGNO` in tre/scena.js)

        // ---- Ottone: l'accento. 400 è il tuo yellow-400 di sempre ----
        brass: {
          50: v("c-brass-50"),
          100: v("c-brass-100"),
          200: v("c-brass-200"),
          300: v("c-brass-300"),
          400: v("c-brass-400"), // l'accento: ottone per Nicer, lilla per Sara
          500: v("c-brass-500"),
          600: v("c-brass-600"),
          700: v("c-brass-700"),
          800: v("c-brass-800"),
          900: v("c-brass-900")
        },

        // ---- Inchiostro: la gerarchia del testo ----
        ink: {
          bright: v("c-ink-bright"), // titoli
          DEFAULT: v("c-ink"), // corpo
          muted: v("c-ink-muted"), // metadati
          faint: v("c-ink-faint") // disabilitato, segnaposto
        },

        // ---- Semantici ----
        jade: v("c-jade"), // completato, confermato
        ember: v("c-ember"), // mancante, distruttivo
        lapis: v("c-lapis"), // in corso, informativo

        // ---- I lettori ----
        // Chi ha scritto una nota si riconosce dal colore, non dal nome
        // letto ogni volta. Sono tenuti volutamente FUORI dai semantici
        // qui sopra: se il colore di una persona fosse anche quello di
        // "completato", la sua nota sembrerebbe una conferma. L'unico in
        // comune è l'ottone, che è il proprietario e il colore del sito
        // da sempre. I nomi combaciano con `COLORI_LETTORE` nel backend
        // (`services/utenti.js`), che è chi li assegna.
        lettore: {
          ottone: "#facc15", // = brass-400, il proprietario
          lilla: "#c084fc",
          menta: "#5eead4",
          corallo: "#fb923c",
          cielo: "#7dd3fc",
          rosa: "#f472b6"
        },

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
        inchiostro: "#2a2118", // quello che ci si scrive sopra

        // ---- Videoteca: "Quaderno" ----
        // L'unica sezione del sito che è chiara per tutta la sua
        // estensione, e non per un oggetto solo come lo scontrino o la
        // bacheca. È voluto: la videoteca deve sembrare un altro posto
        // pur restando lo stesso sito, e il modo più netto di dirlo è
        // ribaltare la luce.
        //
        // Freddo dove la biblioteca è calda, blu dove lei è ottone:
        // è la videoteca vera, quella degli schedari e delle tessere,
        // non un salotto di legno.
        //
        // (Dal 04/10/2026 tutto quanto sopra vale come storia: il
        // Quaderno segue il tema di chi guarda, come il resto del sito.
        // I nomi restano perché li usano un centinaio di componenti.)
        quaderno: {
          carta: v("c-shelf"), // il fondo della sezione
          foglio: v("c-alcove"), // le schede appoggiate sopra
          riga: v("c-riga"), // bordi e divisori
          inchiostro: v("c-ink-bright"), // quello che ci si scrive
          tenue: v("c-ink-muted"), // metadati, didascalie
          blu: v("c-accento"), // l'accento: progressi, ore, numeri
          "blu-tenue": v("c-accento-tenue"), // l'accento quando fa da fondo
          "su-blu": v("c-su-accento"), // il testo sopra un fondo d'accento

          // I voti, agli estremi: dal 4 in su verde, sotto il 3 rosso.
          // In mezzo resta `inchiostro`, il nero di tutto il resto —
          // c'era anche un giallo per il 3 ed è stato tolto, perché fra
          // un verde e un rosso il giallo si legge come un terzo
          // giudizio («così così») mentre il 3 è il voto di chi non si
          // è pronunciato.
          //
          // Non riusano `jade` ed `ember`: quelli sono nati per il
          // fondo scuro della biblioteca e su carta bianca sono due
          // pastelli che non si leggono. Questi sono scuri abbastanza
          // da passare il contrasto su `foglio`.
          verde: v("c-voto-alto"),
          rosso: v("c-voto-basso")
        }
      },

      // Vetro a tre livelli: più un pannello è "vicino", più è denso.
      // Prima erano tutti rgba(24,30,56,0.42) e sembravano piatti.
      //
      // (Dal 04/10/2026 il vetro non c'è più: i tre livelli sono
      // superfici piatte, una più vicina dell'altra. Il nome resta.)
      backgroundColor: {
        "glass-1": "var(--superficie-1)",
        "glass-2": "var(--superficie-2)",
        "glass-3": "var(--superficie-3)"
      },

      borderColor: {
        hairline: "var(--linea-1)",
        soft: "var(--linea-2)",
        strong: "var(--linea-3)"
      },

      // Ombre profonde ma non nere piatte: la profondità si legge
      // meglio con ombre ampie e morbide che con bordi marcati.
      boxShadow: {
        lift: "var(--ombra-lift)",
        raised: "var(--ombra-raised)",
        float: "var(--ombra-float)",
        brass: "var(--ombra-accento)",
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
        // ⚠️ Fino al 04/10/2026 qui c'erano Fraunces, Inter Tight e
        // Roboto Mono, ma nessuno li caricava: il sito usciva in
        // Georgia e nel carattere di sistema, ed era metà del motivo
        // per cui sembrava vecchio. Adesso sono ospitati qui dentro
        // (@fontsource-variable, importati in `main.jsx`): niente
        // richieste a Google, e funzionano anche offline nell'app.
        //
        // Il display serve per i titoli.
        display: ["Bricolage Grotesque Variable", "system-ui", "sans-serif"],
        sans: ["Geist Variable", "system-ui", "sans-serif"],
        // Cifre a larghezza fissa per prezzi e contatori: senza
        // questo i numeri "ballano" mentre si aggiornano. Solo lì:
        // su date e didascalie il mono fa terminale.
        numeric: ["Geist Mono Variable", "ui-monospace", "monospace"]
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
        },

        /* ---- La posta della videoteca ----
           Consigliare un anime a qualcuno è l'unico gesto del sito che
           ha un destinatario, e le altre animazioni non sanno dirlo:
           una cosa che compare in dissolvenza è arrivata da nessuna
           parte. Qui la copertina si piega dentro una busta, la busta
           parte, e dall'altra parte arriva e si apre. Sono cinque
           fotogrammi chiave che raccontano un oggetto che viaggia. */

        // La copertina che si rimpicciolisce e scivola dentro la busta.
        // `forwards`: deve RESTARE piccola mentre il lembo si chiude.
        //
        // ⚠️ Le percentuali sono sull'altezza della COPERTINA, non della
        // busta: `translateY(15%)` di un'immagine alta 240 la abbassa di
        // 36 punti, che con `scale(0.34)` la lasciano dentro la
        // silhouette della busta. Numeri più grandi la fanno uscire dal
        // fondo — la copertina scivolerebbe SOTTO invece che DENTRO.
        imbusta: {
          "0%": { transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" },
          "55%": { transform: "translate3d(0, 9%, 0) scale(0.74) rotate(-3deg)" },
          "100%": { transform: "translate3d(0, 15%, 0) scale(0.34) rotate(-5deg)" }
        },

        // Il lembo che si ribalta e chiude. L'origine sta in alto: la
        // mette il componente, perché è una proprietà della forma e non
        // del movimento.
        "chiudi-lembo": {
          from: { transform: "rotateX(-176deg)" },
          to: { transform: "rotateX(0deg)" }
        },

        // La busta che parte. Il primo terzo è un contraccolpo verso il
        // basso: senza, non parte — si limita a sparire in alto a
        // destra, che è la differenza fra un lancio e una dissolvenza.
        spedisci: {
          "0%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" },
          "22%": { opacity: "1", transform: "translate3d(0, 5%, 0) scale(0.97) rotate(-2deg)" },
          "100%": {
            opacity: "0",
            transform: "translate3d(46vw, -72vh, 0) scale(0.28) rotate(16deg)"
          }
        },

        // Dall'altra parte: la cartolina arriva da lontano e si posa.
        "cartolina-arriva": {
          "0%": {
            opacity: "0",
            transform: "translate3d(-24vw, 46vh, 0) scale(0.18) rotate(-16deg)"
          },
          "58%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" }
        },

        // Il lembo che si apre: l'inverso della chiusura, ma più lento
        // — chiudere è un gesto, aprire è quello che si sta aspettando.
        "apri-lembo": {
          from: { transform: "rotateX(0deg)" },
          to: { transform: "rotateX(-176deg)" }
        },

        // Quello che c'era dentro: sale fuori dalla busta.
        "esce-dalla-busta": {
          from: { opacity: "0", transform: "translate3d(0, 34%, 0) scale(0.86)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0) scale(1)" }
        }
      },

      animation: {
        // `backwards` e non `both`, e non è un dettaglio di stile.
        //
        // `both` lascia addosso all'elemento l'ultimo fotogramma per
        // sempre, cioè un `transform` che vale «non spostarti» ma
        // esiste — e un antenato trasformato diventa il riferimento di
        // tutti i suoi discendenti `position: fixed`. Effetto: ogni
        // finestra di conferma aperta dentro `<main>` (che ha questa
        // animazione) non si centrava nello schermo ma a metà della
        // PAGINA, cioè lontana, in basso, dove chi ha premuto il
        // bottone non stava guardando.
        //
        // `backwards` tiene il primo fotogramma prima della partenza —
        // che è ciò che serve a non far lampeggiare l'elemento — e alla
        // fine restituisce lo stile normale, che è già identico
        // all'ultimo fotogramma. Stessa animazione, niente transform
        // residuo.
        "rise-in": "rise-in 420ms cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        battuta: "battuta 380ms cubic-bezier(0.16, 1, 0.3, 1) both",

        /* La posta. Qui `forwards` ci vuole davvero, ed è l'eccezione
           alla nota sopra: la copertina deve RESTARE piegata dentro la
           busta e la busta deve RESTARE via, o alla fine del volo
           tornerebbero tutt'e due al loro posto di partenza con uno
           scatto. Il transform che resta addosso non fa danni perché
           questi elementi vivono dentro `Sovrapposizione` — un portale
           sul `<body>` — e non hanno discendenti `position: fixed` da
           sganciare dallo schermo. */
        imbusta: "imbusta 620ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "chiudi-lembo": "chiudi-lembo 420ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards",
        spedisci: "spedisci 780ms cubic-bezier(0.55, 0, 0.9, 0.45) forwards",
        "cartolina-arriva": "cartolina-arriva 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards",
        "apri-lembo": "apri-lembo 620ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "esce-dalla-busta": "esce-dalla-busta 520ms cubic-bezier(0.16, 1, 0.3, 1) backwards"
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
