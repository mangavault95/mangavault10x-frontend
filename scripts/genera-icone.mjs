/**
 * Le PNG dell'app, rigenerate da `public/icona.svg`.
 *
 * Uso:
 *   node scripts/genera-icone.mjs
 *
 * Perché uno script: iOS ignora l'SVG e vuole una PNG per la schermata
 * Home, e il manifest ne vuole altre tre. Disegnarle a mano a ogni
 * ritocco del logo vuol dire che prima o poi una resta vecchia — era
 * successo: l'icona sulla Home dell'iPhone era ancora quella d'ottone.
 *
 * Le disegna Chrome (o Edge) senza finestra: niente librerie da
 * installare, e il rendering dell'SVG — aloni compresi — è quello di un
 * browser vero. Il percorso si può forzare con CHROME=…
 *
 * La maskable ha il torii più piccolo: Android la ritaglia in un cerchio
 * o in una goccia, e deve restare tutto dentro l'80% centrale.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pubblico = join(radice, "public");
const svg = readFileSync(join(pubblico, "icona.svg"), "utf8");

const candidati = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome"
].filter(Boolean);

const browser = candidati.find((p) => existsSync(p));

if (!browser) {
  console.error("Non trovo Chrome né Edge: indica il percorso con CHROME=…");
  process.exit(1);
}

const ICONE = [
  { file: "icona-180.png", lato: 180, scala: null },
  { file: "icona-192.png", lato: 192, scala: null },
  { file: "icona-512.png", lato: 512, scala: null },
  // Nella maskable il torii scende da 13.75 a 10.5: sta nel cerchio.
  { file: "icona-maskable-512.png", lato: 512, scala: "10.5" }
];

const lavoro = mkdtempSync(join(tmpdir(), "icone-"));

try {
  for (const icona of ICONE) {
    const disegno = icona.scala ? svg.replace("scale(13.75)", `scale(${icona.scala})`) : svg;
    const pagina = join(lavoro, `${icona.lato}-${icona.file}.html`);

    writeFileSync(
      pagina,
      `<!doctype html><html><body style="margin:0;background:#0b0d14">
        <img src="data:image/svg+xml;base64,${Buffer.from(disegno).toString("base64")}"
             style="display:block;width:${icona.lato}px;height:${icona.lato}px">
      </body></html>`
    );

    execFileSync(browser, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${icona.lato},${icona.lato}`,
      `--screenshot=${join(pubblico, icona.file)}`,
      pathToFileURL(pagina).href
    ], { stdio: "ignore" });

    console.log(`✓ ${icona.file} (${icona.lato}×${icona.lato})`);
  }
} finally {
  rmSync(lavoro, { recursive: true, force: true });
}
