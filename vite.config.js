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

export default defineConfig(({ mode }) => {
  // La cartella è quella da cui si lancia Vite, cioè questa: scriverlo
  // così invece che con `process.cwd()` tiene il file leggibile anche a
  // eslint, che qui dentro non conosce le variabili di Node.
  const ambiente = loadEnv(mode, ".", "");

  return {
    plugins: [react(), preconnessione(ambiente.VITE_API_URL)],
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: inoltri
    }
  };
});
