import { defineConfig } from "vite";
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

export default defineConfig({
  plugins: [react()],
  server: { proxy: inoltri }
});
