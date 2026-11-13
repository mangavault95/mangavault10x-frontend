# MangaVault — frontend

Il portale di casa per la collezione di manga e la videoteca degli anime.
React 18 + Vite + Tailwind, installabile come app sull'iPhone. Un push su
`main` va in produzione su Vercel.

## Avvio in locale

```bash
npm install
npm run dev
```

Con `VITE_API_URL` vuoto in `.env.local` le chiamate passano dall'inoltro di
Vite (`vite.config.js`) e arrivano al server vero senza problemi di CORS.

## Comandi

- `npm run dev` — sviluppo, su http://localhost:5173
- `npm run build` — rigenera il carattere dei kana e costruisce il sito
- `npm run lint` — eslint
- `npm run font-kana` — solo il carattere dei kana (`scripts/genera-font-kana.mjs`)

## Dove sta cosa

- `src/app` — la cornice (`Shell.jsx`), le rotte, la mappa di navigazione, le icone
- `src/pages` — una pagina per file
- `src/ui` — i componenti; `ui/Foglio.jsx` è il modo di aprire qualcosa
  sopra una pagina (tre finestre più vecchie non ci passano ancora: sono
  fra gli «Aperti» di `ROADMAP.md`), `ui/Avvisi.jsx` l'unico avviso
- `src/dati` — dati e stato; le righe del database si traducono una volta
  sola in `dati/serie.js`
- `src/index.css`, `tailwind.config.js` — i token: colori, raggi, movimento

Decisioni e cose aperte: `ROADMAP.md`.
