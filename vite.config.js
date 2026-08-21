import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Gli inoltri delle copertine.
 *
 * Servono alla biblioteca in 3D: WebGL rifiuta le immagini di un altro
 * dominio che non dichiarano il permesso CORS, e nessuno dei nostri
 * host lo dichiara. Facendole passare di qui diventano immagini del
 * nostro stesso indirizzo e il problema sparisce.
 *
 * Questa tabella deve restare allineata con `vercel.json` (che fa la
 * stessa cosa in produzione) e con `src/tre/copertine.js` (che riscrive
 * gli indirizzi). Il `Referer` va tolto: alcuni CDN rispondono 403 a
 * chi arriva da un dominio che non riconoscono.
 */
const COPERTINE = {
  "/copertine/anilist": "https://s4.anilist.co",
  "/copertine/mal": "https://myanimelist.net",
  "/copertine/mal-cdn": "https://cdn.myanimelist.net",
  "/copertine/animeclick": "https://www.animeclick.it"
};

const inoltri = Object.fromEntries(
  Object.entries(COPERTINE).map(([percorso, destinazione]) => [
    percorso,
    {
      target: destinazione,
      changeOrigin: true,
      rewrite: (p) => p.replace(percorso, ""),
      configure: (proxy) => {
        proxy.on("proxyReq", (richiesta) => {
          richiesta.removeHeader("referer");
          richiesta.removeHeader("origin");
        });
      }
    }
  ])
);

/**
 * Il `preconnect` verso il backend.
 *
 * La prima richiesta a un dominio non comincia dalla richiesta: prima
 * bisogna risolvere il nome, aprire la connessione e stringere la mano
 * per il TLS. Sono tre viaggi di andata e ritorno che il browser fa a
 * scoperta, cioè quando il JavaScript chiede i dati — in fondo a tutto.
 *
 * Dichiarandolo nell'intestazione della pagina quei tre viaggi partono
 * col primo byte di HTML, in parallelo allo scaricamento del resto, e la
 * richiesta vera quando arriva trova la strada già aperta.
 *
 * L'indirizzo si scrive qui e non a mano nell'HTML perché è quello di
 * `VITE_API_URL`: cambia fra il computer di casa e Vercel, e un
 * preconnect verso un indirizzo sbagliato è una connessione buttata.
 */
function preconnessione(indirizzo) {
  return {
    name: "preconnessione-al-backend",
    transformIndexHtml(html) {
      if (!indirizzo) return html;

      let origine;

      try {
        origine = new URL(indirizzo).origin;
      } catch {
        return html;
      }

      // Solo se sta fuori: verso il proprio dominio la connessione è già
      // quella che ha portato la pagina.
      return {
        html,
        tags: [
          {
            tag: "link",
            // `crossorigin` non è un vezzo: le chiamate all'API sono
            // richieste senza credenziali, e viaggiano su una
            // connessione diversa da quella che si aprirebbe senza
            // questo attributo. Scritto male, il preconnect scalda la
            // connessione sbagliata e non serve a niente.
            attrs: { rel: "preconnect", href: origine, crossorigin: "" },
            injectTo: "head-prepend"
          }
        ]
      };
    }
  };
}

/**
 * L'elenco di file che il guardiano offline si mette da parte appena
 * installato (`public/sw.js`).
 *
 * Deve stare qui e non lì dentro perché i nomi dei file li decide Vite:
 * contengono l'impronta del contenuto, cambiano a ogni build, e un
 * service worker scritto a mano non ha modo di indovinarli.
 *
 * Cosa si mette da parte: tutto il codice, e solo il codice. I modelli
 * e le texture della stanza sono megabyte, e non sono il motivo per cui
 * uno si installa l'app sul telefono: se li prende il guardiano la
 * prima volta che si entra davvero nella stanza, e da lì in poi restano.
 *
 * Escludere anche Three.js sarebbe stato inutile: la Collezione monta
 * il libro in vetrina, quindi Three.js lo scarica comunque alla prima
 * schermata. Un pezzo che arriva sempre tanto vale averlo da parte.
 */
function guscioOffline() {
  const MARCATORE = "/*__CODICE__*/";

  let cartella = "dist";
  let elenco = [];

  return {
    name: "guscio-offline",
    apply: "build",

    configResolved(configurazione) {
      cartella = configurazione.build.outDir;
    },

    generateBundle(opzioni, pacchetto) {
      elenco = Object.keys(pacchetto)
        .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
        .map((f) => `/${f}`);
    },

    closeBundle() {
      const file = resolve(cartella, "sw.js");
      const testo = readFileSync(file, "utf8");

      if (!testo.includes(MARCATORE)) {
        this.warn(`${MARCATORE} non trovato in sw.js: l'app non funzionerà offline`);
        return;
      }

      writeFileSync(file, testo.replace(MARCATORE, elenco.map((f) => JSON.stringify(f)).join(",")));
    }
  };
}

export default defineConfig(({ mode }) => {
  // La cartella è quella da cui si lancia Vite, cioè questa: scriverlo
  // così invece che con `process.cwd()` tiene il file leggibile anche a
  // eslint, che qui dentro non conosce le variabili di Node.
  const ambiente = loadEnv(mode, ".", "");

  return {
    plugins: [react(), preconnessione(ambiente.VITE_API_URL), guscioOffline()],
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: {
        ...inoltri,

        /**
         * Il backend, in sviluppo.
         *
         * Render accetta solo le origini dichiarate in `ALLOWED_ORIGINS`
         * — l'indirizzo Vercel — e la deroga per localhost vale solo se
         * `NODE_ENV` non è `production`, cosa che in produzione non
         * succede mai. Risultato: `npm run dev` parte, ma ogni chiamata
         * muore con «No 'Access-Control-Allow-Origin'», che sembra il
         * server addormentato e non lo è.
         *
         * Questo inoltro gira lato server, dove il CORS non esiste: il
         * browser vede solo localhost. Vale a una condizione — che gli
         * indirizzi siano relativi, cioè `VITE_API_URL` vuoto in
         * `.env.local` (che ha la precedenza su `.env` e non finisce su
         * GitHub). In produzione non cambia niente: là `VITE_API_URL` è
         * quello vero e questo blocco non esiste nemmeno.
         */
        "/api": {
          target: "https://mangavault10x-api.onrender.com",
          changeOrigin: true,

          /**
           * Via l'intestazione `Origin`.
           *
           * `changeOrigin` riscrive `Host`, non `Origin`, e il browser
           * l'`Origin` lo aggiunge da sé a tutto ciò che non è una GET.
           * Risultato: le letture passavano e le scritture no —
           * spuntare un episodio in locale rispondeva «Origine non
           * autorizzata: http://localhost:5173», che sembra un
           * problema di permessi e invece è questa riga mancante.
           * Senza quell'intestazione la richiesta arriva a Render come
           * arriva un curl, e il controllo delle origini la lascia
           * passare.
           */
          configure: (proxy) => {
            proxy.on("proxyReq", (richiesta) => {
              richiesta.removeHeader("origin");
            });
          }
        }
      }
    }
  };
});
