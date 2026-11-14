// Prova del router nel BROWSER: navigazione, «volo» della copertina (flushSync dentro startViewTransition),
// ritorno col pulsante e col gesto del browser, parametri nell'indirizzo, reindirizzi. Il numero che conta
// è `collezioneNascosta` all'andata: dev'essere `true`, cioè la pagina era GIÀ cambiata quando la
// transizione di vista è partita. Con `false` il volo è rotto (succede con react-router 7 se il router
// avvolge i cambi di pagina in `startTransition`: vedi scripts/controlla-router.mjs).
//
// NON è una dipendenza del progetto e non gira nel controllo automatico: serve Playwright installato.
//   npm run build && npx vite preview --port 4173 &   poi   node scripts/prova-router.cjs
//
// Risultato di riferimento (versione 6.30.6 e 7.18.5 con useTransitions={false}):
//   1. andata: al momento del volo la pagina era già cambiata  {"path":"/serie/1","collezioneNascosta":true}
// Prova del router nel browser: navigazione, «volo» della copertina (flushSync dentro startViewTransition),
// ritorno, indirizzi e parametri. Misura cosa vede la pagina nel momento in cui la transizione parte.
const { chromium } = require("playwright");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errori = []; p.on("pageerror", (e) => errori.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/VITE_API_URL|Failed to load resource/.test(m.text()) && errori.push("console: " + m.text().slice(0, 120)));
  const serie = Array.from({ length: 8 }, (_, i) => ({ ID: i + 1, Titolo: "Serie " + (i + 1), VolumiPosseduti: 3, NumeriPosseduti: [1, 2, 3], VolumiTotali: 10, Autore: "A", Editore: "Panini", CoverURL: `https://s4.anilist.co/f/${i}.jpg`, StatoSerie: "in_corso", VolumiItalia: 6 }));
  await p.route(/_vercel\/image/, (r) => r.fulfill({ body: PNG, contentType: "image/png" }));
  await p.route(/\/api\//, (r) => r.fulfill({ json: new URL(r.request().url()).pathname.endsWith("/api/manga") ? serie : [] }));
  await p.addInitScript(() => {
    const orig = document.startViewTransition.bind(document);
    window.__vt = [];
    document.startViewTransition = (cb) => orig(async () => {
      const r = cb ? await cb() : undefined;
      const c = document.querySelector('a[href^="/serie/"] [data-copertina]');
      window.__vt.push({ path: location.pathname, collezioneNascosta: c ? c.offsetParent === null : null });
      return r;
    });
  });
  const log = (k, v) => console.log(k.padEnd(58), JSON.stringify(v));

  await p.goto("http://localhost:4173/collezione"); await p.waitForSelector('a[href="/serie/1"]'); await p.waitForTimeout(600);
  await p.locator('a[href="/serie/1"]').first().click();
  await p.waitForURL(/\/serie\/1/); await p.waitForTimeout(1500);
  log("1. andata: indirizzo", new URL(p.url()).pathname);
  const andata = (await p.evaluate(() => window.__vt))[0];
  log("1. andata: al momento del volo la pagina era già cambiata", andata);
  log("1. andata: la scheda mostra il titolo", await p.locator("h1").first().innerText().catch(() => null));

  await p.evaluate(() => (window.__vt = []));
  await p.getByRole("button", { name: "Indietro" }).click();
  await p.waitForURL(/\/collezione/, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1500);
  log("2. «Indietro» della scheda: indirizzo", new URL(p.url()).pathname);
  const ritorno = await p.evaluate(() => window.__vt);
  log("2. «Indietro»: transizioni registrate", ritorno);

  await p.locator('a[href="/serie/2"]').first().click(); await p.waitForURL(/\/serie\/2/); await p.waitForTimeout(1200);
  await p.evaluate(() => (window.__vt = []));
  await p.goBack(); await p.waitForTimeout(1500);
  log("3. gesto indietro del browser: indirizzo", new URL(p.url()).pathname);
  log("3. gesto indietro: transizioni registrate", await p.evaluate(() => window.__vt));
  await p.goForward(); await p.waitForTimeout(1000);
  log("3. avanti: indirizzo", new URL(p.url()).pathname);

  await p.goto("http://localhost:4173/cerca"); await p.waitForTimeout(800);
  const campo = p.locator("input").first(); await campo.fill("berserk"); await p.waitForTimeout(700);
  log("4. ricerca: il testo finisce nell'indirizzo", new URL(p.url()).search);
  await p.goto("http://localhost:4173/biblioteca"); await p.waitForTimeout(800);
  log("5. vecchio indirizzo reindirizzato (/biblioteca)", new URL(p.url()).pathname);
  await p.goto("http://localhost:4173/admin"); await p.waitForTimeout(800);
  log("5. reindirizzo con parametri (/admin)", new URL(p.url()).pathname + new URL(p.url()).search);
  await p.goto("http://localhost:4173/indirizzo-che-non-esiste"); await p.waitForTimeout(800);
  log("6. indirizzo sconosciuto", (await p.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 70));
  log("errori di pagina", errori.length ? errori : "nessuno");
  await b.close();
})().catch((e) => { console.error("ERRORE", e.message.split("\n")[0]); process.exit(1); });
