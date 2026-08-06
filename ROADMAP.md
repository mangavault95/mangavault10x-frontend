# Roadmap

## Decisione in vigore: una schermata sola, che sa di essere toccata

**Dal 6 agosto 2026** il telefono non aspetta più. La regola del 31 luglio —
si rifinisce il desktop, il mobile in un giro dedicato — ha finito il suo
lavoro: quel giro è stato fatto, e da qui in avanti una schermata si considera
finita quando funziona **da monitor e da telefono**.

Quello che *non* è cambiato è altrettanto importante: **non esistono due
versioni del sito**. Non c'è una cartella per il telefono, non c'è una pagina
per il telefono, e nessuna funzione vive solo di qua o solo di là. C'è una
schermata sola che si dispone in modo diverso, e la domanda che decide non è
quanto è largo il vetro:

- **La larghezza** (`sm:` `md:` `lg:`) decide come si dispongono le cose: due
  colonne o una, l'elenco accanto alla scheda o al posto della scheda.
- **`[@media(hover:none)]`** decide cos'è raggiungibile. È la domanda vera,
  perché col dito **non esiste passare sopra le cose**: tutto quello che il
  sito rivela al passaggio del mouse, col dito non esiste e basta. Si legge
  anche da JavaScript, con `useTocco()` (`src/ui/tocco.js`), quando a cambiare
  non è un colore ma una frase.

Un tablet largo senza mouse deve avere il cuore dei preferiti visibile; un
portatile con lo schermo tattile deve averli tutti e due. La larghezza da sola
non lo sa, e infatti chiedendo solo quella si sbagliano tutte e due le volte.

### Come si legge una regola col dito

- **La stanza resta un punta e clicca.** Col mouse si passa sopra un mobile e
  poi si clicca; col dito il primo tocco *è* il passaggio sopra — accende il
  contorno e il cartellino — e il secondo tocco sullo stesso mobile fa partire
  la telecamera. La traduzione sta in `tre/scena.js` (`alClick`, e la mira che
  al tocco non si insegue da sé), il cartellino in `pages/HomePage.jsx`
  (`CartellinoOggetto`). Sopra il vetro non è comparso nessun menu, e non ci
  deve comparire: la ragione per cui non c'è vale col dito quanto col mouse.
- **In verticale la stanza non ci sta in un'inquadratura sola**: le postazioni
  sono due (`POSTI_SOGLIA_STRETTO`) e le due frecce per girarsi compaiono da
  sé. Non sono «la versione mobile»: compaiono quando la scena dichiara più di
  una postazione, cioè in risposta a una proporzione.
- **I bersagli crescono al tocco, e solo lì.** Ventotto pixel si prendono al
  primo colpo con una freccia larga un pixel, non con un polpastrello largo un
  centimetro. Su un monitor lo stesso bottone a quaranta pixel urlerebbe.
- **`src/mobile/`** non esiste più: era l'applicazione precedente, non la
  importava nessuno, e adesso che il telefono vede le pagine vere non c'è
  niente da recuperare. (`src/components/` è dello stesso vecchio impianto ed
  è morto allo stesso modo: da cancellare a parte.)

## Aperti

- La porta d'ingresso animata vera e propria (oggi è un velo CSS sopra il
  canvas, non geometria).
- Pulizia dati: editori duplicati (`Panini` / `Panini S.p.A.`), `DataAggiunta`
  quasi sempre vuoto.
- Spostare `ANTHROPIC_API_KEY` dal `.env` del frontend a Render.
- Peso della home: ~1,1 MB fra modelli e texture della stanza (dopo la
  pulizia del 6/8/2026 — via la scala a pioli non più usata, la pietra
  delle pareti da 768 a 512px), più fino a 48 copertine scaricate a parte.
  È la pagina d'ingresso, quindi è il primo scarico di ogni visita.
- Compressione Draco/meshopt sui `.glb`: il taglio grosso che resta.
  `bibliotecaria.glb` da sola pesa 492 kB, più di tutto l'arredo messo
  insieme; richiede un decoder in più lato client, quindi non è la
  correzione di un pomeriggio come le texture — va valutata a parte.
- "Più edizioni della stessa serie": idea non ancora progettata, non esiste
  nessuna colonna né tabella.
